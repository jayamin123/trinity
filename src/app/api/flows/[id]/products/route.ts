import { guard, ok, bad } from "@/server/http";
import { addProduct } from "@/server/flow-write";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { productId, name, price } = (await req.json().catch(() => ({}))) as { productId?: string; name?: string; price?: number };
  if (!productId || !name || price == null) return bad("productId, name, price required");
  try { return ok(await addProduct(id, { productId, name, price: Number(price) })); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}
