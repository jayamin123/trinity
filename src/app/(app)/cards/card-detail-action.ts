"use server";
import { db } from "@/lib/db";
import { parseFirePlan, parseFireAttempts } from "@/lib/flows";
import { flattenCardData, type CardFields } from "@/lib/cards";
import { decrypt } from "@/lib/crypto";

export type CardDetail = CardFields & {
  cardId: string;
  last4: string;
  /** Sorted: pending first (soonest first), then fired (most recent first). */
  schedules: ScheduleSummary[];
};

export type ScheduleSummary = {
  scheduleId: string;
  flowId: string;
  flowName: string;
  scheduledForIso: string;
  firedAtIso: string | null;
  status: "pending" | "processing" | "fired";
  /** Only set when fired. */
  outcome: "success" | "failed" | "cascade" | null;
  orderId: string | null;
  amountPaid: number | null;
  plan: { product_id: string; product_name: string; price: number; cc_gateway_id: string };
  /** Only the most recent attempt's CC response message — used for the row summary. */
  ccMessage: string | null;
  /** Only for cascade: planned vs actual MID. */
  plannedMid: string | null;
  actualMid: string | null;
};

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    include: {
      schedules: {
        include: { flow: { select: { id: true, name: true } } },
        orderBy: { scheduledFor: "desc" },
      },
    },
  });
  if (!card) return null;

  const schedules: ScheduleSummary[] = card.schedules.map(s => {
    const plan = parseFirePlan(s.firePlan);
    const attempts = parseFireAttempts(s.fireAttempts);
    const last = attempts[attempts.length - 1];
    let outcome: ScheduleSummary["outcome"] = null;
    if (s.status === "fired") {
      if (last?.success && last?.cascade_used) outcome = "cascade";
      else if (last?.success) outcome = "success";
      else outcome = "failed";
    }
    return {
      scheduleId: s.id,
      flowId: s.flow.id,
      flowName: s.flow.name,
      scheduledForIso: s.scheduledFor.toISOString(),
      firedAtIso: s.firedAt?.toISOString() ?? null,
      status: s.status as "pending" | "processing" | "fired",
      outcome,
      orderId: s.orderId,
      amountPaid: last?.amount_paid ?? null,
      plan,
      ccMessage: last?.cc_response.message ?? null,
      plannedMid: plan.cc_gateway_id,
      actualMid: last?.actual_cc_gateway_id ?? null,
    };
  }).sort((a, b) => {
    // pending first (soonest first), then fired (most recent fired first)
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    if (a.status === "pending" && b.status === "pending") {
      return a.scheduledForIso.localeCompare(b.scheduledForIso);
    }
    return (b.firedAtIso ?? "").localeCompare(a.firedAtIso ?? "");
  });

  return {
    cardId: card.id,
    last4: card.panLast4,
    ...flattenCardData(card.cardData),
    schedules,
  };
}

/** Decrypt and return PAN + CVV for a card by cardId (not scheduleId). */
export async function revealCardSecretsByCardId(cardId: string): Promise<{ pan: string; cvv: string }> {
  const card = await db.card.findUnique({ where: { id: cardId } });
  if (!card) throw new Error("Card not found");
  const data = JSON.parse(card.cardData);
  return {
    pan: decrypt(String(data.card.pan_encrypted)),
    cvv: decrypt(String(data.card.cvv_encrypted)),
  };
}
