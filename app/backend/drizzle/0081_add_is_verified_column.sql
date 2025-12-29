-- Add is_verified column to users table
-- This column is for verified badge (trust/fame protection), separate from 2FA

DO $$ 
BEGIN
    -- Add is_verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_verified column to users table';
    ELSE
        RAISE NOTICE 'Column is_verified already exists in users table';
    END IF;
END $$;

-- Create index for faster queries on verified users
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = TRUE;
