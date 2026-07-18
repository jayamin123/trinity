import { db } from "@/lib/db";
import { calendarDateBkk } from "@/lib/bkk";

// Flow reads for ledger-v2. Progress/verdicts come from the transactions ledger.

export async function listFlows() {
  const [flows, scheds, txs] = await Promise.all([
    db.flow.findMany({ orderBy: { createdAt: "desc" } }),
    db.schedule.findMany({ select: { flowId: true, status: true } }),
    db.transaction.findMany({ select: { flowId: true, success: true } }),
  ]);
  const sAgg = new Map<string, { total: number; pending: number; done: number }>();
  for (const s of scheds) {
    let e = sAgg.get(s.flowId);
    if (!e) sAgg.set(s.flowId, (e = { total: 0, pending: 0, done: 0 }));
    e.total++;
    if (s.status === "pending" || s.status === "processing") e.pending++;
    else if (s.status === "done") e.done++;
  }
  const tAgg = new Map<string, { ok: number; fail: number }>();
  for (const t of txs) {
    let e = tAgg.get(t.flowId);
    if (!e) tAgg.set(t.flowId, (e = { ok: 0, fail: 0 }));
    if (t.success) e.ok++; else e.fail++;
  }
  return flows.map((f) => {
    const s = sAgg.get(f.id) ?? { total: 0, pending: 0, done: 0 };
    const t = tAgg.get(f.id) ?? { ok: 0, fail: 0 };
    return {
      id: f.id,
      name: f.name,
      status: f.status,
      ccGatewayName: f.ccGatewayName,
      ccCampaignName: f.ccCampaignName,
      startDate: f.startDate,
      endDate: f.endDate,
      total: s.total,
      pending: s.pending,
      done: s.done,
      success: t.ok,
      failed: t.fail,
    };
  });
}

export async function getFlow(id: string) {
  const flow = await db.flow.findUnique({ where: { id } });
  if (!flow) return null;
  const products = await db.flowProduct.findMany({ where: { flowId: id }, orderBy: { price: "asc" } });
  return { ...flow, products };
}

/** Day-by-day rollup for the Schedule tab: one entry per BKK calendar date. */
export async function getFlowSchedule(id: string) {
  const [schedules, cards, txs] = await Promise.all([
    db.schedule.findMany({ where: { flowId: id }, orderBy: { scheduledFor: "asc" } }),
    db.card.findMany({ select: { id: true, firstName: true, lastName: true, panLast4: true } }),
    db.transaction.findMany({ where: { flowId: id }, select: { scheduleId: true, success: true } }),
  ]);
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const lastTx = new Map<string, boolean>(); // scheduleId -> latest success
  for (const t of txs) lastTx.set(t.scheduleId, t.success); // txs ordered by insert; last wins
  const days = new Map<string, { date: string; rows: unknown[]; scheduled: number; done: number; pending: number; failed: number }>();
  for (const s of schedules) {
    const date = calendarDateBkk(s.scheduledFor);
    let d = days.get(date);
    if (!d) days.set(date, (d = { date, rows: [], scheduled: 0, done: 0, pending: 0, failed: 0 }));
    const c = cardMap.get(s.cardId);
    const ok = lastTx.get(s.id);
    d.scheduled++;
    if (s.status === "done") { d.done++; if (ok === false) d.failed++; }
    else d.pending++;
    d.rows.push({
      id: s.id,
      cardName: c ? `${c.firstName} ${c.lastName}` : "—",
      panLast4: c?.panLast4 ?? "",
      scheduledFor: s.scheduledFor,
      status: s.status,
      productName: s.productName,
      price: s.price,
      ccGatewayId: s.ccGatewayId,
      success: ok ?? null,
    });
  }
  return [...days.values()];
}
