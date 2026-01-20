-- Quick Polling System Tables
-- Migration: 0033_quick_polling_system.sql

-- Polls table
CREATE TABLE IF NOT EXISTS "polls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" integer NOT NULL,
  "question" text NOT NULL,
  "allow_multiple" boolean DEFAULT false,
  "token_weighted" boolean DEFAULT false,
  "min_tokens" numeric DEFAULT 0,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
);

-- Poll options table
CREATE TABLE IF NOT EXISTS "poll_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_id" uuid NOT NULL,
  "text" text NOT NULL,
  "order_index" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE
);

-- Poll votes table
CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "poll_id" uuid NOT NULL,
  "option_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "token_amount" numeric DEFAULT 1,
  "created_at" timestamp DEFAULT now(),
  FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE,
  FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  UNIQUE("poll_id", "user_id", "option_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_polls_post_id" ON "polls"("post_id");
CREATE INDEX IF NOT EXISTS "idx_polls_expires_at" ON "polls"("expires_at");
CREATE INDEX IF NOT EXISTS "idx_poll_options_poll_id" ON "poll_options"("poll_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_poll_id" ON "poll_votes"("poll_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_user_id" ON "poll_votes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_option_id" ON "poll_votes"("option_id");

-- Add poll_id column to posts table to link posts to polls
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "poll_id" uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_posts_poll_id' 
        AND table_name = 'posts'
    ) THEN
        ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_poll_id" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE SET NULL;
    END IF;
END$$;