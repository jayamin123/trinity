# Trinity Flows — Ledger-V2 Rebuild · Status & Plan

Branch: `rebuild/ledger-v2`. Overnight autonomous build. **Live system untouched.**

## 🔒 Safety invariants (never violate)
- New deployment worker name = **`trinity-flows-2`** (never `trinity-flows`) → cannot overwrite live.
- `wrangler.flows2.jsonc` has **NO `triggers.crons`** → the new worker cannot fire.
- `FIRING_ENABLED="0"` env guard in the charge path (second layer).
- The **2,495 pending schedules** copied into the new DB must NEVER fire. Guaranteed by no-cron.
- Test fires (if ever): one recent slash card only, logged to `TEST-FIRES.log`. None done so far.

## ✅ STEP 1 — DONE & VERIFIED (database)
New D1 **`trinity-flows-2`** = `c71c8728-c95c-47fa-a37f-fa4c4df4731b` (Accotta, APAC).

1. **Exact copy** of live `trinity-flows` (04ada44c) via export→import. Byte-level parity verified
   (fire_attempts blob bytes identical: 1,524,753 both sides).
2. **Ledger migration applied** (`d1-migrations/ledger-v2/gen-migration.mjs` → `migrate-v2.sql`):
   blob tables renamed `z_legacy_*` (kept as backup); clean columnar + ledger schema created.
3. **Verified integrity:**
   | metric | value |
   |---|---|
   | cards | 2500 (1000 unlimited, all 2500 have email) |
   | flows / flow_products | 6 / 3013 (matches legacy cc_products sum) |
   | schedules | 2892 (pending 2495, done 397, processing 0) |
   | transactions (ledger) | 400 (397 success, 3 fail = the email declines) |
   | balance | sum_remaining = 0, **0 negative** (topup spent to $0, no over-schedule) |
   | spot-check | Leslie Ross: $5.25→$0, 1 schedule, 1 tx ✓ |

The new schema (see `prisma/schema.prisma`): `cards` (columnar + denormalized `remaining_balance`),
`flows` + `flow_products`, `schedules` (mutable intent + status pending|processing|done),
`transactions` (append-only ledger). `accounts`/`admin_users` reused as-is.

## 🚧 STEP 2 — IN PROGRESS (clean backend + UI on the new DB)

### Target architecture (clean, low-abstraction, 3 layers)
```
route handler (src/app/api/**/route.ts)  →  domain service (src/server/*.ts)  →  Prisma (src/lib/db.ts)
frontend page/component  →  thin api-client (src/lib/api.ts)  →  the API endpoints below
```
- **Primitives reused as-is:** `src/lib/crypto.ts` (AES), `src/lib/bkk.ts` (BKK time), `src/lib/auth.ts` (JWT), `src/lib/checkoutchamp.ts` (CC integration), `src/lib/db.ts` (Prisma D1).
- **Rewritten for the ledger model:** balance (now reads `remaining_balance` column), cards availability (`WHERE remaining_balance>0` or unlimited), flows/schedule services, and firing writes a `transactions` row (but firing is DISABLED here).

### Clean API contract (what the UI calls — build these)
- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- **Cards:** `GET /api/cards` (filters: tab/balance/source/flow), `POST /api/cards` (ingest, bearer), `GET /api/cards/:id`, `POST /api/cards/:id/reveal`
- **Flows:** `GET /api/flows`, `POST /api/flows`, `GET /api/flows/:id`, `PATCH /api/flows/:id`, `DELETE /api/flows/:id`, `POST /api/flows/:id/pause`, `POST /api/flows/:id/resume`, `POST /api/flows/:id/cards` (add cards), `GET /api/flows/:id/schedule` (day rollup)
- **Schedules:** `PATCH /api/schedules/:id`, `DELETE /api/schedules/:id`, `POST /api/schedules/:id/retry`
- **Logs (transactions):** `GET /api/logs` (global, filters flow/product/amount/mid/cascade/message), `GET /api/flows/:id/logs`
- **CheckoutChamp:** `GET /api/cc/gateways`, `GET /api/cc/campaigns`, `GET /api/cc/products?campaignId=`, `POST /api/flows/:id/refresh-products`
- **Settings:** `GET /api/settings`, `PUT /api/settings`, `POST /api/settings/test`
- **Tick:** `POST /api/tick` → **DISABLED** (returns `{disabled:true}` when `FIRING_ENABLED!=="1"`); no cron trigger.

### Frontend features to carry over (parity + the Logs redesign)
Dashboard · Cards (pool grid + upload + card modal + reveal) · Flows list · New Flow builder
(gateway/campaign/products + shaped schedule roll) · Flow detail (Schedule tab with When/Only-failed
filters + inline edit/delete; **Logs tab** reading transactions) · **Activity→Logs** global page
(the premium redesign, reads the ledger — attempts never disappear on retry) · Settings · Login.

### Resume plan (ordered)
1. `src/lib/db.ts` → point at new schema; keep crypto/bkk/auth/checkoutchamp.
2. `src/server/balance.ts` + `cards.ts` (availability via `remaining_balance`).
3. `src/server/flows.ts`, `schedules.ts`, `transactions.ts` (ledger reads/writes; firing guarded).
4. API route handlers per the contract above.
5. `src/lib/api.ts` thin client; refactor pages to call it; build the Logs redesign.
6. Build → deploy to flows2 (`npm run cf:build && wrangler deploy -c wrangler.flows2.jsonc`) → Playwright end-to-end test (login=admin@accotta.com/asdf1234) → iterate.
7. Push branch; open PR.

### Deploy/verify
- Build+deploy: `npm run cf:build && npx wrangler deploy -c wrangler.flows2.jsonc` (from repo).
- D1 (new DB): run from `C:\tmp`, `-c C:/tmp/trinity/wrangler.flows2.jsonc`.
- URL: `flows2.accotta.me` (fallback `trinity-flows-2.<subdomain>.workers.dev`).
- ENCRYPTION_KEY not set on flows2 (write-only, can't copy) → migrated cards/CC creds won't decrypt
  → flows2 **cannot charge** (bonus safety). To enable later: `wrangler secret put ENCRYPTION_KEY --name trinity-flows-2`.

### Migration artifacts
`d1-migrations/ledger-v2/gen-migration.mjs` (generator). Working copies + dumps in `C:\tmp\trinity2-work\`
(raw-*.json, dump-full.sql, migrate-v2.sql). To re-run migration: re-export blobs → `node gen-migration.mjs` → apply `migrate-v2.sql`.
