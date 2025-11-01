/**
 * Simple Comment Count Test
 *
 * Tests the basic comment counting implementation with minimal complexity
 */

import { db } from '../../db';
import { safeLogger } from '../utils/safeLogger';
import { posts } from '../../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { sql, eq } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

async function testSimpleCommentCount() {
  safeLogger.info('🧪 Testing Simple Comment Count...\n');

  try {
    // First, check if we have any posts
    const allPosts = await db.select().from(posts).limit(5);
    safeLogger.info(`Found ${allPosts.length} posts in database`);

    if (allPosts.length === 0) {
      safeLogger.info('⚠️  No posts found in database. Comment counting cannot be tested without data.');
      return true;
    }

    // Display first post
    const firstPost = allPosts[0];
    safeLogger.info(`\nFirst post ID: ${firstPost.id}`);
    safeLogger.info(`Has parent: ${firstPost.parentId ? 'Yes (' + firstPost.parentId + ')' : 'No'}`);

    // Count comments for first post
    const commentCountResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(posts)
      .where(eq(posts.parentId, firstPost.id));

    const commentCount = commentCountResult[0]?.count || 0;
    safeLogger.info(`\n✅ Comment count for post ${firstPost.id}: ${commentCount}`);

    // Test on all top-level posts
    safeLogger.info('\n\nTesting comment counts for all top-level posts:');
    const topLevelPosts = allPosts.filter(p => !p.parentId);
    safeLogger.info(`Found ${topLevelPosts.length} top-level posts`);

    for (const post of topLevelPosts.slice(0, 3)) {
      const counts = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(eq(posts.parentId, post.id));

      safeLogger.info(`Post ${post.id}: ${counts[0]?.count || 0} comments`);
    }

    safeLogger.info('\n✅ Simple comment count test passed!\n');
    return true;

  } catch (error) {
    safeLogger.error('\n❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testSimpleCommentCount()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testSimpleCommentCount };
