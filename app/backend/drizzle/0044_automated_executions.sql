-- Automated Proposal Executions Migration
-- This migration adds tables to support automated proposal execution

-- Create community automated executions table
CREATE TABLE IF NOT EXISTS "community_automated_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"execution_type" varchar(50) NOT NULL,
	"execution_time" timestamp,
	"recurrence_pattern" varchar(100),
	"dependency_proposal_id" uuid,
	"execution_status" varchar(32) DEFAULT 'pending',
	"execution_result" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "community_automated_executions" ADD CONSTRAINT "ca_executions_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "community_governance_proposals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_automated_executions" ADD CONSTRAINT "ca_executions_dependency_fk" FOREIGN KEY ("dependency_proposal_id") REFERENCES "community_governance_proposals"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_proposal_id" ON "community_automated_executions" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_type" ON "community_automated_executions" ("execution_type");
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_time" ON "community_automated_executions" ("execution_time");
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_status" ON "community_automated_executions" ("execution_status");
CREATE INDEX IF NOT EXISTS "idx_community_automated_executions_dependency" ON "community_automated_executions" ("dependency_proposal_id");

-- Add automated execution fields to community_governance_proposals table
ALTER TABLE "community_governance_proposals" 
ADD COLUMN IF NOT EXISTS "auto_execute" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "execution_template" text; -- JSON template for automated execution

-- Create indexes for automated execution fields
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_auto_execute" ON "community_governance_proposals" ("auto_execute");