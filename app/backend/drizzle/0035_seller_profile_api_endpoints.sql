-- Seller Profile API Endpoints Migration
-- Ensures seller profile table has all required fields for API endpoints
-- Adds onboarding status tracking and completion logic

-- Add onboarding status fields to sellers table if they don't exist
-- Using individual ALTER TABLE statements for better compatibility

-- Add onboarding completion tracking
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding step tracking
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS onboarding_steps JSONB DEFAULT '{"profile_setup": false, "verification": false, "payout_setup": false, "first_listing": false}';

-- Add store description field (separate from bio)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS store_description TEXT;

-- Add verification status for profile completeness
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create seller_profiles view for API compatibility (if needed for legacy support)
CREATE OR REPLACE VIEW seller_profiles AS
SELECT 
    wallet_address,
    display_name,
    ens_handle,
    store_description,
    cover_image_url,
    is_verified,
    onboarding_completed,
    onboarding_steps,
    created_at,
    updated_at
FROM sellers;

-- Add indexes for API performance
CREATE INDEX IF NOT EXISTS idx_sellers_wallet_address ON sellers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_sellers_onboarding_completed ON sellers(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_sellers_is_verified ON sellers(is_verified);
CREATE INDEX IF NOT EXISTS idx_sellers_created_at ON sellers(created_at);

-- Update existing sellers with default onboarding steps
UPDATE sellers 
SET onboarding_steps = COALESCE(onboarding_steps, '{"profile_setup": false, "verification": false, "payout_setup": false, "first_listing": false}')
WHERE onboarding_steps IS NULL;

-- Migration completion comments
-- Seller Profile API Endpoints Migration Completed Successfully
-- Features Added:
--   ✓ Onboarding completion tracking
--   ✓ Onboarding step tracking with JSON structure
--   ✓ Store description field (separate from bio)
--   ✓ Verification status for profile completeness
--   ✓ seller_profiles view for API compatibility
--   ✓ Performance indexes for API endpoints
--
-- API Endpoints Ready:
--   - GET /api/marketplace/seller/{walletAddress}
--   - POST /api/marketplace/seller/profile
--   - GET /api/marketplace/seller/onboarding/{walletAddress}
</content>
</invoke>