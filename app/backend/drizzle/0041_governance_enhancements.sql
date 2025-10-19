-- Governance Enhancements Migration
-- This migration adds new fields to support sophisticated proposal types

-- Add new columns to community_governance_proposals table
ALTER TABLE "community_governance_proposals" 
ADD COLUMN IF NOT EXISTS "required_stake" numeric(20,8) DEFAULT '0',
ADD COLUMN IF NOT EXISTS "execution_delay" integer;

-- Update existing proposal types to include new sophisticated types
-- This is just documentation as the type field is varchar and can accept new values

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_type" 
ON "community_governance_proposals" ("type");

CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_required_stake" 
ON "community_governance_proposals" ("required_stake");

CREATE INDEX IF NOT EXISTS "idx_community_governance_proposals_execution_delay" 
ON "community_governance_proposals" ("execution_delay");