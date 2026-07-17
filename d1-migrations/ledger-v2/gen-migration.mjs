// Generates migrate-v2.sql: renames the blob tables to z_legacy_*, creates the
// clean ledger-v2 schema, and migrates all data (blob→columns, cc_products→rows,
// fire_attempts→transactions ledger, computes denormalized remaining_balance).
import { readFileSync, writeFileSync } from "node:fs";

const rows = (f) => JSON.parse(readFileSync(f, "utf8"))[0].results;
const cards = rows("raw-cards.json");
const flows = rows("raw-flow.json");
const scheds = rows("raw-schedules.json");

// ---- SQL literal helpers ----
const S = (v) => (v === null || v === undefined) ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const N = (v) => {
  if (v === null || v === undefined || v === "") return "NULL";
  const n = Number(v); return Number.isFinite(n) ? String(n) : "NULL";
};
const B = (v) => (v === true || v === 1 || v === "1") ? "1" : "0";
const J = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

// ---- balance model: which schedules consume balance (old status+success) ----
const consumes = (st, ok) =>
  st === "pending" || st === "processing" || (st === "fired" && (ok === 1 || ok === true));

const committed = new Map(); // card_id -> sum(price of consuming schedules)
for (const s of scheds) {
  if (!consumes(s.status, s.success)) continue;
  const fp = J(s.fire_plan, {});
  const price = Number(fp.price) || 0;
  committed.set(s.card_id, (committed.get(s.card_id) || 0) + price);
}

const out = [];
const p = (line) => out.push(line);

// ---- rename blob tables (kept as backups) ----
p("ALTER TABLE cards RENAME TO z_legacy_cards;");
p("ALTER TABLE flow RENAME TO z_legacy_flow;");
p("ALTER TABLE schedules RENAME TO z_legacy_schedules;");

// ---- clean schema (no DB-level FKs: app-level integrity + indexes, per the plan) ----
p(`CREATE TABLE cards (
  id TEXT PRIMARY KEY, identity_key TEXT UNIQUE NOT NULL, pan_last4 TEXT NOT NULL,
  pan_enc TEXT NOT NULL, cvv_enc TEXT NOT NULL, exp_month TEXT NOT NULL, exp_year TEXT NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT, ip_address TEXT,
  street TEXT, city TEXT, state TEXT, zip_code TEXT,
  is_unlimited INTEGER NOT NULL DEFAULT 0, start_balance REAL, remaining_balance REAL,
  source_file TEXT, created_at TEXT NOT NULL);`);
p("CREATE INDEX idx_cards_last4 ON cards(pan_last4);");
p("CREATE INDEX idx_cards_remaining ON cards(remaining_balance);");
p("CREATE INDEX idx_cards_source ON cards(source_file);");

p(`CREATE TABLE flows (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, account_id TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  paused_at TEXT, last_charged_at TEXT, cc_gateway_id TEXT, cc_gateway_name TEXT,
  cc_campaign_id TEXT, cc_campaign_name TEXT, total_cards INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL);`);
p("CREATE INDEX idx_flows_status ON flows(status);");

p(`CREATE TABLE flow_products (
  id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, product_id TEXT NOT NULL,
  name TEXT, price REAL NOT NULL, count INTEGER NOT NULL DEFAULT 0);`);
p("CREATE INDEX idx_flow_products_flow ON flow_products(flow_id);");

p(`CREATE TABLE schedules (
  id TEXT PRIMARY KEY, card_id TEXT NOT NULL, flow_id TEXT NOT NULL, scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', product_id TEXT, product_name TEXT, price REAL NOT NULL,
  cc_gateway_id TEXT, created_at TEXT NOT NULL);`);
p("CREATE INDEX idx_sched_status_time ON schedules(status, scheduled_for);");
p("CREATE INDEX idx_sched_flow ON schedules(flow_id);");
p("CREATE INDEX idx_sched_card ON schedules(card_id);");

p(`CREATE TABLE transactions (
  id TEXT PRIMARY KEY, schedule_id TEXT NOT NULL, card_id TEXT NOT NULL, flow_id TEXT NOT NULL,
  fired_at TEXT NOT NULL, success INTEGER NOT NULL DEFAULT 0, order_id TEXT, amount_paid REAL,
  planned_mid TEXT, actual_mid TEXT, cascade_used INTEGER NOT NULL DEFAULT 0,
  product_id TEXT, product_name TEXT, price REAL, cc_code TEXT, cc_message TEXT,
  raw_response TEXT, created_at TEXT NOT NULL);`);
