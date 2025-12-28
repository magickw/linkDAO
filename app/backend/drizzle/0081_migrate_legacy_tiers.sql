-- Migration: Update Legacy Tier Values to New Tier System
-- Description: Converts all legacy tier values (TIER_1, TIER_2, TIER_3, BASIC, VERIFIED, PRO) 
--              to new tier system (bronze, silver, gold, platinum, diamond)
-- Date: 2025-12-28
-- Note: This migration handles both old and new seller_tier_progression schemas

-- Update sellers table tier column
UPDATE sellers 
SET tier = CASE 
  WHEN LOWER(tier) IN ('basic', 'tier_1') THEN 'bronze'
  WHEN LOWER(tier) IN ('verified', 'tier_2') THEN 'silver'
  WHEN LOWER(tier) IN ('pro', 'tier_3') THEN 'gold'
  WHEN LOWER(tier) = 'platinum' THEN 'platinum'
  WHEN LOWER(tier) = 'diamond' THEN 'diamond'
  ELSE 'bronze' -- Default to bronze for any unknown values
END
WHERE tier IS NOT NULL;

-- Check if seller_tier_progression table exists and has current_tier column
DO $$
BEGIN
  -- Update seller_tier_progression table current_tier column (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_tier_progression' 
    AND column_name = 'current_tier'
  ) THEN
    UPDATE seller_tier_progression
    SET current_tier = CASE 
      WHEN LOWER(current_tier) IN ('basic', 'tier_1') THEN 'bronze'
      WHEN LOWER(current_tier) IN ('verified', 'tier_2') THEN 'silver'
      WHEN LOWER(current_tier) IN ('pro', 'tier_3') THEN 'gold'
      WHEN LOWER(current_tier) = 'platinum' THEN 'platinum'
      WHEN LOWER(current_tier) = 'diamond' THEN 'diamond'
      ELSE 'bronze'
    END
    WHERE current_tier IS NOT NULL;

    -- Update seller_tier_progression table next_eligible_tier column
    UPDATE seller_tier_progression
    SET next_eligible_tier = CASE 
      WHEN LOWER(next_eligible_tier) IN ('basic', 'tier_1') THEN 'bronze'
      WHEN LOWER(next_eligible_tier) IN ('verified', 'tier_2') THEN 'silver'
      WHEN LOWER(next_eligible_tier) IN ('pro', 'tier_3') THEN 'gold'
      WHEN LOWER(next_eligible_tier) = 'platinum' THEN 'platinum'
      WHEN LOWER(next_eligible_tier) = 'diamond' THEN 'diamond'
      ELSE NULL
    END
    WHERE next_eligible_tier IS NOT NULL;
  END IF;

  -- Update seller_tier_progression table current_tier_id column (if it exists - old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_tier_progression' 
    AND column_name = 'current_tier_id'
  ) THEN
    -- This references seller_tiers table, so just ensure the tier IDs are correct
    -- The seller_tiers table should already have bronze, silver, gold, platinum, diamond as IDs
    RAISE NOTICE 'seller_tier_progression uses current_tier_id (references seller_tiers)';
  END IF;
END $$;

-- Update seller_tier_history table from_tier column
UPDATE seller_tier_history
SET from_tier = CASE 
  WHEN LOWER(from_tier) IN ('basic', 'tier_1') THEN 'bronze'
  WHEN LOWER(from_tier) IN ('verified', 'tier_2') THEN 'silver'
  WHEN LOWER(from_tier) IN ('pro', 'tier_3') THEN 'gold'
  WHEN LOWER(from_tier) = 'platinum' THEN 'platinum'
  WHEN LOWER(from_tier) = 'diamond' THEN 'diamond'
  ELSE 'bronze'
END
WHERE from_tier IS NOT NULL;

