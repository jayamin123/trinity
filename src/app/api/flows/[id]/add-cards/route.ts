import { guard, ok, bad } from "@/server/http";
import { addCardsToFlow } from "@/server/schedules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { count, startDate, endDate, source } = (await req.json().catch(() => ({}))) as { count?: number; startDate?: string; endDate?: string; source?: string };
  if (!count || !startDate || !endDate) return bad("count, startDate, endDate required");
  try {
    return ok(await addCardsToFlow(id, Number(count), startDate, endDate, source || undefined));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed");
  }
}
