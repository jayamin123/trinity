import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { parseCardsJson } from "@/lib/csv";
import { persistCards } from "@/lib/persist-cards";
import { nowBkk } from "@/lib/bkk";

// node:crypto (encryption + timing-safe compare) needs the Node runtime.
export const runtime = "nodejs";

/** Constant-time string compare that never short-circuits on content. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * POST /api/cards — token-authenticated JSON card ingest.
 *
 * Machine-to-machine sibling of the CSV web upload. Bypasses the login cookie
 * (it's in the middleware PUBLIC_PATHS allowlist) and authenticates with a
 * bearer token instead:
 *
 *   Authorization: Bearer <INGEST_TOKEN>
 *   Content-Type: application/json
 *   Body: [ { cardNumber, securityCode, expMonth, expYear, firstName, ... }, ... ]
 *         (or { "cards": [ ... ] })
 *
 * Same validation (Luhn, expiry), same identity-key dedup, and the same
 * encrypted card_data row shape as the web upload — it reuses parseCardsJson +
 * persistCards, so a card ingested here is indistinguishable from one uploaded
 * via the form.
 */
export async function POST(req: Request): Promise<Response> {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "INGEST_TOKEN is not configured on the server" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const rows: unknown[] | null = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { cards?: unknown }).cards)
      ? (body as { cards: unknown[] }).cards
      : null;

  if (!rows) {
    return NextResponse.json(
      { ok: false, error: "body must be a JSON array of cards, or an object { cards: [...] }" },
      { status: 400 },
    );
  }
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "no cards provided" }, { status: 400 });
  }
  if (rows.length > 5000) {
    return NextResponse.json(
      { ok: false, error: "too many cards in one request (max 5000)" },
      { status: 413 },
    );
  }

  const sourceFile = `api-ingest-${nowBkk().toISOString().replace(/[:.]/g, "-")}.json`;
  const result = parseCardsJson(rows, sourceFile);
  const { imported, matched } = await persistCards(result.cards);
  const skipped = result.stats.total - imported - matched;

  return NextResponse.json(
    {
      ok: true,
      sourceFile,
      imported,
      matched,
      skipped,
      stats: result.stats,
      errors: result.errors,
      warnings: result.warnings,
    },
    { status: 201 },
  );
}
