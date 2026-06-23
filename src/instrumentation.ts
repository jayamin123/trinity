/**
 * On Cloudflare Workers, this file is a no-op.  Cron Triggers (`scheduled()`)
 * drive the tick, and there are no long-running processes to start.
 *
 * (Trinity is now Cloudflare-only — there is no setInterval in production
 * or local-with-`wrangler dev`.)
 */
export async function register() {
  // intentionally empty
}
