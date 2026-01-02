DO $$ BEGIN
 ALTER TABLE "posts" ADD COLUMN "location" jsonb;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "quick_posts" ADD COLUMN "location" jsonb;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "quick_posts" ADD COLUMN "media_urls" text;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
