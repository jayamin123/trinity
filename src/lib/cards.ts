import { db } from "./db";
import type { Prisma } from "@prisma/client";
import type { CardAmount } from "./csv";

/** Pool = cards with NO schedule rows at all. Once a card has been scheduled
 *  anywhere, ever — it's used. Single-use semantic. */
export const POOL_WHERE: Prisma.CardWhereInput = {
  schedules: { none: {} },
};

export const IN_USE_WHERE: Prisma.CardWhereInput = {
  schedules: { some: {} },
};

export async function countCardsInPool(): Promise<number> {
  return db.card.count({ where: POOL_WHERE });
}

/** Pull up to `limit` pool cards (oldest first — FIFO). */
export async function pullCardsFromPool(limit: number) {
  return db.card.findMany({
    where: POOL_WHERE,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Source-aware pulls. A flow draws from one population (never mixed):
//   topup → the single-use pool, EXCLUDING unlimited cards (FIFO).
//   unlim → the reusable roster: unlimited cards not already in THIS flow.
// Both return `{ id }[]` — callers only need the id. Raw SQL because the
// amount lives inside the card_data JSON blob (no dedicated column).
// ---------------------------------------------------------------------------

/** Single-use pool, topup cards only (unlimited cards are reserved for the
 *  roster and never consumed here). Oldest first. */
export async function pullTopupFromPool(limit: number): Promise<{ id: string }[]> {
  return db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT c.id FROM cards c
     WHERE NOT EXISTS (SELECT 1 FROM schedules s WHERE s.card_id = c.id)
       AND COALESCE(json_extract(c.card_data,'$.amount'),'') != 'unlim'
     ORDER BY c.created_at ASC LIMIT ?`,
    limit,
  );
}

/** Unlimited roster available to a flow: unlim cards with no schedule in that
 *  flow (reusable across flows, once per flow). Omit flowId for a brand-new
 *  flow (nothing is in it yet). Oldest first. */
export async function pullUnlimForFlow(limit: number, flowId?: string): Promise<{ id: string }[]> {
  if (flowId) {
    return db.$queryRawUnsafe<{ id: string }[]>(
      `SELECT c.id FROM cards c
       WHERE json_extract(c.card_data,'$.amount') = 'unlim'
         AND NOT EXISTS (SELECT 1 FROM schedules s WHERE s.card_id = c.id AND s.flow_id = ?)
       ORDER BY c.created_at ASC LIMIT ?`,
      flowId, limit,
    );
  }
  return db.$queryRawUnsafe<{ id: string }[]>(
    `SELECT c.id FROM cards c
     WHERE json_extract(c.card_data,'$.amount') = 'unlim'
     ORDER BY c.created_at ASC LIMIT ?`,
    limit,
  );
}

/** Count of topup cards available in the single-use pool. */
export async function countTopupPool(): Promise<number> {
  const r = await db.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM cards c
     WHERE NOT EXISTS (SELECT 1 FROM schedules s WHERE s.card_id = c.id)
       AND COALESCE(json_extract(c.card_data,'$.amount'),'') != 'unlim'`,
  );
  return Number(r[0]?.n ?? 0);
}

/** Count of unlimited roster cards available (to a flow, if given). */
export async function countUnlimAvailable(flowId?: string): Promise<number> {
  const r = flowId
    ? await db.$queryRawUnsafe<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM cards c
         WHERE json_extract(c.card_data,'$.amount') = 'unlim'
           AND NOT EXISTS (SELECT 1 FROM schedules s WHERE s.card_id = c.id AND s.flow_id = ?)`,
        flowId,
      )
    : await db.$queryRawUnsafe<{ n: number }[]>(
        `SELECT COUNT(*) AS n FROM cards c WHERE json_extract(c.card_data,'$.amount') = 'unlim'`,
      );
  return Number(r[0]?.n ?? 0);
}

/** Human-facing fields flattened out of a card's `card_data` JSON blob.
 *  Excludes PAN/CVV — those stay encrypted and are revealed separately. */
export type CardFields = {
  name: string;
  expMonth: string;
  expYear: string;
  amount: CardAmount;
  sourceFile: string;
  createdAt: string;
  billing: { street: string; city: string; state: string; zipCode: string };
  contact: { phone: string; email: string; ipAddress: string };
};

/** Parse a `card_data` JSON blob into display fields. Used by both the card-
 *  detail and schedule-detail views so the flattening lives in one place. */
export function flattenCardData(cardDataJson: string): CardFields {
  const data = JSON.parse(cardDataJson);
  return {
    name: `${data.cardholder?.first_name ?? ""} ${data.cardholder?.last_name ?? ""}`.trim(),
    expMonth: String(data.card?.exp_month ?? ""),
    expYear: String(data.card?.exp_year ?? ""),
    amount: (data.amount ?? null) as CardAmount,
    sourceFile: String(data.source_file ?? ""),
    createdAt: String(data.created_at ?? ""),
    billing: {
      street: String(data.billing_address?.street ?? ""),
      city: String(data.billing_address?.city ?? ""),
      state: String(data.billing_address?.state ?? ""),
      zipCode: String(data.billing_address?.zip_code ?? ""),
    },
    contact: {
      phone: String(data.contact?.phone ?? ""),
      email: String(data.contact?.email ?? ""),
      ipAddress: String(data.contact?.ip_address ?? ""),
    },
  };
}
