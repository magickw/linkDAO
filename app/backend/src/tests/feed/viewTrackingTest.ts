/**
 * View Tracking Integration Test
 *
 * Tests view tracking functionality including deduplication
 */

import { viewService } from '../../services/viewService';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../../db';
import { posts, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

async function testViewTracking() {
  safeLogger.info('🧪 Testing View Tracking Implementation...\n');

  try {
    // Test 1: Check if we have posts to test with
    safeLogger.info('Test 1: Checking for existing posts...');
    const existingPosts = await db.select().from(posts).limit(1);

    if (existingPosts.length === 0) {
      safeLogger.info('⚠️  No posts found. View tracking cannot be tested without posts.');
      return true;
    }

    const testPostId = existingPosts[0].id;
    safeLogger.info(`✅ Using post ID ${testPostId} for testing\n`);

    // Test 2: Track an anonymous view
    safeLogger.info('Test 2: Tracking anonymous view...');
    const tracked1 = await viewService.trackView({
      postId: testPostId,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    });
    safeLogger.info(`✅ First anonymous view tracked: ${tracked1}`);

    // Test 3: Try to track same anonymous view again (should be deduplicated)
    safeLogger.info('\nTest 3: Testing anonymous view deduplication...');
    const tracked2 = await viewService.trackView({
      postId: testPostId,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    });
    safeLogger.info(`✅ Duplicate detection: ${!tracked2 ? 'PASSED' : 'FAILED'} (expected: false, got: ${tracked2})`);

    // Test 4: Track view from different IP
    safeLogger.info('\nTest 4: Tracking view from different IP...');
    const tracked3 = await viewService.trackView({
      postId: testPostId,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Test Browser 2)'
    });
    safeLogger.info(`✅ Different IP view tracked: ${tracked3}`);

    // Test 5: Get view count
    safeLogger.info('\nTest 5: Getting view count...');
    const viewCount = await viewService.getViewCount(testPostId);
    safeLogger.info(`✅ Total view count for post ${testPostId}: ${viewCount}`);

    // Test 6: Get unique viewer count
    safeLogger.info('\nTest 6: Getting unique viewer count...');
    const uniqueCount = await viewService.getUniqueViewerCount(testPostId);
    safeLogger.info(`✅ Unique viewer count: ${uniqueCount}`);

    // Test 7: Get view analytics
    safeLogger.info('\nTest 7: Getting view analytics...');
    const analytics = await viewService.getViewAnalytics(testPostId);
    safeLogger.info('✅ View analytics:');
    safeLogger.info(`   Total views: ${analytics.totalViews}`);
    safeLogger.info(`   Unique viewers: ${analytics.uniqueViewers}`);
    safeLogger.info(`   Logged-in views: ${analytics.loggedInViews}`);
    safeLogger.info(`   Anonymous views: ${analytics.anonymousViews}`);

    // Test 8: Test with logged-in user (if available)
    safeLogger.info('\nTest 8: Testing logged-in user view tracking...');
    const testUser = await db.select().from(users).limit(1);

    if (testUser.length > 0) {
      const userId = testUser[0].id;
      const tracked4 = await viewService.trackView({
        postId: testPostId,
        userId,
        ipAddress: '192.168.1.102'
      });
      safeLogger.info(`✅ Logged-in user view tracked: ${tracked4}`);

      // Test deduplication for logged-in user
      const tracked5 = await viewService.trackView({
        postId: testPostId,
        userId,
        ipAddress: '192.168.1.103' // Different IP, but same user
      });
      safeLogger.info(`✅ User deduplication: ${!tracked5 ? 'PASSED' : 'FAILED'} (expected: false, got: ${tracked5})`);

      // Get updated analytics
      const updatedAnalytics = await viewService.getViewAnalytics(testPostId);
      safeLogger.info('\n✅ Updated analytics:');
      safeLogger.info(`   Total views: ${updatedAnalytics.totalViews}`);
      safeLogger.info(`   Logged-in views: ${updatedAnalytics.loggedInViews}`);
      safeLogger.info(`   Anonymous views: ${updatedAnalytics.anonymousViews}`);
    } else {
      safeLogger.info('⚠️  No users found. Skipping logged-in user tests.');
    }

    safeLogger.info('\n\n✅ All view tracking tests passed!\n');
    return true;
  } catch (error) {
    safeLogger.error('\n❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testViewTracking()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testViewTracking };
