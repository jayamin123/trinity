"use server";
import { db } from "@/lib/db";
import { pullAvailableForFlow, type CardSet } from "@/lib/cards";
import { randomDailyCounts, stratifiedTimesForDay } from "@/lib/schedule";
import { nowBkk } from "@/lib/bkk";
import { type FirePlan, type FlowSettings } from "@/lib/flows";
import { listGateways as ccListGateways, listCampaigns as ccListCampaigns, listProducts as ccListProducts } from "@/lib/checkoutchamp";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// CheckoutChamp option lists for the New-Flow builder. Each reads the single
// saved account and hits CC live. Same creds shape the rest of the app uses.
async function ccCreds() {
  const a = await db.account.findFirst();
  if (!a) throw new Error("No CheckoutChamp account configured");
  return { apiUrl: a.apiUrl, loginId: a.loginIdEncrypted, password: a.passwordEncrypted };
}

export async function listFlowGateways(): Promise<{ id: string; name: string }[]> {
  const gateways = await ccListGateways(await ccCreds());
  return gateways.filter(g => g.enabled).map(g => ({ id: g.id, name: g.title }));
}

export async function listFlowCampaigns(): Promise<{ id: string; name: string }[]> {
  return ccListCampaigns(await ccCreds());
}

export async function listFlowProducts(campaignId: string): Promise<{ id: string; name: string; price: number }[]> {
  if (!campaignId) return [];
  return ccListProducts(await ccCreds(), campaignId);
}

export type ProductPick = {
  product_id: string;
  product_name: string;
  price: number;
  count: number;
};

export type CreateFlowInput = {
  name: string;
  ccGateway: { id: string; name: string };
  ccCampaign: { id: string; name: string };
  /** Per-product mix the user picked. Sum of counts = total cards. */
  productMix: ProductPick[];
  /** Per-day card counts (after randomized distribution). Length = days in window. */
  perDay: { date: string; count: number }[];
  /** Which card set to draw from: "balance" (numbered/untagged) or "unlim". */
  cardSet?: CardSet;
};

export async function previewSchedule(totalCards: number, startDate: string, endDate: string) {
  const start = new Date(startDate + "T12:00:00Z");
  const end = new Date(endDate + "T12:00:00Z");
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days < 1) throw new Error("End date must be on or after start date");
  if (days > 366) throw new Error("Date range is too long (max 366 days)");
  const counts = randomDailyCounts(totalCards, days);
  return counts.map((count, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().substring(0, 10), count };
  });
}

export async function createFlow(input: CreateFlowInput) {
  const account = await db.account.findFirst();
  if (!account) throw new Error("No CheckoutChamp account configured");

  const totalCards = input.productMix.reduce((s, p) => s + p.count, 0);
  if (totalCards <= 0) throw new Error("Pick at least one card");

  const perDaySum = input.perDay.reduce((s, d) => s + d.count, 0);
  if (perDaySum !== totalCards) {
    throw new Error(`Per-day schedule sums to ${perDaySum} but product mix sums to ${totalCards}`);
  }

  // Pull cards from the chosen set. Brand-new flow, so no flowId filter.
  const set: CardSet = input.cardSet ?? "any";
  const cards = await pullAvailableForFlow(totalCards, "", set);
  if (cards.length < totalCards) {
    const label = set === "unlim" ? "unlimited" : set === "balance" ? "remaining-balance" : "available";
    throw new Error(`Only ${cards.length} ${label} cards available — need ${totalCards}`);
  }

  // Build a per-card fire_plan list shuffled across products so the
  // distribution is roughly uniform, not "first N go to product A".
  const planSequence: FirePlan[] = [];
  for (const p of input.productMix) {
    for (let i = 0; i < p.count; i++) {
      planSequence.push({
        product_id: p.product_id,
        product_name: p.product_name,
        price: p.price,
        cc_gateway_id: input.ccGateway.id,
      });
    }
  }
  for (let i = planSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [planSequence[i], planSequence[j]] = [planSequence[j], planSequence[i]];
  }

  const sortedDays = [...input.perDay].sort((a, b) => a.date.localeCompare(b.date));
  // Dates are stored as fake-UTC-BKK: noon BKK of the calendar day, no TZ math.
  const startDate = new Date(sortedDays[0].date + "T12:00:00.000Z");
  const endDate = new Date(sortedDays[sortedDays.length - 1].date + "T12:00:00.000Z");

  const flowSettings: FlowSettings = {
    schedule_window: { start_date: startDate.toISOString(), end_date: endDate.toISOString() },
    lifecycle: { status: "active", paused_at: null, last_charged_at: null },
    cc_gateway: input.ccGateway,
    cc_campaign: input.ccCampaign,
    cc_products: input.productMix.map(p => ({
      id: p.product_id,
      name: p.product_name,
      price: p.price,
      count: p.count,
    })),
    total_cards: totalCards,
    created_at: nowBkk().toISOString(),
  };

  const flow = await db.flow.create({
    data: {
      name: input.name,
      accountId: account.id,
      flowSettings: JSON.stringify(flowSettings),
      createdAt: nowBkk(),
    },
  });

  // Walk the per-day buckets, generating stratified times and pairing each
  // with the next (card, plan) tuple from the shuffled sequences.
  const floor = new Date(nowBkk().getTime() + 60_000);
  let cardIdx = 0;
  for (const day of sortedDays) {
    if (day.count <= 0) continue;
    const dayDate = new Date(day.date + "T12:00:00.000Z");
    const times = stratifiedTimesForDay(day.count, dayDate, floor);
    if (times.length < day.count) {
      throw new Error(`Not enough time left today (${day.date}) to schedule ${day.count} cards — pick a later start date or fewer cards`);
    }
    for (let i = 0; i < day.count; i++) {
      const card = cards[cardIdx];
      const plan = planSequence[cardIdx];
      cardIdx++;
      await db.schedule.create({
        data: {
          flowId: flow.id,
          cardId: card.id,
          scheduledFor: times[i],
          firePlan: JSON.stringify(plan),
          createdAt: nowBkk(),
        },
      });
    }
  }

  revalidatePath("/flows");
  redirect(`/flows/${flow.id}`);
}
