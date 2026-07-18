import { guard, ok } from "@/server/http";
import { listFlows } from "@/server/flows";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  return ok(await listFlows());
}
