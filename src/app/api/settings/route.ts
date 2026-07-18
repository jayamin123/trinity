import { guard, ok, bad } from "@/server/http";
import { getAccount, saveAccount } from "@/server/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  return ok(await getAccount());
}

export async function PUT(req: Request) {
  const g = await guard();
  if (g) return g;
  const body = (await req.json().catch(() => ({}))) as { name?: string; apiUrl?: string; loginId?: string; password?: string };
  if (!body.name || !body.apiUrl || !body.loginId || !body.password) return bad("name, apiUrl, loginId, password required");
  try {
    return ok(await saveAccount(body as { name: string; apiUrl: string; loginId: string; password: string }));
  } catch {
    return bad("cannot save credentials — ENCRYPTION_KEY is not set on this deployment", 503);
  }
}
