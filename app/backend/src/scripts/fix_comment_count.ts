import { db } from '../db';
import { comments, posts, statuses } from '../db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';

/**
 * Script to debug and fix comment count mismatch issues
 *
 * This script checks for discrepancies between:
 * 1. The comment count shown on posts
 * 2. The actual comments returned when fetching
 *
 * Common causes:
 * - Comments with wrong postId/statusId mapping
 * - Comments with moderation status that filters them out
 * - Comments in deleted/hidden state
 */

async function analyzeCommentMismatch() {
  console.log('🔍 Analyzing comment count mismatches...\n');

  try {
    // Get all posts with their comment counts
    const allPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        author: posts.authorId,
      })
      .from(posts)
      .limit(100);

    for (const post of allPosts) {
      // Count all comments for this post
      const totalComments = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      // Count visible comments (not blocked)
      const visibleComments = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(
          and(
            eq(comments.postId, post.id),
            sql`(${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked')`
          )
        );

      // Count blocked comments
      const blockedComments = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(
          and(
            eq(comments.postId, post.id),
            sql`${comments.moderationStatus} = 'blocked'`
          )
        );

      const total = Number(totalComments[0]?.count || 0);
      const visible = Number(visibleComments[0]?.count || 0);
      const blocked = Number(blockedComments[0]?.count || 0);

      if (total !== visible) {
        console.log(`\n📊 Post ID ${post.id}:`);
        console.log(`   Title: ${post.title || 'Untitled'}`);
        console.log(`   Total comments: ${total}`);
        console.log(`   Visible comments: ${visible}`);
        console.log(`   Blocked comments: ${blocked}`);

        if (total > 0) {
          // Get sample comments to see what's wrong
          const sampleComments = await db
            .select({
              id: comments.id,
              content: comments.content,
              moderationStatus: comments.moderationStatus,
              postId: comments.postId,
              statusId: comments.statusId,
            })
            .from(comments)
            .where(eq(comments.postId, post.id))
            .limit(5);

          console.log(`   Sample comments:`);
          sampleComments.forEach(c => {
            console.log(`     - ID: ${c.id}, Status: ${c.moderationStatus || 'NULL'}, PostId: ${c.postId}, StatusId: ${c.statusId}`);
          });
        }
      }
    }

    console.log('\n\n🔍 Checking statuses...\n');

    // Check statuses
    const allStatuses = await db
      .select({
        id: statuses.id,
        content: statuses.content,
        author: statuses.authorId,
      })
      .from(statuses)
      .limit(100);

    for (const status of allStatuses) {
      // Count all comments for this status
      const totalComments = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(eq(comments.statusId, status.id));

      // Count visible comments (not blocked)
      const visibleComments = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(
          and(
            eq(comments.statusId, status.id),
            sql`(${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked')`
          )
        );

      const total = Number(totalComments[0]?.count || 0);
      const visible = Number(visibleComments[0]?.count || 0);

      if (total !== visible && total > 0) {
        console.log(`\n📊 Status ID ${status.id}:`);
        console.log(`   Content: ${status.content?.substring(0, 50)}...`);
        console.log(`   Total comments: ${total}`);
        console.log(`   Visible comments: ${visible}`);
      }
    }

    console.log('\n✅ Analysis complete!');
  } catch (error) {
    console.error('❌ Error analyzing comment mismatch:', error);
    throw error;
  }
}

// Run the analysis
analyzeCommentMismatch()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