-- Update seller_tier_history table to_tier column
UPDATE seller_tier_history
SET to_tier = CASE 
  WHEN LOWER(to_tier) IN ('basic', 'tier_1') THEN 'bronze'
  WHEN LOWER(to_tier) IN ('verified', 'tier_2') THEN 'silver'
  WHEN LOWER(to_tier) IN ('pro', 'tier_3') THEN 'gold'
  WHEN LOWER(to_tier) = 'platinum' THEN 'platinum'
  WHEN LOWER(to_tier) = 'diamond' THEN 'diamond'
  ELSE 'bronze'
END
WHERE to_tier IS NOT NULL;

-- Update seller_tier_requirements table tier column
UPDATE seller_tier_requirements
SET tier = CASE 
  WHEN LOWER(tier) IN ('basic', 'tier_1') THEN 'bronze'
  WHEN LOWER(tier) IN ('verified', 'tier_2') THEN 'silver'
  WHEN LOWER(tier) IN ('pro', 'tier_3') THEN 'gold'
  WHEN LOWER(tier) = 'platinum' THEN 'platinum'
  WHEN LOWER(tier) = 'diamond' THEN 'diamond'
  ELSE 'bronze'
END
WHERE tier IS NOT NULL;

-- Update seller_tier_benefits table tier column
UPDATE seller_tier_benefits
SET tier = CASE 
  WHEN LOWER(tier) IN ('basic', 'tier_1') THEN 'bronze'
  WHEN LOWER(tier) IN ('verified', 'tier_2') THEN 'silver'
  WHEN LOWER(tier) IN ('pro', 'tier_3') THEN 'gold'
  WHEN LOWER(tier) = 'platinum' THEN 'platinum'
  WHEN LOWER(tier) = 'diamond' THEN 'diamond'
  ELSE 'bronze'
END
WHERE tier IS NOT NULL;

-- Update seller_scorecards table performance_tier column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seller_scorecards' 
    AND column_name = 'performance_tier'
  ) THEN
    UPDATE seller_scorecards
    SET performance_tier = CASE 
      WHEN LOWER(performance_tier) IN ('basic', 'tier_1') THEN 'bronze'
      WHEN LOWER(performance_tier) IN ('verified', 'tier_2') THEN 'silver'
      WHEN LOWER(performance_tier) IN ('pro', 'tier_3') THEN 'gold'
      WHEN LOWER(performance_tier) = 'platinum' THEN 'platinum'
      WHEN LOWER(performance_tier) = 'diamond' THEN 'diamond'
      ELSE 'bronze'
    END
    WHERE performance_tier IS NOT NULL;
  END IF;
END $$;

-- Update user_reputation_tiers table reputation_tier column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_reputation_tiers'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_reputation_tiers' 
      AND column_name = 'reputation_tier'
    ) THEN
      UPDATE user_reputation_tiers
      SET reputation_tier = CASE 
        WHEN LOWER(reputation_tier) IN ('basic', 'tier_1') THEN 'bronze'
        WHEN LOWER(reputation_tier) IN ('verified', 'tier_2') THEN 'silver'
        WHEN LOWER(reputation_tier) IN ('pro', 'tier_3') THEN 'gold'
        WHEN LOWER(reputation_tier) = 'platinum' THEN 'platinum'
        WHEN LOWER(reputation_tier) = 'diamond' THEN 'diamond'
        ELSE 'bronze'
      END
      WHERE reputation_tier IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Update user_reputation_history table reputation_tier column (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_reputation_history'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_reputation_history' 
      AND column_name = 'reputation_tier'
    ) THEN
      UPDATE user_reputation_history
      SET reputation_tier = CASE 
        WHEN LOWER(reputation_tier) IN ('basic', 'tier_1') THEN 'bronze'
        WHEN LOWER(reputation_tier) IN ('verified', 'tier_2') THEN 'silver'
        WHEN LOWER(reputation_tier) IN ('pro', 'tier_3') THEN 'gold'
        WHEN LOWER(reputation_tier) = 'platinum' THEN 'platinum'
        WHEN LOWER(reputation_tier) = 'diamond' THEN 'diamond'
        ELSE 'bronze'
      END
      WHERE reputation_tier IS NOT NULL;
    END IF;
  END IF;
END $$;
