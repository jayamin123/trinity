import { getCurrentUser } from "@/lib/auth";
import { ok, bad } from "@/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return bad("unauthorized", 401);
  return ok({ id: user.id, email: user.email });
}
