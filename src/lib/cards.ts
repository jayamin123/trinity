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
