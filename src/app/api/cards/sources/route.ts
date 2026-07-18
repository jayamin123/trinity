import { guard, ok } from "@/server/http";
import { cardSources } from "@/server/cards";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard();
  if (g) return g;
  return ok(await cardSources());
}
