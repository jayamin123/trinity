import { guard, ok, bad } from "@/server/http";
import { ccProducts } from "@/server/cc";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard();
  if (g) return g;
  const campaignId = new URL(req.url).searchParams.get("campaignId");
  if (!campaignId) return bad("campaignId required");
  try { return ok(await ccProducts(campaignId)); }
  catch (e) { const m = e instanceof Error ? e.message : "failed"; return bad(m, /ENCRYPTION_KEY/.test(m) ? 503 : 502); }
}
