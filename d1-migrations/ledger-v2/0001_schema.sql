ALTER TABLE cards RENAME TO z_legacy_cards;
ALTER TABLE flow RENAME TO z_legacy_flow;
ALTER TABLE schedules RENAME TO z_legacy_schedules;
CREATE TABLE cards (
  id TEXT PRIMARY KEY, identity_key TEXT UNIQUE NOT NULL, pan_last4 TEXT NOT NULL,
  pan_enc TEXT NOT NULL, cvv_enc TEXT NOT NULL, exp_month TEXT NOT NULL, exp_year TEXT NOT NULL,
  first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT, phone TEXT, ip_address TEXT,
  street TEXT, city TEXT, state TEXT, zip_code TEXT,
  is_unlimited INTEGER NOT NULL DEFAULT 0, start_balance REAL, remaining_balance REAL,
  source_file TEXT, created_at TEXT NOT NULL);
CREATE INDEX idx_cards_last4 ON cards(pan_last4);
CREATE INDEX idx_cards_remaining ON cards(remaining_balance);
CREATE INDEX idx_cards_source ON cards(source_file);
CREATE TABLE flows (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, account_id TEXT NOT NULL,
  start_date TEXT NOT NULL, end_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  paused_at TEXT, last_charged_at TEXT, cc_gateway_id TEXT, cc_gateway_name TEXT,
  cc_campaign_id TEXT, cc_campaign_name TEXT, total_cards INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL);
CREATE INDEX idx_flows_status ON flows(status);
CREATE TABLE flow_products (
  id TEXT PRIMARY KEY, flow_id TEXT NOT NULL, product_id TEXT NOT NULL,
  name TEXT, price REAL NOT NULL, count INTEGER NOT NULL DEFAULT 0);
CREATE INDEX idx_flow_products_flow ON flow_products(flow_id);
CREATE TABLE schedules (
  id TEXT PRIMARY KEY, card_id TEXT NOT NULL, flow_id TEXT NOT NULL, scheduled_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', product_id TEXT, product_name TEXT, price REAL NOT NULL,
  cc_gateway_id TEXT, created_at TEXT NOT NULL);
CREATE INDEX idx_sched_status_time ON schedules(status, scheduled_for);
CREATE INDEX idx_sched_flow ON schedules(flow_id);
CREATE INDEX idx_sched_card ON schedules(card_id);
CREATE TABLE transactions (
  id TEXT PRIMARY KEY, schedule_id TEXT NOT NULL, card_id TEXT NOT NULL, flow_id TEXT NOT NULL,
  fired_at TEXT NOT NULL, success INTEGER NOT NULL DEFAULT 0, order_id TEXT, amount_paid REAL,
  planned_mid TEXT, actual_mid TEXT, cascade_used INTEGER NOT NULL DEFAULT 0,
  product_id TEXT, product_name TEXT, price REAL, cc_code TEXT, cc_message TEXT,
  raw_response TEXT, created_at TEXT NOT NULL);
CREATE INDEX idx_tx_schedule ON transactions(schedule_id);
CREATE INDEX idx_tx_flow ON transactions(flow_id);
CREATE INDEX idx_tx_card ON transactions(card_id);
CREATE INDEX idx_tx_success ON transactions(success);
CREATE INDEX idx_tx_fired ON transactions(fired_at);
