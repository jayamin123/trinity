# Trinity Flows — How it works

Upload card CSVs, schedule charges across multiple days through CheckoutChamp, watch results live. Deployed on Cloudflare (Worker + D1 + R2 + Cron).

## What it does, in one paragraph

You upload a CSV of cards into a **pool**. You create a **flow** that takes N cards from the pool, generates a randomized schedule of charge times across a date range, and saves one **schedule** row per intended charge. A background **tick** runs every minute, claims any schedule whose time has arrived, and charges the card through CheckoutChamp. Every attempt is appended to that schedule's fire history. You can pause, resume, edit a pending schedule, and see exactly what ran, what's queued, and what failed.

## First-time setup

1. **Settings** (avatar menu → Settings) → enter CheckoutChamp credentials → **Save** → **Test connection** (hits `/purchase/query/`).
2. **Cards** → upload a CSV (Papa-parse + Luhn check + dedup on identity key).
3. **Flows** → **+ New flow** → pick a Gateway + CC Campaign + Product, set price, card count, and date range → **Generate preview** (🎲 reroll the per-day split) → **Create flow**.

The scheduler is already running. When a scheduled time arrives the card is charged; results appear in the flow's **Activity** tab and the global **Activity** log.

## The schedule

Each card gets a `scheduled_for` timestamp at flow-create time — no time math at runtime, the scheduler just claims whatever is due.

- **Distribution:** total split randomly across days (each day jittered ±25% of the average), total preserved — see `randomDailyCounts`.
- **Within a day:** stratified random — the firing window is divided into N equal slots, one random moment picked per slot → spread evenly, no clusters (`stratifiedTimesForDay`).
- **Firing window:** BKK wall-clock **09:00–23:00**, never crosses midnight (`lib/window.ts` — change the two hour constants to widen/narrow).

## Pause / resume

- **Pause:** `lifecycle.status = 'paused'` — the claim query skips the flow; queued schedules stay put.
- **Resume:** flips back to `active`; unfired schedules fire when their time comes.

## What gets stored where (5 tables, rich data in one JSON column each)

| Thing | Table.column | Form |
|---|---|---|
| Admin password | `admin_users.password_hash` | bcrypt hash |
| CheckoutChamp login/password | `accounts.login_id_encrypted` / `.password_encrypted` | AES-256-GCM |
| Card identity + PAN/CVV | `cards.card_data` (JSON; pan/cvv fields encrypted) | AES-256-GCM inside JSON |
| Flow config (window, lifecycle, gateway, campaign, products) | `flow.flow_settings` | JSON (IDs + display names) |
| Intended fire snapshot | `schedules.fire_plan` | JSON, never changes after create |
| Every charge attempt | `schedules.fire_attempts` | append-only JSON array |
| Charge verdict | `schedules.status` + `.success` | `pending → processing → fired`; `success` ticks only on a successful fire |

All foreign keys are `RESTRICT` — once flows/schedules exist they're permanent (no deleting charge history).

## The whole pipeline

```
CSV → parseCardsCsv()  →  cards rows (deduped on identity_key)
                              │
                              ▼
        pull N cards + generateSchedule(N, startDate, endDate) at flow create
                              │
                              ▼
              schedules rows: scheduled_for + fire_plan (status=pending)
                              │
                              ▼
        cron every 60s → /api/tick (Cloudflare)  /  setInterval (local dev)
                              │
                              ▼
                  claimNextDueSchedule()  (atomic SELECT then UPDATE)
                              │
                              ▼
                  daily-quota tripwire (skip if today's cap exceeded)
                              │
                              ▼
                  chargeCard()  → CheckoutChamp /order/import/
                              │
                              ▼
        schedule.status='fired', success set, attempt appended to fire_attempts
```

A hard ceiling of **one schedule per tick** caps the whole worker at ~1 fire/minute (`MAX_SCHEDULES_PER_TICK` in `lib/tick.ts`).

## How to read the code

```
src/
├── app/
│   ├── login/                ← /login page + signIn action
│   ├── api/tick/route.ts     ← cron-triggered endpoint (Cloudflare)
│   └── (app)/                ← auth-gated section
│       ├── layout.tsx        ← AppShell (sidebar + topbar + clock)
│       ├── page.tsx          ← Dashboard
│       ├── settings/         ← CC credentials (save + test connection)
│       ├── cards/            ← upload + pool table + CardModal
│       ├── flows/
│       │   ├── page.tsx      ← list
│       │   ├── new/          ← create form with preview
│       │   └── [id]/         ← detail: Plan / Activity tabs + fire/edit modals
│       └── activity/         ← global charge log
├── lib/
│   ├── db.ts                 ← Prisma client (D1 in prod, SQLite locally)
│   ├── auth.ts               ← signIn / signOut / getCurrentUser
│   ├── crypto.ts             ← encrypt / decrypt (AES-256-GCM)
│   ├── bkk.ts                ← nowBkk + BKK calendar-day helpers
│   ├── window.ts             ← firing-window hour constants
│   ├── checkoutchamp.ts      ← testConnection, list gateways/campaigns/products, chargeCard
│   ├── csv.ts                ← parseCardsCsv (Papa-parse + Luhn + dedup)
│   ├── files.ts              ← saveUploadedCsv (R2)
│   ├── cards.ts              ← pool helpers
│   ├── schedule.ts           ← randomDailyCounts + stratifiedTimesForDay
│   ├── flows.ts              ← JSON shapes, claimNextDueSchedule, quotas, day rollup
│   └── tick.ts               ← tick() + processClaimedSchedule()
└── components/
    ├── ThemeRegistry.tsx     ← MUI ThemeProvider
    ├── AppShell.tsx          ← sidebar + topbar
    ├── BkkClock.tsx          ← live BKK clock in the sidebar
    └── modal-shared.tsx      ← reusable modal building blocks (used by 5 modals)
```

Every feature is **one folder**. To understand charging, read `lib/tick.ts` + the helpers it calls.

## Cloudflare architecture

- **DB:** D1 via the Prisma D1 adapter (schema identical to local SQLite). D1 stores `DateTime` as ISO **TEXT** — `claimNextDueSchedule` passes ISO strings (not millis) for comparison, and splits SELECT-then-UPDATE because the composite `UPDATE…WHERE id=(SELECT…)` silently drops rows through the adapter.
- **Files:** R2 bucket `trinity-uploads` (`lib/files.ts`).
- **Scheduler:** Cron Trigger (`* * * * *`) → `/api/tick`. Cloudflare-only — there is no local `setInterval` (`instrumentation.ts` is a no-op); in `next dev` you can trigger a tick by hitting `/api/tick` manually.
- **Secrets:** `JWT_SECRET` and `ENCRYPTION_KEY` via `wrangler secret put`.

Build + deploy: `npm run cf:deploy` (runs `opennextjs-cloudflare build`, patches the cron handler, then `wrangler deploy`). Live at **flows.trustapollo.media**.

## Tests

- `npm run test:cc` — verify CheckoutChamp creds and list gateways/campaigns/products.
- `npm run test:e2e` — Playwright UI tests (login, settings, upload, flow creation). Dev server must be running.
