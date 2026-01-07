-- Migration: Data Migration from Flat Address Structure
-- Number: 0097
-- Created: 2026-01-06
-- Description: Migrates existing billing and shipping addresses from users table to user_addresses table

-- Migrate existing billing addresses
INSERT INTO user_addresses (
  user_id, 
  address_type, 
  label,
  first_name, 
  last_name, 
  company, 
  phone,
  address_line1, 
  address_line2, 
  city, 
  state, 
  postal_code, 
  country,
  is_default, 
  created_at,
  updated_at
)
SELECT 
  id, 
  'billing', 
  'Primary Billing',
  billing_first_name, 
  billing_last_name, 
  billing_company, 
  billing_phone,
  billing_address1, 
  billing_address2, 
  billing_city, 
  billing_state, 
  billing_zip_code, 
  COALESCE(billing_country, 'US'),
  true, 
  created_at,
  updated_at
FROM users
WHERE billing_address1 IS NOT NULL 
  AND billing_address1 != ''
  AND billing_first_name IS NOT NULL
  AND billing_last_name IS NOT NULL;

-- Migrate existing shipping addresses
INSERT INTO user_addresses (
  user_id, 
  address_type, 
  label,
  first_name, 
  last_name, 
  company, 
  phone,
  address_line1, 
  address_line2, 
  city, 
  state, 
  postal_code, 
  country,
  is_default, 
  created_at,
  updated_at
)
SELECT 
  id, 
  'shipping', 
  'Primary Shipping',
  shipping_first_name, 
  shipping_last_name, 
  shipping_company, 
  shipping_phone,
  shipping_address1, 
  shipping_address2, 
  shipping_city, 
  shipping_state, 
  shipping_zip_code, 
  COALESCE(shipping_country, 'US'),
  true, 
  created_at,
  updated_at
FROM users
WHERE shipping_address1 IS NOT NULL 
  AND shipping_address1 != ''
  AND shipping_first_name IS NOT NULL
  AND shipping_last_name IS NOT NULL
  AND NOT shipping_same_as_billing; -- Only migrate if different from billing

-- Initialize buyer profiles for all existing users
INSERT INTO buyer_profiles (user_id, created_at, updated_at)
SELECT id, created_at, updated_at
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Update buyer profile stats from existing orders
UPDATE buyer_profiles bp
SET 
  total_orders = stats.order_count,
  total_spent = stats.total_amount,
  average_order_value = CASE 
    WHEN stats.order_count > 0 THEN stats.total_amount / stats.order_count 
    ELSE 0 
  END,
  last_purchase_at = stats.last_order_date,
  updated_at = CURRENT_TIMESTAMP
FROM (
  SELECT 
    buyer_id,
    COUNT(*) as order_count,
    SUM(COALESCE(total_amount, amount, 0)) as total_amount,
    MAX(created_at) as last_order_date
  FROM orders
  WHERE status IN ('completed', 'processing')
  GROUP BY buyer_id
) stats
WHERE bp.user_id = stats.buyer_id;

-- Update address counts in buyer profiles
UPDATE buyer_profiles bp
SET 
  saved_addresses_count = (
    SELECT COUNT(*) 
    FROM user_addresses ua 
    WHERE ua.user_id = bp.user_id
  ),
  updated_at = CURRENT_TIMESTAMP;

-- Add comments to deprecated columns in users table
COMMENT ON COLUMN users.billing_first_name IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_last_name IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_company IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_address1 IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_address2 IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_city IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_state IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_zip_code IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_country IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.billing_phone IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';

COMMENT ON COLUMN users.shipping_first_name IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_last_name IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_company IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_address1 IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_address2 IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_city IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_state IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_zip_code IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_country IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_phone IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';
COMMENT ON COLUMN users.shipping_same_as_billing IS 'DEPRECATED: Use user_addresses table instead. Kept for backward compatibility.';

-- Log migration completion
DO $$
DECLARE
  migrated_billing_count INTEGER;
  migrated_shipping_count INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_billing_count FROM user_addresses WHERE address_type = 'billing';
  SELECT COUNT(*) INTO migrated_shipping_count FROM user_addresses WHERE address_type = 'shipping';
  SELECT COUNT(*) INTO total_users FROM users;
  
  RAISE NOTICE 'Address Migration Complete:';
  RAISE NOTICE '  - Migrated % billing addresses', migrated_billing_count;
  RAISE NOTICE '  - Migrated % shipping addresses', migrated_shipping_count;
  RAISE NOTICE '  - Total users: %', total_users;
  RAISE NOTICE '  - Buyer profiles initialized: %', (SELECT COUNT(*) FROM buyer_profiles);
END $$;
