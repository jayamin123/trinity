import { db } from "@/lib/db";
import { addCardsToFlow } from "./schedules";

export type NewFlowInput = {
  name: string;
  ccGatewayId?: string; ccGatewayName?: string;
  ccCampaignId?: string; ccCampaignName?: string;
  products: { productId: string; name: string; price: number }[];
  startDate: string; endDate: string;
  count: number; source?: string;
};

export async function createFlow(input: NewFlowInput) {
  const account = await db.account.findFirst();
  if (!account) throw new Error("no account configured");
  const flow = await db.flow.create({
    data: {
      name: input.name, accountId: account.id,
      startDate: new Date(input.startDate), endDate: new Date(input.endDate),
      status: "active",
      ccGatewayId: input.ccGatewayId ?? null, ccGatewayName: input.ccGatewayName ?? null,
      ccCampaignId: input.ccCampaignId ?? null, ccCampaignName: input.ccCampaignName ?? null,
      totalCards: 0,
    },
  });
  for (const p of input.products ?? []) {
    await db.flowProduct.create({ data: { flowId: flow.id, productId: p.productId, name: p.name, price: Number(p.price), count: 0 } });
  }
  let added = 0;
  if (input.count > 0 && (input.products?.length ?? 0) > 0) {
    // split the requested count evenly across the products
    const prods = input.products;
    const per = Array(prods.length).fill(0);
    for (let i = 0; i < input.count; i++) per[i % prods.length]++;
    const items = prods.map((p, i) => ({ productId: p.productId, name: p.name, price: Number(p.price), count: per[i] }));
    const r = await addCardsToFlow(flow.id, items, input.startDate, input.endDate, "even", input.source || undefined);
    added = r.added;
  }
  return { id: flow.id, added };
}
