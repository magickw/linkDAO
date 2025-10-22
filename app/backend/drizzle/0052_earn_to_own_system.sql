-- LDAO Earn-to-Own System Tables

-- Earning activities table to track all earning events
CREATE TABLE IF NOT EXISTS "earning_activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" varchar(32) NOT NULL, -- 'post', 'comment', 'referral', 'marketplace', 'daily_login', 'profile_complete'
  "activity_id" varchar(128), -- ID of the related activity (post ID, comment ID, etc.)
  "tokens_earned" numeric(20, 8) NOT NULL DEFAULT '0',
  "base_reward" numeric(20, 8) NOT NULL DEFAULT '0',
  "multiplier" numeric(5, 2) NOT NULL DEFAULT '1.0',
  "quality_score" numeric(5, 2) DEFAULT '1.0', -- Quality scoring for content-based rewards
  "is_premium_bonus" boolean DEFAULT false,
  "premium_bonus_amount" numeric(20, 8) DEFAULT '0',
  "daily_limit_applied" boolean DEFAULT false,
  "metadata" text, -- JSON object with additional activity data
  "created_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp,
  "status" varchar(20) DEFAULT 'pending' -- 'pending', 'processed', 'failed'
);

-- Indexes for earning activities
CREATE INDEX IF NOT EXISTS "idx_earning_activities_user_id" ON "earning_activities"("user_id");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_activity_type" ON "earning_activities"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_created_at" ON "earning_activities"("created_at");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_status" ON "earning_activities"("status");
CREATE INDEX IF NOT EXISTS "idx_earning_activities_activity_id" ON "earning_activities"("activity_id");

-- Referral system table
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referee_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referral_code" varchar(32) NOT NULL UNIQUE,
  "tier" integer DEFAULT 1, -- Multi-tier referral support (1st tier, 2nd tier, etc.)
  "bonus_percentage" numeric(5, 2) DEFAULT '10.0',
  "total_earned" numeric(20, 8) DEFAULT '0',
  "status" varchar(20) DEFAULT 'active', -- 'active', 'inactive', 'expired'
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS "idx_referrals_referrer_id" ON "referrals"("referrer_id");
CREATE INDEX IF NOT EXISTS "idx_referrals_referee_id" ON "referrals"("referee_id");
CREATE INDEX IF NOT EXISTS "idx_referrals_referral_code" ON "referrals"("referral_code");
CREATE INDEX IF NOT EXISTS "idx_referrals_status" ON "referrals"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_referrals_unique_referrer_referee" ON "referrals"("referrer_id", "referee_id");

-- Referral rewards tracking
CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referral_id" uuid NOT NULL REFERENCES "referrals"("id") ON DELETE CASCADE,
  "earning_activity_id" uuid REFERENCES "earning_activities"("id") ON DELETE CASCADE,
  "reward_amount" numeric(20, 8) NOT NULL,
  "reward_type" varchar(32) NOT NULL, -- 'signup_bonus', 'activity_bonus', 'milestone_bonus'
  "milestone_reached" varchar(64), -- Description of milestone if applicable
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for referral rewards
CREATE INDEX IF NOT EXISTS "idx_referral_rewards_referral_id" ON "referral_rewards"("referral_id");
CREATE INDEX IF NOT EXISTS "idx_referral_rewards_earning_activity_id" ON "referral_rewards"("earning_activity_id");
CREATE INDEX IF NOT EXISTS "idx_referral_rewards_created_at" ON "referral_rewards"("created_at");

-- Daily earning limits and tracking
CREATE TABLE IF NOT EXISTS "daily_earning_limits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "activity_type" varchar(32) NOT NULL,
  "tokens_earned_today" numeric(20, 8) DEFAULT '0',
  "daily_limit" numeric(20, 8) NOT NULL,
  "limit_reached" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for daily earning limits
