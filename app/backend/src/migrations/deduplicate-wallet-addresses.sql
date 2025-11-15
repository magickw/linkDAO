-- Migration: Deduplicate wallet addresses and ensure unique constraint
-- This migration finds duplicate wallet addresses, merges their data, and enforces uniqueness

-- Step 1: Find duplicate wallet addresses
-- This query will help identify which addresses have duplicates
DO $$
DECLARE
    duplicate_record RECORD;
    keep_user_id UUID;
    delete_user_ids UUID[];
BEGIN
    RAISE NOTICE 'Starting deduplication process...';

    -- Loop through each duplicate wallet address
    FOR duplicate_record IN
        SELECT
            LOWER(wallet_address) as wallet_addr,
            COUNT(*) as count
        FROM users
        GROUP BY LOWER(wallet_address)
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Found % duplicates for wallet address: %', duplicate_record.count, duplicate_record.wallet_addr;

        -- Get the oldest user ID (the one we'll keep)
        SELECT id INTO keep_user_id
        FROM users
        WHERE LOWER(wallet_address) = duplicate_record.wallet_addr
        ORDER BY created_at ASC, id ASC
        LIMIT 1;

        RAISE NOTICE 'Keeping user ID: %', keep_user_id;

        -- Get all the duplicate user IDs (the ones we'll delete)
        SELECT ARRAY_AGG(id) INTO delete_user_ids
        FROM users
        WHERE LOWER(wallet_address) = duplicate_record.wallet_addr
        AND id != keep_user_id;

        RAISE NOTICE 'Will delete user IDs: %', delete_user_ids;

        -- Update all posts to point to the kept user
        UPDATE posts
        SET author_id = keep_user_id
        WHERE author_id = ANY(delete_user_ids);

        -- Update all quick_posts to point to the kept user
        UPDATE quick_posts
        SET author_id = keep_user_id
        WHERE author_id = ANY(delete_user_ids);

        -- Update all votes to point to the kept user
        UPDATE votes
        SET user_id = keep_user_id
        WHERE user_id = ANY(delete_user_ids);

        -- Update all follows where the duplicate is the follower
        UPDATE follows
        SET follower_id = keep_user_id
        WHERE follower_id = ANY(delete_user_ids)
        AND NOT EXISTS (
            SELECT 1 FROM follows f2
            WHERE f2.follower_id = keep_user_id
            AND f2.following_id = follows.following_id
        );

        -- Update all follows where the duplicate is being followed
        UPDATE follows
        SET following_id = keep_user_id
        WHERE following_id = ANY(delete_user_ids)
        AND NOT EXISTS (
            SELECT 1 FROM follows f2
            WHERE f2.follower_id = follows.follower_id
            AND f2.following_id = keep_user_id
        );

        -- Delete any remaining duplicate follows (would cause unique constraint violations)
        DELETE FROM follows
        WHERE follower_id = ANY(delete_user_ids)
        OR following_id = ANY(delete_user_ids);

        -- Update bookmarks
        UPDATE bookmarks
        SET user_id = keep_user_id
        WHERE user_id = ANY(delete_user_ids)
        AND NOT EXISTS (
            SELECT 1 FROM bookmarks b2
            WHERE b2.user_id = keep_user_id
            AND b2.post_id = bookmarks.post_id
            AND b2.post_type = bookmarks.post_type
        );

        -- Delete any remaining duplicate bookmarks
        DELETE FROM bookmarks
        WHERE user_id = ANY(delete_user_ids);

        -- Update shares
        UPDATE shares
        SET user_id = keep_user_id
        WHERE user_id = ANY(delete_user_ids);

        -- Update views
        UPDATE views
        SET user_id = keep_user_id
        WHERE user_id = ANY(delete_user_ids);

        -- Update tips (as sender)
        UPDATE tips
        SET sender_id = keep_user_id
        WHERE sender_id = ANY(delete_user_ids);

        -- Update tips (as recipient)
        UPDATE tips
        SET recipient_id = keep_user_id
        WHERE recipient_id = ANY(delete_user_ids);

        -- Update community memberships
        UPDATE community_members
        SET user_id = keep_user_id
        WHERE user_id = ANY(delete_user_ids)
        AND NOT EXISTS (
            SELECT 1 FROM community_members cm2
            WHERE cm2.user_id = keep_user_id
            AND cm2.community_id = community_members.community_id
        );

        -- Delete any remaining duplicate community memberships
        DELETE FROM community_members
        WHERE user_id = ANY(delete_user_ids);

        -- Merge profile data (keep the most complete profile)
        UPDATE users
        SET
            handle = COALESCE(users.handle, dup.handle),
            display_name = COALESCE(users.display_name, dup.display_name),
            profile_cid = COALESCE(users.profile_cid, dup.profile_cid),
            email = COALESCE(users.email, dup.email),
            billing_first_name = COALESCE(users.billing_first_name, dup.billing_first_name),
            billing_last_name = COALESCE(users.billing_last_name, dup.billing_last_name),
            billing_address1 = COALESCE(users.billing_address1, dup.billing_address1),
            billing_city = COALESCE(users.billing_city, dup.billing_city),
            billing_state = COALESCE(users.billing_state, dup.billing_state),
            billing_zip_code = COALESCE(users.billing_zip_code, dup.billing_zip_code),
            billing_country = COALESCE(users.billing_country, dup.billing_country),
            billing_phone = COALESCE(users.billing_phone, dup.billing_phone)
        FROM (
            SELECT
                id,
                handle,
                display_name,
                profile_cid,
                email,
                billing_first_name,
                billing_last_name,
                billing_address1,
                billing_city,
                billing_state,
                billing_zip_code,
                billing_country,
                billing_phone
            FROM users
            WHERE id = ANY(delete_user_ids)
            ORDER BY updated_at DESC, created_at DESC
            LIMIT 1
        ) AS dup
        WHERE users.id = keep_user_id;

        -- Now delete the duplicate users
        DELETE FROM users
        WHERE id = ANY(delete_user_ids);

        RAISE NOTICE 'Successfully merged and deleted duplicates for wallet address: %', duplicate_record.wallet_addr;
    END LOOP;

    RAISE NOTICE 'Deduplication process completed!';
END $$;

-- Step 2: Ensure unique constraint exists on wallet_address
-- First, drop the constraint if it exists (might not exist or might be named differently)
DO $$
BEGIN
    -- Try to drop any existing unique constraint on wallet_address
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_wallet_address_unique'
    ) THEN
        ALTER TABLE users DROP CONSTRAINT users_wallet_address_unique;
        RAISE NOTICE 'Dropped existing unique constraint';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'No existing unique constraint to drop';
END $$;

-- Create the unique constraint (case-insensitive by normalizing to lowercase)
-- First, normalize all existing wallet addresses to lowercase
UPDATE users SET wallet_address = LOWER(wallet_address);

-- Add the unique constraint
ALTER TABLE users ADD CONSTRAINT users_wallet_address_unique UNIQUE (wallet_address);

-- Add a comment
COMMENT ON CONSTRAINT users_wallet_address_unique ON users IS 'Ensures each wallet address can only have one user account';

-- Step 3: Create a unique index for case-insensitive lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_address_lower
ON users (LOWER(wallet_address));

COMMENT ON INDEX idx_users_wallet_address_lower IS 'Case-insensitive unique index for wallet addresses';
