-- Create announcements table
CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "community_id" uuid NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "type" text DEFAULT 'info' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp
);

-- Add foreign key reference to communities table
DO $$ BEGIN
 ALTER TABLE "announcements" ADD CONSTRAINT "announcements_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_announcements_community_id" ON "announcements" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_is_active" ON "announcements" ("is_active");
