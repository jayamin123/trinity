"use server";
import { db } from "@/lib/db";
import { parseCardsCsv } from "@/lib/csv";
import { saveUploadedCsv } from "@/lib/files";
import { nowBkk } from "@/lib/bkk";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function uploadCsv(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const text = await file.text();
  const filename = await saveUploadedCsv(file.name || "upload.csv", text);
  const result = parseCardsCsv(text, filename);

  // Insert by identity_key, deduped against what's already in the DB. We do this
  // in a handful of BATCHED queries instead of 2 queries per card — at 1k+ cards
  // the old per-row loop was both glacial and blew past the Worker subrequest cap.
  //
  // D1 caps SQL variables per query, so both the existence check and the inserts
  // are chunked to stay well under that limit. (SQLite/D1 createMany has no
  // skipDuplicates, so we pre-filter existing keys ourselves.)
  const READ_CHUNK = 90;  // 1 var per key
  const WRITE_CHUNK = 15; // ~5 cols per row

  const allKeys = result.cards.map(c => c.identityKey);
  const existingKeys = new Set<string>();
  for (let i = 0; i < allKeys.length; i += READ_CHUNK) {
    const found = await db.card.findMany({
      where: { identityKey: { in: allKeys.slice(i, i + READ_CHUNK) } },
      select: { identityKey: true },
    });
    for (const f of found) existingKeys.add(f.identityKey);
  }

  // New cards only, also deduped within this file by identity_key.
  const seenInBatch = new Set<string>();
  const createdAt = nowBkk();
  const toInsert = result.cards
    .filter(c => !existingKeys.has(c.identityKey))
    .filter(c => (seenInBatch.has(c.identityKey) ? false : (seenInBatch.add(c.identityKey), true)))
    .map(c => ({ ...c, createdAt }));

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += WRITE_CHUNK) {
    const res = await db.card.createMany({ data: toInsert.slice(i, i + WRITE_CHUNK) });
    imported += res.count;
  }

  const alreadyExisted = result.cards.length - toInsert.length;
  const skipped = result.stats.total - imported - alreadyExisted;
  revalidatePath("/cards");
  redirect(
    `/cards?uploaded=${encodeURIComponent(filename)}` +
    `&imported=${imported}&matched=${alreadyExisted}&skipped=${skipped}`,
  );
}