CREATE INDEX IF NOT EXISTS "idx_daily_earning_limits_user_id" ON "daily_earning_limits"("user_id");
CREATE INDEX IF NOT EXISTS "idx_daily_earning_limits_date" ON "daily_earning_limits"("date");
CREATE INDEX IF NOT EXISTS "idx_daily_earning_limits_activity_type" ON "daily_earning_limits"("activity_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_daily_earning_limits_unique" ON "daily_earning_limits"("user_id", "date", "activity_type");

-- Marketplace transaction rewards
CREATE TABLE IF NOT EXISTS "marketplace_rewards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_id" integer REFERENCES "orders"("id") ON DELETE CASCADE,
  "buyer_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "seller_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "transaction_amount" numeric(20, 8) NOT NULL,
  "buyer_reward" numeric(20, 8) DEFAULT '0',
  "seller_reward" numeric(20, 8) DEFAULT '0',
  "reward_tier" varchar(32), -- Volume-based bonus tier
  "bonus_multiplier" numeric(5, 2) DEFAULT '1.0',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp
);

-- Indexes for marketplace rewards
CREATE INDEX IF NOT EXISTS "idx_marketplace_rewards_order_id" ON "marketplace_rewards"("order_id");
CREATE INDEX IF NOT EXISTS "idx_marketplace_rewards_buyer_id" ON "marketplace_rewards"("buyer_id");
CREATE INDEX IF NOT EXISTS "idx_marketplace_rewards_seller_id" ON "marketplace_rewards"("seller_id");
CREATE INDEX IF NOT EXISTS "idx_marketplace_rewards_created_at" ON "marketplace_rewards"("created_at");

-- Earning challenges and milestones
CREATE TABLE IF NOT EXISTS "earning_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "description" text,
  "challenge_type" varchar(32) NOT NULL, -- 'daily', 'weekly', 'monthly', 'milestone'
  "activity_type" varchar(32), -- Specific activity type or null for general challenges
  "target_value" numeric(20, 8) NOT NULL, -- Target amount/count to achieve
  "reward_amount" numeric(20, 8) NOT NULL,
  "bonus_multiplier" numeric(5, 2) DEFAULT '1.0',
  "start_date" timestamp,
  "end_date" timestamp,
  "is_active" boolean DEFAULT true,
  "max_participants" integer, -- Limit number of participants
  "current_participants" integer DEFAULT 0,
  "metadata" text, -- JSON object with additional challenge data
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for earning challenges
CREATE INDEX IF NOT EXISTS "idx_earning_challenges_challenge_type" ON "earning_challenges"("challenge_type");
CREATE INDEX IF NOT EXISTS "idx_earning_challenges_activity_type" ON "earning_challenges"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_earning_challenges_is_active" ON "earning_challenges"("is_active");
CREATE INDEX IF NOT EXISTS "idx_earning_challenges_start_date" ON "earning_challenges"("start_date");
CREATE INDEX IF NOT EXISTS "idx_earning_challenges_end_date" ON "earning_challenges"("end_date");

-- User challenge participation
CREATE TABLE IF NOT EXISTS "user_challenge_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "challenge_id" uuid NOT NULL REFERENCES "earning_challenges"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "current_progress" numeric(20, 8) DEFAULT '0',
  "target_value" numeric(20, 8) NOT NULL,
  "is_completed" boolean DEFAULT false,
  "completed_at" timestamp,
  "reward_claimed" boolean DEFAULT false,
  "reward_claimed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for user challenge progress
CREATE INDEX IF NOT EXISTS "idx_user_challenge_progress_challenge_id" ON "user_challenge_progress"("challenge_id");
CREATE INDEX IF NOT EXISTS "idx_user_challenge_progress_user_id" ON "user_challenge_progress"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_challenge_progress_is_completed" ON "user_challenge_progress"("is_completed");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_challenge_progress_unique" ON "user_challenge_progress"("challenge_id", "user_id");

-- Real-time activity feed for notifications
CREATE TABLE IF NOT EXISTS "activity_feed" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" varchar(32) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "tokens_earned" numeric(20, 8) DEFAULT '0',
  "icon" varchar(64), -- Icon identifier for UI
  "action_url" varchar(500), -- URL to navigate to for more details
  "is_read" boolean DEFAULT false,
  "metadata" text, -- JSON object with additional data
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for activity feed
CREATE INDEX IF NOT EXISTS "idx_activity_feed_user_id" ON "activity_feed"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_feed_activity_type" ON "activity_feed"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_activity_feed_created_at" ON "activity_feed"("created_at");
CREATE INDEX IF NOT EXISTS "idx_activity_feed_is_read" ON "activity_feed"("is_read");

