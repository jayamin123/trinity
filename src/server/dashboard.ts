import { db } from "@/lib/db";

// Dashboard KPIs, derived from the ledger (all-time — flows2 doesn't fire, so
// "today" would always be 0; the ledger totals are the meaningful numbers).

export async function dashboardStats() {
  const [cards, activeFlows, flows, pending, txs] = await Promise.all([
    db.card.count(),
    db.flow.count({ where: { status: "active" } }),
    db.flow.count(),
    db.schedule.count({ where: { status: "pending" } }),
    db.transaction.findMany({ select: { success: true, amountPaid: true, firedAt: true } }),
  ]);

  const ok = txs.filter((t) => t.success).length;
  const volume = txs.filter((t) => t.success).reduce((s, t) => s + (t.amountPaid ?? 0), 0);

  const perDay = new Map<string, number>();
  for (const t of txs) {
    const d = t.firedAt.toISOString().slice(0, 10);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const series = [...perDay.entries()].sort().slice(-14).map(([, n]) => n);

  return {
    cards,
    activeFlows,
    flows,
    pending,
    totalCharges: txs.length,
    approvalRate: txs.length ? Math.round((ok / txs.length) * 1000) / 10 : 0,
    volume: Math.round(volume * 100) / 100,
    declined: txs.length - ok,
    series,
  };
}
