import { db } from "@/lib/db";
import { availableForFlow } from "./cards";
import { reserve, release } from "./balance";

// Schedule writes: add cards to a flow (generates schedule rows), edit/delete a
// pending schedule, retry. NONE of this fires — flows2 has no cron. Scheduling
// just creates rows with a future time; firing is a separate (disabled) path.

function buildTimes(count: number, startISO: string, endISO: string): Date[] {
  const DAY = 86400000;
  const s = new Date(startISO), e = new Date(endISO);
  const s0 = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const e0 = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  const days = Math.max(1, Math.round((e0 - s0) / DAY) + 1);
  const perDay = Array(days).fill(0);
  for (let i = 0; i < count; i++) perDay[i % days]++; // even round-robin
  const out: Date[] = [];
  for (let d = 0; d < days; d++) {
    const dateStr = new Date(s0 + d * DAY).toISOString().slice(0, 10);
    for (let j = 0; j < perDay[d]; j++) {
      const h = 9 + Math.floor(Math.random() * 14); // 09:00–22:59 BKK window
      const m = Math.floor(Math.random() * 60);
      out.push(new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`));
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

export async function previewAddCards(flowId: string, count: number, source?: string) {
  const cards = await availableForFlow(flowId, count, source);
  return { available: cards.length, requested: count };
}

export async function addCardsToFlow(flowId: string, count: number, startISO: string, endISO: string, source?: string) {
  const flow = await db.flow.findUnique({ where: { id: flowId }, include: { products: true } });
  if (!flow) throw new Error("flow not found");
  const cards = await availableForFlow(flowId, count, source);
  if (!cards.length) throw new Error("no available cards for that filter");
  const times = buildTimes(cards.length, startISO, endISO);
  const products = flow.products.length ? flow.products : [{ productId: null as string | null, name: null as string | null, price: 0 }];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const p = products[i % products.length];
    await db.schedule.create({
      data: { cardId: c.id, flowId, scheduledFor: times[i], status: "pending", productId: p.productId ?? null, productName: p.name ?? null, price: p.price ?? 0, ccGatewayId: flow.ccGatewayId },
    });
    await reserve(c.id, p.price ?? 0, c.isUnlimited);
  }
  await db.flow.update({ where: { id: flowId }, data: { totalCards: { increment: cards.length } } });
  return { added: cards.length };
}

export async function deleteSchedule(id: string) {
  const s = await db.schedule.findUnique({ where: { id } });
  if (!s) throw new Error("not found");
  if (s.status !== "pending") throw new Error("only pending schedules can be deleted");
  const c = await db.card.findUnique({ where: { id: s.cardId }, select: { isUnlimited: true } });
  await db.schedule.delete({ where: { id } });
  await release(s.cardId, s.price, c?.isUnlimited ?? false);
  await db.flow.update({ where: { id: s.flowId }, data: { totalCards: { decrement: 1 } } }).catch(() => {});
  return { ok: true };
}

export async function updateSchedule(id: string, scheduledForISO: string) {
  const s = await db.schedule.findUnique({ where: { id } });
  if (!s || s.status !== "pending") throw new Error("only pending schedules can be edited");
  await db.schedule.update({ where: { id }, data: { scheduledFor: new Date(scheduledForISO) } });
  return { ok: true };
}

export async function retrySchedule(id: string, whenISO: string) {
  const s = await db.schedule.findUnique({ where: { id } });
  if (!s) throw new Error("not found");
  const c = await db.card.findUnique({ where: { id: s.cardId }, select: { isUnlimited: true } });
  await db.schedule.update({ where: { id }, data: { status: "pending", scheduledFor: new Date(whenISO) } });
  await reserve(s.cardId, s.price, c?.isUnlimited ?? false);
  return { ok: true };
}
