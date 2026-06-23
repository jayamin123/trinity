"use server";
import { db } from "@/lib/db";
import { parseFirePlan, parseFireAttempts, parseFlowSettings, type CCProduct } from "@/lib/flows";
import { flattenCardData, type CardFields } from "@/lib/cards";
import { decrypt } from "@/lib/crypto";

export type ScheduleDetail = {
  scheduleId: string;
  flowId: string;
  flowName: string;
  flowStatus: string;
  status: "pending" | "processing" | "fired";
  success: boolean;
  scheduledForIso: string;
  firedAtIso: string | null;
  orderId: string | null;
  plan: { product_id: string; product_name: string; price: number; cc_gateway_id: string };
  attempts: ReturnType<typeof parseFireAttempts>;
  cardId: string;
  card: CardFields & { last4: string };
  flow: {
    ccCampaignName: string;
    ccGateway: { id: string; name: string };
    ccProducts: CCProduct[];
  };
};

export async function getScheduleDetail(scheduleId: string): Promise<ScheduleDetail | null> {
  const s = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      card: { select: { id: true, panLast4: true, cardData: true } },
      flow: true,
    },
  });
  if (!s) return null;
  const flowSettings = parseFlowSettings(s.flow.flowSettings);
  return {
    scheduleId: s.id,
    flowId: s.flowId,
    flowName: s.flow.name,
    flowStatus: flowSettings.lifecycle.status,
    status: s.status as "pending" | "processing" | "fired",
    success: s.success,
    scheduledForIso: s.scheduledFor.toISOString(),
    firedAtIso: s.firedAt ? s.firedAt.toISOString() : null,
    orderId: s.orderId,
    plan: parseFirePlan(s.firePlan),
    attempts: parseFireAttempts(s.fireAttempts),
    cardId: s.card.id,
    card: {
      last4: s.card.panLast4,
      ...flattenCardData(s.card.cardData),
    },
    flow: {
      ccCampaignName: flowSettings.cc_campaign.name,
      ccGateway: flowSettings.cc_gateway,
      ccProducts: flowSettings.cc_products,
    },
  };
}

/** Decrypt and return PAN + CVV for a card via its schedule. Server-side only;
 *  the encrypted blobs never leave the server. Anyone with a valid session
 *  cookie can call this — the modals are operator-only. */
export async function revealCardSecrets(scheduleId: string): Promise<{ pan: string; cvv: string }> {
  const s = await db.schedule.findUnique({
    where: { id: scheduleId },
    include: { card: { select: { cardData: true } } },
  });
  if (!s) throw new Error("Schedule not found");
  const data = JSON.parse(s.card.cardData);
  return {
    pan: decrypt(String(data.card.pan_encrypted)),
    cvv: decrypt(String(data.card.cvv_encrypted)),
  };
}
