import { guard, ok, bad } from "@/server/http";
import { getFlow } from "@/server/flows";
import { updateFlow, deleteFlow } from "@/server/flow-write";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const flow = await getFlow(id);
  return flow ? ok(flow) : bad("not found", 404);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string; startDate?: string; endDate?: string };
  try { return ok(await updateFlow(id, body)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  try { return ok(await deleteFlow(id)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}
