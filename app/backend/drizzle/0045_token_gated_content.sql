-- Token-gated Content Migration
-- This migration adds tables to support token-gated content

-- Create community token gated content table
CREATE TABLE IF NOT EXISTS "community_token_gated_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" integer,
	"gating_type" varchar(50) NOT NULL,
	"token_address" varchar(66),
	"token_id" varchar(128),
	"minimum_balance" numeric(20,8),
	"subscription_tier" varchar(50),
	"access_type" varchar(50) DEFAULT 'view',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community user content access table
CREATE TABLE IF NOT EXISTS "community_user_content_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"access_level" varchar(50) NOT NULL,
	"access_granted_at" timestamp DEFAULT now() NOT NULL,
	"access_expires_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	PRIMARY KEY("content_id", "user_address")
);

-- Create community subscription tiers table
CREATE TABLE IF NOT EXISTS "community_subscription_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(20,8) NOT NULL,
	"currency" varchar(10) NOT NULL,
	"benefits" text,
	"access_level" varchar(50) NOT NULL,
	"duration_days" integer,
	"is_active" boolean DEFAULT true,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community user subscriptions table
CREATE TABLE IF NOT EXISTS "community_user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"tier_id" uuid NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"payment_tx_hash" varchar(66),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "community_token_gated_content" ADD CONSTRAINT "community_token_gated_content_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_token_gated_content" ADD CONSTRAINT "community_token_gated_content_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_user_content_access" ADD CONSTRAINT "community_user_content_access_content_id_community_token_gated_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "community_token_gated_content"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_subscription_tiers" ADD CONSTRAINT "community_subscription_tiers_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_user_subscriptions" ADD CONSTRAINT "community_user_subscriptions_tier_id_community_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "community_subscription_tiers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_community_id" ON "community_token_gated_content" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_post_id" ON "community_token_gated_content" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_gating_type" ON "community_token_gated_content" ("gating_type");
CREATE INDEX IF NOT EXISTS "idx_community_token_gated_content_token_address" ON "community_token_gated_content" ("token_address");

CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_content_id" ON "community_user_content_access" ("content_id");
CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_user_address" ON "community_user_content_access" ("user_address");
CREATE INDEX IF NOT EXISTS "idx_community_user_content_access_level" ON "community_user_content_access" ("access_level");

CREATE INDEX IF NOT EXISTS "idx_community_subscription_tiers_community_id" ON "community_subscription_tiers" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_subscription_tiers_is_active" ON "community_subscription_tiers" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_user_id" ON "community_user_subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_community_id" ON "community_user_subscriptions" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_tier_id" ON "community_user_subscriptions" ("tier_id");
CREATE INDEX IF NOT EXISTS "idx_community_user_subscriptions_status" ON "community_user_subscriptions" ("status");

-- Add token gated fields to posts table
ALTER TABLE "posts" 
ADD COLUMN IF NOT EXISTS "is_token_gated" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "gated_content_preview" text; -- Preview content for gated posts

-- Create indexes for token gated posts
CREATE INDEX IF NOT EXISTS "idx_posts_token_gated" ON "posts" ("is_token_gated");