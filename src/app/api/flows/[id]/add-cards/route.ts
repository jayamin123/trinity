import { guard, ok, bad } from "@/server/http";
import { addCardsToFlow, type AddItem } from "@/server/schedules";
import type { DistributionShape } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { items, startDate, endDate, shape, source } = (await req.json().catch(() => ({}))) as
    { items?: AddItem[]; startDate?: string; endDate?: string; shape?: DistributionShape; source?: string };
  if (!items?.length || !startDate || !endDate) return bad("items, startDate, endDate required");
  try {
    return ok(await addCardsToFlow(id, items, startDate, endDate, shape || "even", source || undefined));
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed");
  }
}
