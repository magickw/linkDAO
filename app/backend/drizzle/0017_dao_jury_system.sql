-- AI Content Moderation System - DAO Jury Selection and Voting
-- Migration: 0017_dao_jury_system.sql

-- Core moderation cases table
CREATE TABLE IF NOT EXISTS "moderation_cases" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_id" varchar(64) NOT NULL,
  "content_type" varchar(24) NOT NULL,
  "user_id" uuid NOT NULL,
  "status" varchar(24) DEFAULT 'pending',
  "risk_score" numeric DEFAULT '0',
  "decision" varchar(24),
  "reason_code" varchar(48),
  "confidence" numeric DEFAULT '0',
  "vendor_scores" jsonb DEFAULT '{}',
  "evidence_cid" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Moderation actions/enforcement
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "content_id" varchar(64) NOT NULL,
  "action" varchar(24) NOT NULL,
  "duration_sec" integer DEFAULT 0,
  "applied_by" varchar(64),
  "rationale" text,
  "created_at" timestamp DEFAULT now()
);

-- Community reports
CREATE TABLE IF NOT EXISTS "content_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "content_id" varchar(64) NOT NULL,
  "reporter_id" uuid NOT NULL,
  "reason" varchar(48) NOT NULL,
  "details" text,
  "weight" numeric DEFAULT '1',
  "status" varchar(24) DEFAULT 'open',
  "created_at" timestamp DEFAULT now()
);

-- Appeals system
CREATE TABLE IF NOT EXISTS "moderation_appeals" (
  "id" serial PRIMARY KEY NOT NULL,
  "case_id" integer NOT NULL,
  "appellant_id" uuid NOT NULL,
  "status" varchar(24) DEFAULT 'open',
  "stake_amount" numeric DEFAULT '0',
  "jury_decision" varchar(24),
  "decision_cid" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- DAO Jury system tables
CREATE TABLE IF NOT EXISTS "appeal_jurors" (
  "id" serial PRIMARY KEY NOT NULL,
  "appeal_id" integer NOT NULL,
  "juror_id" uuid NOT NULL,
  "selection_round" integer NOT NULL,
  "status" varchar(24) DEFAULT 'selected',
  "stake_amount" numeric DEFAULT '0',
  "vote_commitment" text,
  "vote_reveal" varchar(24),
  "vote_timestamp" timestamp,
  "reward_amount" numeric DEFAULT '0',
  "slashed_amount" numeric DEFAULT '0',
  "created_at" timestamp DEFAULT now()
);

-- Jury voting sessions
CREATE TABLE IF NOT EXISTS "jury_voting_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "appeal_id" integer NOT NULL,
  "session_round" integer NOT NULL,
  "commit_phase_start" timestamp NOT NULL,
  "commit_phase_end" timestamp NOT NULL,
  "reveal_phase_start" timestamp NOT NULL,
  "reveal_phase_end" timestamp NOT NULL,
  "required_jurors" integer DEFAULT 5,
  "selected_jurors" integer DEFAULT 0,
  "committed_votes" integer DEFAULT 0,
  "revealed_votes" integer DEFAULT 0,
  "status" varchar(24) DEFAULT 'setup',
  "final_decision" varchar(24),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Juror eligibility and reputation tracking
CREATE TABLE IF NOT EXISTS "juror_eligibility" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "reputation_score" numeric DEFAULT '1.0',
  "total_stake" numeric DEFAULT '0',
  "active_cases" integer DEFAULT 0,
  "completed_cases" integer DEFAULT 0,
  "correct_decisions" integer DEFAULT 0,
  "incorrect_decisions" integer DEFAULT 0,
  "last_activity" timestamp,
  "is_eligible" boolean DEFAULT true,
  "suspension_until" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Audit logging for moderation decisions
CREATE TABLE IF NOT EXISTS "moderation_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "action_type" varchar(64) NOT NULL,
  "actor_id" varchar(64) NOT NULL,
  "actor_type" varchar(24) NOT NULL,
  "target_id" varchar(64),
  "target_type" varchar(24),
  "old_state" jsonb,
  "new_state" jsonb,
  "reasoning" text,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now()
);

-- Reputation history tracking
CREATE TABLE IF NOT EXISTS "reputation_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "impact_type" varchar(50) NOT NULL,
  "impact_value" numeric NOT NULL,
  "previous_score" numeric NOT NULL,
  "new_score" numeric NOT NULL,
  "reason" text,
  "related_entity_type" varchar(50),
  "related_entity_id" varchar(128),
  "created_at" timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "moderation_cases_content_idx" ON "moderation_cases" ("content_id");
CREATE INDEX IF NOT EXISTS "moderation_cases_user_idx" ON "moderation_cases" ("user_id");
CREATE INDEX IF NOT EXISTS "moderation_cases_status_idx" ON "moderation_cases" ("status");

CREATE INDEX IF NOT EXISTS "moderation_appeals_case_idx" ON "moderation_appeals" ("case_id");
CREATE INDEX IF NOT EXISTS "moderation_appeals_appellant_idx" ON "moderation_appeals" ("appellant_id");
CREATE INDEX IF NOT EXISTS "moderation_appeals_status_idx" ON "moderation_appeals" ("status");

CREATE INDEX IF NOT EXISTS "appeal_jurors_appeal_idx" ON "appeal_jurors" ("appeal_id");
CREATE INDEX IF NOT EXISTS "appeal_jurors_juror_idx" ON "appeal_jurors" ("juror_id");
CREATE INDEX IF NOT EXISTS "appeal_jurors_status_idx" ON "appeal_jurors" ("status");

CREATE INDEX IF NOT EXISTS "jury_voting_sessions_appeal_idx" ON "jury_voting_sessions" ("appeal_id");
CREATE INDEX IF NOT EXISTS "jury_voting_sessions_status_idx" ON "jury_voting_sessions" ("status");

CREATE INDEX IF NOT EXISTS "juror_eligibility_user_idx" ON "juror_eligibility" ("user_id");
CREATE INDEX IF NOT EXISTS "juror_eligibility_eligible_idx" ON "juror_eligibility" ("is_eligible");

CREATE INDEX IF NOT EXISTS "content_reports_content_idx" ON "content_reports" ("content_id");
CREATE INDEX IF NOT EXISTS "content_reports_reporter_idx" ON "content_reports" ("reporter_id");

-- Foreign key constraints
ALTER TABLE "moderation_appeals" ADD CONSTRAINT "moderation_appeals_case_id_fk" 
  FOREIGN KEY ("case_id") REFERENCES "moderation_cases"("id") ON DELETE CASCADE;

ALTER TABLE "appeal_jurors" ADD CONSTRAINT "appeal_jurors_appeal_id_fk" 
  FOREIGN KEY ("appeal_id") REFERENCES "moderation_appeals"("id") ON DELETE CASCADE;

ALTER TABLE "jury_voting_sessions" ADD CONSTRAINT "jury_voting_sessions_appeal_id_fk" 
  FOREIGN KEY ("appeal_id") REFERENCES "moderation_appeals"("id") ON DELETE CASCADE;

ALTER TABLE "juror_eligibility" ADD CONSTRAINT "juror_eligibility_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "moderation_cases" ADD CONSTRAINT "moderation_cases_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fk" 
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "reputation_history" ADD CONSTRAINT "reputation_history_user_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;