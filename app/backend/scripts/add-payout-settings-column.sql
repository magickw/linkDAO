-- Manual Migration Script: Add payout_settings column to sellers table
-- This script can be executed directly against the database if needed

-- Check if column exists first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sellers' 
                   AND column_name = 'payout_settings') THEN
        
        -- Add payout_settings column to sellers table
        ALTER TABLE sellers 
        ADD COLUMN payout_settings JSONB;
        
        -- Add comment for documentation
        COMMENT ON COLUMN sellers.payout_settings IS 'JSON object containing payout configuration including bank account details, crypto addresses, and fiat withdrawal preferences';
        
        RAISE NOTICE 'Column payout_settings added to sellers table successfully';
        
    ELSE
        RAISE NOTICE 'Column payout_settings already exists in sellers table';
    END IF;
END $$;

-- Update statistics for query planner
ANALYZE sellers;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name = 'payout_settings';