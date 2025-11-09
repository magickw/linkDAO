-- Check all communities and their visibility status
-- Run this in your database to see which communities exist and their is_public status

-- 1. List all communities with their public status
SELECT
    id,
    name,
    display_name,
    is_public,
    member_count,
    created_at
FROM communities
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count public vs private communities
SELECT
    is_public,
    COUNT(*) as count
FROM communities
GROUP BY is_public;

-- 3. Find communities that are NOT public (these won't show on the communities page)
SELECT
    id,
    name,
    display_name,
    is_public,
    created_at
FROM communities
WHERE is_public = false
ORDER BY created_at DESC;

-- 4. To make a specific community public, run this (replace 'your-community-id' with actual ID):
-- UPDATE communities
-- SET is_public = true, updated_at = NOW()
-- WHERE id = 'your-community-id';

-- 5. Or if you want to make ALL communities public:
-- UPDATE communities
-- SET is_public = true, updated_at = NOW()
-- WHERE is_public = false;
