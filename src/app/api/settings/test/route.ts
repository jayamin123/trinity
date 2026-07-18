import { guard, ok, bad } from "@/server/http";
import { testAccount } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function POST() {
  const g = await guard();
  if (g) return g;
  try {
    return ok(await testAccount());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "test failed";
    if (/ENCRYPTION_KEY/.test(msg)) return bad("cannot test — ENCRYPTION_KEY is not set on this deployment", 503);
    return bad(msg, 502);
  }
}
