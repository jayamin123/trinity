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

// A card belongs to exactly one "set": unlim (draws on a shared account), or
// balance (a numbered top-up card, OR an untagged single-use card). The picker
// in Add Cards / New Flow chooses which set to pull from so unlimited cards can
// never be scheduled into a balance flow by accident (and vice-versa).
export type CardSet = "balance" | "unlim" | "any";

//  unlim: not already scheduled in THIS flow (once per campaign). Only this
//  branch references the flowId `?`.
const UNLIM_BRANCH = `( json_extract(c.card_data,'$.amount') = 'unlim'
      AND SUM(CASE WHEN s.flow_id = ? THEN 1 ELSE 0 END) = 0 )`;
//  untagged: single-use, holding no live charge.
const UNTAGGED_BRANCH = `( json_extract(c.card_data,'$.amount') IS NULL
      AND COALESCE(SUM(CASE WHEN ${LIVE_CHARGE} THEN 1 ELSE 0 END), 0) = 0 )`;
//  numbered: remaining balance (start − live charge prices) > 0.
const NUMBERED_BRANCH = `( typeof(json_extract(c.card_data,'$.amount')) IN ('integer','real')
      AND CAST(json_extract(c.card_data,'$.amount') AS REAL)
          - COALESCE(SUM(CASE WHEN ${LIVE_CHARGE} THEN CAST(json_extract(s.fire_plan,'$.price') AS REAL) ELSE 0 END), 0)
          > 0 )`;

/** Availability SELECT for a card set. `usesFlowId` is true only when the unlim
 *  branch is present (the sole branch that references the flowId `?` param). */
function availableSelect(set: CardSet): { sql: string; usesFlowId: boolean } {
  const branches: string[] = [];
  const usesFlowId = set === "unlim" || set === "any";
  if (set === "unlim" || set === "any") branches.push(UNLIM_BRANCH);
  if (set === "balance" || set === "any") branches.push(UNTAGGED_BRANCH, NUMBERED_BRANCH);
  return {
    sql: `SELECT c.id FROM cards c LEFT JOIN schedules s ON s.card_id = c.id GROUP BY c.id HAVING ${branches.join("\n OR \n")}`,
    usesFlowId,
  };
}

/** Cards available to a flow from the given set, oldest first. Pass the flow's id
 *  so an unlimited card already in that flow is excluded; omit ("") for createFlow. */
export async function pullAvailableForFlow(limit: number, flowId: string = "", set: CardSet = "any"): Promise<{ id: string }[]> {
  const { sql, usesFlowId } = availableSelect(set);
  const params = usesFlowId ? [flowId, limit] : [limit];
  return db.$queryRawUnsafe<{ id: string }[]>(`${sql} ORDER BY c.created_at ASC LIMIT ?`, ...params);
}

/** How many cards are available to a flow from a set (same rule as pull). */
export async function countAvailableForFlow(flowId: string = "", set: CardSet = "any"): Promise<number> {
  const { sql, usesFlowId } = availableSelect(set);
  const params = usesFlowId ? [flowId] : [];
  const r = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*) AS n FROM (${sql})`, ...params);
  return Number(r[0]?.n ?? 0);
}

/** Available counts split by set — powers the "Pull from" picker. */
export async function countAvailableBySet(flowId: string = ""): Promise<{ balance: number; unlim: number }> {
  const [balance, unlim] = await Promise.all([
    countAvailableForFlow(flowId, "balance"),
    countAvailableForFlow(flowId, "unlim"),
  ]);
  return { balance, unlim };
}

/** Which set a flow is currently built from — used to default the picker. A flow
 *  with ANY schedule on an unlim card is an "unlim" flow; otherwise "balance". */
export async function flowCardSet(flowId: string): Promise<"balance" | "unlim"> {
  const r = await db.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM schedules s JOIN cards c ON c.id = s.card_id
     WHERE s.flow_id = ? AND json_extract(c.card_data,'$.amount') = 'unlim'`,
    flowId,
  );
  return Number(r[0]?.n ?? 0) > 0 ? "unlim" : "balance";
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
