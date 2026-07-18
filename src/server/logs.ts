import { db } from "@/lib/db";

// The transactions ledger reads — powering the global Logs page + per-flow Logs
// tab + the fire-attempts modal. Append-only: retries never hide history.

type TxRow = {
  id: string;
  scheduleId: string;
  firedAt: Date;
  cardName: string;
  panLast4: string;
  flowId: string;
  flowName: string;
  productName: string | null;
  price: number | null;
  amountPaid: number | null;
  plannedMid: string | null;
  actualMid: string | null;
  cascadeUsed: boolean;
  success: boolean;
  orderId: string | null;
  ccMessage: string | null;
  retried: boolean; // the schedule has more than one attempt
};

async function decorate(txs: Awaited<ReturnType<typeof db.transaction.findMany>>): Promise<TxRow[]> {
  const [flows, cards] = await Promise.all([
    db.flow.findMany({ select: { id: true, name: true } }),
    db.card.findMany({ select: { id: true, firstName: true, lastName: true, panLast4: true } }),
  ]);
  const fMap = new Map(flows.map((f) => [f.id, f.name]));
  const cMap = new Map(cards.map((c) => [c.id, c]));
  const attemptCount = new Map<string, number>();
  for (const t of txs) attemptCount.set(t.scheduleId, (attemptCount.get(t.scheduleId) ?? 0) + 1);
  return txs.map((t) => {
    const c = cMap.get(t.cardId);
    return {
      retried: (attemptCount.get(t.scheduleId) ?? 0) > 1,
      id: t.id,
      scheduleId: t.scheduleId,
      firedAt: t.firedAt,
      cardName: c ? `${c.firstName} ${c.lastName}` : "—",
      panLast4: c?.panLast4 ?? "",
      flowId: t.flowId,
      flowName: fMap.get(t.flowId) ?? "—",
      productName: t.productName,
      price: t.price,
      amountPaid: t.amountPaid,
      plannedMid: t.plannedMid,
      actualMid: t.actualMid,
      cascadeUsed: t.cascadeUsed,
      success: t.success,
      orderId: t.orderId,
      ccMessage: t.ccMessage,
    };
  });
}

export async function listLogs(limit = 500): Promise<TxRow[]> {
  const txs = await db.transaction.findMany({ orderBy: { firedAt: "desc" }, take: limit });
  return decorate(txs);
}

export async function flowLogs(flowId: string, limit = 500): Promise<TxRow[]> {
  const txs = await db.transaction.findMany({ where: { flowId }, orderBy: { firedAt: "desc" }, take: limit });
  return decorate(txs);
}

/** Every attempt for one schedule (the fire-attempts modal — failed→approved trail). */
export async function scheduleAttempts(scheduleId: string) {
  return db.transaction.findMany({ where: { scheduleId }, orderBy: { firedAt: "asc" } });
}
