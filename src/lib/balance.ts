import type { CardAmount } from "./csv";

// ---------------------------------------------------------------------------
// Card balance model.
//
// Every card has a starting balance = its `amount`:
//   - a number  → a real balance (e.g. 5.25). Spent down by each charge.
//   - "unlim"   → infinite (draws on a shared account, never depletes).
//   - null      → untagged/legacy; treated as single-use (usable until it has
//                 any live charge, then done).
//
// A schedule CONSUMES balance while it's live — pending, processing, or a
// successful fire. A FAILED fire released no money, so it frees its reservation.
// `committed` is the sum of the fire-plan prices of a card's live schedules;
// `remaining = start - committed`. Nothing is stored — this is always derived
// from the schedules, so it can't drift.
// ---------------------------------------------------------------------------

/** True when a schedule is holding balance (pending / processing / fired-ok). */
export function scheduleConsumesBalance(status: string, success: boolean): boolean {
  return status === "pending" || status === "processing" || (status === "fired" && success);
}

export type CardBalanceView = {
  isUnlimited: boolean;
  /** Starting balance. Infinity for unlimited, null when untagged/unknown. */
  start: number | null;
  /** Sum of live charge prices against the card. */
  committed: number;
  /** start − committed. Infinity for unlimited, null when start is unknown. */
  remaining: number | null;
  /** committed exceeds the starting balance (over-scheduled) — a flag, not a block. */
  overBalance: boolean;
};

const EPS = 1e-9; // float tolerance for money comparisons

/** Derive a card's balance view from its starting amount and the total of its
 *  live charge prices. Pure. */
export function cardBalance(amount: CardAmount, committed: number): CardBalanceView {
  if (amount === "unlim") {
    return { isUnlimited: true, start: Infinity, committed, remaining: Infinity, overBalance: false };
  }
  if (typeof amount === "number") {
    return {
      isUnlimited: false,
      start: amount,
      committed,
      remaining: amount - committed,
      overBalance: committed > amount + EPS,
    };
  }
  // Untagged (null): unknown balance → single-use. "Remaining" is unknown.
  return { isUnlimited: false, start: null, committed, remaining: null, overBalance: false };
}

/** Can this card still take a charge? Unlimited: always. Numbered: some balance
 *  left. Untagged: only while nothing is committed (single-use). The
 *  once-per-campaign guard for unlimited cards is handled at the query level
 *  (it needs the flow), not here. */
export function cardIsUsable(view: CardBalanceView, amount: CardAmount): boolean {
  if (amount === "unlim") return true;
  if (amount === null) return view.committed <= EPS;
  return (view.remaining ?? 0) > EPS;
}
