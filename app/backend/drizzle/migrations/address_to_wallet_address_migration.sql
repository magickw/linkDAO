-- Migration: Rename address to walletAddress and add physicalAddress fields
-- This migration handles the transition from single address field to separate wallet and physical addresses
-- Uses conditional logic to avoid errors if columns already exist

-- Step 1: Add new columns to users table (only if they don't exist)
DO $$ 
BEGIN
    -- Add wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_address') THEN
        ALTER TABLE users ADD COLUMN wallet_address VARCHAR(66);
    END IF;
    
    -- Add physical address columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_street') THEN
        ALTER TABLE users ADD COLUMN physical_street VARCHAR(200);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_city') THEN
        ALTER TABLE users ADD COLUMN physical_city VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_state') THEN
        ALTER TABLE users ADD COLUMN physical_state VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_postal_code') THEN
        ALTER TABLE users ADD COLUMN physical_postal_code VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_country') THEN
        ALTER TABLE users ADD COLUMN physical_country VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_address_type') THEN
        ALTER TABLE users ADD COLUMN physical_address_type VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_is_default') THEN
        ALTER TABLE users ADD COLUMN physical_is_default BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Step 2: Copy data from old address column to new wallet_address column (if old column exists)
DO $$ 
BEGIN
    -- Only copy data if the old address column exists and wallet_address is empty
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
        UPDATE users SET wallet_address = address WHERE address IS NOT NULL AND (wallet_address IS NULL OR wallet_address = '');
        
        -- Add NOT NULL constraint to wallet_address if it doesn't have one
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints tc 
                      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                      WHERE tc.table_name = 'users' AND ccu.column_name = 'wallet_address' AND tc.constraint_type = 'NOT NULL') THEN
            ALTER TABLE users ALTER COLUMN wallet_address SET NOT NULL;
        END IF;
        
        -- Create unique constraint on wallet_address if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_name='users_wallet_address_unique') THEN
            ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);
        END IF;
        
        -- Drop old constraints and column
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_address_unique;
        ALTER TABLE users DROP COLUMN address;
    ELSE
        -- If address column doesn't exist, just ensure wallet_address has proper constraints
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_name='users_wallet_address_unique') THEN
            ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);
        END IF;
    END IF;
END $$;

-- Step 6: Update reputations table
DO $$ 
BEGIN
    -- Add wallet_address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='wallet_address') THEN
        ALTER TABLE reputations ADD COLUMN wallet_address VARCHAR(66);
    END IF;
    
    -- Copy data from old address column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='address') THEN
        UPDATE reputations SET wallet_address = address WHERE address IS NOT NULL AND (wallet_address IS NULL OR wallet_address = '');
        
        -- Set NOT NULL constraint
        ALTER TABLE reputations ALTER COLUMN wallet_address SET NOT NULL;
        
        -- Drop old primary key and create new one
        ALTER TABLE reputations DROP CONSTRAINT IF EXISTS reputations_pkey;
        ALTER TABLE reputations ADD PRIMARY KEY (wallet_address);
        ALTER TABLE reputations DROP COLUMN address;
    ELSE
        -- If address column doesn't exist, ensure wallet_address is primary key
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='reputations' AND constraint_type='PRIMARY KEY') THEN
            ALTER TABLE reputations ADD PRIMARY KEY (wallet_address);
        END IF;
    END IF;
END $$;

-- Step 8: Add shipping address fields to orders table
ALTER TABLE orders ADD COLUMN shipping_street VARCHAR(200);
ALTER TABLE orders ADD COLUMN shipping_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN shipping_state VARCHAR(100);
ALTER TABLE orders ADD COLUMN shipping_postal_code VARCHAR(20);
ALTER TABLE orders ADD COLUMN shipping_country VARCHAR(100);
ALTER TABLE orders ADD COLUMN shipping_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN shipping_phone VARCHAR(20);

-- Step 9: Create indexes for better performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_reputations_wallet_address ON reputations(wallet_address);
CREATE INDEX idx_orders_shipping_country ON orders(shipping_country);