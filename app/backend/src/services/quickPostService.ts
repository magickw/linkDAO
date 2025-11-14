import { sql } from 'drizzle-orm';
import { db } from '../db';
import { quickPosts, users, quickPostTags, quickPostReactions, quickPostTips, quickPostViews, quickPostBookmarks, quickPostShares } from '../db/schema';
import { eq, desc, and, inArray, isNull, isNotNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { trendingCacheService } from './trendingCacheService';

interface CreateQuickPostInput {
  authorId: string;
  contentCid: string;
  parentId?: string;
  mediaCids?: string;
  tags?: string;
  onchainRef?: string;
  isTokenGated?: boolean;
  gatedContentPreview?: string;
}

export class QuickPostService {
  /**
   * Create a new quick post
   */
  async createQuickPost(postData: QuickPostInput) {
    try {
      const [newPost] = await db.insert(quickPosts).values({
        authorId: postData.authorId,
        contentCid: postData.contentCid,
        parentId: postData.parentId,
        mediaCids: postData.mediaCids,
        tags: postData.tags,
        onchainRef: postData.onchainRef,
        isTokenGated: postData.isTokenGated || false,
        gatedContentPreview: postData.gatedContentPreview
      }).returning();

      // Update cache
      trendingCacheService.updatePost(newPost.id);

      return newPost;
    } catch (error) {
      safeLogger.error('Error creating quick post:', error);
      throw new Error('Failed to create quick post');
    }
  }

  /**
   * Get a quick post by ID
   */
  async getQuickPostById(id: string) {
    try {
      const post = await db.select({
        id: quickPosts.id,
        authorId: quickPosts.authorId,
        contentCid: quickPosts.contentCid,
        parentId: quickPosts.parentId,
        mediaCids: quickPosts.mediaCids,
        tags: quickPosts.tags,
        stakedValue: quickPosts.stakedValue,
        reputationScore: quickPosts.reputationScore,
        isTokenGated: quickPosts.isTokenGated,
        gatedContentPreview: quickPosts.gatedContentPreview,
        moderationStatus: quickPosts.moderationStatus,
        createdAt: quickPosts.createdAt,
        updatedAt: quickPosts.updatedAt,
        // Join with users to get author info
        walletAddress: users.walletAddress,
        handle: users.handle,
        profileCid: users.profileCid
      })
      .from(quickPosts)
      .leftJoin(users, eq(quickPosts.authorId, users.id))
      .where(eq(quickPosts.id, id))
      .limit(1);

      return post[0] || null;
    } catch (error) {
      safeLogger.error('Error getting quick post by ID:', error);
      throw new Error('Failed to get quick post');
    }
  }

  /**
   * Get all quick posts
   */
  async getAllQuickPosts() {
    try {
      const posts = await db.select({
        id: quickPosts.id,
        authorId: quickPosts.authorId,
        contentCid: quickPosts.contentCid,
        parentId: quickPosts.parentId,
        mediaCids: quickPosts.mediaCids,
        tags: quickPosts.tags,
        stakedValue: quickPosts.stakedValue,
        reputationScore: quickPosts.reputationScore,
        isTokenGated: quickPosts.isTokenGated,
        gatedContentPreview: quickPosts.gatedContentPreview,
        moderationStatus: quickPosts.moderationStatus,
        createdAt: quickPosts.createdAt,
        updatedAt: quickPosts.updatedAt,
        // Join with users to get author info
        walletAddress: users.walletAddress,
        handle: users.handle,
        profileCid: users.profileCid
      })
      .from(quickPosts)
      .leftJoin(users, eq(quickPosts.authorId, users.id))
      .orderBy(desc(quickPosts.createdAt));

      return posts;
    } catch (error) {
      safeLogger.error('Error getting all quick posts:', error);
      throw new Error('Failed to get quick posts');
    }
  }

  /**
   * Get quick posts by author
   */
  async getQuickPostsByAuthor(authorId: string) {
    try {
      const posts = await db.select({
        id: quickPosts.id,
        authorId: quickPosts.authorId,
        contentCid: quickPosts.contentCid,
        parentId: quickPosts.parentId,
        mediaCids: quickPosts.mediaCids,
        tags: quickPosts.tags,
        stakedValue: quickPosts.stakedValue,
        reputationScore: quickPosts.reputationScore,
        isTokenGated: quickPosts.isTokenGated,
        gatedContentPreview: quickPosts.gatedContentPreview,
        moderationStatus: quickPosts.moderationStatus,
        createdAt: quickPosts.createdAt,
        updatedAt: quickPosts.updatedAt,
        // Join with users to get author info
        walletAddress: users.walletAddress,
        handle: users.handle,
        profileCid: users.profileCid
      })
      .from(quickPosts)
      .leftJoin(users, eq(quickPosts.authorId, users.id))
      .where(eq(quickPosts.authorId, authorId))
      .orderBy(desc(quickPosts.createdAt));

      return posts;
    } catch (error) {
      safeLogger.error('Error getting quick posts by author:', error);
      throw new Error('Failed to get quick posts by author');
    }
  }

  /**
   * Get quick posts feed (home/feed posts)
   */
  async getQuickPostFeed(forUser?: string) {
    try {
      let query = db.select({
        id: quickPosts.id,
        authorId: quickPosts.authorId,
        contentCid: quickPosts.contentCid,
        parentId: quickPosts.parentId,
        mediaCids: quickPosts.mediaCids,
        tags: quickPosts.tags,
        stakedValue: quickPosts.stakedValue,
        reputationScore: quickPosts.reputationScore,
        isTokenGated: quickPosts.isTokenGated,
        gatedContentPreview: quickPosts.gatedContentPreview,
        moderationStatus: quickPosts.moderationStatus,
        createdAt: quickPosts.createdAt,
        updatedAt: quickPosts.updatedAt,
        // Join with users to get author info
        walletAddress: users.walletAddress,
        handle: users.handle,
        profileCid: users.profileCid
      })
      .from(quickPosts)
      .leftJoin(users, eq(quickPosts.authorId, users.id));

      // Add moderation filter to exclude blocked content
      query = query.where(
        and(
          isNull(quickPosts.moderationStatus).or(eq(quickPosts.moderationStatus, 'active'))
        )
      );

      // Order by creation date (newest first)
      query = query.orderBy(desc(quickPosts.createdAt));

      const posts = await query;

      // If user is specified, we could add personalization logic here
      if (forUser) {
        // TODO: Add personalization based on user preferences/following
        // For now, just return the posts
      }

      return posts;
    } catch (error) {
      safeLogger.error('Error getting quick post feed:', error);
      throw new Error('Failed to get quick post feed');
    }
  }

  /**
   * Update a quick post
   */
  async updateQuickPost(id: string, updateData: Partial<QuickPostInput>) {
    try {
      const [updatedPost] = await db.update(quickPosts)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(quickPosts.id, id))
        .returning();

      // Update cache
      trendingCacheService.updatePost(updatedPost.id);

      return updatedPost;
    } catch (error) {
      safeLogger.error('Error updating quick post:', error);
      throw new Error('Failed to update quick post');
    }
  }

  /**
   * Delete a quick post
   */
  async deleteQuickPost(id: string) {
    try {
      // Delete the quick post and all related data (due to CASCADE)
      await db.delete(quickPosts).where(eq(quickPosts.id, id));

      // Update cache
      trendingCacheService.removePost(id);

      return true;
    } catch (error) {
      safeLogger.error('Error deleting quick post:', error);
      throw new Error('Failed to delete quick post');
    }
  }
}

export const quickPostService = new QuickPostService();