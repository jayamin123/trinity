import { guard, ok, bad } from "@/server/http";
import { getCard } from "@/server/cards";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g) return g;
  const { id } = await params;
  const card = await getCard(id);
  return card ? ok(card) : bad("not found", 404);
}
