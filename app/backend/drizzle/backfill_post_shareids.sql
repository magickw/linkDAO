-- Backfill shareId for existing posts that don't have one
-- This migration ensures all posts have a shareId for share URL functionality

DO $$
DECLARE
    post_record RECORD;
    new_share_id VARCHAR(16);
    updated_count INTEGER := 0;
BEGIN
    -- Loop through all posts without a shareId
    FOR post_record IN 
        SELECT id FROM posts WHERE share_id IS NULL
    LOOP
        -- Generate a random 8-character base62 shareId
        new_share_id := '';
        FOR i IN 1..8 LOOP
            new_share_id := new_share_id || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 
                                                     floor(random() * 62 + 1)::int, 1);
        END LOOP;
        
        -- Update the post with the new shareId
        UPDATE posts 
        SET share_id = new_share_id 
        WHERE id = post_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Updated % posts with new shareIds', updated_count;
END $$;

-- Verify the update
SELECT 
    COUNT(*) as total_posts,
    COUNT(share_id) as posts_with_shareid,
    COUNT(*) - COUNT(share_id) as posts_without_shareid
FROM posts;
