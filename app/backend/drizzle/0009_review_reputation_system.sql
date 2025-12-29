-- Review and Reputation System Tables

-- Reviews table for storing user reviews
DROP TABLE IF EXISTS "reviews" CASCADE;
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewee_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"listing_id" uuid,
	"rating" integer NOT NULL,
	"title" varchar(200),
	"comment" text,
	"ipfs_hash" varchar(128),
	"blockchain_tx_hash" varchar(66),
	"verification_status" varchar(32) DEFAULT 'pending',
	"helpful_votes" integer DEFAULT 0,
	"report_count" integer DEFAULT 0,
	"moderation_status" varchar(32) DEFAULT 'active',
	"moderation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Review helpfulness tracking
DROP TABLE IF EXISTS "review_helpfulness" CASCADE;
CREATE TABLE IF NOT EXISTS "review_helpfulness" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"is_helpful" boolean NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Review reports for moderation
DROP TABLE IF EXISTS "review_reports" CASCADE;
CREATE TABLE IF NOT EXISTS "review_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'pending',
	"moderator_id" uuid,
	"moderator_notes" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);

-- Reputation history tracking
DROP TABLE IF EXISTS "reputation_history" CASCADE;
CREATE TABLE IF NOT EXISTS "reputation_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"previous_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"change_reason" varchar(100) NOT NULL,
	"related_entity_type" varchar(32),
	"related_entity_id" integer,
	"calculation_details" text,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_users_id_fk" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add unique constraints
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_order_unique" UNIQUE("reviewer_id","order_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "review_helpfulness" ADD CONSTRAINT "review_helpfulness_review_user_unique" UNIQUE("review_id","user_id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "reviews_reviewee_rating_idx" ON "reviews" ("reviewee_id","rating");
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" ("created_at");
CREATE INDEX IF NOT EXISTS "reputation_history_user_created_idx" ON "reputation_history" ("user_id","created_at");

-- Add check constraints
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);