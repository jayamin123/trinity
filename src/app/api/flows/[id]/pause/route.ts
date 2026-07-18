import { guard, ok } from "@/server/http";
import { db } from "@/lib/db";
import { nowBkk } from "@/lib/bkk";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  await db.flow.update({ where: { id }, data: { status: "paused", pausedAt: nowBkk() } });
  return ok({ ok: true });
}
