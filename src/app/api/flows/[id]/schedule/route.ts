import { guard, ok } from "@/server/http";
import { getFlowSchedule } from "@/server/flows";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  return ok(await getFlowSchedule(id));
}
