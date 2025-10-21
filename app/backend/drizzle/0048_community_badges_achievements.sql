-- Community Badges and Achievements System
-- Migration: 0048_community_badges_achievements.sql

-- Badges definition table
CREATE TABLE IF NOT EXISTS "community_badges" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT,
    "icon" VARCHAR(255),
    "badge_type" VARCHAR(50) NOT NULL, -- 'participation', 'contribution', 'milestone', 'special', 'seasonal'
    "tier" VARCHAR(20) NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
    "category" VARCHAR(50), -- 'governance', 'content', 'social', 'economic', 'community'
    "criteria" JSONB NOT NULL, -- Achievement criteria
    "rewards" JSONB, -- Optional rewards (tokens, NFTs, etc.)
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "is_hidden" BOOLEAN DEFAULT false NOT NULL, -- Hidden until earned
    "max_supply" INTEGER, -- Limited edition badges
    "current_supply" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS "community_user_badges" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_address" VARCHAR(66) NOT NULL,
    "badge_id" UUID NOT NULL REFERENCES "community_badges"("id") ON DELETE CASCADE,
    "community_id" UUID, -- NULL for platform-wide badges
    "earned_at" TIMESTAMP DEFAULT now() NOT NULL,
    "progress" INTEGER DEFAULT 100, -- 0-100 percentage
    "metadata" JSONB, -- Additional data (e.g., specific achievement details)
    "nft_token_id" VARCHAR(100), -- If minted as NFT
    "is_displayed" BOOLEAN DEFAULT true, -- User can hide badges
    UNIQUE("user_address", "badge_id", "community_id")
);

-- Badge progress tracking
CREATE TABLE IF NOT EXISTS "community_badge_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_address" VARCHAR(66) NOT NULL,
    "badge_id" UUID NOT NULL REFERENCES "community_badges"("id") ON DELETE CASCADE,
    "community_id" UUID,
    "current_value" INTEGER DEFAULT 0,
    "target_value" INTEGER NOT NULL,
    "progress_percentage" INTEGER DEFAULT 0,
    "started_at" TIMESTAMP DEFAULT now() NOT NULL,
    "last_updated" TIMESTAMP DEFAULT now() NOT NULL,
    UNIQUE("user_address", "badge_id", "community_id")
);

-- Achievements (one-time accomplishments)
CREATE TABLE IF NOT EXISTS "community_achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT,
    "icon" VARCHAR(255),
    "achievement_type" VARCHAR(50) NOT NULL, -- 'first_time', 'milestone', 'rare', 'epic', 'legendary'
    "points" INTEGER DEFAULT 0, -- Achievement points
    "requirements" JSONB NOT NULL, -- What user must do
    "rewards" JSONB, -- What user gets
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "is_repeatable" BOOLEAN DEFAULT false NOT NULL,
    "cooldown_period" INTEGER, -- Seconds before can be earned again (if repeatable)
    "created_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- User achievements
CREATE TABLE IF NOT EXISTS "community_user_achievements" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_address" VARCHAR(66) NOT NULL,
    "achievement_id" UUID NOT NULL REFERENCES "community_achievements"("id") ON DELETE CASCADE,
    "community_id" UUID,
    "earned_at" TIMESTAMP DEFAULT now() NOT NULL,
    "earned_count" INTEGER DEFAULT 1, -- For repeatable achievements
    "metadata" JSONB
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS "community_leaderboards" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" UUID,
    "leaderboard_type" VARCHAR(50) NOT NULL, -- 'badges', 'achievements', 'reputation', 'contributions'
    "time_period" VARCHAR(20) NOT NULL, -- 'all_time', 'monthly', 'weekly', 'daily'
    "user_address" VARCHAR(66) NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "metadata" JSONB,
    "calculated_at" TIMESTAMP DEFAULT now() NOT NULL,
    UNIQUE("community_id", "leaderboard_type", "time_period", "user_address")
);

