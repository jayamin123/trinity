import type { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

// In the Cloudflare Worker bundle we MUST use the wasm variant — Workers has
// no native engine. In `next dev` (Node) the wasm variant fails to boot
// ("wasm module was unexpectedly undefined"), so fall back to the regular
// client. process.env.CLOUDFLARE_WORKER is set in wrangler.jsonc vars.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PrismaClientCtor: new (args: { adapter: PrismaD1 }) => PrismaClient = process.env.CLOUDFLARE_WORKER
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require("@prisma/client/wasm").PrismaClient
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require("@prisma/client").PrismaClient;

/**
 * Trinity database client.
 *
 * Cloudflare Workers: Prisma D1 adapter (uses env.DB binding).
 * Local dev with `wrangler dev`: same — Miniflare provides an emulated D1.
 *
 * `globalThis.__trinity_env.DB` is set by the request-context boot code in
 * the Worker handler so the proxy can lazily resolve it the first time db.x.y()
 * is called.
 */

declare global {
  // eslint-disable-next-line no-var
  var __trinity_d1_env: { DB?: D1Database } | undefined;
}

let _client: PrismaClient | null = null;

function buildClient(): PrismaClient {
  // Get D1 binding from the Cloudflare request context
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCloudflareContext } = require("@opennextjs/cloudflare") as typeof import("@opennextjs/cloudflare");
  const { env } = getCloudflareContext();
  const db1 = (env as unknown as { DB?: D1Database }).DB;
  if (!db1) throw new Error("D1 database binding 'DB' is not available in this context");
  return new PrismaClientCtor({ adapter: new PrismaD1(db1) });
}

export const db = new Proxy({} as PrismaClient, {
  get(_, prop, receiver) {
    if (!_client) _client = buildClient();
    return Reflect.get(_client, prop, receiver);
  },
});
