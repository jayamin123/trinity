import { guard, ok } from "@/server/http";
import { previewAddCards } from "@/server/schedules";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { source } = (await req.json().catch(() => ({}))) as { source?: string };
  return ok(await previewAddCards(id, source || undefined));
}
