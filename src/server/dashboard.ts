import { db } from "@/lib/db";

// Dashboard KPIs + rollups, derived from the ledger (all-time — flows2 doesn't
// fire, so "today" would always be 0; the ledger totals are the real numbers).

export async function dashboardStats() {
  const [cards, activeFlows, flows, pending, txs, flowRows] = await Promise.all([
    db.card.count(),
    db.flow.count({ where: { status: "active" } }),
    db.flow.count(),
    db.schedule.count({ where: { status: "pending" } }),
    db.transaction.findMany({ select: { success: true, amountPaid: true, firedAt: true, productName: true, flowId: true } }),
    db.flow.findMany({ select: { id: true, name: true } }),
  ]);

  const ok = txs.filter((t) => t.success).length;
  const volume = txs.filter((t) => t.success).reduce((s, t) => s + (t.amountPaid ?? 0), 0);

  const perDay = new Map<string, number>();
  for (const t of txs) {
    const d = t.firedAt.toISOString().slice(0, 10);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const series = [...perDay.entries()].sort().slice(-14).map(([, n]) => n);

  const fName = new Map(flowRows.map((f) => [f.id, f.name]));
  const prodAgg = new Map<string, { charges: number; volume: number }>();
  const flowAgg = new Map<string, { charges: number; ok: number }>();
  for (const t of txs) {
    const pk = t.productName ?? "—";
    const p = prodAgg.get(pk) ?? { charges: 0, volume: 0 };
    p.charges++; if (t.success) p.volume += t.amountPaid ?? 0;
    prodAgg.set(pk, p);
    const f = flowAgg.get(t.flowId) ?? { charges: 0, ok: 0 };
    f.charges++; if (t.success) f.ok++;
    flowAgg.set(t.flowId, f);
  }
  const byProduct = [...prodAgg.entries()].map(([name, v]) => ({ name, charges: v.charges, volume: Math.round(v.volume * 100) / 100 })).sort((a, b) => b.charges - a.charges).slice(0, 8);
  const byFlow = [...flowAgg.entries()].map(([id, v]) => ({ name: fName.get(id) ?? id, charges: v.charges, ok: v.ok })).sort((a, b) => b.charges - a.charges);

  return {
    cards, activeFlows, flows, pending,
    totalCharges: txs.length,
    approvalRate: txs.length ? Math.round((ok / txs.length) * 1000) / 10 : 0,
    volume: Math.round(volume * 100) / 100,
    declined: txs.length - ok,
    series, byProduct, byFlow,
  };
}
