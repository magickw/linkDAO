g-- Query to find duplicate wallet addresses in the users table
-- Run this BEFORE the deduplication migration to see what will be affected

-- Show all duplicate wallet addresses with details
SELECT
    LOWER(u.wallet_address) as wallet_address,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(u.id ORDER BY u.created_at ASC) as user_ids,
    ARRAY_AGG(u.handle ORDER BY u.created_at ASC) as handles,
    ARRAY_AGG(u.created_at ORDER BY u.created_at ASC) as created_dates,
    MIN(u.created_at) as oldest_created_at,
    MAX(u.created_at) as newest_created_at
FROM users u
GROUP BY LOWER(u.wallet_address)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Show posts count for each duplicate user
SELECT
    LOWER(u.wallet_address) as wallet_address,
    u.id as user_id,
    u.handle,
    u.created_at,
    (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count,
    (SELECT COUNT(*) FROM quick_posts WHERE author_id = u.id) as quick_post_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
    (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count
FROM users u
WHERE LOWER(u.wallet_address) IN (
    SELECT LOWER(wallet_address)
    FROM users
    GROUP BY LOWER(wallet_address)
    HAVING COUNT(*) > 1
)
ORDER BY LOWER(u.wallet_address), u.created_at ASC;

-- Summary statistics
SELECT
    'Total Users' as metric,
    COUNT(*) as value
FROM users
UNION ALL
SELECT
    'Unique Wallet Addresses' as metric,
    COUNT(DISTINCT LOWER(wallet_address)) as value
FROM users
UNION ALL
SELECT
    'Duplicate Wallet Addresses' as metric,
    COUNT(*) as value
FROM (
    SELECT LOWER(wallet_address)
    FROM users
    GROUP BY LOWER(wallet_address)
    HAVING COUNT(*) > 1
) dup
UNION ALL
SELECT
    'Total Duplicate User Records' as metric,
    COUNT(*) - COUNT(DISTINCT LOWER(wallet_address)) as value
FROM users;
