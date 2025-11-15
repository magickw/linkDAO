-- Migration: Add Display Name to Users
-- Created: 2025-11-14
-- Description: Adds displayName column to users table for public display names and removes plain text address columns

-- Add displayName column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);

-- Add comment to describe the purpose of the column
COMMENT ON COLUMN users.display_name IS 'Public display name for user profiles';

-- Remove billing address columns that were previously stored in plain text
ALTER TABLE users DROP COLUMN IF EXISTS billing_first_name;
ALTER TABLE users DROP COLUMN IF EXISTS billing_last_name;
ALTER TABLE users DROP COLUMN IF EXISTS billing_company;
ALTER TABLE users DROP COLUMN IF EXISTS billing_address1;
ALTER TABLE users DROP COLUMN IF EXISTS billing_address2;
ALTER TABLE users DROP COLUMN IF EXISTS billing_city;
ALTER TABLE users DROP COLUMN IF EXISTS billing_state;
ALTER TABLE users DROP COLUMN IF EXISTS billing_zip_code;
ALTER TABLE users DROP COLUMN IF EXISTS billing_country;
ALTER TABLE users DROP COLUMN IF EXISTS billing_phone;

-- Remove shipping address columns that were previously stored in plain text
ALTER TABLE users DROP COLUMN IF EXISTS shipping_first_name;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_last_name;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_company;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_address1;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_address2;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_city;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_state;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_zip_code;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_country;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_phone;
ALTER TABLE users DROP COLUMN IF EXISTS shipping_same_as_billing;