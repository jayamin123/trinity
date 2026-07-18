import { guard, ok, bad } from "@/server/http";
import { retrySchedule } from "@/server/schedules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { when } = (await req.json().catch(() => ({}))) as { when?: string };
  if (!when) return bad("when required");
  try { return ok(await retrySchedule(id, when)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}
