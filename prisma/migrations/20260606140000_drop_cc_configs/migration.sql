-- Drop cc_configs table after folding its data into flow.flow_settings.
-- The data migration ran first (scripts/migrate-fold-cc-config.ts → SQL applied
-- via wrangler d1 execute). This migration only handles schema changes.
--
-- SQLite refuses ALTER TABLE flow DROP COLUMN cc_config_id because the column
-- carries a FK to cc_configs. The standard SQLite recipe for this case is to
-- recreate the affected tables. D1 also enforces FK at DROP TABLE time, so we
-- must recreate schedules first (to drop its FK to the old flow table), then
-- recreate flow without cc_config_id, then drop cc_configs, then re-add the
-- schedules→flow FK by recreating schedules one more time.

-- Step 1: rebuild schedules WITHOUT its FK to flow (temporarily).
CREATE TABLE "schedules_step1" (
  "id"            TEXT     NOT NULL PRIMARY KEY,
  "card_id"       TEXT     NOT NULL,
  "flow_id"       TEXT     NOT NULL,
  "scheduled_for" DATETIME NOT NULL,
  "status"        TEXT     NOT NULL DEFAULT 'pending',
  "fired_at"      DATETIME,
  "order_id"      TEXT,
  "success"       BOOLEAN  NOT NULL DEFAULT false,
  "fire_plan"     TEXT     NOT NULL,
  "fire_attempts" TEXT     NOT NULL DEFAULT '[]',
  "created_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedules_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "schedules_step1"
  ("id", "card_id", "flow_id", "scheduled_for", "status", "fired_at", "order_id", "success", "fire_plan", "fire_attempts", "created_at")
SELECT
  "id", "card_id", "flow_id", "scheduled_for", "status", "fired_at", "order_id", "success", "fire_plan", "fire_attempts", "created_at"
FROM "schedules";

DROP TABLE "schedules";
ALTER TABLE "schedules_step1" RENAME TO "schedules";

CREATE INDEX "schedules_status_scheduled_for_idx" ON "schedules" ("status", "scheduled_for");
CREATE INDEX "schedules_flow_id_idx" ON "schedules" ("flow_id");
CREATE INDEX "schedules_card_id_idx" ON "schedules" ("card_id");

-- Step 2: rebuild flow WITHOUT cc_config_id.
CREATE TABLE "flow_new" (
  "id"            TEXT     NOT NULL PRIMARY KEY,
  "name"          TEXT     NOT NULL,
  "account_id"    TEXT     NOT NULL,
  "flow_settings" TEXT     NOT NULL,
  "created_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "flow_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "flow_new" ("id", "name", "account_id", "flow_settings", "created_at")
SELECT "id", "name", "account_id", "flow_settings", "created_at" FROM "flow";

DROP TABLE "flow";
ALTER TABLE "flow_new" RENAME TO "flow";

-- Step 3: cc_configs is now orphaned (no FK references it). Drop it.
DROP TABLE "cc_configs";

-- Step 4: rebuild schedules ONE more time, this time with the FK to the new flow.
CREATE TABLE "schedules_step2" (
  "id"            TEXT     NOT NULL PRIMARY KEY,
  "card_id"       TEXT     NOT NULL,
  "flow_id"       TEXT     NOT NULL,
  "scheduled_for" DATETIME NOT NULL,
  "status"        TEXT     NOT NULL DEFAULT 'pending',
  "fired_at"      DATETIME,
  "order_id"      TEXT,
  "success"       BOOLEAN  NOT NULL DEFAULT false,
  "fire_plan"     TEXT     NOT NULL,
  "fire_attempts" TEXT     NOT NULL DEFAULT '[]',
  "created_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "schedules_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "schedules_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "schedules_step2"
  ("id", "card_id", "flow_id", "scheduled_for", "status", "fired_at", "order_id", "success", "fire_plan", "fire_attempts", "created_at")
SELECT
  "id", "card_id", "flow_id", "scheduled_for", "status", "fired_at", "order_id", "success", "fire_plan", "fire_attempts", "created_at"
FROM "schedules";

DROP TABLE "schedules";
ALTER TABLE "schedules_step2" RENAME TO "schedules";

CREATE INDEX "schedules_status_scheduled_for_idx" ON "schedules" ("status", "scheduled_for");
CREATE INDEX "schedules_flow_id_idx" ON "schedules" ("flow_id");
CREATE INDEX "schedules_card_id_idx" ON "schedules" ("card_id");
