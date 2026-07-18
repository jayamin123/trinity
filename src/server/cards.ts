import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { balanceView, type BalanceView } from "./balance";

// Card pool reads for the ledger-v2 schema (columnar cards + denormalized balance).

export type CardRow = {
  id: string;
  name: string;
  panLast4: string;
  email: string | null;
  sourceFile: string | null;
  balance: BalanceView;
  pending: number; // # pending schedules
  done: number; // # done schedules (fired)
  flowIds: string[];
};

/** Whole card pool with derived per-card schedule counts (2 flat queries, joined in JS). */
export async function listCards(): Promise<CardRow[]> {
  const [cards, schedules] = await Promise.all([
    db.card.findMany({ orderBy: { createdAt: "desc" } }),
    db.schedule.findMany({ select: { cardId: true, flowId: true, status: true } }),
  ]);
  const byCard = new Map<string, { pending: number; done: number; flows: Set<string> }>();
  for (const s of schedules) {
    let e = byCard.get(s.cardId);
    if (!e) byCard.set(s.cardId, (e = { pending: 0, done: 0, flows: new Set() }));
    e.flows.add(s.flowId);
    if (s.status === "pending" || s.status === "processing") e.pending++;
    else if (s.status === "done") e.done++;
  }
  return cards.map((c) => {
    const e = byCard.get(c.id);
    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      panLast4: c.panLast4,
      email: c.email,
      sourceFile: c.sourceFile,
      balance: balanceView(c),
      pending: e?.pending ?? 0,
      done: e?.done ?? 0,
      flowIds: e ? [...e.flows] : [],
    };
  });
}

/** One card with its schedules + transaction history (for the card modal). */
export async function getCard(id: string) {
  const card = await db.card.findUnique({ where: { id } });
  if (!card) return null;
  const [schedules, transactions] = await Promise.all([
    db.schedule.findMany({ where: { cardId: id }, orderBy: { scheduledFor: "asc" } }),
    db.transaction.findMany({ where: { cardId: id }, orderBy: { firedAt: "desc" } }),
  ]);
  return {
    id: card.id,
    name: `${card.firstName} ${card.lastName}`,
    panLast4: card.panLast4,
    expMonth: card.expMonth,
    expYear: card.expYear,
    email: card.email,
    phone: card.phone,
    address: [card.street, card.city, card.state, card.zipCode].filter(Boolean).join(", "),
    sourceFile: card.sourceFile,
    balance: balanceView(card),
    schedules,
    transactions,
  };
}

/** Decrypt PAN + CVV. Requires ENCRYPTION_KEY. Session-gated by the route. */
export async function revealCard(id: string): Promise<{ pan: string; cvv: string } | null> {
  const card = await db.card.findUnique({ where: { id }, select: { panEnc: true, cvvEnc: true } });
  if (!card) return null;
  return { pan: decrypt(card.panEnc), cvv: decrypt(card.cvvEnc) };
}

/** Available cards for a flow: usable balance and not already scheduled in this flow
 *  (unlimited = once per flow; numeric = while remaining_balance > 0). */
export async function availableForFlow(flowId: string, limit: number) {
  const used = await db.schedule.findMany({ where: { flowId }, select: { cardId: true } });
  const usedIds = new Set(used.map((u) => u.cardId));
  const cards = await db.card.findMany({
    where: { OR: [{ isUnlimited: true }, { remainingBalance: { gt: 0 } }] },
    orderBy: { createdAt: "asc" },
  });
  return cards.filter((c) => !usedIds.has(c.id)).slice(0, limit);
}
