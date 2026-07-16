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
// Balance-based availability (see lib/balance.ts for the model). A card is
// available to a flow when ANY of:
//   - unlimited AND not already scheduled in THIS flow (once per campaign), OR
//   - untagged  AND holding no live charge (single-use), OR
//   - numbered  AND remaining balance (start − live charge prices) > 0.
// "Live" = pending / processing / fired-succeeded (a failed fire frees its
// reservation). Raw SQL because amount lives inside the card_data JSON blob.
// The single `?` inside the HAVING is the flowId — pass "" for a brand-new flow.
// ---------------------------------------------------------------------------
const LIVE_CHARGE = `(s.status IN ('pending','processing') OR (s.status = 'fired' AND s.success = 1))`;
const AVAILABLE_HAVING = `
  HAVING
    ( json_extract(c.card_data,'$.amount') = 'unlim'
      AND SUM(CASE WHEN s.flow_id = ? THEN 1 ELSE 0 END) = 0 )
    OR
    ( json_extract(c.card_data,'$.amount') IS NULL
      AND COALESCE(SUM(CASE WHEN ${LIVE_CHARGE} THEN 1 ELSE 0 END), 0) = 0 )
    OR
    ( typeof(json_extract(c.card_data,'$.amount')) IN ('integer','real')
      AND CAST(json_extract(c.card_data,'$.amount') AS REAL)
          - COALESCE(SUM(CASE WHEN ${LIVE_CHARGE} THEN CAST(json_extract(s.fire_plan,'$.price') AS REAL) ELSE 0 END), 0)
          > 0 )`;
const AVAILABLE_SELECT = `SELECT c.id FROM cards c LEFT JOIN schedules s ON s.card_id = c.id GROUP BY c.id ${AVAILABLE_HAVING}`;

/** Cards that still have balance for a flow, oldest first. Pass the flow's id so
 *  an unlimited card already in that flow is excluded; omit ("") for createFlow. */
export async function pullAvailableForFlow(limit: number, flowId: string = ""): Promise<{ id: string }[]> {
  return db.$queryRawUnsafe<{ id: string }[]>(
    `${AVAILABLE_SELECT} ORDER BY c.created_at ASC LIMIT ?`,
    flowId, limit,
  );
}

/** How many cards are available to a flow (same rule as pullAvailableForFlow). */
export async function countAvailableForFlow(flowId: string = ""): Promise<number> {
  const r = await db.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM (${AVAILABLE_SELECT})`,
    flowId,
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
