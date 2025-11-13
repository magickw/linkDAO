-- Check database state after UUID migration
-- This script helps diagnose cache warming failures

-- 1. Check if listings table has UUIDs
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'listings' 
    AND column_name = 'id';

-- 2. Sample listings to verify UUID format
SELECT id, seller_id, created_at 
FROM listings 
LIMIT 5;

-- 3. Check for any NULL IDs after migration
SELECT COUNT(*) as null_ids 
FROM listings 
WHERE id IS NULL;

-- 4. Check sellers table
SELECT COUNT(*) as total_sellers FROM sellers;

-- 5. Sample seller addresses that actually exist
SELECT wallet_address, store_name, created_at 
FROM sellers 
LIMIT 10;

-- 6. Check if there are any orders referencing non-existent listings
SELECT o.id as order_id, o.listing_id, l.id as listing_exists
FROM orders o
LEFT JOIN listings l ON o.listing_id = l.id
WHERE l.id IS NULL
LIMIT 10;

-- 7. Check categories table (used in cache warming)
SELECT COUNT(*) as total_categories FROM categories;

-- 8. Sample categories
SELECT id, name, slug FROM categories LIMIT 10;