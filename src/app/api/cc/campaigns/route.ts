import { guard, ok, bad } from "@/server/http";
import { ccCampaigns } from "@/server/cc";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  try { return ok(await ccCampaigns()); }
  catch (e) { const m = e instanceof Error ? e.message : "failed"; return bad(m, /ENCRYPTION_KEY/.test(m) ? 503 : 502); }
}
