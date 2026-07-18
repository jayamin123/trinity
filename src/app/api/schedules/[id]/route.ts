import { guard, ok, bad } from "@/server/http";
import { deleteSchedule, updateSchedule } from "@/server/schedules";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  try { return ok(await deleteSchedule(id)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const { scheduledFor } = (await req.json().catch(() => ({}))) as { scheduledFor?: string };
  if (!scheduledFor) return bad("scheduledFor required");
  try { return ok(await updateSchedule(id, scheduledFor)); } catch (e) { return bad(e instanceof Error ? e.message : "failed"); }
}
