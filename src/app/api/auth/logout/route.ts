import { signOut } from "@/lib/auth";
import { ok } from "@/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await signOut();
  return ok({ ok: true });
}
