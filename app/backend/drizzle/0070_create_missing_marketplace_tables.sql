CREATE TABLE IF NOT EXISTS "marketplace_users" (
	"user_id" uuid PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"role" varchar(10) NOT NULL,
	"email" varchar(255),
	"legal_name" varchar(255),
	"country" varchar(2),
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"kyc_verified" boolean DEFAULT false,
	"kyc_verification_date" timestamp,
	"kyc_provider" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"title" varchar(500) NOT NULL,
	"description" text,
	"main_category" varchar(50) NOT NULL,
	"sub_category" varchar(100),
	"tags" jsonb,
	"price_crypto" numeric(20, 8) NOT NULL,
	"price_fiat" numeric(20, 2),
	"currency" varchar(10) DEFAULT 'USDC',
	"metadata_uri" text,
	"is_physical" boolean DEFAULT false,
	"stock" integer DEFAULT 1,
	"defi_protocol" varchar(100),
	"defi_asset_type" varchar(50),
	"underlying_assets" jsonb,
	"current_apy" numeric(5, 2),
	"lock_period" integer,
	"maturity_date" timestamp,
	"risk_level" varchar(20) DEFAULT 'medium',
	"weight" numeric(10, 3),
	"dimensions" jsonb,
	"condition" varchar(20) DEFAULT 'new',
	"service_duration" integer,
	"delivery_method" varchar(20),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"seller_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"product_id" uuid NOT NULL REFERENCES "marketplace_products"("id") ON DELETE CASCADE,
	"escrow_contract_address" varchar(66) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"amount" numeric(20, 8) NOT NULL,
	"currency" varchar(10) DEFAULT 'USDC',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL REFERENCES "marketplace_orders"("id") ON DELETE CASCADE,
	"raised_by" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"status" varchar(20) DEFAULT 'open',
	"evidence" jsonb,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);

CREATE TABLE IF NOT EXISTS "dispute_judges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispute_id" uuid NOT NULL REFERENCES "marketplace_disputes"("id") ON DELETE CASCADE,
	"judge_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"decision" varchar(10),
	"staked_amount" numeric(20, 8) NOT NULL,
	"rewarded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"reviewee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"order_id" uuid NOT NULL REFERENCES "marketplace_orders"("id") ON DELETE CASCADE,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"comment" text,
	"is_verified" boolean DEFAULT false,
	"helpful_count" integer DEFAULT 0,
	"report_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"product_id" uuid REFERENCES "marketplace_products"("id") ON DELETE CASCADE,
	"event_type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_config" (
	"id" varchar(50) PRIMARY KEY,
	"config_key" varchar(100) NOT NULL UNIQUE,
	"config_value" text NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "marketplace_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" integer NOT NULL,
	"buyer_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"seller_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
	"transaction_amount" numeric(20, 8) NOT NULL,
	"buyer_reward" numeric(20, 8) NOT NULL,
	"seller_reward" numeric(20, 8) NOT NULL,
	"reward_tier" varchar(20) NOT NULL,
	"bonus_multiplier" numeric(5, 2) NOT NULL,
	"processed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "earning_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"challenge_type" varchar(20) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"target_value" numeric(20, 8) NOT NULL,
	"reward_amount" numeric(20, 8) NOT NULL,
	"bonus_multiplier" numeric(5, 2) DEFAULT '1.00',
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"max_participants" integer,
	"current_participants" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_challenge_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL REFERENCES "earning_challenges"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"current_progress" numeric(20, 8) NOT NULL,
	"target_value" numeric(20, 8) NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false,
	"reward_claimed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS "marketplace_products_main_category_idx" ON "marketplace_products" ("main_category");
CREATE INDEX IF NOT EXISTS "marketplace_products_sub_category_idx" ON "marketplace_products" ("sub_category");
CREATE INDEX IF NOT EXISTS "marketplace_products_defi_protocol_idx" ON "marketplace_products" ("defi_protocol");
CREATE INDEX IF NOT EXISTS "marketplace_products_defi_asset_type_idx" ON "marketplace_products" ("defi_asset_type");
CREATE INDEX IF NOT EXISTS "marketplace_products_risk_level_idx" ON "marketplace_products" ("risk_level");

CREATE INDEX IF NOT EXISTS "marketplace_rewards_buyer_id_idx" ON "marketplace_rewards" ("buyer_id");
CREATE INDEX IF NOT EXISTS "marketplace_rewards_seller_id_idx" ON "marketplace_rewards" ("seller_id");
CREATE INDEX IF NOT EXISTS "marketplace_rewards_order_id_idx" ON "marketplace_rewards" ("order_id");
CREATE INDEX IF NOT EXISTS "marketplace_rewards_processed_at_idx" ON "marketplace_rewards" ("processed_at");

CREATE INDEX IF NOT EXISTS "earning_challenges_type_idx" ON "earning_challenges" ("challenge_type");
CREATE INDEX IF NOT EXISTS "earning_challenges_activity_type_idx" ON "earning_challenges" ("activity_type");
CREATE INDEX IF NOT EXISTS "earning_challenges_is_active_idx" ON "earning_challenges" ("is_active");
CREATE INDEX IF NOT EXISTS "earning_challenges_start_date_idx" ON "earning_challenges" ("start_date");

CREATE INDEX IF NOT EXISTS "user_challenge_progress_challenge_user_idx" ON "user_challenge_progress" ("challenge_id", "user_id");
CREATE INDEX IF NOT EXISTS "user_challenge_progress_user_idx" ON "user_challenge_progress" ("user_id");
CREATE INDEX IF NOT EXISTS "user_challenge_progress_is_completed_idx" ON "user_challenge_progress" ("is_completed");
CREATE INDEX IF NOT EXISTS "user_challenge_progress_reward_claimed_idx" ON "user_challenge_progress" ("reward_claimed");
