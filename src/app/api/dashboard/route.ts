import { guard, ok } from "@/server/http";
import { dashboardStats } from "@/server/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  return ok(await dashboardStats());
}
