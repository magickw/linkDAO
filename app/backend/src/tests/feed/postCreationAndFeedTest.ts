/**
 * Post Creation and Feed Test
 *
 * Tests that posts are properly created and appear in the feed
 */

import { db } from '../../db';
import { safeLogger } from '../../utils/safeLogger';
import { users, posts, follows } from '../../db/schema';
import { PostService } from '../../services/postService';
import { UserProfileService } from '../../services/userProfileService';
import { eq } from 'drizzle-orm';

async function testPostCreationAndFeed() {
  safeLogger.info('🧪 Testing Post Creation and Feed...\n');
  
  const postService = new PostService();
  const userProfileService = new UserProfileService();
  
  try {
    // Create test users
    safeLogger.info('Creating test users...');
    
    let testUser1, testUser2;
    
    try {
      testUser1 = await userProfileService.createProfile({
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser1',
        ens: 'testuser1.eth',
        avatarCid: '',
        bioCid: ''
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Profile already exists')) {
        safeLogger.info('Test user 1 already exists, fetching existing profile...');
        testUser1 = await userProfileService.getProfileByAddress('0x1234567890123456789012345678901234567890');
      } else {
        throw error;
      }
    }
    
    try {
      testUser2 = await userProfileService.createProfile({
        walletAddress: '0x0987654321098765432109876543210987654321',
        handle: 'testuser2',
        ens: 'testuser2.eth',
        avatarCid: '',
        bioCid: ''
      });
    } catch (error: any) {
      if (error.message && error.message.includes('Profile already exists')) {
        safeLogger.info('Test user 2 already exists, fetching existing profile...');
        testUser2 = await userProfileService.getProfileByAddress('0x0987654321098765432109876543210987654321');
      } else {
        throw error;
      }
    }
    
    if (!testUser1 || !testUser2) {
      throw new Error('Failed to get or create test users');
    }
    
    safeLogger.info(`Test user 1 ID: ${testUser1.id}`);
    safeLogger.info(`Test user 2 ID: ${testUser2.id}`);
    
    // Clear any existing follow relationships between these users
    safeLogger.info('Clearing existing follow relationships...');
    await db.delete(follows).where(
      eq(follows.followerId, testUser2.id)
    ).where(
      eq(follows.followingId, testUser1.id)
    );
    
    // Create a follow relationship
    safeLogger.info('Creating follow relationship...');
    await db.insert(follows).values({
      followerId: testUser2.id,
      followingId: testUser1.id
    });
    safeLogger.info('Follow relationship created');
    
    // Create a post
    safeLogger.info('Creating test post...');
    const testPost = await postService.createPost({
      author: '0x1234567890123456789012345678901234567890',
      content: 'This is a test post for feed verification ' + new Date().toISOString(),
      tags: ['test', 'feed'],
      media: []
    });
    
    safeLogger.info(`Created test post with ID: ${testPost.id}`);
    safeLogger.info(`Post content CID: ${testPost.contentCid}`);
    safeLogger.info(`Post tags: ${JSON.stringify(testPost.tags)}`);
    
    // Verify post exists in database
    safeLogger.info('Verifying post in database...');
    const dbPost = await db.select().from(posts).where(eq(posts.id, parseInt(testPost.id)));
    if (dbPost.length === 0) {
      throw new Error('Post not found in database');
    }
    
    safeLogger.info('✅ Post found in database');
    safeLogger.info(`Post author ID: ${dbPost[0].authorId}`);
    safeLogger.info(`Post content CID: ${dbPost[0].contentCid}`);
    safeLogger.info(`Post tags: ${dbPost[0].tags}`);
    
    // Get feed for follower
    safeLogger.info('Getting feed for follower...');
    const feed = await postService.getFeed('0x0987654321098765432109876543210987654321');
    
    safeLogger.info(`Feed contains ${feed.length} posts`);
    
    // Check if our post is in the feed
    const postInFeed = feed.find(p => p.id === testPost.id);
    if (!postInFeed) {
      // Log some feed details for debugging
      if (feed.length > 0) {
        safeLogger.info('First few posts in feed:');
        feed.slice(0, 3).forEach((post, index) => {
          safeLogger.info(`  ${index + 1}. Post ID: ${post.id}, Author: ${post.author}`);
        });
      }
      throw new Error('Post not found in feed');
    }
    
    safeLogger.info('✅ Post found in feed');
    safeLogger.info(`Post in feed author: ${postInFeed.author}`);
    safeLogger.info(`Post in feed content CID: ${postInFeed.contentCid}`);
    safeLogger.info(`Post in feed tags: ${JSON.stringify(postInFeed.tags)}`);
    
    // Get all posts
    safeLogger.info('Getting all posts...');
    const allPosts = await postService.getAllPosts();
    
    safeLogger.info(`All posts count: ${allPosts.length}`);
    
    // Check if our post is in all posts
    const postInAllPosts = allPosts.find(p => p.id === testPost.id);
    if (!postInAllPosts) {
      throw new Error('Post not found in all posts');
    }
    
    safeLogger.info('✅ Post found in all posts');
    
    // Get posts by author
    safeLogger.info('Getting posts by author...');
    const authorPosts = await postService.getPostsByAuthor('0x1234567890123456789012345678901234567890');
    
    safeLogger.info(`Author posts count: ${authorPosts.length}`);
    
    // Check if our post is in author posts
    const postInAuthorPosts = authorPosts.find(p => p.id === testPost.id);
    if (!postInAuthorPosts) {
      throw new Error('Post not found in author posts');
    }
    
    safeLogger.info('✅ Post found in author posts');
    safeLogger.info(`Author post tags: ${JSON.stringify(postInAuthorPosts.tags)}`);
    safeLogger.info(`Author post media CIDs: ${JSON.stringify(postInAuthorPosts.mediaCids)}`);
    
    safeLogger.info('\n✅ Post creation and feed test passed!\n');
    return true;
    
  } catch (error: any) {
    safeLogger.error('\n❌ Test failed:', error);
    safeLogger.error('Error stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testPostCreationAndFeed()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      safeLogger.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testPostCreationAndFeed };