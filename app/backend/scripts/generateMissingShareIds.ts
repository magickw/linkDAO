import { db } from '../src/db';
import { quickPosts, posts } from '../src/db/schema';
import { generateShareId } from '../src/utils/shareIdGenerator';
import { eq, sql } from 'drizzle-orm';

async function generateMissingShareIds() {
  console.log('Starting to generate missing share IDs...');

  try {
    // Generate shareIds for quick_posts that don't have them
    const quickPostsWithoutShareId = await db
      .select({ id: quickPosts.id })
      .from(quickPosts)
      .where(sql`${quickPosts.shareId} = '' OR ${quickPosts.shareId} IS NULL`);

    console.log(`Found ${quickPostsWithoutShareId.length} quick posts without share IDs`);

    for (const post of quickPostsWithoutShareId) {
      const shareId = generateShareId();
      await db
        .update(quickPosts)
        .set({ shareId })
        .where(eq(quickPosts.id, post.id));
      console.log(`Generated shareId ${shareId} for quick post ${post.id}`);
    }

    // Generate shareIds for posts that don't have them
    const postsWithoutShareId = await db
      .select({ id: posts.id })
      .from(posts)
      .where(sql`${posts.shareId} = '' OR ${posts.shareId} IS NULL`);

    console.log(`Found ${postsWithoutShareId.length} posts without share IDs`);

    for (const post of postsWithoutShareId) {
      const shareId = generateShareId();
      await db
        .update(posts)
        .set({ shareId })
        .where(eq(posts.id, post.id));
      console.log(`Generated shareId ${shareId} for post ${post.id}`);
    }

    console.log('Successfully generated all missing share IDs!');
  } catch (error) {
    console.error('Error generating share IDs:', error);
  }
}

// Run the script
generateMissingShareIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });