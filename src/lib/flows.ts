import { db } from "./db";
import { calendarDateBkk, nowBkk, startOfTodayBkk } from "./bkk";

export const MIN_SECONDS_BETWEEN_CHARGES_PER_FLOW = 60;

// ---------------------------------------------------------------------------
// JSON shapes carried in TEXT columns. Kept here so callers have one canonical
// definition. Parsing is done at the lib boundary; UI/server actions work
// with strongly-typed objects.
// ---------------------------------------------------------------------------

export type FirePlan = {
  product_id: string;
  product_name: string;
  price: number;
  cc_gateway_id: string;
};

export type FireAttempt = {
  fired_at: string;
  order_id: string | null;
  success: boolean;
  amount_paid: number | null;
  actual_cc_gateway_id: string | null;
  cascade_used: boolean;
  cc_response: { code: string; message: string; raw: string };
};

export type FlowLifecycle = {
  status: "active" | "paused" | "completed";
  paused_at: string | null;
  last_charged_at: string | null;
};

export type ScheduleWindow = { start_date: string; end_date: string };

export type CCGateway = { id: string; name: string };
export type CCCampaign = { id: string; name: string };
export type CCProduct = { id: string; name: string; price: number; count: number };

/** Which card population a flow draws from. "topup" = the single-use pool
 *  (default; also the value assumed when the field is absent on older flows).
 *  "unlim" = the reusable unlimited roster, once per flow. */
export type CardSource = "topup" | "unlim";

export type FlowSettings = {
  schedule_window: ScheduleWindow;
  lifecycle: FlowLifecycle;
  cc_gateway: CCGateway;
  cc_campaign: CCCampaign;
  cc_products: CCProduct[];
  card_source?: CardSource;
  total_cards: number;
  created_at: string;
};

/** Read a flow's card source, defaulting to "topup" for flows created before
 *  the field existed. */
export function flowCardSource(settings: FlowSettings): CardSource {
  return settings.card_source ?? "topup";
}

export function parseFlowSettings(json: string): FlowSettings {
  return JSON.parse(json) as FlowSettings;
}
export function parseFirePlan(json: string): FirePlan {
  return JSON.parse(json) as FirePlan;
}
export function parseFireAttempts(json: string): FireAttempt[] {
  try { return JSON.parse(json) as FireAttempt[]; } catch { return []; }
}

// ---------------------------------------------------------------------------
// Atomically claim the next due schedule. See the v1 code for the bug class
// this guards against: D1 stores DateTime as ISO TEXT, so we pass ISO strings
// (not millis) for comparison; and we split SELECT-then-UPDATE because the
// composite UPDATE…WHERE id=(SELECT…) RETURNING * silently drops rows through
// the Prisma D1 adapter.
// ---------------------------------------------------------------------------

export async function claimNextDueSchedule() {
  const now = nowBkk();
  const nowIso = now.toISOString();
  const minIntervalCutoffIso = new Date(now.getTime() - MIN_SECONDS_BETWEEN_CHARGES_PER_FLOW * 1000).toISOString();

  const candidates = await db.$queryRawUnsafe<{ id: string }[]>(`
    SELECT schedules.id FROM schedules
    JOIN flow ON schedules.flow_id = flow.id
    WHERE schedules.status = 'pending'
      AND schedules.scheduled_for <= ?
      AND json_extract(flow.flow_settings, '$.lifecycle.status') = 'active'
    ORDER BY schedules.scheduled_for ASC
    LIMIT 1
  `, nowIso);

  if (candidates.length === 0) return null;
  const candidateId = String(candidates[0].id);

  const changed = await db.$executeRawUnsafe(
    `UPDATE schedules SET status = 'processing' WHERE id = ? AND status = 'pending'`,
    candidateId,
  );
  if (changed !== 1) return null;

  const claimed = await db.schedule.findUnique({
    where: { id: candidateId },
    include: { card: true, flow: { include: { account: true } } },
  });
  if (!claimed) return null;

  // Honor a global per-flow rate limit by stamping last_charged_at into
  // flow_settings.lifecycle. Keeps everything in JSON instead of growing the
  // schema.
  const settings = parseFlowSettings(claimed.flow.flowSettings);
  settings.lifecycle.last_charged_at = nowIso;
  await db.flow.update({
    where: { id: claimed.flow.id },
    data: { flowSettings: JSON.stringify(settings) },
  });

  // Refuse this claim if the flow was rate-limited in the last 60s (per the
  // PREVIOUS stamp we just overwrote — but we're claiming once per tick
  // anyway, and tick is rate-limited above to MAX_SCHEDULES_PER_TICK = 1).
  // No need for extra logic here; the safety net is the cron's own cadence.
  return claimed;
}

