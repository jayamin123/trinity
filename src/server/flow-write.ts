import { db } from "@/lib/db";
import { release } from "./balance";

// Flow edits: name/window, add/delete product, delete flow (only if nothing fired).

export async function updateFlow(id: string, patch: { name?: string; startDate?: string; endDate?: string }) {
  const data: { name?: string; startDate?: Date; endDate?: Date } = {};
  if (patch.name) data.name = patch.name;
  if (patch.startDate) data.startDate = new Date(patch.startDate);
  if (patch.endDate) data.endDate = new Date(patch.endDate);
  await db.flow.update({ where: { id }, data });
  return { ok: true };
}

export async function deleteFlow(id: string) {
  const fired = await db.transaction.count({ where: { flowId: id } });
  if (fired > 0) throw new Error("cannot delete — this flow has fired transactions (history is permanent)");
  const scheds = await db.schedule.findMany({ where: { flowId: id } });
  const cards = await db.card.findMany({ where: { id: { in: [...new Set(scheds.map((s) => s.cardId))] } }, select: { id: true, isUnlimited: true } });
  const unlimMap = new Map(cards.map((c) => [c.id, c.isUnlimited]));
  for (const s of scheds) if (s.status === "pending") await release(s.cardId, s.price, unlimMap.get(s.cardId) ?? false);
  await db.schedule.deleteMany({ where: { flowId: id } });
  await db.flowProduct.deleteMany({ where: { flowId: id } });
  await db.flow.delete({ where: { id } });
  return { ok: true };
}

export async function addProduct(flowId: string, input: { productId: string; name: string; price: number }) {
  await db.flowProduct.create({ data: { flowId, productId: input.productId, name: input.name, price: input.price, count: 0 } });
  return { ok: true };
}

export async function deleteProduct(productRowId: string) {
  await db.flowProduct.delete({ where: { id: productRowId } });
  return { ok: true };
}
