import { guard, ok } from "@/server/http";
import { previewAddCards } from "@/server/schedules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { count, source } = (await req.json().catch(() => ({}))) as { count?: number; source?: string };
  return ok(await previewAddCards(id, Number(count) || 0, source || undefined));
}