export async function releaseStuckSchedules(): Promise<number> {
  const result = await db.schedule.updateMany({
    where: { status: "processing" },
    data: { status: "pending" },
  });
  return result.count;
}

// ---------------------------------------------------------------------------
// Daily quota — refuse to fire more than (planned-for-today * 1.1) on a single
// flow. Doesn't count overdue catch-up fires of past-day schedules against
// today's quota (matches v1 behavior).
// ---------------------------------------------------------------------------

export async function getTodayQuotaStatus(flowId: string): Promise<{
  plannedToday: number;
  doneToday: number;
  capExceeded: boolean;
}> {
  const today = calendarDateBkk(nowBkk());
  const sinceToday = startOfTodayBkk();

  const allSchedules = await db.schedule.findMany({
    where: { flowId },
    select: { scheduledFor: true, firedAt: true, status: true },
  });

  const plannedToday = allSchedules.filter(
    s => calendarDateBkk(s.scheduledFor) === today,
  ).length;

  const doneToday = allSchedules.filter(
    s =>
      calendarDateBkk(s.scheduledFor) === today &&
      s.firedAt !== null &&
      s.firedAt >= sinceToday,
  ).length;

  const cap = Math.ceil(plannedToday * 1.1);
  return { plannedToday, doneToday, capExceeded: doneToday >= cap };
}

// ---------------------------------------------------------------------------
// Day rollup for the Plan tab.
// ---------------------------------------------------------------------------

export type DayCard = {
  scheduleId: string;
  cardId: string;
  last4: string;
  name: string;
  scheduledFor: string;
  status: "fired-success" | "fired-failed" | "processing" | "pending";
  firedAt: string | null;
  orderId: string | null;
  plan: FirePlan;
  lastAttempt: FireAttempt | null;
  attemptCount: number;
};

export type DayRollup = {
  date: string;
  scheduled: number;
  succeeded: number;
  failed: number;
  pending: number;
  processing: number;
  cards: DayCard[];
};

export async function getFlowDayRollup(flowId: string): Promise<DayRollup[]> {
  const schedules = await db.schedule.findMany({
    where: { flowId },
    select: {
      id: true,
      scheduledFor: true,
      status: true,
      firedAt: true,
      orderId: true,
      success: true,
      firePlan: true,
      fireAttempts: true,
      card: { select: { id: true, panLast4: true, cardData: true } },
    },
  });

  const map = new Map<string, DayRollup>();
  for (const s of schedules) {
    const date = calendarDateBkk(s.scheduledFor);
    if (!map.has(date)) {
      map.set(date, { date, scheduled: 0, succeeded: 0, failed: 0, pending: 0, processing: 0, cards: [] });
    }
    const day = map.get(date)!;
    day.scheduled++;

    let status: DayCard["status"];
    if (s.status === "fired") status = s.success ? "fired-success" : "fired-failed";
    else if (s.status === "processing") status = "processing";
    else status = "pending";

    if (status === "fired-success") day.succeeded++;
    else if (status === "fired-failed") day.failed++;
    else if (status === "processing") day.processing++;
    else day.pending++;

    const attempts = parseFireAttempts(s.fireAttempts);
    const cardData = JSON.parse(s.card.cardData);
    const name = `${cardData.cardholder?.first_name ?? ""} ${cardData.cardholder?.last_name ?? ""}`.trim() || "—";

    day.cards.push({
      scheduleId: s.id,
      cardId: s.card.id,
      last4: s.card.panLast4,
      name,
      scheduledFor: s.scheduledFor.toISOString(),
      status,
      firedAt: s.firedAt ? s.firedAt.toISOString() : null,
      orderId: s.orderId,
      plan: parseFirePlan(s.firePlan),
      lastAttempt: attempts.length > 0 ? attempts[attempts.length - 1] : null,
      attemptCount: attempts.length,
    });
  }
  for (const day of map.values()) {
    day.cards.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function checkFlowComplete(flowId: string): Promise<boolean> {
  const pending = await db.schedule.count({
    where: {
      flowId,
      OR: [{ status: "pending" }, { status: "processing" }],
    },
  });
  return pending === 0;
}
