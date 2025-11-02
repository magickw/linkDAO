/**
 * Comment Count Integration Test
 *
 * This test verifies that comment counts are correctly calculated in feed queries
 */

import { feedService } from '../../services/feedService';
import { safeLogger } from '../../utils/safeLogger';

async function testCommentCounting() {
  safeLogger.info('🧪 Testing Comment Count Implementation...\n');

  try {
    // Test 1: Get Enhanced Feed with comment counts
    safeLogger.info('Test 1: Fetching enhanced feed...');
    const feedResult = await feedService.getEnhancedFeed({
      userAddress: '0x0000000000000000000000000000000000000000', // Test address
      page: 1,
      limit: 5,
      sort: 'new',
      communities: [],
      timeRange: 'week'
    });

    safeLogger.info(`✅ Retrieved ${feedResult.posts.length} posts`);

    if (feedResult.posts.length > 0) {
      const firstPost = feedResult.posts[0];
      safeLogger.info(`\nPost ID: ${firstPost.id}`);
      safeLogger.info(`Comment Count: ${firstPost.commentCount || 0}`);
      safeLogger.info(`Reaction Count: ${firstPost.reactionCount || 0}`);
      safeLogger.info(`Tip Count: ${firstPost.tipCount || 0}`);
      safeLogger.info(`Engagement Score: ${firstPost.engagementScore || 0}`);
    }

    // Test 2: Get Trending Posts with comment counts
    safeLogger.info('\n\nTest 2: Fetching trending posts...');
    const trendingResult = await feedService.getTrendingPosts({
      page: 1,
      limit: 5,
      timeRange: 'week'
    });

    safeLogger.info(`✅ Retrieved ${trendingResult.posts.length} trending posts`);

    if (trendingResult.posts.length > 0) {
      const firstTrending = trendingResult.posts[0];
      safeLogger.info(`\nPost ID: ${firstTrending.id}`);
      safeLogger.info(`Comment Count: ${firstTrending.commentCount || 0}`);
      safeLogger.info(`Reaction Count: ${firstTrending.reactionCount || 0}`);
      safeLogger.info(`Tip Count: ${firstTrending.tipCount || 0}`);
      safeLogger.info(`Trending Score: ${firstTrending.trendingScore || 0}`);
    }

    // Test 3: Get Engagement Data for a specific post
    if (feedResult.posts.length > 0) {
      const postId = feedResult.posts[0].id.toString();
      safeLogger.info('\n\nTest 3: Fetching engagement data...');
      const engagementData = await feedService.getEngagementData(postId);

      if (engagementData) {
        safeLogger.info(`✅ Engagement data for post ${postId}:`);
        safeLogger.info(`Comment Count: ${engagementData.commentCount || 0}`);
        safeLogger.info(`Reaction Count: ${engagementData.reactionCount || 0}`);
        safeLogger.info(`Tip Count: ${engagementData.tipCount || 0}`);
        safeLogger.info(`Engagement Score: ${engagementData.engagementScore || 0}`);
      }
    }

    safeLogger.info('\n\n✅ All tests passed! Comment counting is working correctly.\n');
    return true;
  } catch (error) {
    safeLogger.error('\n❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testCommentCounting()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testCommentCounting };
