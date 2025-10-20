-- Simple migration to ensure database matches current schema
-- This script is safe to run multiple times

DO $$ 
BEGIN
    -- Ensure users table has wallet_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_address') THEN
        ALTER TABLE users ADD COLUMN wallet_address VARCHAR(66);
        
        -- Copy data from address column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='address') THEN
            UPDATE users SET wallet_address = address WHERE address IS NOT NULL;
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_address_unique;
            ALTER TABLE users DROP COLUMN address;
        END IF;
        
        -- Set constraints
        ALTER TABLE users ALTER COLUMN wallet_address SET NOT NULL;
        ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);
    END IF;
    
    -- Ensure users table has physical_address column (JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='physical_address') THEN
        ALTER TABLE users ADD COLUMN physical_address TEXT;
    END IF;
    
    -- Ensure reputations table has wallet_address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='wallet_address') THEN
        ALTER TABLE reputations ADD COLUMN wallet_address VARCHAR(66);
        
        -- Copy data from address column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reputations' AND column_name='address') THEN
            UPDATE reputations SET wallet_address = address WHERE address IS NOT NULL;
            ALTER TABLE reputations DROP CONSTRAINT IF EXISTS reputations_pkey;
            ALTER TABLE reputations DROP COLUMN address;
        END IF;
        
        -- Set constraints
        ALTER TABLE reputations ALTER COLUMN wallet_address SET NOT NULL;
        ALTER TABLE reputations ADD PRIMARY KEY (wallet_address);
    END IF;
    
    -- Create indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_wallet_address') THEN
        CREATE INDEX idx_users_wallet_address ON users(wallet_address);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reputations_wallet_address') THEN
        CREATE INDEX idx_reputations_wallet_address ON reputations(wallet_address);
    END IF;
    
    RAISE NOTICE 'Schema migration completed successfully';
END $$;