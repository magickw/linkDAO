-- Communities System Migration
-- This migration creates the core community tables to replace mock data

-- Communities table
CREATE TABLE IF NOT EXISTS "communities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL UNIQUE,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"rules" text, -- JSON array of rules
	"member_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"avatar" text,
	"banner" text,
	"category" varchar(100) NOT NULL,
	"tags" text, -- JSON array of tags
	"is_public" boolean DEFAULT true NOT NULL,
	"moderators" text, -- JSON array of moderator addresses
	"treasury_address" varchar(66),
	"governance_token" varchar(66),
	"settings" text, -- JSON CommunitySettings object
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Community members table
CREATE TABLE IF NOT EXISTS "community_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"user_address" varchar(66) NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL, -- 'member', 'moderator', 'admin'
	"reputation" integer DEFAULT 0 NOT NULL,
	"contributions" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("community_id", "user_address")
);

-- Community statistics table for analytics
CREATE TABLE IF NOT EXISTS "community_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL UNIQUE,
	"active_members_7d" integer DEFAULT 0 NOT NULL,
	"active_members_30d" integer DEFAULT 0 NOT NULL,
	"posts_7d" integer DEFAULT 0 NOT NULL,
	"posts_30d" integer DEFAULT 0 NOT NULL,
	"engagement_rate" numeric(5,4) DEFAULT 0 NOT NULL,
	"growth_rate_7d" numeric(5,4) DEFAULT 0 NOT NULL,
	"growth_rate_30d" numeric(5,4) DEFAULT 0 NOT NULL,
	"trending_score" numeric(10,4) DEFAULT 0 NOT NULL,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Community categories table for better organization
CREATE TABLE IF NOT EXISTS "community_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL UNIQUE,
	"slug" varchar(100) NOT NULL UNIQUE,
	"description" text,
	"icon" varchar(100),
	"color" varchar(7), -- hex color code
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_stats" ADD CONSTRAINT "community_stats_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_communities_name" ON "communities" ("name");
CREATE INDEX IF NOT EXISTS "idx_communities_category" ON "communities" ("category");
CREATE INDEX IF NOT EXISTS "idx_communities_is_public" ON "communities" ("is_public");
CREATE INDEX IF NOT EXISTS "idx_communities_member_count" ON "communities" ("member_count");
CREATE INDEX IF NOT EXISTS "idx_communities_created_at" ON "communities" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_community_members_community_id" ON "community_members" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_members_user_address" ON "community_members" ("user_address");
CREATE INDEX IF NOT EXISTS "idx_community_members_role" ON "community_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_community_members_is_active" ON "community_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_community_members_joined_at" ON "community_members" ("joined_at");

CREATE INDEX IF NOT EXISTS "idx_community_stats_trending_score" ON "community_stats" ("trending_score");
CREATE INDEX IF NOT EXISTS "idx_community_stats_growth_rate_7d" ON "community_stats" ("growth_rate_7d");
CREATE INDEX IF NOT EXISTS "idx_community_stats_last_calculated_at" ON "community_stats" ("last_calculated_at");

CREATE INDEX IF NOT EXISTS "idx_community_categories_slug" ON "community_categories" ("slug");
CREATE INDEX IF NOT EXISTS "idx_community_categories_is_active" ON "community_categories" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_community_categories_sort_order" ON "community_categories" ("sort_order");

-- Insert default categories
INSERT INTO "community_categories" ("name", "slug", "description", "icon", "color", "sort_order") VALUES
('General', 'general', 'General discussion and community topics', 'chat', '#6B7280', 1),
('Finance', 'finance', 'DeFi, trading, and financial discussions', 'dollar-sign', '#10B981', 2),
('Technology', 'technology', 'Tech discussions, development, and innovation', 'cpu', '#3B82F6', 3),
('Art', 'art', 'NFTs, digital art, and creative content', 'palette', '#EC4899', 4),
('Governance', 'governance', 'DAO governance, proposals, and voting', 'vote', '#8B5CF6', 5),
('Gaming', 'gaming', 'Web3 gaming, GameFi, and play-to-earn', 'gamepad-2', '#F59E0B', 6),
('Education', 'education', 'Learning resources and educational content', 'book-open', '#06B6D4', 7),
('News', 'news', 'Latest news and updates in Web3', 'newspaper', '#EF4444', 8)
ON CONFLICT (slug) DO NOTHING;

-- Update posts table to reference communities properly
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "community_id" uuid;
CREATE INDEX IF NOT EXISTS "idx_posts_community_id" ON "posts" ("community_id");

-- Add foreign key constraint for posts to communities (optional, since dao field exists)
-- ALTER TABLE "posts" ADD CONSTRAINT "posts_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;