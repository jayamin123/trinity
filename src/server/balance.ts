import { db } from "@/lib/db";

// Balance model for ledger-v2. The card row carries a denormalized
// `remainingBalance`, so availability is a single indexed column read instead of
// a GROUP BY over every schedule. Unlimited cards have null balance (infinite,
// but once per flow).

export type BalanceView = {
  isUnlimited: boolean;
  start: number | null;
  remaining: number | null;
  usable: boolean;
  overBalance: boolean;
  label: string;
};

export function balanceView(c: {
  isUnlimited: boolean;
  startBalance: number | null;
  remainingBalance: number | null;
}): BalanceView {
  if (c.isUnlimited) {
    return { isUnlimited: true, start: null, remaining: null, usable: true, overBalance: false, label: "Unlimited" };
  }
  const start = c.startBalance ?? 0;
  const remaining = c.remainingBalance ?? 0;
  return {
    isUnlimited: false,
    start,
    remaining,
    usable: remaining > 1e-6,
    overBalance: remaining < -1e-6,
    label: `$${remaining.toFixed(2)} of $${start.toFixed(2)}`,
  };
}

/** Reserve balance when a numeric-balance card is scheduled for `price`. No-op for unlimited. */
export async function reserve(cardId: string, price: number, isUnlimited: boolean): Promise<void> {
  if (isUnlimited || !price) return;
  await db.card.update({ where: { id: cardId }, data: { remainingBalance: { decrement: price } } });
}

/** Release a reservation (schedule deleted, or a fire permanently failed). No-op for unlimited. */
export async function release(cardId: string, price: number, isUnlimited: boolean): Promise<void> {
  if (isUnlimited || !price) return;
  await db.card.update({ where: { id: cardId }, data: { remainingBalance: { increment: price } } });
}
