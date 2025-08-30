-- Add missing columns to content_reports table for community reporting system
ALTER TABLE "content_reports" ADD COLUMN "content_type" varchar(24) NOT NULL DEFAULT 'post';
ALTER TABLE "content_reports" ADD COLUMN "category" varchar(24);
ALTER TABLE "content_reports" ADD COLUMN "moderator_id" uuid;
ALTER TABLE "content_reports" ADD COLUMN "resolution" text;
ALTER TABLE "content_reports" ADD COLUMN "moderator_notes" text;
ALTER TABLE "content_reports" ADD COLUMN "updated_at" timestamp DEFAULT now();

-- Add foreign key constraint for moderator_id
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Add new indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_content_reports_category" ON "content_reports" ("category");
CREATE INDEX IF NOT EXISTS "idx_content_reports_moderator" ON "content_reports" ("moderator_id");

-- Update existing records to have a default content_type
UPDATE "content_reports" SET "content_type" = 'post' WHERE "content_type" IS NULL;

-- Remove the default after updating existing records
ALTER TABLE "content_reports" ALTER COLUMN "content_type" DROP DEFAULT;