-- Rollback Migration: Revert walletAddress back to address and remove physicalAddress fields
-- This migration reverts the changes made in address_to_wallet_address_migration.sql

-- Step 1: Add back old address column to users table
ALTER TABLE users ADD COLUMN address VARCHAR(66);

-- Step 2: Copy data from wallet_address back to address
UPDATE users SET address = wallet_address WHERE wallet_address IS NOT NULL;

-- Step 3: Add NOT NULL constraint to address
ALTER TABLE users ALTER COLUMN address SET NOT NULL;

-- Step 4: Create unique constraint on address
ALTER TABLE users ADD CONSTRAINT users_address_unique UNIQUE (address);

-- Step 5: Drop new constraints and columns from users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_unique;
ALTER TABLE users DROP COLUMN wallet_address;
ALTER TABLE users DROP COLUMN physical_street;
ALTER TABLE users DROP COLUMN physical_city;
ALTER TABLE users DROP COLUMN physical_state;
ALTER TABLE users DROP COLUMN physical_postal_code;
ALTER TABLE users DROP COLUMN physical_country;
ALTER TABLE users DROP COLUMN physical_address_type;
ALTER TABLE users DROP COLUMN physical_is_default;

-- Step 6: Revert reputations table
ALTER TABLE reputations ADD COLUMN address VARCHAR(66);
UPDATE reputations SET address = wallet_address WHERE wallet_address IS NOT NULL;

-- Step 7: Drop new primary key and create old one for reputations
ALTER TABLE reputations DROP CONSTRAINT reputations_pkey;
ALTER TABLE reputations ADD PRIMARY KEY (address);
ALTER TABLE reputations DROP COLUMN wallet_address;

-- Step 8: Remove shipping address fields from orders table
ALTER TABLE orders DROP COLUMN shipping_street;
ALTER TABLE orders DROP COLUMN shipping_city;
ALTER TABLE orders DROP COLUMN shipping_state;
ALTER TABLE orders DROP COLUMN shipping_postal_code;
ALTER TABLE orders DROP COLUMN shipping_country;
ALTER TABLE orders DROP COLUMN shipping_name;
ALTER TABLE orders DROP COLUMN shipping_phone;

-- Step 9: Drop new indexes
DROP INDEX IF EXISTS idx_users_wallet_address;
DROP INDEX IF EXISTS idx_reputations_wallet_address;
DROP INDEX IF EXISTS idx_orders_shipping_country;