-- Earning configuration and rules
CREATE TABLE IF NOT EXISTS "earning_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "activity_type" varchar(32) NOT NULL UNIQUE,
  "base_reward" numeric(20, 8) NOT NULL DEFAULT '0',
  "daily_limit" numeric(20, 8) DEFAULT '100', -- Default daily limit
  "quality_multiplier_enabled" boolean DEFAULT false,
  "premium_bonus_percentage" numeric(5, 2) DEFAULT '25.0',
  "cooldown_period" integer DEFAULT 0, -- Cooldown in seconds between rewards
  "min_quality_score" numeric(5, 2) DEFAULT '0.5',
  "max_quality_score" numeric(5, 2) DEFAULT '2.0',
  "is_active" boolean DEFAULT true,
  "metadata" text, -- JSON object with additional configuration
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for earning config
CREATE INDEX IF NOT EXISTS "idx_earning_config_activity_type" ON "earning_config"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_earning_config_is_active" ON "earning_config"("is_active");

-- Insert default earning configuration
INSERT INTO "earning_config" ("activity_type", "base_reward", "daily_limit", "quality_multiplier_enabled", "premium_bonus_percentage") VALUES
('post', '10.0', '100.0', true, '25.0'),
('comment', '2.0', '50.0', true, '25.0'),
('referral', '50.0', '500.0', false, '25.0'),
('marketplace', '5.0', '200.0', false, '25.0'),
('daily_login', '1.0', '1.0', false, '25.0'),
('profile_complete', '25.0', '25.0', false, '25.0')
ON CONFLICT ("activity_type") DO NOTHING;

-- User earning statistics for analytics
CREATE TABLE IF NOT EXISTS "user_earning_stats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_tokens_earned" numeric(20, 8) DEFAULT '0',
  "tokens_earned_today" numeric(20, 8) DEFAULT '0',
  "tokens_earned_this_week" numeric(20, 8) DEFAULT '0',
  "tokens_earned_this_month" numeric(20, 8) DEFAULT '0',
  "total_activities" integer DEFAULT 0,
  "referrals_made" integer DEFAULT 0,
  "challenges_completed" integer DEFAULT 0,
  "current_streak" integer DEFAULT 0, -- Daily activity streak
  "longest_streak" integer DEFAULT 0,
  "last_activity_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for user earning stats
CREATE INDEX IF NOT EXISTS "idx_user_earning_stats_user_id" ON "user_earning_stats"("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_earning_stats_total_tokens_earned" ON "user_earning_stats"("total_tokens_earned");
CREATE INDEX IF NOT EXISTS "idx_user_earning_stats_current_streak" ON "user_earning_stats"("current_streak");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_earning_stats_unique_user" ON "user_earning_stats"("user_id");

-- Abuse prevention and rate limiting
CREATE TABLE IF NOT EXISTS "earning_abuse_prevention" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "activity_type" varchar(32) NOT NULL,
  "suspicious_activity_count" integer DEFAULT 0,
  "last_suspicious_activity" timestamp,
  "is_flagged" boolean DEFAULT false,
  "flagged_reason" text,
  "flagged_at" timestamp,
  "reviewed_by" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp,
  "status" varchar(20) DEFAULT 'active', -- 'active', 'suspended', 'banned'
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for abuse prevention
CREATE INDEX IF NOT EXISTS "idx_earning_abuse_prevention_user_id" ON "earning_abuse_prevention"("user_id");
CREATE INDEX IF NOT EXISTS "idx_earning_abuse_prevention_activity_type" ON "earning_abuse_prevention"("activity_type");
CREATE INDEX IF NOT EXISTS "idx_earning_abuse_prevention_is_flagged" ON "earning_abuse_prevention"("is_flagged");
CREATE INDEX IF NOT EXISTS "idx_earning_abuse_prevention_status" ON "earning_abuse_prevention"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_earning_abuse_prevention_unique" ON "earning_abuse_prevention"("user_id", "activity_type");