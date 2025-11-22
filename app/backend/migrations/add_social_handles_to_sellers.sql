-- Migration: Update sellers table - Add social handles and remove display_name
-- Date: 2025-11-22
-- Description: Adds social handle columns (LinkedIn, Facebook, Discord, Telegram) and removes displayName column

-- Add LinkedIn handle column
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS linkedin_handle VARCHAR(100);

-- Add Facebook handle column
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS facebook_handle VARCHAR(100);

-- Add Discord handle column (if not already exists)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS discord_handle VARCHAR(100);

-- Add Telegram handle column (if not already exists)
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS telegram_handle VARCHAR(100);

-- Drop displayName column (no longer needed, storeName is the primary identifier)
-- CASCADE will drop any dependent objects (views, indexes, constraints, etc.)
ALTER TABLE sellers 
DROP COLUMN IF EXISTS display_name CASCADE;

-- Add comments for documentation
COMMENT ON COLUMN sellers.linkedin_handle IS 'LinkedIn profile handle or URL';
COMMENT ON COLUMN sellers.facebook_handle IS 'Facebook profile handle or URL';
COMMENT ON COLUMN sellers.discord_handle IS 'Discord username (e.g., username#1234)';
COMMENT ON COLUMN sellers.telegram_handle IS 'Telegram username (e.g., @username)';
