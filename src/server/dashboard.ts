import { db } from "@/lib/db";
import { startOfTodayBkk } from "@/lib/bkk";

// Dashboard KPIs, derived from the ledger.

export async function dashboardStats() {
  const todayStart = startOfTodayBkk();
  const [cardCount, activeFlows, txAll, txToday] = await Promise.all([
    db.card.count(),
    db.flow.count({ where: { status: "active" } }),
    db.transaction.findMany({ select: { success: true, amountPaid: true } }),
    db.transaction.findMany({ where: { firedAt: { gte: todayStart } }, select: { success: true, amountPaid: true, actualMid: true } }),
  ]);

  const ok = txAll.filter((t) => t.success).length;
  const approvalRate = txAll.length ? (ok / txAll.length) * 100 : 0;

  const todayOk = txToday.filter((t) => t.success);
  const volumeToday = todayOk.reduce((s, t) => s + (t.amountPaid ?? 0), 0);
  const midsToday = new Set(txToday.map((t) => t.actualMid).filter(Boolean)).size;

  return {
    cards: cardCount,
    activeFlows,
    chargesToday: txToday.length,
    approvalRate: Math.round(approvalRate * 10) / 10,
    volumeToday: Math.round(volumeToday * 100) / 100,
    midsToday,
    failedToday: txToday.length - todayOk.length,
    totalCharges: txAll.length,
  };
}
