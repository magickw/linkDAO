import { db } from './src/db';
import { posts, quickPosts, users, communities } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function checkPosts() {
  try {
    console.log('Checking database connection...');
    
    // Check total posts count
    const postsCount = await db.select({ count: sql`count(*)` }).from(posts);
    console.log('Total posts:', postsCount[0].count);
    
    // Check total quick posts count
    const quickPostsCount = await db.select({ count: sql`count(*)` }).from(quickPosts);
    console.log('Total quick posts:', quickPostsCount[0].count);
    
    // Check total users count
    const usersCount = await db.select({ count: sql`count(*)` }).from(users);
    console.log('Total users:', usersCount[0].count);
    
    // Get some sample posts
    const samplePosts = await db.select({
      id: posts.id,
      authorId: posts.authorId,
      title: posts.title,
      content: posts.content,
      communityId: posts.communityId,
      dao: posts.dao,
      createdAt: posts.createdAt,
      isQuickPost: sql`false`
    }).from(posts).limit(5);
    
    console.log('\nSample posts:');
    console.log(samplePosts);
    
    // Get some sample quick posts
    const sampleQuickPosts = await db.select({
      id: quickPosts.id,
      authorId: quickPosts.authorId,
      content: quickPosts.content,
      createdAt: quickPosts.createdAt,
      isQuickPost: sql`true`
    }).from(quickPosts).limit(5);
    
    console.log('\nSample quick posts:');
    console.log(sampleQuickPosts);
    
    // Check communities table
    const { communities } = require('./src/db/schema');
    const communitiesCount = await db.select({ count: sql`count(*)` }).from(communities);
    console.log('\nTotal communities:', communitiesCount[0].count);
    
    // Get sample communities
    const sampleCommunities = await db.select({
      id: communities.id,
      name: communities.name,
      displayName: communities.displayName,
      memberCount: communities.memberCount
    }).from(communities).limit(5);
    
    console.log('\nSample communities:');
    console.log(sampleCommunities);
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkPosts();