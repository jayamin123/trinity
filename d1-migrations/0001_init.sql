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
    "login_id" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biller_id" TEXT NOT NULL,
    "gateway_name" TEXT NOT NULL,
    "cc_campaign_id" TEXT NOT NULL,
    "cc_campaign_name" TEXT NOT NULL,
    "cc_product_id" TEXT NOT NULL,
    "cc_product_name" TEXT NOT NULL,
    "product_price" REAL NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "total_cards" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "paused_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaigns_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pan_encrypted" TEXT NOT NULL,
    "pan_last4" TEXT NOT NULL,
    "cvv_encrypted" TEXT NOT NULL,
    "exp_month" TEXT NOT NULL,
    "exp_year" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "campaign_id" TEXT,
    "scheduled_for" DATETIME,
    "status" TEXT,
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "card_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "amount" REAL NOT NULL,
    "order_id" TEXT,
    "response_code" TEXT,
    "response_message" TEXT,
    "raw_response" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "cards_status_scheduled_for_idx" ON "cards"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "cards_campaign_id_idx" ON "cards"("campaign_id");

-- CreateIndex
CREATE INDEX "cards_source_file_idx" ON "cards"("source_file");

-- CreateIndex
CREATE INDEX "transactions_campaign_id_created_at_idx" ON "transactions"("campaign_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_card_id_idx" ON "transactions"("card_id");
-- CreateTable
CREATE TABLE "cc_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biller_id" TEXT NOT NULL,
    "gateway_name" TEXT NOT NULL,
    "cc_campaign_id" TEXT NOT NULL,
    "cc_campaign_name" TEXT NOT NULL,
    "cc_product_id" TEXT NOT NULL,
    "cc_product_name" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cc_configs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "last_charged_at" DATETIME;
