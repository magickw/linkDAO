-- LDAO Token Acquisition System Tables

-- Purchase transactions table
CREATE TABLE IF NOT EXISTS "purchase_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_token" varchar(20) NOT NULL,
	"price_per_token" numeric(20, 8) NOT NULL,
	"discount_applied" numeric(5, 4) DEFAULT '0' NOT NULL,
	"total_price" numeric(20, 8) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"tx_hash" varchar(66),
	"payment_processor_id" varchar(255),
	"payment_details" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Earning activities table
CREATE TABLE IF NOT EXISTS "earning_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"activity_id" varchar(255) NOT NULL,
	"tokens_earned" numeric(20, 8) NOT NULL,
	"multiplier" numeric(5, 4) DEFAULT '1.0' NOT NULL,
	"is_premium_bonus" boolean DEFAULT false NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Enhanced staking positions table
CREATE TABLE IF NOT EXISTS "staking_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"lock_period" integer NOT NULL,
	"apr_rate" numeric(5, 4) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_auto_compound" boolean DEFAULT false NOT NULL,
	"rewards_earned" numeric(20, 8) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"contract_address" varchar(66),
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Price history table for analytics
CREATE TABLE IF NOT EXISTS "ldao_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_usd" numeric(20, 8) NOT NULL,
	"price_eth" numeric(20, 8),
	"volume_24h" numeric(20, 8) DEFAULT '0',
	"market_cap" numeric(20, 8),
	"source" varchar(50) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

-- Volume discount tiers configuration
CREATE TABLE IF NOT EXISTS "volume_discount_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_amount" numeric(20, 8) NOT NULL,
	"max_amount" numeric(20, 8),
	"discount_percentage" numeric(5, 4) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- User purchase limits and KYC status
CREATE TABLE IF NOT EXISTS "user_purchase_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"daily_limit" numeric(20, 8) DEFAULT '1000' NOT NULL,
	"monthly_limit" numeric(20, 8) DEFAULT '10000' NOT NULL,
	"daily_spent" numeric(20, 8) DEFAULT '0' NOT NULL,
	"monthly_spent" numeric(20, 8) DEFAULT '0' NOT NULL,
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"kyc_level" varchar(20) DEFAULT 'none' NOT NULL,
	"last_reset_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Referral program tracking
CREATE TABLE IF NOT EXISTS "referral_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"tokens_earned" numeric(20, 8) NOT NULL,
	"tier_level" integer DEFAULT 1 NOT NULL,
	"bonus_percentage" numeric(5, 4) NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Bridge transactions tracking
CREATE TABLE IF NOT EXISTS "bridge_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_chain" varchar(50) NOT NULL,
	"to_chain" varchar(50) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"bridge_provider" varchar(50) NOT NULL,
	"source_tx_hash" varchar(66),
	"destination_tx_hash" varchar(66),
	"bridge_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0',
	"estimated_time" integer,
	"actual_time" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- DEX swap transactions
CREATE TABLE IF NOT EXISTS "dex_swap_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dex_provider" varchar(50) NOT NULL,
	"from_token" varchar(20) NOT NULL,
	"to_token" varchar(20) NOT NULL,
	"amount_in" numeric(20, 8) NOT NULL,
	"amount_out" numeric(20, 8),
	"expected_amount_out" numeric(20, 8),
	"slippage_tolerance" numeric(5, 4) DEFAULT '0.005',
	"price_impact" numeric(5, 4),
	"gas_fee" numeric(20, 8),
	"tx_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Fiat payment processing records
CREATE TABLE IF NOT EXISTS "fiat_payment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_transaction_id" uuid NOT NULL,
	"payment_processor" varchar(50) NOT NULL,
	"processor_payment_id" varchar(255) NOT NULL,
	"amount_fiat" numeric(20, 8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"exchange_rate" numeric(20, 8) NOT NULL,
	"amount_crypto" numeric(20, 8) NOT NULL,
	"crypto_currency" varchar(20) NOT NULL,
	"processing_fees" numeric(20, 8) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"webhook_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "purchase_transactions" ADD CONSTRAINT "purchase_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "earning_activities" ADD CONSTRAINT "earning_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "staking_positions" ADD CONSTRAINT "staking_positions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_purchase_limits" ADD CONSTRAINT "user_purchase_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "referral_activities" ADD CONSTRAINT "referral_activities_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "referral_activities" ADD CONSTRAINT "referral_activities_referee_id_users_id_fk" FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dex_swap_transactions" ADD CONSTRAINT "dex_swap_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fiat_payment_records" ADD CONSTRAINT "fiat_payment_records_purchase_transaction_id_purchase_transactions_id_fk" FOREIGN KEY ("purchase_transaction_id") REFERENCES "purchase_transactions"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_user_id" ON "purchase_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_status" ON "purchase_transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_created_at" ON "purchase_transactions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_purchase_transactions_payment_method" ON "purchase_transactions" ("payment_method");

CREATE INDEX IF NOT EXISTS "idx_earning_activities_user_id" ON "earning_activities" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_activity_type" ON "earning_activities" ("activity_type");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_created_at" ON "earning_activities" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_staking_positions_user_id" ON "staking_positions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_status" ON "staking_positions" ("status");
CREATE INDEX IF NOT EXISTS "idx_staking_positions_end_date" ON "staking_positions" ("end_date");

CREATE INDEX IF NOT EXISTS "idx_ldao_price_history_timestamp" ON "ldao_price_history" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_ldao_price_history_source" ON "ldao_price_history" ("source");

CREATE INDEX IF NOT EXISTS "idx_volume_discount_tiers_min_amount" ON "volume_discount_tiers" ("min_amount");
CREATE INDEX IF NOT EXISTS "idx_volume_discount_tiers_is_active" ON "volume_discount_tiers" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_referral_activities_referrer_id" ON "referral_activities" ("referrer_id");
CREATE INDEX IF NOT EXISTS "idx_referral_activities_referee_id" ON "referral_activities" ("referee_id");
CREATE INDEX IF NOT EXISTS "idx_referral_activities_created_at" ON "referral_activities" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_user_id" ON "bridge_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_status" ON "bridge_transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_bridge_transactions_created_at" ON "bridge_transactions" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_user_id" ON "dex_swap_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_status" ON "dex_swap_transactions" ("status");
CREATE INDEX IF NOT EXISTS "idx_dex_swap_transactions_created_at" ON "dex_swap_transactions" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_purchase_transaction_id" ON "fiat_payment_records" ("purchase_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_status" ON "fiat_payment_records" ("status");
CREATE INDEX IF NOT EXISTS "idx_fiat_payment_records_processor_payment_id" ON "fiat_payment_records" ("processor_payment_id");

-- Insert default volume discount tiers
INSERT INTO "volume_discount_tiers" ("min_amount", "max_amount", "discount_percentage", "is_active") VALUES
(1000, 4999, 0.05, true),
(5000, 9999, 0.08, true),
(10000, 24999, 0.10, true),
(25000, 49999, 0.12, true),
(50000, NULL, 0.15, true)
ON CONFLICT DO NOTHING;