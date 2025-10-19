-- Delegation System Migration
-- This migration adds tables to support delegation and proxy voting

-- Create community delegations table
CREATE TABLE IF NOT EXISTS "community_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_id" uuid NOT NULL,
	"delegator_address" varchar(66) NOT NULL,
	"delegate_address" varchar(66) NOT NULL,
	"voting_power" numeric(20,8) DEFAULT '0' NOT NULL,
	"is_revocable" boolean DEFAULT true,
	"expiry_date" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create community proxy votes table
CREATE TABLE IF NOT EXISTS "community_proxy_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"proxy_address" varchar(66) NOT NULL,
	"voter_address" varchar(66) NOT NULL,
	"vote_choice" varchar(10) NOT NULL,
	"voting_power" numeric(20,8) DEFAULT '0' NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "community_delegations" ADD CONSTRAINT "community_delegations_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "community_proxy_votes" ADD CONSTRAINT "community_proxy_votes_proposal_id_community_governance_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "community_governance_proposals"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_community_delegations_community_id" ON "community_delegations" ("community_id");
CREATE INDEX IF NOT EXISTS "idx_community_delegations_delegator" ON "community_delegations" ("delegator_address");
CREATE INDEX IF NOT EXISTS "idx_community_delegations_delegate" ON "community_delegations" ("delegate_address");
CREATE INDEX IF NOT EXISTS "idx_community_delegations_expiry" ON "community_delegations" ("expiry_date");
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_proposal_id" ON "community_proxy_votes" ("proposal_id");
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_proxy" ON "community_proxy_votes" ("proxy_address");
CREATE INDEX IF NOT EXISTS "idx_community_proxy_votes_voter" ON "community_proxy_votes" ("voter_address");