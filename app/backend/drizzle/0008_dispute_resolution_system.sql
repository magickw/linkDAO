-- Enhanced disputes table with comprehensive dispute resolution features
DO $$ BEGIN

DROP TABLE IF EXISTS "disputes" CASCADE;
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_id" uuid,
	"reporter_id" uuid,
	"reason" text,
	"status" varchar(32) DEFAULT 'created',
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolution" text,
	"evidence" text,
	"dispute_type" varchar(64) DEFAULT 'other',
	"resolution_method" varchar(32) DEFAULT 'community_arbitrator',
	"evidence_deadline" timestamp,
	"voting_deadline" timestamp,
	"verdict" varchar(32),
	"refund_amount" numeric,
	"resolver_id" uuid,
	"escalated_to_dao" boolean DEFAULT false
);

-- 	ALTER TABLE "disputes" ADD COLUMN "dispute_type" varchar(64) DEFAULT 'other';
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "resolution_method" varchar(32) DEFAULT 'community_arbitrator';
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "evidence_deadline" timestamp;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "voting_deadline" timestamp;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "verdict" varchar(32);
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "refund_amount" numeric;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "resolver_id" uuid;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
-- 	ALTER TABLE "disputes" ADD COLUMN "escalated_to_dao" boolean DEFAULT false;
EXCEPTION
	WHEN duplicate_column THEN null;
END $$;

-- Update existing disputes status to new format
-- UPDATE "disputes" SET "status" = 'created' WHERE "status" = 'open';

-- Add foreign key constraints for disputes
DO $$ BEGIN
	ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolver_id_users_id_fk" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create dispute evidence table
DROP TABLE IF EXISTS "dispute_evidence" CASCADE;
CREATE TABLE IF NOT EXISTS "dispute_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" uuid,
	"submitter_id" uuid,
	"evidence_type" varchar(32) NOT NULL,
	"ipfs_hash" varchar(128) NOT NULL,
	"description" text,
	"timestamp" timestamp DEFAULT now(),
	"verified" boolean DEFAULT false
);

DO $$ BEGIN
	ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create dispute votes table
DROP TABLE IF EXISTS "dispute_votes" CASCADE;
CREATE TABLE IF NOT EXISTS "dispute_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" uuid,
	"voter_id" uuid,
	"verdict" varchar(32) NOT NULL,
	"voting_power" integer NOT NULL,
	"reasoning" text,
	"timestamp" timestamp DEFAULT now()
);

DO $$ BEGIN
	ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_dispute_id_voter_id_unique" UNIQUE("dispute_id","voter_id");
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create arbitrator applications table
DROP TABLE IF EXISTS "arbitrator_applications" CASCADE;
CREATE TABLE IF NOT EXISTS "arbitrator_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" uuid,
	"qualifications" text NOT NULL,
	"experience" text,
	"reputation_score" integer NOT NULL,
	"cases_handled" integer DEFAULT 0,
	"success_rate" numeric DEFAULT '0',
	"approved" boolean DEFAULT false,
	"applied_at" timestamp DEFAULT now(),
	"approved_at" timestamp
);

DO $$ BEGIN
	ALTER TABLE "arbitrator_applications" ADD CONSTRAINT "arbitrator_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "arbitrator_applications" ADD CONSTRAINT "arbitrator_applications_applicant_id_unique" UNIQUE("applicant_id");
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create dispute events table for audit trail
DROP TABLE IF EXISTS "dispute_events" CASCADE;
CREATE TABLE IF NOT EXISTS "dispute_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" uuid,
	"event_type" varchar(64) NOT NULL,
	"actor_id" uuid,
	"description" text,
	"metadata" text,
	"timestamp" timestamp DEFAULT now()
);

DO $$ BEGIN
	ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
	ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_disputes_status" ON "disputes"("status");
CREATE INDEX IF NOT EXISTS "idx_disputes_dispute_type" ON "disputes"("dispute_type");
CREATE INDEX IF NOT EXISTS "idx_disputes_created_at" ON "disputes"("created_at");
CREATE INDEX IF NOT EXISTS "idx_dispute_evidence_dispute_id" ON "dispute_evidence"("dispute_id");
CREATE INDEX IF NOT EXISTS "idx_dispute_votes_dispute_id" ON "dispute_votes"("dispute_id");
CREATE INDEX IF NOT EXISTS "idx_dispute_events_dispute_id" ON "dispute_events"("dispute_id");
CREATE INDEX IF NOT EXISTS "idx_arbitrator_applications_approved" ON "arbitrator_applications"("approved");

-- Insert sample dispute types for reference
INSERT INTO "dispute_events" ("dispute_id", "event_type", "description", "timestamp") VALUES 
(NULL, 'system_init', 'Dispute resolution system initialized', now())
ON CONFLICT DO NOTHING;