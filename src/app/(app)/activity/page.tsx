import { db } from "@/lib/db";
import ActivityLedger from "./ActivityLedger";

// The Activity page now reads the append-only `transactions` (logs) table —
// one row per CheckoutChamp attempt, lifted out of the fire_attempts JSON. A
// retried schedule shows BOTH the declined attempt and the approved one; nothing
// is hidden. (The old version showed one row per fired schedule, latest attempt.)
export default async function ActivityPage() {
  const [txs, cards, flows] = await Promise.all([
    db.transaction.findMany({ orderBy: { firedAt: "desc" }, take: 1000 }),
    db.card.findMany({ select: { id: true, panLast4: true, cardData: true } }),
    db.flow.findMany({ select: { id: true, name: true } }),
  ]);

  const cardMap = new Map(cards.map((c) => {
    let name = "—";
    try { const d = JSON.parse(c.cardData); name = `${d.cardholder?.first_name ?? ""} ${d.cardholder?.last_name ?? ""}`.trim() || "—"; } catch {}
    return [c.id, { name, last4: c.panLast4 }];
  }));
  const flowMap = new Map(flows.map((f) => [f.id, f.name]));

  const attemptCount = new Map<string, number>();
  for (const t of txs) attemptCount.set(t.scheduleId, (attemptCount.get(t.scheduleId) ?? 0) + 1);

  const rows = txs.map((t) => ({
    id: t.id,
    scheduleId: t.scheduleId,
    firedAt: t.firedAt.toISOString(),
    cardName: cardMap.get(t.cardId)?.name ?? "—",
    last4: cardMap.get(t.cardId)?.last4 ?? "",
    flowName: flowMap.get(t.flowId) ?? "—",
    productName: t.productName,
    price: t.price,
    amountPaid: t.amountPaid,
    plannedMid: t.plannedMid,
    actualMid: t.actualMid,
    cascade: t.cascadeUsed,
    success: t.success,
    orderId: t.orderId,
    message: t.ccMessage,
    rawResponse: t.rawResponse,
    attemptIndex: t.attemptIndex,
    retried: (attemptCount.get(t.scheduleId) ?? 0) > 1,
  }));

  return <ActivityLedger rows={rows} />;
}

