/**
 * Post-build patch: inject a `scheduled()` handler into .open-next/worker.js
 * so Cloudflare Cron Triggers can drive the tick. OpenNext's generated worker
 * only exports `default { fetch }`, which makes the cron error every minute
 * with "Handler does not export a scheduled() function".
 *
 * Runs after `opennextjs-cloudflare build`. Idempotent.
 */
import fs from "node:fs";
import path from "node:path";

const WORKER = path.resolve(".open-next/worker.js");
const SCHEDULED_HANDLER = `
    async scheduled(event, env, ctx) {
        const url = "https://worker.invalid/api/tick";
        const request = new Request(url, { method: "GET" });
        try {
            const response = await this.fetch(request, env, ctx);
            if (!response.ok) {
                console.error("[Trinity-flows cron] /api/tick returned", response.status);
            }
        } catch (err) {
            console.error("[Trinity-flows cron] error:", err);
        }
    },
`;

const src = fs.readFileSync(WORKER, "utf8");
if (src.includes("async scheduled(")) {
  console.log("worker.js already has scheduled() — skipping");
  process.exit(0);
}

// Inject right before the final closing `};` of the `export default { ... }` block.
const closingIdx = src.lastIndexOf("};");
if (closingIdx === -1) throw new Error("Could not find closing '};' of export default in worker.js");

const patched = src.slice(0, closingIdx) + SCHEDULED_HANDLER + src.slice(closingIdx);
fs.writeFileSync(WORKER, patched);
console.log("Patched .open-next/worker.js with scheduled() handler");
