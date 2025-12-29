-- Add billing address column to marketplace_users table
-- Migration to add billing address support for marketplace users

DO $$ BEGIN
    ALTER TABLE marketplace_users 
    ADD COLUMN billing_address JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
