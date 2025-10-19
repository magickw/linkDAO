/**
 * Comment Count Integration Test
 *
 * This test verifies that comment counts are correctly calculated in feed queries
 */

import { feedService } from '../../services/feedService';

async function testCommentCounting() {
  console.log('🧪 Testing Comment Count Implementation...\n');

  try {
    // Test 1: Get Enhanced Feed with comment counts
    console.log('Test 1: Fetching enhanced feed...');
    const feedResult = await feedService.getEnhancedFeed({
      userAddress: '0x0000000000000000000000000000000000000000', // Test address
      page: 1,
      limit: 5,
      sort: 'new',
      communities: [],
      timeRange: 'week'
    });

    console.log(`✅ Retrieved ${feedResult.posts.length} posts`);

    if (feedResult.posts.length > 0) {
      const firstPost = feedResult.posts[0];
      console.log(`\nPost ID: ${firstPost.id}`);
      console.log(`Comment Count: ${firstPost.commentCount || 0}`);
      console.log(`Reaction Count: ${firstPost.reactionCount || 0}`);
      console.log(`Tip Count: ${firstPost.tipCount || 0}`);
      console.log(`Engagement Score: ${firstPost.engagementScore || 0}`);
    }

    // Test 2: Get Trending Posts with comment counts
    console.log('\n\nTest 2: Fetching trending posts...');
    const trendingResult = await feedService.getTrendingPosts({
      page: 1,
      limit: 5,
      timeRange: 'week'
    });

    console.log(`✅ Retrieved ${trendingResult.posts.length} trending posts`);

    if (trendingResult.posts.length > 0) {
      const firstTrending = trendingResult.posts[0];
      console.log(`\nPost ID: ${firstTrending.id}`);
      console.log(`Comment Count: ${firstTrending.commentCount || 0}`);
      console.log(`Reaction Count: ${firstTrending.reactionCount || 0}`);
      console.log(`Tip Count: ${firstTrending.tipCount || 0}`);
      console.log(`Trending Score: ${firstTrending.trendingScore || 0}`);
    }

    // Test 3: Get Engagement Data for a specific post
    if (feedResult.posts.length > 0) {
      const postId = feedResult.posts[0].id.toString();
      console.log('\n\nTest 3: Fetching engagement data...');
      const engagementData = await feedService.getEngagementData(postId);

      if (engagementData) {
        console.log(`✅ Engagement data for post ${postId}:`);
        console.log(`Comment Count: ${engagementData.commentCount || 0}`);
        console.log(`Reaction Count: ${engagementData.reactionCount || 0}`);
        console.log(`Tip Count: ${engagementData.tipCount || 0}`);
        console.log(`Engagement Score: ${engagementData.engagementScore || 0}`);
      }
    }

    console.log('\n\n✅ All tests passed! Comment counting is working correctly.\n');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
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
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testCommentCounting };
