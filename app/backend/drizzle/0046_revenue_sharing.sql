-- Revenue Sharing and Treasury Management Migration
-- This migration adds tables to support revenue sharing mechanisms

-- Create community treasury pools table
CREATE TABLE IF NOT EXISTS "community_treasury_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"balance" numeric(20,8) DEFAULT '0' NOT NULL,
	"total_contributions" numeric(20,8) DEFAULT '0' NOT NULL,
	"total_distributions" numeric(20,8) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community creator rewards table
CREATE TABLE IF NOT EXISTS "community_creator_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"post_id" integer,
	"creator_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20,8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"distribution_type" varchar(30) NOT NULL,
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"distributed_at" timestamp
);

-- Create community staking table
CREATE TABLE IF NOT EXISTS "community_staking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"staked_amount" numeric(20,8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"staked_at" timestamp DEFAULT now() NOT NULL,
	"unstaked_at" timestamp,
	"rewards_earned" numeric(20,8) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community staking rewards table
CREATE TABLE IF NOT EXISTS "community_staking_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staking_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20,8) NOT NULL,
	"token_address" varchar(66) NOT NULL,
	"token_symbol" varchar(20) NOT NULL,
	"reward_type" varchar(30) NOT NULL,
	"transaction_hash" varchar(66),
	"status" varchar(20) DEFAULT 'pending',
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"distributed_at" timestamp
);

-- Create community referral programs table
CREATE TABLE IF NOT EXISTS "community_referral_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"reward_amount" numeric(20,8) NOT NULL,
	"reward_token" varchar(66) NOT NULL,
	"reward_token_symbol" varchar(20) NOT NULL,
	"referral_limit" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community user referrals table
CREATE TABLE IF NOT EXISTS "community_user_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"referrer_address" varchar(66) NOT NULL,
	"referred_address" varchar(66) NOT NULL,
	"reward_amount" numeric(20,8) NOT NULL,
	"reward_token" varchar(66) NOT NULL,
	"reward_token_symbol" varchar(20) NOT NULL,
	"reward_status" varchar(20) DEFAULT 'pending',
	"transaction_hash" varchar(66),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rewarded_at" timestamp
);

-- Add foreign key constraints
DO $$ BEGIN 
  ALTER TABLE "community_treasury_pools" ADD CONSTRAINT "community_treasury_pools_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_creator_rewards" ADD CONSTRAINT "community_creator_rewards_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_creator_rewards" ADD CONSTRAINT "community_creator_rewards_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_staking" ADD CONSTRAINT "community_staking_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_staking_rewards" ADD CONSTRAINT "community_staking_rewards_staking_id_community_staking_id_fk" FOREIGN KEY ("staking_id") REFERENCES "community_staking"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_referral_programs" ADD CONSTRAINT "community_referral_programs_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN 
  ALTER TABLE "community_user_referrals" ADD CONSTRAINT "community_user_referrals_program_id_community_referral_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "community_referral_programs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_community_id" ON "community_treasury_pools" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_token_address" ON "community_treasury_pools" ("token_address");
CREATE INDEX IF NOT EXISTS "idx_community_treasury_pools_is_active" ON "community_treasury_pools" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_community_id" ON "community_creator_rewards" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_creator_address" ON "community_creator_rewards" ("creator_address");
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_post_id" ON "community_creator_rewards" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_status" ON "community_creator_rewards" ("status");
CREATE INDEX IF NOT EXISTS "idx_community_creator_rewards_created_at" ON "community_creator_rewards" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_community_staking_community_id" ON "community_staking" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_staking_user_address" ON "community_staking" ("user_address");
CREATE INDEX IF NOT EXISTS "idx_community_staking_is_active" ON "community_staking" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_community_staking_staked_at" ON "community_staking" ("staked_at");

CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_staking_id" ON "community_staking_rewards" ("staking_id");
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_user_address" ON "community_staking_rewards" ("user_address");
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_status" ON "community_staking_rewards" ("status");
CREATE INDEX IF NOT EXISTS "idx_community_staking_rewards_type" ON "community_staking_rewards" ("reward_type");

CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_community_id" ON "community_referral_programs" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_is_active" ON "community_referral_programs" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_community_referral_programs_start_date" ON "community_referral_programs" ("start_date");

CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_program_id" ON "community_user_referrals" ("program_id");
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_referrer_address" ON "community_user_referrals" ("referrer_address");
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_referred_address" ON "community_user_referrals" ("referred_address");
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_reward_status" ON "community_user_referrals" ("reward_status");
CREATE INDEX IF NOT EXISTS "idx_community_user_referrals_unique" ON "community_user_referrals" ("program_id", "referrer_address", "referred_address");
