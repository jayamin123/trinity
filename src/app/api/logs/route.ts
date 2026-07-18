import { guard, ok } from "@/server/http";
import { listLogs } from "@/server/logs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard();
  if (g) return g;
  const limit = Number(new URL(req.url).searchParams.get("limit")) || 500;
  return ok(await listLogs(limit));
}
