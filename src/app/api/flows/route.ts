import { guard, ok, bad } from "@/server/http";
import { listFlows } from "@/server/flows";
import { createFlow, type NewFlowInput } from "@/server/flow-create";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  return ok(await listFlows());
}

export async function POST(req: Request) {
  const g = await guard();
  if (g) return g;
  const body = (await req.json().catch(() => ({}))) as Partial<NewFlowInput>;
  if (!body.name || !body.startDate || !body.endDate) return bad("name, startDate, endDate required");
  try {
    return ok(await createFlow({ products: [], count: 0, ...body } as NewFlowInput));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed");
  }
}
