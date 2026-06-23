# Trinity Flows

Card-automation system: upload card CSVs, schedule charges across multiple days through CheckoutChamp, watch results live. Next.js + MUI + Prisma. Runs on SQLite locally; deployed on Cloudflare (Worker + D1 + R2 + Cron) at **flows.trustapollo.media**.

## Quick start (local)

```bash
npm install --legacy-peer-deps
npx prisma migrate deploy
npx prisma db seed       # creates admin@trustapollo.com / asdf1234
npm run dev              # http://localhost:3040
```

## Docs

- **HOW-IT-WORKS.md** — system explanation, code map, where data lives, Cloudflare architecture.

## Verifying it works

```bash
npm run test:cc          # verify CheckoutChamp credentials
npm run test:e2e         # Playwright UI tests (dev server must be running)
```

## Deploy

```bash
npm run cf:deploy        # opennext build → patch cron handler → wrangler deploy
```
