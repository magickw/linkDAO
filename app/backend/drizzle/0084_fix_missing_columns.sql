-- Migration to fix missing columns and tables for moderation and posts

-- 1. Create moderation_cases table
CREATE TABLE IF NOT EXISTS "moderation_cases" (
  "id" serial PRIMARY KEY,
  "content_id" varchar(64) NOT NULL,
  "content_type" varchar(24) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "assigned_moderator_id" uuid REFERENCES "users"("id"),
  "status" varchar(24) DEFAULT 'pending',
  "risk_score" numeric(5, 4) DEFAULT 0,
  "decision" varchar(24),
  "reason_code" varchar(48),
  "confidence" numeric(5, 4) DEFAULT 0,
  "vendor_scores" text, -- JSON string
  "evidence_cid" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "moderation_cases_content_idx" ON "moderation_cases" ("content_id");
CREATE INDEX IF NOT EXISTS "moderation_cases_user_idx" ON "moderation_cases" ("user_id");
CREATE INDEX IF NOT EXISTS "moderation_cases_status_idx" ON "moderation_cases" ("status");

-- 2. Create moderation_actions table
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" serial PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "content_id" varchar(64) NOT NULL,
  "action" varchar(24) NOT NULL,
  "duration_sec" integer DEFAULT 0,
  "applied_by" varchar(64),
  "rationale" text,
  "created_at" timestamp DEFAULT now()
);

-- 3. Create content_reports table
CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" serial PRIMARY KEY,
  "content_id" varchar(64) NOT NULL,
  "target_type" varchar(32),
  "target_id" varchar(64),
  "report_type" varchar(32),
  "reporter_id" uuid NOT NULL REFERENCES "users"("id"),
  "reporter_weight" numeric DEFAULT 1,
  "reason" varchar(48) NOT NULL,
  "details" text,
  "weight" numeric DEFAULT 1,
  "status" varchar(24) DEFAULT 'open',
  "resolution" text,
  "moderator_notes" text,
  "consensus_score" numeric(5, 2),
  "validated_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "content_reports_content_idx" ON "content_reports" ("content_id");
CREATE INDEX IF NOT EXISTS "content_reports_reporter_idx" ON "content_reports" ("reporter_id");

-- 4. Add missing columns to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "media_urls" text; -- JSON array of media URLs
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderation_status" varchar(24) DEFAULT 'active';
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "moderation_warning" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "risk_score" numeric(5, 4) DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_pinned" boolean DEFAULT false;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "pinned_at" timestamp;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "pinned_by" text;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "upvotes" integer DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "downvotes" integer DEFAULT 0;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "share_id" varchar(16);

CREATE INDEX IF NOT EXISTS "idx_posts_share_id" ON "posts" ("share_id");
