import { db } from "./db";
import { nowBkk } from "./bkk";
import type { ParsedCard } from "./csv";

export type PersistResult = {
  /** Rows newly inserted this call. */
  imported: number;
  /** Rows skipped because their identity_key already existed (in the DB or
   *  earlier in the same batch). */
  matched: number;
};

/**
 * Insert cards by identity_key, deduped against what's already in the DB and
 * within the batch itself. Shared by the CSV web upload and the JSON ingest API
 * so both behave identically.
 *
 * We do this in a handful of BATCHED queries instead of 2 queries per card — at
 * 1k+ cards the old per-row loop was both glacial and blew past the Worker
 * subrequest cap. D1 caps SQL variables per query, so both the existence check
 * and the inserts are chunked to stay well under that limit. (SQLite/D1
 * createMany has no skipDuplicates, so we pre-filter existing keys ourselves.)
 */
export async function persistCards(cards: ParsedCard[]): Promise<PersistResult> {
  const READ_CHUNK = 90;  // 1 var per key
  const WRITE_CHUNK = 15; // ~5 cols per row

  const allKeys = cards.map(c => c.identityKey);
  const existingKeys = new Set<string>();
  for (let i = 0; i < allKeys.length; i += READ_CHUNK) {
    const found = await db.card.findMany({
      where: { identityKey: { in: allKeys.slice(i, i + READ_CHUNK) } },
      select: { identityKey: true },
    });
    for (const f of found) existingKeys.add(f.identityKey);
  }

  // New cards only, also deduped within this batch by identity_key.
  const seenInBatch = new Set<string>();
  const createdAt = nowBkk();
  const toInsert = cards
    .filter(c => !existingKeys.has(c.identityKey))
    .filter(c => (seenInBatch.has(c.identityKey) ? false : (seenInBatch.add(c.identityKey), true)))
    .map(c => ({ ...c, createdAt }));

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += WRITE_CHUNK) {
    const res = await db.card.createMany({ data: toInsert.slice(i, i + WRITE_CHUNK) });
    imported += res.count;
  }

  return { imported, matched: cards.length - toInsert.length };
}
