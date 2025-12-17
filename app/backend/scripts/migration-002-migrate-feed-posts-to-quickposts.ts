#!/usr/bin/env ts-node

/**
 * Migration script to move home/feed posts to quickPosts table
 * This script identifies posts without title or communityId and moves them to the new quickPosts table
 */

import { db } from '../src/db/connection';
import { sql } from 'drizzle-orm';
import { posts, quickPosts, users, quickPostTags, quickPostReactions, quickPostTips, quickPostViews, quickPostBookmarks, quickPostShares, reactions, tips, views, bookmarks, shares } from '../src/db/schema';

async function migrateFeedPostsToQuickPosts() {
  console.log('🔄 Starting migration of feed posts to quickPosts table...\n');

  try {
    // First, identify posts that should be quick posts (no title and no communityId)
    const feedPostsToMove = await db.execute(sql`
      SELECT 
        id,
        authorId,
        contentCid,
        parentId,
        mediaCids,
        tags,
        stakedValue,
        reputationScore,
        isTokenGated,
        gatedContentPreview,
        moderationStatus,
        moderationWarning,
        riskScore,
        createdAt,
        updatedAt
      FROM posts
      WHERE 
        (title IS NULL OR title = '') 
        AND (communityId IS NULL OR communityId = '')
    `);

    console.log(`Found ${feedPostsToMove.length} feed posts to migrate`);

    if (feedPostsToMove.length === 0) {
      console.log('✅ No feed posts to migrate. All posts already have proper titles or community assignments.');
      return;
    }

    // Process rows properly
    const rows = feedPostsToMove.rows;

    // Insert into quickPosts table
    // Build values array for batch insert
    const values = rows.map(row => 
      `('${row.id}', '${row.authorid}', '${row.contentcid}', ${row.parentid ? `'${row.parentid}'` : 'NULL'}, ${row.mediacids ? `'${row.mediacids}'` : 'NULL'}, ${row.tags ? `'${row.tags}'` : 'NULL'}, 
      ${row.stakedvalue}, ${row.reputationscore}, ${row.istokengated}, ${row.gatedcontentpreview ? `'${row.gatedcontentpreview}'` : 'NULL'}, 
      '${row.moderationstatus}', ${row.moderationwarning ? `'${row.moderationwarning}'` : 'NULL'}, ${row.riskscore}, 
      '${row.createdat}', '${row.updatedat}')`
    ).join(',\n');

    const insertedQuickPosts = await db.execute(sql`
      INSERT INTO quick_posts (
        id,
        author_id,
        content_cid,
        parent_id,
        media_cids,
        tags,
        staked_value,
        reputation_score,
        is_token_gated,
        gated_content_preview,
        moderation_status,
        moderation_warning,
        risk_score,
        created_at,
        updated_at
      )
      VALUES ${values}
      RETURNING id
    `);

    console.log(`✅ Migrated ${insertedQuickPosts.length} posts to quickPosts table`);

    // Extract IDs for the next operations
    const postIds = rows.map(row => `'${row.id}'`).join(', ');

    // Migrate post tags
    const postTagsToMove = await db.execute(sql`
      SELECT 
        pt.post_id,
        pt.tag,
        pt.created_at
      FROM post_tags pt
      WHERE pt.post_id IN (${postIds})
    `);

    if (postTagsToMove.length > 0) {
      const tagValues = postTagsToMove.rows.map(row => 
        `('${row.post_id}', '${row.tag}', '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_tags (quick_post_id, tag, created_at)
        VALUES ${tagValues}
      `);
      console.log(`✅ Migrated ${postTagsToMove.length} post tags to quick_post_tags table`);
    }

    // Migrate reactions
    const reactionsToMove = await db.execute(sql`
      SELECT 
        r.id,
        r.post_id,
        r.user_id,
        r.type,
        r.amount,
        r.rewards_earned,
        r.created_at
      FROM reactions r
      WHERE r.post_id IN (${postIds})
    `);

    if (reactionsToMove.length > 0) {
      const reactionValues = reactionsToMove.rows.map(row => 
        `('${row.post_id}', '${row.user_id}', '${row.type}', ${row.amount}, ${row.rewards_earned}, '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_reactions (quick_post_id, user_id, type, amount, rewards_earned, created_at)
        VALUES ${reactionValues}
      `);
      console.log(`✅ Migrated ${reactionsToMove.length} reactions to quick_post_reactions table`);
    }

    // Migrate tips
    const tipsToMove = await db.execute(sql`
      SELECT 
        t.id,
        t.post_id,
        t.from_user_id,
        t.to_user_id,
        t.token,
        t.amount,
        t.message,
        t.tx_hash,
        t.created_at
      FROM tips t
      WHERE t.post_id IN (${postIds})
    `);

    if (tipsToMove.length > 0) {
      const tipValues = tipsToMove.rows.map(row => 
        `('${row.post_id}', '${row.from_user_id}', '${row.to_user_id}', '${row.token}', ${row.amount}, ${row.message ? `'${row.message}'` : 'NULL'}, '${row.tx_hash}', '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_tips (quick_post_id, from_user_id, to_user_id, token, amount, message, tx_hash, created_at)
        VALUES ${tipValues}
      `);
      console.log(`✅ Migrated ${tipsToMove.length} tips to quick_post_tips table`);
    }

    // Migrate views
    const viewsToMove = await db.execute(sql`
      SELECT 
        v.id,
        v.post_id,
        v.user_id,
        v.ip_address,
        v.user_agent,
        v.created_at
      FROM views v
      WHERE v.post_id IN (${postIds})
    `);

    if (viewsToMove.length > 0) {
      const viewValues = viewsToMove.rows.map(row => 
        `('${row.post_id}', ${row.user_id ? `'${row.user_id}'` : 'NULL'}, ${row.ip_address ? `'${row.ip_address}'` : 'NULL'}, ${row.user_agent ? `'${row.user_agent}'` : 'NULL'}, '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_views (quick_post_id, user_id, ip_address, user_agent, created_at)
        VALUES ${viewValues}
      `);
      console.log(`✅ Migrated ${viewsToMove.length} views to quick_post_views table`);
    }

    // Migrate bookmarks
    const bookmarksToMove = await db.execute(sql`
      SELECT 
        b.user_id,
        b.post_id,
        b.created_at
      FROM bookmarks b
      WHERE b.post_id IN (${postIds})
    `);

    if (bookmarksToMove.length > 0) {
      const bookmarkValues = bookmarksToMove.rows.map(row => 
        `('${row.user_id}', '${row.post_id}', '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_bookmarks (user_id, quick_post_id, created_at)
        VALUES ${bookmarkValues}
      `);
      console.log(`✅ Migrated ${bookmarksToMove.length} bookmarks to quick_post_bookmarks table`);
    }

    // Migrate shares
    const sharesToMove = await db.execute(sql`
      SELECT 
        s.id,
        s.post_id,
        s.user_id,
        s.target_type,
        s.target_id,
        s.message,
        s.created_at
      FROM shares s
      WHERE s.post_id IN (${postIds})
    `);

    if (sharesToMove.length > 0) {
      const shareValues = sharesToMove.rows.map(row => 
        `('${row.post_id}', '${row.user_id}', '${row.target_type}', ${row.target_id ? `'${row.target_id}'` : 'NULL'}, ${row.message ? `'${row.message}'` : 'NULL'}, '${row.created_at}')`
      ).join(',\n');

      await db.execute(sql`
        INSERT INTO quick_post_shares (quick_post_id, user_id, target_type, target_id, message, created_at)
        VALUES ${shareValues}
      `);
      console.log(`✅ Migrated ${sharesToMove.length} shares to quick_post_shares table`);
    }

    // Now delete the migrated posts from the posts table
    await db.execute(sql`
      DELETE FROM posts
      WHERE id IN (${postIds})
    `);

    console.log(`✅ Deleted ${rows.length} migrated posts from posts table`);
    console.log('\n✅ Migration completed successfully!');
    console.log('   - Feed posts are now in quick_posts table');
    console.log('   - Community posts remain in posts table');
    console.log('   - All related data (tags, reactions, tips, views, bookmarks, shares) have been migrated');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateFeedPostsToQuickPosts();