-- AI-powered Recommendations Migration
-- This migration adds tables to support AI-powered recommendation system

-- Create user interaction logs table for recommendation training
CREATE TABLE IF NOT EXISTS "user_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"target_type" varchar(32) NOT NULL, -- 'community', 'post', 'user'
	"target_id" varchar(66) NOT NULL, -- ID of the target (community_id, post_id, user_address)
	"interaction_type" varchar(32) NOT NULL, -- 'view', 'join', 'follow', 'like', 'comment', 'share'
	"interaction_value" numeric(10,4) DEFAULT 1.0, -- Weight/value of interaction
	"metadata" text, -- JSON additional data
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create community recommendations table for precomputed recommendations
CREATE TABLE IF NOT EXISTS "community_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"community_id" uuid NOT NULL,
	"score" numeric(10,4) NOT NULL, -- Recommendation score
	"reasons" text, -- JSON array of reasons for recommendation
	"algorithm_version" varchar(32) DEFAULT 'v1.0',
	"expires_at" timestamp, -- When recommendation expires
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("user_id", "community_id")
);

-- Create user recommendations table for precomputed user suggestions
CREATE TABLE IF NOT EXISTS "user_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL, -- User receiving the recommendation
	"recommended_user_id" uuid NOT NULL, -- User being recommended
	"score" numeric(10,4) NOT NULL, -- Recommendation score
	"reasons" text, -- JSON array of reasons for recommendation
	"mutual_connections" integer DEFAULT 0,
	"shared_interests" text, -- JSON array of shared interests
	"algorithm_version" varchar(32) DEFAULT 'v1.0',
	"expires_at" timestamp, -- When recommendation expires
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("user_id", "recommended_user_id")
);

-- Create trending content table for cross-community trending
CREATE TABLE IF NOT EXISTS "trending_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" varchar(32) NOT NULL, -- 'community', 'post', 'user', 'topic'
	"content_id" varchar(66) NOT NULL, -- ID of the content
	"score" numeric(10,4) NOT NULL, -- Trending score
	"timeframe" varchar(16) NOT NULL, -- 'hourly', 'daily', 'weekly'
	"rank" integer NOT NULL, -- Rank within timeframe
	"metadata" text, -- JSON additional data
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("content_type", "content_id", "timeframe")
);

-- Create event calendar table for community events
CREATE TABLE IF NOT EXISTS "community_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_type" varchar(50) NOT NULL, -- 'meeting', 'ama', 'workshop', 'competition', 'other'
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"location" text, -- Could be physical address or virtual link
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar(100), -- cron expression or simple pattern
	"max_attendees" integer,
	"rsvp_required" boolean DEFAULT false,
	"rsvp_deadline" timestamp,
	"metadata" text, -- JSON additional data
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create user event RSVPs table
CREATE TABLE IF NOT EXISTS "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed', -- 'confirmed', 'maybe', 'declined'
	"attendees_count" integer DEFAULT 1,
	"metadata" text, -- JSON additional data
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	UNIQUE("event_id", "user_id")
);

-- Add foreign key constraints
ALTER TABLE "user_interactions" ADD CONSTRAINT "user_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_recommendations" ADD CONSTRAINT "community_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_recommendations" ADD CONSTRAINT "community_recommendations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_recommended_user_id_users_id_fk" FOREIGN KEY ("recommended_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_community_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_user_interactions_user_id" ON "user_interactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_interactions_target_type" ON "user_interactions" ("target_type");
CREATE INDEX IF NOT EXISTS "idx_user_interactions_target_id" ON "user_interactions" ("target_id");
CREATE INDEX IF NOT EXISTS "idx_user_interactions_interaction_type" ON "user_interactions" ("interaction_type");
CREATE INDEX IF NOT EXISTS "idx_user_interactions_created_at" ON "user_interactions" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_community_recommendations_user_id" ON "community_recommendations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_community_id" ON "community_recommendations" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_score" ON "community_recommendations" ("score");
CREATE INDEX IF NOT EXISTS "idx_community_recommendations_expires_at" ON "community_recommendations" ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_user_recommendations_user_id" ON "user_recommendations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_recommended_user_id" ON "user_recommendations" ("recommended_user_id");
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_score" ON "user_recommendations" ("score");
CREATE INDEX IF NOT EXISTS "idx_user_recommendations_expires_at" ON "user_recommendations" ("expires_at");

CREATE INDEX IF NOT EXISTS "idx_trending_content_content_type" ON "trending_content" ("content_type");
CREATE INDEX IF NOT EXISTS "idx_trending_content_content_id" ON "trending_content" ("content_id");
CREATE INDEX IF NOT EXISTS "idx_trending_content_timeframe" ON "trending_content" ("timeframe");
CREATE INDEX IF NOT EXISTS "idx_trending_content_score" ON "trending_content" ("score");
CREATE INDEX IF NOT EXISTS "idx_trending_content_rank" ON "trending_content" ("rank");
CREATE INDEX IF NOT EXISTS "idx_trending_content_calculated_at" ON "trending_content" ("calculated_at");

CREATE INDEX IF NOT EXISTS "idx_community_events_community_id" ON "community_events" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_events_start_time" ON "community_events" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_community_events_event_type" ON "community_events" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_community_events_is_recurring" ON "community_events" ("is_recurring");

CREATE INDEX IF NOT EXISTS "idx_event_rsvps_event_id" ON "event_rsvps" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_rsvps_user_id" ON "event_rsvps" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_rsvps_status" ON "event_rsvps" ("status");