-- Quests (multi-step achievements)
CREATE TABLE IF NOT EXISTS "community_quests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "community_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "quest_type" VARCHAR(50) NOT NULL, -- 'tutorial', 'daily', 'weekly', 'special', 'seasonal'
    "difficulty" VARCHAR(20) DEFAULT 'easy', -- 'easy', 'medium', 'hard', 'expert'
    "steps" JSONB NOT NULL, -- Array of quest steps
    "rewards" JSONB NOT NULL,
    "start_date" TIMESTAMP,
    "end_date" TIMESTAMP,
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "max_completions" INTEGER, -- Limit how many can complete
    "current_completions" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT now() NOT NULL
);

-- User quest progress
CREATE TABLE IF NOT EXISTS "community_user_quest_progress" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_address" VARCHAR(66) NOT NULL,
    "quest_id" UUID NOT NULL REFERENCES "community_quests"("id") ON DELETE CASCADE,
    "current_step" INTEGER DEFAULT 0,
    "total_steps" INTEGER NOT NULL,
    "steps_completed" JSONB DEFAULT '[]',
    "started_at" TIMESTAMP DEFAULT now() NOT NULL,
    "completed_at" TIMESTAMP,
    "is_completed" BOOLEAN DEFAULT false NOT NULL,
    "rewards_claimed" BOOLEAN DEFAULT false NOT NULL,
    UNIQUE("user_address", "quest_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_user_badges_user" ON "community_user_badges"("user_address");
CREATE INDEX IF NOT EXISTS "idx_user_badges_badge" ON "community_user_badges"("badge_id");
CREATE INDEX IF NOT EXISTS "idx_user_badges_community" ON "community_user_badges"("community_id");
CREATE INDEX IF NOT EXISTS "idx_user_badges_earned_at" ON "community_user_badges"("earned_at");

CREATE INDEX IF NOT EXISTS "idx_badge_progress_user" ON "community_badge_progress"("user_address");
CREATE INDEX IF NOT EXISTS "idx_badge_progress_badge" ON "community_badge_progress"("badge_id");

CREATE INDEX IF NOT EXISTS "idx_user_achievements_user" ON "community_user_achievements"("user_address");
CREATE INDEX IF NOT EXISTS "idx_user_achievements_achievement" ON "community_user_achievements"("achievement_id");
CREATE INDEX IF NOT EXISTS "idx_user_achievements_earned_at" ON "community_user_achievements"("earned_at");

CREATE INDEX IF NOT EXISTS "idx_leaderboards_community" ON "community_leaderboards"("community_id");
CREATE INDEX IF NOT EXISTS "idx_leaderboards_type_period" ON "community_leaderboards"("leaderboard_type", "time_period");
CREATE INDEX IF NOT EXISTS "idx_leaderboards_rank" ON "community_leaderboards"("rank");

CREATE INDEX IF NOT EXISTS "idx_quest_progress_user" ON "community_user_quest_progress"("user_address");
CREATE INDEX IF NOT EXISTS "idx_quest_progress_quest" ON "community_user_quest_progress"("quest_id");
CREATE INDEX IF NOT EXISTS "idx_quest_progress_completed" ON "community_user_quest_progress"("is_completed");

-- Insert default platform badges
INSERT INTO "community_badges" ("name", "slug", "description", "icon", "badge_type", "tier", "category", "criteria") VALUES
('First Post', 'first-post', 'Created your first post in the community', '📝', 'milestone', 'bronze', 'content', '{"action": "create_post", "count": 1}'),
('Active Participant', 'active-participant', 'Made 100 posts or comments', '💬', 'participation', 'silver', 'content', '{"action": "create_content", "count": 100}'),
('Community Veteran', 'community-veteran', 'Been a member for 1 year', '🎖️', 'milestone', 'gold', 'community', '{"action": "membership_duration", "days": 365}'),
('Governance Guru', 'governance-guru', 'Voted on 50 proposals', '🗳️', 'participation', 'gold', 'governance', '{"action": "vote_on_proposal", "count": 50}'),
('Token Holder', 'token-holder', 'Hold at least 1000 LDAO tokens', '💎', 'economic', 'silver', 'economic', '{"action": "token_balance", "amount": 1000}'),
('Staking Champion', 'staking-champion', 'Stake 10,000 LDAO tokens', '🏆', 'economic', 'platinum', 'economic', '{"action": "staking_balance", "amount": 10000}'),
('Helpful Member', 'helpful-member', 'Received 100 upvotes on your posts', '⭐', 'contribution', 'gold', 'social', '{"action": "receive_upvotes", "count": 100}'),
('Early Adopter', 'early-adopter', 'Joined in the first 1000 members', '🚀', 'special', 'diamond', 'community', '{"action": "early_member", "threshold": 1000}'),
('Community Builder', 'community-builder', 'Created a community with 100+ members', '🏗️', 'contribution', 'platinum', 'community', '{"action": "create_community", "members": 100}'),
('NFT Collector', 'nft-collector', 'Own 10 different NFTs from LinkDAO', '🎨', 'economic', 'gold', 'economic', '{"action": "nft_ownership", "count": 10}')
ON CONFLICT (slug) DO NOTHING;

-- Insert default achievements
INSERT INTO "community_achievements" ("name", "slug", "description", "icon", "achievement_type", "points", "requirements", "rewards") VALUES
('Welcome to LinkDAO', 'welcome', 'Complete your profile setup', '👋', 'first_time', 10, '{"action": "complete_profile"}', '{"tokens": 10}'),
('Social Butterfly', 'social-butterfly', 'Follow 50 other users', '🦋', 'milestone', 25, '{"action": "follow_users", "count": 50}', '{"tokens": 25}'),
('Content Creator', 'content-creator', 'Create 10 high-quality posts', '✍️', 'milestone', 50, '{"action": "quality_posts", "count": 10, "min_upvotes": 5}', '{"tokens": 50, "badge": "content-creator"}'),
('Engagement King', 'engagement-king', 'Receive 1000 total interactions', '👑', 'epic', 100, '{"action": "total_engagement", "count": 1000}', '{"tokens": 100, "nft": "engagement_king"}'),
('Proposal Pioneer', 'proposal-pioneer', 'Create your first governance proposal', '💡', 'first_time', 30, '{"action": "create_proposal"}', '{"tokens": 30}'),
('Streak Master', 'streak-master', 'Log in for 30 consecutive days', '🔥', 'milestone', 75, '{"action": "login_streak", "days": 30}', '{"tokens": 75}')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample quests
INSERT INTO "community_quests" ("name", "description", "quest_type", "difficulty", "steps", "rewards") VALUES
('Getting Started', 'Complete your LinkDAO onboarding', 'tutorial', 'easy', '[
    {"step": 1, "action": "complete_profile", "description": "Fill out your profile"},
    {"step": 2, "action": "join_community", "description": "Join your first community"},
    {"step": 3, "action": "create_post", "description": "Create your first post"},
    {"step": 4, "action": "comment", "description": "Leave a comment on a post"}
]', '{"tokens": 100, "badge": "onboarding-complete"}'),

('Daily Engagement', 'Complete daily tasks', 'daily', 'easy', '[
    {"step": 1, "action": "login", "description": "Log in to LinkDAO"},
    {"step": 2, "action": "view_posts", "count": 5, "description": "View 5 posts"},
    {"step": 3, "action": "interact", "count": 3, "description": "Like or comment on 3 posts"}
]', '{"tokens": 10, "reputation": 5}'),

('Governance Participant', 'Participate in DAO governance', 'weekly', 'medium', '[
    {"step": 1, "action": "view_proposals", "count": 3, "description": "Review 3 proposals"},
    {"step": 2, "action": "vote", "count": 2, "description": "Vote on 2 proposals"},
    {"step": 3, "action": "discuss", "description": "Comment on a proposal"}
]', '{"tokens": 50, "reputation": 20}')
ON CONFLICT DO NOTHING;
