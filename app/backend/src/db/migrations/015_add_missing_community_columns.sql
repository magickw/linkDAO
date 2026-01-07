-- Migration: 015_add_missing_community_columns
-- Purpose: Add missing columns to communities table to match schema definition
-- This migration adds columns that may be missing from the production database

-- Check and add is_verified column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE communities ADD COLUMN is_verified BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_verified column';
    END IF;
END $$;

-- Check and add treasury_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'treasury_address'
    ) THEN
        ALTER TABLE communities ADD COLUMN treasury_address VARCHAR(66);
        RAISE NOTICE 'Added treasury_address column';
    END IF;
END $$;

-- Check and add governance_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'governance_token'
    ) THEN
        ALTER TABLE communities ADD COLUMN governance_token VARCHAR(66);
        RAISE NOTICE 'Added governance_token column';
    END IF;
END $$;

-- Check and add settings column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'settings'
    ) THEN
        ALTER TABLE communities ADD COLUMN settings TEXT;
        RAISE NOTICE 'Added settings column';
    END IF;
END $$;

-- Check and add moderators column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'moderators'
    ) THEN
        ALTER TABLE communities ADD COLUMN moderators TEXT;
        RAISE NOTICE 'Added moderators column';
    END IF;
END $$;

-- Check and add creator_address column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'creator_address'
    ) THEN
        ALTER TABLE communities ADD COLUMN creator_address VARCHAR(66);
        RAISE NOTICE 'Added creator_address column';
    END IF;
END $$;

-- Check and add display_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'display_name'
    ) THEN
        ALTER TABLE communities ADD COLUMN display_name VARCHAR(255);
        RAISE NOTICE 'Added display_name column';
    END IF;
END $$;

-- Check and add avatar column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'avatar'
    ) THEN
        ALTER TABLE communities ADD COLUMN avatar TEXT;
        RAISE NOTICE 'Added avatar column';
    END IF;
END $$;

-- Check and add banner column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'banner'
    ) THEN
        ALTER TABLE communities ADD COLUMN banner TEXT;
        RAISE NOTICE 'Added banner column';
    END IF;
END $$;

-- Check and add tags column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'tags'
    ) THEN
        ALTER TABLE communities ADD COLUMN tags TEXT;
        RAISE NOTICE 'Added tags column';
    END IF;
END $$;

-- Check and add rules column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'rules'
    ) THEN
        ALTER TABLE communities ADD COLUMN rules TEXT;
        RAISE NOTICE 'Added rules column';
    END IF;
END $$;

-- Check and add member_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'member_count'
    ) THEN
        ALTER TABLE communities ADD COLUMN member_count INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added member_count column';
    END IF;
END $$;

-- Check and add post_count column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'communities' AND column_name = 'post_count'
    ) THEN
        ALTER TABLE communities ADD COLUMN post_count INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Added post_count column';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN communities.is_verified IS 'Verification status of the community';
COMMENT ON COLUMN communities.treasury_address IS 'Treasury wallet address for the community';
COMMENT ON COLUMN communities.governance_token IS 'Governance token contract address';
COMMENT ON COLUMN communities.settings IS 'JSON object containing community settings';
COMMENT ON COLUMN communities.moderators IS 'JSON array of moderator wallet addresses';
COMMENT ON COLUMN communities.creator_address IS 'Wallet address of the community creator';
COMMENT ON COLUMN communities.display_name IS 'Display name of the community';
COMMENT ON COLUMN communities.avatar IS 'Avatar image URL or CID';
COMMENT ON COLUMN communities.banner IS 'Banner image URL or CID';
COMMENT ON COLUMN communities.tags IS 'JSON array of community tags';
COMMENT ON COLUMN communities.rules IS 'JSON array of community rules';
COMMENT ON COLUMN communities.member_count IS 'Number of members in the community';
COMMENT ON COLUMN communities.post_count IS 'Number of posts in the community';

-- Create index on creator_address if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'communities' AND indexname = 'idx_communities_creator_address'
    ) THEN
        CREATE INDEX idx_communities_creator_address ON communities(creator_address);
        RAISE NOTICE 'Created idx_communities_creator_address index';
    END IF;
END $$;

-- Create index on is_public if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'communities' AND indexname = 'idx_communities_is_public'
    ) THEN
        CREATE INDEX idx_communities_is_public ON communities(is_public);
        RAISE NOTICE 'Created idx_communities_is_public index';
    END IF;
END $$;

-- Create index on member_count if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'communities' AND indexname = 'idx_communities_member_count'
    ) THEN
        CREATE INDEX idx_communities_member_count ON communities(member_count);
        RAISE NOTICE 'Created idx_communities_member_count index';
    END IF;
END $$;

-- Create index on created_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'communities' AND indexname = 'idx_communities_created_at'
    ) THEN
        CREATE INDEX idx_communities_created_at ON communities(created_at);
        RAISE NOTICE 'Created idx_communities_created_at index';
    END IF;
END $$;