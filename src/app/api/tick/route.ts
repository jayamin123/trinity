import { tick, recoverFromCrash, runSchedulerSafetyCheck } from "@/lib/tick";

/**
 * Trigger endpoint for the scheduler.  Hit every minute by Cloudflare Cron
 * Triggers in production, and by the local node-cron loop in `instrumentation.ts`
 * in dev mode.
 *
 * Each invocation:
 *   1. Runs the startup safety check (refuses to run if SQL date comparison is
 *      broken — the bug we fixed on 2026-05-23 cannot silently return).
 *   2. Cleans up any stuck "processing" cards (crash recovery).
 *   3. Runs one tick (claims at most 1 card, charges it, records result).
 */
export async function POST() {
  try {
    await runSchedulerSafetyCheck();
  } catch (err) {
    const stack = err instanceof Error ? err.stack : "(no stack)";
    console.error("[Trinity tick] SAFETY CHECK FAILED:", err);
    console.error("[Trinity tick] STACK:", stack);
    return Response.json(
      { ok: false, error: "Safety check failed — refusing to tick", details: String(err), stack },
      { status: 503 },
    );
  }

  await recoverFromCrash();
  const result = await tick();
  return Response.json({ ok: true, ...result });
}

// Allow GET for manual triggering / health checks
export const GET = POST;
