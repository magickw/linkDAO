import { db } from '../db';
import { posts, communities, communityMembers, users } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface PinPostRequest {
    postId: string;
    userId: string; // This is the user UUID
    communityId: string;
}

export class PostManagementService {
    /**
     * Check if user has permission to pin/unpin posts
     */
    private async checkPermission(userId: string, communityId: string): Promise<boolean> {
        try {
            if (!db) {
                safeLogger.error('Database connection not initialized');
                return false;
            }

            // Get user's wallet address
            const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
            const user = userResult[0];

            if (!user || !user.walletAddress) {
                return false;
            }

            const walletAddress = user.walletAddress.toLowerCase();

            // Check if user is creator
            const communityResult = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
            const community = communityResult[0];

            if (community && community.creatorAddress && community.creatorAddress.toLowerCase() === walletAddress) {
                return true;
            }

            // Check if user is admin or moderator in community_members
            const memberResult = await db.select().from(communityMembers).where(and(
                eq(communityMembers.communityId, communityId),
                eq(communityMembers.userAddress, walletAddress)
            )).limit(1);
            const member = memberResult[0];

            if (member && (member.role === 'admin' || member.role === 'moderator')) {
                return true;
            }

            // Also check moderators array in communities table (legacy/backup)
            if (community && community.moderators) {
                try {
                    const moderators = JSON.parse(community.moderators);
                    if (Array.isArray(moderators) && moderators.some((m: string) => m.toLowerCase() === walletAddress)) {
                        return true;
                    }
                } catch (e) {
                    // Ignore parsing error
                }
            }

            return false;
        } catch (error) {
            safeLogger.error('Error checking permissions:', error);
            return false;
        }
    }

    /**
     * Pin a post to the top of the community feed
     * Only community admins/moderators can pin posts
     */
    async pinPost(request: PinPostRequest): Promise<{ success: boolean; message: string }> {
        const { postId, userId, communityId } = request;

        try {
            if (!db) {
                return { success: false, message: 'Database connection not initialized' };
            }

            // Check permissions
            const hasPermission = await this.checkPermission(userId, communityId);
            if (!hasPermission) {
                return { success: false, message: 'You do not have permission to pin posts in this community' };
            }

            const postIdInt = parseInt(postId);
            if (isNaN(postIdInt)) {
                return { success: false, message: 'Invalid post ID' };
            }

            // Verify the post exists and belongs to the community
            const postResult = await db.select().from(posts).where(eq(posts.id, postIdInt)).limit(1);
            const post = postResult[0];

            if (!post) {
                return { success: false, message: 'Post not found' };
            }

            if (post.communityId !== communityId) {
                return { success: false, message: 'Post does not belong to this community' };
            }

            // Check if already pinned
            if (post.isPinned) {
                return { success: false, message: 'Post is already pinned' };
            }

            // Update post to pinned status
            await db
                .update(posts)
                .set({
                    isPinned: true,
                    pinnedAt: new Date(),
                    pinnedBy: userId, // Storing UUID of the pinner
                })
                .where(eq(posts.id, postIdInt));

            safeLogger.info(`Post ${postId} pinned by ${userId} in community ${communityId}`);

            return { success: true, message: 'Post pinned successfully' };
        } catch (error) {
            safeLogger.error('Error pinning post:', error);
            return { success: false, message: 'Failed to pin post' };
        }
    }

    /**
     * Unpin a post
     */
    async unpinPost(postId: string, userId: string): Promise<{ success: boolean; message: string }> {
        try {
            if (!db) {
                return { success: false, message: 'Database connection not initialized' };
            }

            const postIdInt = parseInt(postId);
            if (isNaN(postIdInt)) {
                return { success: false, message: 'Invalid post ID' };
            }

            // Verify the post exists to get communityId
            const postResult = await db.select().from(posts).where(eq(posts.id, postIdInt)).limit(1);
            const post = postResult[0];

            if (!post) {
                return { success: false, message: 'Post not found' };
            }

            if (!post.communityId) {
                return { success: false, message: 'Post does not belong to any community' };
            }

            // Check permissions
            const hasPermission = await this.checkPermission(userId, post.communityId);
            if (!hasPermission) {
                return { success: false, message: 'You do not have permission to unpin posts in this community' };
            }

            if (!post.isPinned) {
                return { success: false, message: 'Post is not pinned' };
            }

            // Update post to unpinned status
            await db
                .update(posts)
                .set({
                    isPinned: false,
                    pinnedAt: null,
                    pinnedBy: null,
                })
                .where(eq(posts.id, postIdInt));

            safeLogger.info(`Post ${postId} unpinned by ${userId}`);

            return { success: true, message: 'Post unpinned successfully' };
        } catch (error) {
            safeLogger.error('Error unpinning post:', error);
            return { success: false, message: 'Failed to unpin post' };
        }
    }

    /**
     * Get all pinned posts for a community
     */
    async getPinnedPosts(communityId: string, limit: number = 5) {
        try {
            if (!db) {
                return [];
            }

            // Join with users table to get author details
            const pinnedPosts = await db.select({
                post: posts,
                author: {
                    id: users.id,
                    username: users.handle,
                    walletAddress: users.walletAddress,
                    avatar: users.avatarCid,
                    verified: users.emailVerified, // Using emailVerified as proxy for verified
                    handle: users.handle
                }
            })
                .from(posts)
                .leftJoin(users, eq(posts.authorId, users.id))
                .where(and(
                    eq(posts.communityId, communityId),
                    eq(posts.isPinned, true)
                ))
                .orderBy(desc(posts.pinnedAt))
                .limit(limit);

            // Transform result to match expected format
            return pinnedPosts.map(item => ({
                ...item.post,
                author: item.author
            }));
        } catch (error) {
            safeLogger.error('Error fetching pinned posts:', error);
            return [];
        }
    }

    /**
     * Get pinned post count for a community
     */
    async getPinnedPostCount(communityId: string): Promise<number> {
        try {
            if (!db) {
                return 0;
            }

            const result = await db.select({ count: sql<number>`count(*)` })
                .from(posts)
                .where(and(
                    eq(posts.communityId, communityId),
                    eq(posts.isPinned, true)
                ));

            return Number(result[0]?.count || 0);
        } catch (error) {
            safeLogger.error('Error counting pinned posts:', error);
            return 0;
        }
    }
}

export const postManagementService = new PostManagementService();
