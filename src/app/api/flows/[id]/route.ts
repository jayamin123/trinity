import { guard, ok, bad } from "@/server/http";
import { getFlow } from "@/server/flows";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const flow = await getFlow(id);
  return flow ? ok(flow) : bad("not found", 404);
}
