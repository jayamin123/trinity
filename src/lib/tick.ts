import { db } from "./db";
import {
  claimNextDueSchedule, checkFlowComplete, getTodayQuotaStatus,
  releaseStuckSchedules, parseFlowSettings, parseFirePlan, parseFireAttempts,
  type FireAttempt,
} from "./flows";
import { chargeCard } from "./checkoutchamp";
import { calendarDateBkk, nowBkk } from "./bkk";

/** Hard ceiling: one schedule per tick. The cron runs every 60s, so this caps
 *  the whole worker at ~1 fire per minute regardless of how many flows have
 *  cards due. */
const MAX_SCHEDULES_PER_TICK = 1;

export async function tick(): Promise<{ processed: number; skipped: number }> {
  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < MAX_SCHEDULES_PER_TICK; i++) {
    const claimed = await claimNextDueSchedule();
    if (!claimed) break;

    // Daily quota tripwire. Overdue schedules (planned for a past day) bypass
    // the check; otherwise they would be permanently blocked once today's
    // quota was burned by other fires.
    const today = calendarDateBkk(nowBkk());
    const cardDay = calendarDateBkk(claimed.scheduledFor);
    const isOverdue = cardDay < today;

    if (!isOverdue) {
      const quota = await getTodayQuotaStatus(claimed.flowId);
      if (quota.capExceeded) {
        console.warn(`[Trinity-flows tick] SAFETY: flow ${claimed.flowId} exceeded daily quota (${quota.doneToday}/${quota.plannedToday}). Releasing schedule.`);
        await db.schedule.update({
          where: { id: claimed.id },
          data: { status: "pending" },
        });
        skipped++;
        continue;
      }
    }

    await processClaimedSchedule(claimed);
    processed++;
  }

  return { processed, skipped };
}

type ClaimedSchedule = NonNullable<Awaited<ReturnType<typeof claimNextDueSchedule>>>;

async function processClaimedSchedule(schedule: ClaimedSchedule): Promise<void> {
  const plan = parseFirePlan(schedule.firePlan);
  const cardData = JSON.parse(schedule.card.cardData);

  const flowSettings = parseFlowSettings(schedule.flow.flowSettings);
  const result = await chargeCard({
    account: {
      apiUrl: schedule.flow.account.apiUrl,
      loginId: schedule.flow.account.loginIdEncrypted,
      password: schedule.flow.account.passwordEncrypted,
    },
    plan: {
      ccCampaignId: flowSettings.cc_campaign.id,
      ccProductId: plan.product_id,
      productPrice: plan.price,
      ccGatewayId: plan.cc_gateway_id,
    },
    card: {
      panEncrypted: String(cardData.card.pan_encrypted),
      cvvEncrypted: String(cardData.card.cvv_encrypted),
      expMonth: String(cardData.card.exp_month),
      expYear: String(cardData.card.exp_year),
      firstName: String(cardData.cardholder.first_name),
      lastName: String(cardData.cardholder.last_name),
      address: String(cardData.billing_address.street),
      city: String(cardData.billing_address.city),
      state: String(cardData.billing_address.state),
      zipCode: String(cardData.billing_address.zip_code),
      phone: String(cardData.contact.phone),
      email: String(cardData.contact.email),
      ipAddress: String(cardData.contact.ip_address),
    },
  });

  const firedAt = nowBkk();
  const attempt: FireAttempt = {
    fired_at: firedAt.toISOString(),
    order_id: result.orderId ?? null,
    success: result.success,
    amount_paid: result.amountPaid ?? null,
    actual_cc_gateway_id: result.actualGatewayId ?? null,
    cascade_used: result.success
      && result.actualGatewayId != null
      && result.actualGatewayId !== plan.cc_gateway_id,
    cc_response: {
      code: result.responseCode ?? "",
      message: result.responseMessage ?? "",
      raw: result.rawResponse ?? "",
    },
  };

  const attempts = parseFireAttempts(schedule.fireAttempts);
  attempts.push(attempt);

  await db.schedule.update({
    where: { id: schedule.id },
    data: {
      status: "fired",
      firedAt,
      orderId: result.orderId ?? null,
      success: result.success,
      fireAttempts: JSON.stringify(attempts),
    },
  });

  if (await checkFlowComplete(schedule.flowId)) {
    const flow = await db.flow.findUnique({ where: { id: schedule.flowId } });
    if (flow) {
      const settings = parseFlowSettings(flow.flowSettings);
      settings.lifecycle.status = "completed";
      await db.flow.update({
        where: { id: flow.id },
        data: { flowSettings: JSON.stringify(settings) },
      });
    }
  }
}

export async function recoverFromCrash(): Promise<number> {
  const count = await releaseStuckSchedules();
  if (count > 0) console.log(`[Trinity-flows] Recovered ${count} stuck schedules on boot`);
  return count;
}

/** Stress-test the TEXT/INTEGER date comparison with literal strings only —
 *  no real schedule rows are touched. Verified passing on D1 with the
 *  Prisma adapter; refuses to start if SQLite's type coercion has shifted
 *  underneath us. */
export async function runSchedulerSafetyCheck(): Promise<void> {
  const nowIso = new Date().toISOString();

  const result = await db.$queryRawUnsafe<{ past_due: number; future_due: number }[]>(
    `SELECT
       CAST('1970-01-01T00:00:00.000Z' <= ? AS INTEGER) AS past_due,
       CAST('2099-12-31T23:59:59.000Z' <= ? AS INTEGER) AS future_due`,
    nowIso, nowIso,
  );

  const r = result[0];
  if (Number(r.past_due) !== 1) {
    throw new Error(
      `TRINITY SAFETY CHECK FAILED: a date 50+ years in the past does not compare <= now. ` +
      `Got past_due=${r.past_due} (expected 1). Refusing to start the scheduler.`,
    );
  }
  if (Number(r.future_due) !== 0) {
    throw new Error(
      `TRINITY SAFETY CHECK FAILED: a date 70+ years in the future compares <= now. ` +
      `Got future_due=${r.future_due} (expected 0). Refusing to start the scheduler.`,
    );
  }
}
