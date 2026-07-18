import { guard, ok, bad } from "@/server/http";
import { deleteProduct } from "@/server/flow-write";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; pid: string }> }) {
  const g = await guard();
  if (g) return g;
  const { pid } = await params;
  try { return ok(await deleteProduct(pid)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}
