-- Normalize wallet addresses to lowercase across all tables
-- This fixes case-sensitivity issues with product listings and seller lookups
-- Uses a two-phase approach to handle foreign key constraints

BEGIN;

-- Temporarily disable the foreign key constraint
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS fk_marketplace_listings_seller;

-- Step 1: Update sellers table
UPDATE sellers
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address != LOWER(wallet_address);

-- Step 2: Update users table
UPDATE users
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address != LOWER(wallet_address);

-- Step 3: Update marketplace_listings
UPDATE marketplace_listings 
SET seller_address = LOWER(seller_address)
WHERE seller_address IS NOT NULL 
  AND seller_address != LOWER(seller_address);

-- Re-create the foreign key constraint
ALTER TABLE marketplace_listings 
ADD CONSTRAINT fk_marketplace_listings_seller 
FOREIGN KEY (seller_address) 
REFERENCES sellers(wallet_address);

COMMIT;

-- Verification queries
SELECT 'Sellers with mixed case addresses:' as check_type, COUNT(*) as count
FROM sellers
WHERE wallet_address != LOWER(wallet_address)
UNION ALL
SELECT 'Users with mixed case addresses:', COUNT(*)
FROM users
WHERE wallet_address != LOWER(wallet_address)
UNION ALL
SELECT 'Marketplace listings with mixed case:', COUNT(*)
FROM marketplace_listings
WHERE seller_address IS NOT NULL AND seller_address != LOWER(seller_address);
