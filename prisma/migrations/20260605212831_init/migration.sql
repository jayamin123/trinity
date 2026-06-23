-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "api_url" TEXT NOT NULL,
    "login_id_encrypted" TEXT NOT NULL,
    "password_encrypted" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cc_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cc_configs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identity_key" TEXT NOT NULL,
    "pan_last4" TEXT NOT NULL,
    "card_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "flow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "cc_config_id" TEXT NOT NULL,
    "flow_settings" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flow_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "flow_cc_config_id_fkey" FOREIGN KEY ("cc_config_id") REFERENCES "cc_configs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "scheduled_for" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fired_at" DATETIME,
    "order_id" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "fire_plan" TEXT NOT NULL,
    "fire_attempts" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "schedules_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "schedules_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "flow" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cards_identity_key_key" ON "cards"("identity_key");

-- CreateIndex
CREATE INDEX "cards_pan_last4_idx" ON "cards"("pan_last4");

-- CreateIndex
CREATE INDEX "schedules_status_scheduled_for_idx" ON "schedules"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "schedules_flow_id_idx" ON "schedules"("flow_id");

-- CreateIndex
CREATE INDEX "schedules_card_id_idx" ON "schedules"("card_id");
