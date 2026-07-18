import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { db } from "@/lib/db";
import { availableForFlow } from "./cards";
import { reserve, release } from "./balance";
import { distributeShaped, stratifiedTimesForDay, type DistributionShape } from "@/lib/schedule";

dayjs.extend(utc);

// Schedule writes. NOTHING fires — flows2 has no cron. Scheduling just creates
// rows with future times; firing is a separate (disabled) path.

export type AddItem = { productId: string; name: string; price: number; count: number };

export async function previewAddCards(flowId: string, source?: string) {
  const cards = await availableForFlow(flowId, 1_000_000, source);
  return { available: cards.length };
}

/** Add cards to a flow: per-product counts, distributed across the date window by
 *  `shape` (even/increasing/decreasing/normal/inverse), stratified within each day. */
export async function addCardsToFlow(
  flowId: string,
  items: AddItem[],
  startISO: string,
  endISO: string,
  shape: DistributionShape,
  source?: string,
) {
  const flow = await db.flow.findUnique({ where: { id: flowId } });
  if (!flow) throw new Error("flow not found");

  const total = items.reduce((s, it) => s + (it.count || 0), 0);
  if (total <= 0) throw new Error("set a count on at least one product");

  const cards = await availableForFlow(flowId, total, source);
  if (!cards.length) throw new Error("no available cards for that source");
  const n = Math.min(total, cards.length);

  // one product slot per card, proportional to the counts, then shuffled
  const slots: AddItem[] = [];
  for (const it of items) for (let i = 0; i < (it.count || 0); i++) slots.push(it);
  for (let i = slots.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [slots[i], slots[k]] = [slots[k], slots[i]]; }
  const used = slots.slice(0, n);

  // distribute n across the days of the window by shape, then stratified times per day
  const startDay = dayjs.utc(startISO).startOf("day");
  const endDay = dayjs.utc(endISO).startOf("day");
  const days = Math.max(1, endDay.diff(startDay, "day") + 1);
  const perDay = distributeShaped(n, days, shape);
  const times: Date[] = [];
  for (let d = 0; d < days; d++) times.push(...stratifiedTimesForDay(perDay[d], startDay.add(d, "day").toDate()));
  times.sort((a, b) => a.getTime() - b.getTime());

  for (let i = 0; i < n; i++) {
    const c = cards[i], p = used[i], when = times[i] ?? startDay.toDate();
    await db.schedule.create({ data: { cardId: c.id, flowId, scheduledFor: when, status: "pending", productId: p.productId, productName: p.name, price: p.price, ccGatewayId: flow.ccGatewayId } });
    await reserve(c.id, p.price, c.isUnlimited);
  }
  // bump flow_products.count + flow total
  const perProduct = new Map<string, number>();
  for (const p of used) perProduct.set(p.productId, (perProduct.get(p.productId) ?? 0) + 1);
  for (const [pid, cnt] of perProduct) await db.flowProduct.updateMany({ where: { flowId, productId: pid }, data: { count: { increment: cnt } } });
  await db.flow.update({ where: { id: flowId }, data: { totalCards: { increment: n } } });
  return { added: n, requested: total };
}

export async function deleteSchedule(id: string) {
  const s = await db.schedule.findUnique({ where: { id } });
  if (!s) throw new Error("not found");
  if (s.status !== "pending") throw new Error("only pending schedules can be deleted");
  const c = await db.card.findUnique({ where: { id: s.cardId }, select: { isUnlimited: true } });
  await db.schedule.delete({ where: { id } });
  await release(s.cardId, s.price, c?.isUnlimited ?? false);
  if (s.productId) await db.flowProduct.updateMany({ where: { flowId: s.flowId, productId: s.productId }, data: { count: { decrement: 1 } } });
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
