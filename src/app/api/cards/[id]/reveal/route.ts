import { guard, ok, bad } from "@/server/http";
import { revealCard } from "@/server/cards";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  try {
    const secrets = await revealCard(id);
    return secrets ? ok(secrets) : bad("not found", 404);
  } catch {
    // ENCRYPTION_KEY missing / mismatched (expected on flows2 without the key).
    return bad("card secrets unavailable (ENCRYPTION_KEY not set on this deployment)", 503);
  }
}
