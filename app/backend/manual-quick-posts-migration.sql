-- Manual Database Migration Script for Quick Posts Table
-- Run this directly in your PostgreSQL database to fix the quick_posts API 500 errors

-- First, check if the table already exists and drop it to avoid conflicts
DROP TABLE IF EXISTS "quick_post_shares" CASCADE;
DROP TABLE IF EXISTS "quick_post_bookmarks" CASCADE;
DROP TABLE IF EXISTS "quick_post_views" CASCADE;
DROP TABLE IF EXISTS "quick_post_tips" CASCADE;
DROP TABLE IF EXISTS "quick_post_reactions" CASCADE;
DROP TABLE IF EXISTS "quick_post_tags" CASCADE;
DROP TABLE IF EXISTS "quick_posts" CASCADE;
DROP TABLE IF EXISTS "comments" CASCADE;

-- Create quick_posts table
CREATE TABLE IF NOT EXISTS "quick_posts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" TEXT,
    "content_cid" TEXT NOT NULL,
    "parent_id" UUID REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "media_cids" TEXT,
    "tags" TEXT,
    "staked_value" NUMERIC DEFAULT '0',
    "reputation_score" INTEGER DEFAULT 0,
    "is_token_gated" BOOLEAN DEFAULT false,
    "gated_content_preview" TEXT,
    "moderation_status" VARCHAR(24) DEFAULT 'active',
    "moderation_warning" TEXT,
    "risk_score" NUMERIC(5, 4) DEFAULT '0',
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_quick_posts_moderation_status" ON "quick_posts"("moderation_status");
CREATE INDEX IF NOT EXISTS "idx_quick_posts_author_id" ON "quick_posts"("author_id");
CREATE INDEX IF NOT EXISTS "idx_quick_posts_created_at" ON "quick_posts"("created_at");

-- Create quick_post_tags table
CREATE TABLE IF NOT EXISTS "quick_post_tags" (
    "id" SERIAL PRIMARY KEY,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "tag" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_tag" ON "quick_post_tags"("quick_post_id", "tag");

-- Create comments table
CREATE TABLE IF NOT EXISTS "comments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id" INTEGER REFERENCES "posts"("id") ON DELETE CASCADE,
    "quick_post_id" UUID REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "parent_comment_id" UUID REFERENCES "comments"("id"),
    "upvotes" INTEGER DEFAULT 0,
    "downvotes" INTEGER DEFAULT 0,
    "moderation_status" VARCHAR(24) DEFAULT 'active',
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_comments_post_id" ON "comments"("post_id");
CREATE INDEX IF NOT EXISTS "idx_comments_quick_post_id" ON "comments"("quick_post_id");
CREATE INDEX IF NOT EXISTS "idx_comments_author_id" ON "comments"("author_id");
CREATE INDEX IF NOT EXISTS "idx_comments_created_at" ON "comments"("created_at");

-- Create quick_post_reactions table
CREATE TABLE IF NOT EXISTS "quick_post_reactions" (
    "id" SERIAL PRIMARY KEY,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" VARCHAR(32) NOT NULL,
    "amount" NUMERIC NOT NULL,
    "rewards_earned" NUMERIC DEFAULT '0',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_reaction_user" ON "quick_post_reactions"("quick_post_id", "user_id");

-- Create quick_post_tips table
CREATE TABLE IF NOT EXISTS "quick_post_tips" (
    "id" SERIAL PRIMARY KEY,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "from_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "to_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token" VARCHAR(64) NOT NULL,
    "amount" NUMERIC NOT NULL,
    "message" TEXT,
    "tx_hash" VARCHAR(66),
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_tip" ON "quick_post_tips"("quick_post_id");

-- Create quick_post_views table
CREATE TABLE IF NOT EXISTS "quick_post_views" (
    "id" SERIAL PRIMARY KEY,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_view_post_user" ON "quick_post_views"("quick_post_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_quick_post_view_created_at" ON "quick_post_views"("created_at");

-- Create quick_post_bookmarks table
CREATE TABLE IF NOT EXISTS "quick_post_bookmarks" (
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("user_id", "quick_post_id")
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_bookmark_user" ON "quick_post_bookmarks"("user_id");
CREATE INDEX IF NOT EXISTS "idx_quick_post_bookmark_post" ON "quick_post_bookmarks"("quick_post_id");

-- Create quick_post_shares table
CREATE TABLE IF NOT EXISTS "quick_post_shares" (
    "id" SERIAL PRIMARY KEY,
    "quick_post_id" UUID NOT NULL REFERENCES "quick_posts"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "target_type" VARCHAR(32) NOT NULL,
    "target_id" UUID,
    "message" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_quick_post_share_post_user" ON "quick_post_shares"("quick_post_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_quick_post_share_created_at" ON "quick_post_shares"("created_at");

-- Verify table creation
SELECT 'quick_posts' as table_name, COUNT(*) as record_count FROM quick_posts
UNION ALL
SELECT 'quick_post_tags' as table_name, COUNT(*) as record_count FROM quick_post_tags
UNION ALL
SELECT 'comments' as table_name, COUNT(*) as record_count FROM comments
UNION ALL
SELECT 'quick_post_reactions' as table_name, COUNT(*) as record_count FROM quick_post_reactions
UNION ALL
SELECT 'quick_post_tips' as table_name, COUNT(*) as record_count FROM quick_post_tips
UNION ALL
SELECT 'quick_post_views' as table_name, COUNT(*) as record_count FROM quick_post_views
UNION ALL
SELECT 'quick_post_bookmarks' as table_name, COUNT(*) as record_count FROM quick_post_bookmarks
UNION ALL
SELECT 'quick_post_shares' as table_name, COUNT(*) as record_count FROM quick_post_shares;

-- Success message
SELECT 'Quick posts tables created successfully!' as status;