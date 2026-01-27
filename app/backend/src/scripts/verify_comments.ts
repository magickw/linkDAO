
import { db } from '../db';
import { users, posts, statuses, comments } from '../db/schema';
import { feedService } from '../services/feedService';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function verifyComments() {
    console.log('🚀 Starting comment verification...');

    const testWallet = `0x${uuidv4().replace(/-/g, '').substring(0, 40)}`;
    let userId: string;
    let regularPostId: string;
    let statusId: string;

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

        // 3. Create status
        console.log('Creating status...');
        const status = await db.insert(statuses).values({
            authorId: userId,
            content: 'Test status content',
            contentCid: 'QmTestStatus',
            shareId: Math.random().toString(36).substring(7),
            createdAt: new Date(),
            stakedValue: '0'
        }).returning();
        statusId = status[0].id;
        console.log('✅ Status created:', statusId);

        // 4. Add comment to regular post
        console.log('Adding comment to regular post...');
        await feedService.addComment({
            postId: regularPostId.toString(),
            userAddress: testWallet,
            content: 'Test comment on regular post'
        });
        console.log('✅ Comment added to regular post');

        // 5. Add comment to status
        console.log('Adding comment to status...');
        await feedService.addComment({
            statusId: statusId,
            userAddress: testWallet,
            content: 'Test comment on status'
        });
        console.log('✅ Comment added to status');

        // 6. Verify comments in DB
        console.log('Verifying comments in DB...');
        const regularComments = await db.select().from(comments).where(eq(comments.postId, regularPostId));
        const statusComments = await db.select().from(comments).where(eq(comments.statusId, statusId));

        if (regularComments.length === 1 && regularComments[0].content === 'Test comment on regular post') {
            console.log('✅ Regular post comment persisted correctly');
        } else {
            console.error('❌ Regular post comment failed persistence check', regularComments);
        }

        if (statusComments.length === 1 && statusComments[0].content === 'Test comment on status') {
            console.log('✅ Status comment persisted correctly');
        } else {
            console.error('❌ Status comment failed persistence check', statusComments);
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
        const feedStatus = feed.posts.find((p: any) => p.id === statusId);

        if (feedRegularPost && feedRegularPost.commentCount === 1) {
            console.log('✅ Regular post comment count correct in feed');
        } else {
            console.error('❌ Regular post comment count incorrect in feed:', feedRegularPost?.commentCount);
        }

        if (feedStatus && feedStatus.commentCount === 1) {
            console.log('✅ Status comment count correct in feed');
        } else {
            console.error('❌ Status comment count incorrect in feed:', feedStatus?.commentCount);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        if (userId) {
            // Delete posts first to avoid FK constraint violations
            if (regularPostId) await db.delete(posts).where(eq(posts.id, regularPostId));
            if (statusId) await db.delete(statuses).where(eq(statuses.id, statusId));
            await db.delete(users).where(eq(users.id, userId));
        }
        console.log('✅ Cleanup complete');
        process.exit(0);
    }
}

verifyComments();
