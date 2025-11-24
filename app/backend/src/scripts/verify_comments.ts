
import { db } from '../db';
import { users, posts, quickPosts, comments } from '../db/schema';
import { feedService } from '../services/feedService';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function verifyComments() {
    console.log('🚀 Starting comment verification...');

    const testWallet = `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`;
    let userId: string;
    let regularPostId: number;
    let quickPostId: string;

    try {
        // 1. Create test user
        console.log('Creating test user...');
        const user = await db.insert(users).values({
            walletAddress: testWallet,
            handle: `test_user_${Date.now()}`,
            createdAt: new Date()
        }).returning();
        userId = user[0].id;
        console.log('✅ Test user created:', userId);

        // 2. Create regular post
        console.log('Creating regular post...');
        const regularPost = await db.insert(posts).values({
            authorId: userId,
            content: 'Test regular post content',
            contentCid: 'QmTestRegular',
            createdAt: new Date(),
            stakedValue: '0'
        }).returning();
        regularPostId = regularPost[0].id;
        console.log('✅ Regular post created:', regularPostId);

        // 3. Create quick post
        console.log('Creating quick post...');
        const quickPost = await db.insert(quickPosts).values({
            authorId: userId,
            content: 'Test quick post content',
            contentCid: 'QmTestQuick',
            createdAt: new Date(),
            stakedValue: '0'
        }).returning();
        quickPostId = quickPost[0].id;
        console.log('✅ Quick post created:', quickPostId);

        // 4. Add comment to regular post
        console.log('Adding comment to regular post...');
        await feedService.addComment({
            postId: regularPostId.toString(),
            userAddress: testWallet,
            content: 'Test comment on regular post'
        });
        console.log('✅ Comment added to regular post');

        // 5. Add comment to quick post
        console.log('Adding comment to quick post...');
        await feedService.addComment({
            postId: quickPostId,
            userAddress: testWallet,
            content: 'Test comment on quick post'
        });
        console.log('✅ Comment added to quick post');

        // 6. Verify comments in DB
        console.log('Verifying comments in DB...');
        const regularComments = await db.select().from(comments).where(eq(comments.postId, regularPostId));
        const quickComments = await db.select().from(comments).where(eq(comments.quickPostId, quickPostId));

        if (regularComments.length === 1 && regularComments[0].content === 'Test comment on regular post') {
            console.log('✅ Regular post comment persisted correctly');
        } else {
            console.error('❌ Regular post comment failed persistence check', regularComments);
        }

        if (quickComments.length === 1 && quickComments[0].content === 'Test comment on quick post') {
            console.log('✅ Quick post comment persisted correctly');
        } else {
            console.error('❌ Quick post comment failed persistence check', quickComments);
        }

        // 7. Verify comment counts in feed
        console.log('Verifying comment counts in feed...');
        const feed = await feedService.getEnhancedFeed({
            userAddress: testWallet,
            page: 1,
            limit: 10,
            sort: 'new',
            communities: [],
            timeRange: 'all',
            feedSource: 'all'
        });

        const feedRegularPost = feed.posts.find((p: any) => p.id === regularPostId);
        const feedQuickPost = feed.posts.find((p: any) => p.id === quickPostId);

        if (feedRegularPost && feedRegularPost.commentCount === 1) {
            console.log('✅ Regular post comment count correct in feed');
        } else {
            console.error('❌ Regular post comment count incorrect in feed:', feedRegularPost?.commentCount);
        }

        if (feedQuickPost && feedQuickPost.commentCount === 1) {
            console.log('✅ Quick post comment count correct in feed');
        } else {
            console.error('❌ Quick post comment count incorrect in feed:', feedQuickPost?.commentCount);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        if (userId) {
            // Delete posts first to avoid FK constraint violations
            if (regularPostId) await db.delete(posts).where(eq(posts.id, regularPostId));
            if (quickPostId) await db.delete(quickPosts).where(eq(quickPosts.id, quickPostId));
            await db.delete(users).where(eq(users.id, userId));
        }
        console.log('✅ Cleanup complete');
        process.exit(0);
    }
}

verifyComments();
