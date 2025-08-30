-- Enhanced disputes table with comprehensive dispute resolution features
ALTER TABLE "disputes" ADD COLUMN "dispute_type" varchar(64) DEFAULT 'other';
ALTER TABLE "disputes" ADD COLUMN "resolution_method" varchar(32) DEFAULT 'community_arbitrator';
ALTER TABLE "disputes" ADD COLUMN "evidence_deadline" timestamp;
ALTER TABLE "disputes" ADD COLUMN "voting_deadline" timestamp;
ALTER TABLE "disputes" ADD COLUMN "verdict" varchar(32);
ALTER TABLE "disputes" ADD COLUMN "refund_amount" numeric;
ALTER TABLE "disputes" ADD COLUMN "resolver_id" uuid;
ALTER TABLE "disputes" ADD COLUMN "escalated_to_dao" boolean DEFAULT false;

-- Update existing disputes status to new format
UPDATE "disputes" SET "status" = 'created' WHERE "status" = 'open';

-- Add foreign key constraints for disputes
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_escrow_id_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "escrows"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolver_id_users_id_fk" FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create dispute evidence table
CREATE TABLE IF NOT EXISTS "dispute_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" integer,
	"submitter_id" uuid,
	"evidence_type" varchar(32) NOT NULL,
	"ipfs_hash" varchar(128) NOT NULL,
	"description" text,
	"timestamp" timestamp DEFAULT now(),
	"verified" boolean DEFAULT false
);

ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Create dispute votes table
CREATE TABLE IF NOT EXISTS "dispute_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" integer,
	"voter_id" uuid,
	"verdict" varchar(32) NOT NULL,
	"voting_power" integer NOT NULL,
	"reasoning" text,
	"timestamp" timestamp DEFAULT now()
);

ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dispute_votes" ADD CONSTRAINT "dispute_votes_dispute_id_voter_id_unique" UNIQUE("dispute_id","voter_id");

-- Create arbitrator applications table
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

ALTER TABLE "arbitrator_applications" ADD CONSTRAINT "arbitrator_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "arbitrator_applications" ADD CONSTRAINT "arbitrator_applications_applicant_id_unique" UNIQUE("applicant_id");

-- Create dispute events table for audit trail
CREATE TABLE IF NOT EXISTS "dispute_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"dispute_id" integer,
	"event_type" varchar(64) NOT NULL,
	"actor_id" uuid,
	"description" text,
	"metadata" text,
	"timestamp" timestamp DEFAULT now()
);

ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dispute_events" ADD CONSTRAINT "dispute_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

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