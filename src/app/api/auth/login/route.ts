import { signIn } from "@/lib/auth";
import { ok, bad } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!email || !password) return bad("email and password required");
  const user = await signIn(email, password);
  if (!user) return bad("invalid credentials", 401);
  return ok({ id: user.id, email: user.email });
}
