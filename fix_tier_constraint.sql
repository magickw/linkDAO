-- Fix for the tier constraint violation issue
-- This script will fix the constraint violation by updating invalid tier values

-- First, let's check what values currently exist in the sellers table that are causing the issue
SELECT DISTINCT tier FROM sellers WHERE tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Update any invalid tier values to 'bronze' to satisfy the constraint
UPDATE sellers SET tier = 'bronze' WHERE tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Also update seller_verifications table if it has invalid values
UPDATE seller_verifications SET current_tier = 'bronze' WHERE current_tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- Verify the update worked
SELECT DISTINCT tier FROM sellers WHERE tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');
SELECT DISTINCT current_tier FROM seller_verifications WHERE current_tier NOT IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- If the above queries return no results, then the constraint violation should be fixed
-- You can now run the migration again with the corrected migration file