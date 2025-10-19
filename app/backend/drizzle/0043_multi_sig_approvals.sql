-- Multi-signature Approvals Migration
-- This migration adds tables to support multi-signature governance actions

-- Create community multi-signature approvals table
CREATE TABLE IF NOT EXISTS "community_multi_sig_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"approver_address" varchar(66) NOT NULL,
	"signature" text,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text
);

-- Add foreign key constraints
ALTER TABLE "community_multi_sig_approvals" ADD CONSTRAINT "community_multi_sig_approvals_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "community_governance_proposals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_proposal_id" ON "community_multi_sig_approvals" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_approver" ON "community_multi_sig_approvals" ("approver_address");
CREATE INDEX IF NOT EXISTS "idx_community_multi_sig_approvals_approved_at" ON "community_multi_sig_approvals" ("approved_at");

-- Add multi-sig fields to community_governance_proposals table
ALTER TABLE "community_governance_proposals" 
ADD COLUMN IF NOT EXISTS "required_signatures" integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS "signatures_obtained" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "multi_sig_enabled" boolean DEFAULT false;

-- Create indexes for multi-sig fields
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_multi_sig" ON "community_governance_proposals" ("multi_sig_enabled");
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_required_signatures" ON "community_governance_proposals" ("required_signatures");