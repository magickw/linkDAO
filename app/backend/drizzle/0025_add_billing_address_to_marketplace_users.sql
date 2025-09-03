-- Add billing address column to marketplace_users table
-- Migration to add billing address support for marketplace users

ALTER TABLE marketplace_users 
ADD COLUMN billing_address JSONB;