p("CREATE INDEX idx_tx_schedule ON transactions(schedule_id);");
p("CREATE INDEX idx_tx_flow ON transactions(flow_id);");
p("CREATE INDEX idx_tx_card ON transactions(card_id);");
p("CREATE INDEX idx_tx_success ON transactions(success);");
p("CREATE INDEX idx_tx_fired ON transactions(fired_at);");

// ---- cards ----
let unlimCount = 0, negBalance = 0;
for (const c of cards) {
  const cd = J(c.card_data, {});
  const ch = cd.cardholder || {}, card = cd.card || {}, ba = cd.billing_address || {}, ct = cd.contact || {};
  const isUnlim = cd.amount === "unlim" || cd.amount === "UNLIM";
  if (isUnlim) unlimCount++;
  const start = isUnlim ? null : (Number.isFinite(Number(cd.amount)) ? Number(cd.amount) : null);
  const used = committed.get(c.id) || 0;
  const remaining = isUnlim ? null : (start === null ? null : +(start - used).toFixed(4));
  if (remaining !== null && remaining < -0.0001) negBalance++;
  p(`INSERT INTO cards VALUES (${S(c.id)},${S(c.identity_key)},${S(c.pan_last4)},${S(card.pan_encrypted)},${S(card.cvv_encrypted)},${S(card.exp_month)},${S(card.exp_year)},${S(ch.first_name)},${S(ch.last_name)},${S(ct.email)},${S(ct.phone)},${S(ct.ip_address)},${S(ba.street)},${S(ba.city)},${S(ba.state)},${S(ba.zip_code)},${isUnlim ? 1 : 0},${N(start)},${remaining === null ? "NULL" : N(remaining)},${S(cd.source_file)},${S(cd.created_at || c.created_at)});`);
}

// ---- flows + flow_products ----
for (const f of flows) {
  const fs = J(f.flow_settings, {});
  const sw = fs.schedule_window || {}, lc = fs.lifecycle || {}, gw = fs.cc_gateway || {}, cp = fs.cc_campaign || {};
  p(`INSERT INTO flows VALUES (${S(f.id)},${S(f.name)},${S(f.account_id)},${S(sw.start_date)},${S(sw.end_date)},${S(lc.status || "active")},${S(lc.paused_at)},${S(lc.last_charged_at)},${S(gw.id)},${S(gw.name)},${S(cp.id)},${S(cp.name)},${N(fs.total_cards)},${S(fs.created_at || f.created_at)});`);
  for (const prod of (fs.cc_products || [])) {
    p(`INSERT INTO flow_products VALUES (${S(f.id + "-" + prod.id)},${S(f.id)},${S(prod.id)},${S(prod.name)},${N(prod.price)},${N(prod.count)});`);
  }
}

// ---- schedules (fired->done) + transactions (explode fire_attempts) ----
let txCount = 0;
for (const s of scheds) {
  const fp = J(s.fire_plan, {});
  const status = s.status === "fired" ? "done" : s.status;
  p(`INSERT INTO schedules VALUES (${S(s.id)},${S(s.card_id)},${S(s.flow_id)},${S(s.scheduled_for)},${S(status)},${S(fp.product_id)},${S(fp.product_name)},${N(fp.price)},${S(fp.cc_gateway_id)},${S(s.created_at)});`);
  const attempts = J(s.fire_attempts, []);
  attempts.forEach((a, i) => {
    const r = a.cc_response || {};
    p(`INSERT INTO transactions VALUES (${S(s.id + "-a" + i)},${S(s.id)},${S(s.card_id)},${S(s.flow_id)},${S(a.fired_at)},${B(a.success)},${S(a.order_id)},${N(a.amount_paid)},${S(fp.cc_gateway_id)},${S(a.actual_cc_gateway_id)},${B(a.cascade_used)},${S(fp.product_id)},${S(fp.product_name)},${N(fp.price)},${S(r.code)},${S(r.message)},${S(r.raw)},${S(a.fired_at)});`);
    txCount++;
  });
}

writeFileSync("migrate-v2.sql", out.join("\n") + "\n");
console.log(`generated migrate-v2.sql`);
console.log(`  cards: ${cards.length} (unlimited: ${unlimCount}, negative-balance: ${negBalance})`);
console.log(`  flows: ${flows.length}, schedules: ${scheds.length}, transactions: ${txCount}`);
console.log(`  statements: ${out.length}`);
