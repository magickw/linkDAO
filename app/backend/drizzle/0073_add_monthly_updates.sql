-- Create monthly_updates table for creator community updates
CREATE TABLE IF NOT EXISTS "monthly_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "summary" text, -- Short summary for preview
  "month" integer NOT NULL, -- 1-12
  "year" integer NOT NULL,
  "highlights" jsonb DEFAULT '[]', -- Array of highlight items
  "metrics" jsonb DEFAULT '{}', -- Key metrics for the month
  "media_cids" text, -- JSON array of media IPFS CIDs
  "is_published" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key reference to communities table
DO $$ BEGIN
 ALTER TABLE "monthly_updates" ADD CONSTRAINT "monthly_updates_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_monthly_updates_community_id" ON "monthly_updates" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_monthly_updates_year_month" ON "monthly_updates" ("year", "month");
CREATE INDEX IF NOT EXISTS "idx_monthly_updates_is_published" ON "monthly_updates" ("is_published");
CREATE INDEX IF NOT EXISTS "idx_monthly_updates_published_at" ON "monthly_updates" ("published_at" DESC);

-- Create unique constraint on community_id, month, year to prevent duplicate updates
CREATE UNIQUE INDEX IF NOT EXISTS "idx_monthly_updates_unique_month" ON "monthly_updates" ("community_id", "year", "month");
