import { db } from '../db';
import { quickPosts, quickPostReactions, quickPostTips, users, quickPostTags } from '../db/schema';
import { eq, and, sql, desc, asc, isNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { trendingCacheService } from './trendingCacheService';
import { getWebSocketService } from './webSocketService';
import { generateShareId } from '../utils/shareIdGenerator';

// Define interfaces for input data
interface QuickPostInput {
  authorId: string;
  contentCid: string; // This is now the CID, not the actual content
  content?: string;   // Actual content as fallback
  parentId?: string;
  isRepost?: boolean;
  mediaCids?: string;
  tags?: string;
  onchainRef?: string;
  isTokenGated?: boolean;
  gatedContentPreview?: string;
}

interface UpdateQuickPostInput {
  contentCid?: string; // This is now the CID, not the actual content
  content?: string;    // Actual content as fallback
  tags?: string;
}

interface QuickPostReactionInput {
  quickPostId: string;
  userId: string;
  type: string;
  amount: string;
}

interface QuickPostTipInput {
  quickPostId: string;
  fromUserId: string;
  toUserId: string;
  token: string;
  amount: string;
  message?: string;
}

export class QuickPostService {
  async createQuickPost(postData: QuickPostInput) {
    try {
      // Build insert object dynamically to handle missing columns
      const insertData: any = {
        authorId: postData.authorId,
        contentCid: postData.contentCid, // This is now the CID, not the actual content
        shareId: generateShareId(8), // Generate short, shareable ID
      };

      // Add optional fields only if they exist in the schema
      // This handles cases where the production schema hasn't been updated yet
      try {
        if (postData.content !== undefined) {
          insertData.content = postData.content;
        }
      } catch (e) {
        safeLogger.warn('Content field not available, skipping');
      }

      try {
        if (postData.parentId !== undefined) {
          insertData.parentId = postData.parentId;
        }
      } catch (e) {
        safeLogger.warn('ParentId field not available, skipping');
      }

      try {
        if (postData.isRepost !== undefined) {
          insertData.isRepost = postData.isRepost;
        }
      } catch (e) {
        safeLogger.warn('isRepost field not available, skipping');
      }

      try {
        if (postData.mediaCids !== undefined) {
          insertData.mediaCids = postData.mediaCids;
        }
      } catch (e) {
        safeLogger.warn('MediaCids field not available, skipping');
      }

      try {
        if (postData.tags !== undefined) {
          insertData.tags = postData.tags;
        }
      } catch (e) {
        safeLogger.warn('Tags field not available, skipping');
      }

      try {
        if (postData.onchainRef !== undefined) {
          insertData.onchainRef = postData.onchainRef;
        }
      } catch (e) {
        safeLogger.warn('OnchainRef field not available, skipping');
      }

      try {
        insertData.isTokenGated = postData.isTokenGated || false;
      } catch (e) {
        safeLogger.warn('IsTokenGated field not available, skipping');
      }

      try {
        if (postData.gatedContentPreview !== undefined) {
          insertData.gatedContentPreview = postData.gatedContentPreview;
        }
      } catch (e) {
        safeLogger.warn('GatedContentPreview field not available, skipping');
      }

      console.log('🔍 [DEBUG-CREATE-SERVICE] Inserting quick post data:', JSON.stringify(insertData));

      const [newPost] = await db.insert(quickPosts).values(insertData).returning();

      // Update cache with error handling
      try {
        trendingCacheService.updatePost(newPost.id);
      } catch (cacheError) {
        safeLogger.warn('Cache update failed, but post was created:', cacheError);
      }

      return newPost;
    } catch (error) {
      safeLogger.error('Error creating quick post:', error);
      throw new Error('Failed to create quick post');
    }
  }

  async getQuickPost(id: string) {
    try {
      const posts = await db
        .select({
          id: quickPosts.id,
          shareId: quickPosts.shareId,
          authorId: quickPosts.authorId,
          contentCid: quickPosts.contentCid,
          content: quickPosts.content,
          parentId: quickPosts.parentId,
          mediaCids: quickPosts.mediaCids,
          tags: quickPosts.tags,
          stakedValue: quickPosts.stakedValue,
          reputationScore: quickPosts.reputationScore,
          isTokenGated: quickPosts.isTokenGated,
          gatedContentPreview: quickPosts.gatedContentPreview,
          moderationStatus: quickPosts.moderationStatus,
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          upvotes: quickPosts.upvotes,
          downvotes: quickPosts.downvotes,
          createdAt: quickPosts.createdAt,
          updatedAt: quickPosts.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: quickPosts.isRepost
        })
        .from(quickPosts)
        .leftJoin(users, eq(quickPosts.authorId, users.id))
        .where(eq(quickPosts.id, id))
        .limit(1);

      return posts[0] || null;
    } catch (error) {
      safeLogger.error('Error getting quick post:', error);
      throw new Error('Failed to retrieve quick post');
    }
  }

  async getQuickPostByShareId(shareId: string) {
    try {
      const posts = await db
        .select({
          id: quickPosts.id,
          shareId: quickPosts.shareId,
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
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          createdAt: quickPosts.createdAt,
          updatedAt: quickPosts.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: quickPosts.isRepost
        })
        .from(quickPosts)
        .leftJoin(users, eq(quickPosts.authorId, users.id))
        .where(eq(quickPosts.shareId, shareId))
        .limit(1);

      return posts[0] || null;
    } catch (error) {
      safeLogger.error('Error getting quick post by share ID:', error);
      throw new Error('Failed to retrieve quick post by share ID');
    }
  }

  async updateQuickPost(id: string, updateData: UpdateQuickPostInput) {
    try {
      const updateFields: any = {};
      if (updateData.contentCid !== undefined) {
        updateFields.contentCid = updateData.contentCid; // This is now the CID, not the actual content
      }
      if (updateData.content !== undefined) {
        updateFields.content = updateData.content; // Store actual content as fallback if provided
      }
      if (updateData.tags !== undefined) {
        updateFields.tags = updateData.tags;
      }
      updateFields.updatedAt = new Date();

      const [updatedPost] = await db
        .update(quickPosts)
        .set(updateFields)
        .where(eq(quickPosts.id, id))
        .returning();

      return updatedPost || null;
    } catch (error) {
      safeLogger.error('Error updating quick post:', error);
      throw new Error('Failed to update quick post');
    }
  }

  async deleteQuickPost(id: string, userId?: string) {
    try {
      // First, check if the post exists and get its author
      const [existingPost] = await db
        .select({
          id: quickPosts.id,
          authorId: quickPosts.authorId
        })
        .from(quickPosts)
        .where(eq(quickPosts.id, id))
        .limit(1);

      if (!existingPost) {
        safeLogger.warn(`Quick post not found: ${id}`);
        return false;
      }

      // If userId is provided, check authorization
      if (userId && existingPost.authorId !== userId) {
        safeLogger.warn(`Unauthorized delete attempt: user ${userId} tried to delete post ${id} owned by ${existingPost.authorId}`);
        throw new Error('Unauthorized: You can only delete your own posts');
      }

      // Delete the post (CASCADE should handle related records)
      const result = await db
        .delete(quickPosts)
        .where(eq(quickPosts.id, id));

      if (result && result.length > 0) {
        safeLogger.info(`Quick post deleted successfully: ${id}`);

        // Update trending cache
        trendingCacheService.invalidatePost(id);

        return true;
      }

      safeLogger.warn(`Quick post delete returned 0 rows: ${id}`);
      return false;
    } catch (error) {
      safeLogger.error(`Error deleting quick post ${id}:`, error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete quick post');
    }
  }

  async getQuickPostsByAuthor(authorId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const posts = await db
        .select({
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
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          createdAt: quickPosts.createdAt,
          updatedAt: quickPosts.updatedAt,
          isRepost: quickPosts.isRepost
        })
        .from(quickPosts)
        .where(and(
          eq(quickPosts.authorId, authorId),
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`
        ))
        .orderBy(desc(quickPosts.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quickPosts)
        .where(and(
          eq(quickPosts.authorId, authorId),
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`
        ));

      return {
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting quick posts by author:', error);
      throw new Error('Failed to retrieve quick posts');
    }
  }

  async addReaction(quickPostId: string, userId: string, type: string, amount: string) {
    try {
      // Check if reaction already exists
      const existingReactions = await db
        .select()
        .from(quickPostReactions)
        .where(and(
          eq(quickPostReactions.quickPostId, quickPostId),
          eq(quickPostReactions.userId, userId)
        ))
        .limit(1);

      let reaction;
      if (existingReactions.length > 0) {
        // Update existing reaction
        [reaction] = await db
          .update(quickPostReactions)
          .set({
            type,
            amount,
            createdAt: new Date()
          })
          .where(and(
            eq(quickPostReactions.quickPostId, quickPostId),
            eq(quickPostReactions.userId, userId)
          ))
          .returning();
      } else {
        // Create new reaction
        [reaction] = await db
          .insert(quickPostReactions)
          .values({
            quickPostId,
            userId,
            type,
            amount,
            createdAt: new Date()
          })
          .returning();
      }

      // Update trending cache
      trendingCacheService.updatePost(quickPostId);

      // Broadcast via WebSocket
      const wsService = getWebSocketService();
      if (wsService && typeof (wsService as any).broadcast === 'function') {
        (wsService as any).broadcast('quick_post_update', {
          type: 'reaction',
          quickPostId,
          userId,
          reaction
        });
      }

      return reaction;
    } catch (error) {
      safeLogger.error('Error adding quick post reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  async addTip(quickPostId: string, fromUserId: string, toUserId: string, token: string, amount: string, message?: string) {
    try {
      const [tip] = await db
        .insert(quickPostTips)
        .values({
          quickPostId,
          fromUserId,
          toUserId,
          token,
          amount,
          message,
          createdAt: new Date()
        })
        .returning();

      // Update trending cache
      trendingCacheService.updatePost(quickPostId);

      // Broadcast via WebSocket
      const wsService = getWebSocketService();
      if (wsService && typeof (wsService as any).broadcast === 'function') {
        (wsService as any).broadcast('quick_post_update', {
          type: 'tip',
          quickPostId,
          fromUserId,
          tip
        });
      }

      return tip;
    } catch (error) {
      safeLogger.error('Error adding quick post tip:', error);
      throw new Error('Failed to add tip');
    }
  }

  async getQuickPostFeed(options: {
    page?: number;
    limit?: number;
    sort?: 'new' | 'hot' | 'top';
    timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    authorId?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      sort = 'new',
      timeRange = 'all',
      authorId
    } = options;

    const offset = (page - 1) * limit;

    try {
      // Build time filter
      let timeFilter = sql`1=1`;
      if (timeRange !== 'all') {
        const interval = this.getTimeInterval(timeRange);
        timeFilter = sql`${quickPosts.createdAt} > NOW() - INTERVAL '${sql.raw(interval)}'`;
      }

      // Build author filter
      let authorFilter = sql`1=1`;
      if (authorId) {
        authorFilter = eq(quickPosts.authorId, authorId);
      }

      // Build sort order
      let orderByClause;
      switch (sort) {
        case 'hot':
          orderByClause = desc(quickPosts.stakedValue);
          break;
        case 'top':
          orderByClause = desc(quickPosts.stakedValue);
          break;
        default: // 'new'
          orderByClause = desc(quickPosts.createdAt);
      }

      const posts = await db
        .select({
          id: quickPosts.id,
          shareId: quickPosts.shareId,
          authorId: quickPosts.authorId,
          contentCid: quickPosts.contentCid,
          content: quickPosts.content,
          parentId: quickPosts.parentId,
          mediaCids: quickPosts.mediaCids,
          tags: quickPosts.tags,
          stakedValue: quickPosts.stakedValue,
          reputationScore: quickPosts.reputationScore,
          isTokenGated: quickPosts.isTokenGated,
          gatedContentPreview: quickPosts.gatedContentPreview,
          moderationStatus: quickPosts.moderationStatus,
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          createdAt: quickPosts.createdAt,
          updatedAt: quickPosts.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: quickPosts.isRepost
        })
        .from(quickPosts)
        .leftJoin(users, eq(quickPosts.authorId, users.id))
        .where(and(
          timeFilter,
          authorFilter,
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`,
          isNull(quickPosts.parentId) // Only show top-level posts, not replies
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quickPosts)
        .where(and(
          timeFilter,
          authorFilter,
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`,
          isNull(quickPosts.parentId)
        ));

      return {
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting quick post feed:', error);
      throw new Error('Failed to retrieve quick post feed');
    }
  }

  async getQuickPostReplies(quickPostId: string, options: { page?: number; limit?: number; sort?: 'new' | 'old' }) {
    const { page = 1, limit = 20, sort = 'new' } = options;
    const offset = (page - 1) * limit;

    try {
      // Build sort order
      const orderByClause = sort === 'new' ? desc(quickPosts.createdAt) : asc(quickPosts.createdAt);

      const replies = await db
        .select({
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
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          createdAt: quickPosts.createdAt,
          updatedAt: quickPosts.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: quickPosts.isRepost
        })
        .from(quickPosts)
        .leftJoin(users, eq(quickPosts.authorId, users.id))
        .where(and(
          eq(quickPosts.parentId, quickPostId),
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quickPosts)
        .where(and(
          eq(quickPosts.parentId, quickPostId),
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`
        ));

      return {
        replies,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting quick post replies:', error);
      throw new Error('Failed to retrieve quick post replies');
    }
  }

  async getQuickPostReactions(quickPostId: string) {
    try {
      const reactions = await db
        .select({
          id: quickPostReactions.id,
          quickPostId: quickPostReactions.quickPostId,
          userId: quickPostReactions.userId,
          type: quickPostReactions.type,
          amount: quickPostReactions.amount,
          createdAt: quickPostReactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(quickPostReactions)
        .leftJoin(users, eq(quickPostReactions.userId, users.id))
        .where(eq(quickPostReactions.quickPostId, quickPostId))
        .orderBy(desc(quickPostReactions.createdAt));

      return reactions;
    } catch (error) {
      safeLogger.error('Error getting quick post reactions:', error);
      throw new Error('Failed to retrieve quick post reactions');
    }
  }

  async getQuickPostTips(quickPostId: string) {
    try {
      const tips = await db
        .select({
          id: quickPostTips.id,
          quickPostId: quickPostTips.quickPostId,
          fromUserId: quickPostTips.fromUserId,
          toUserId: quickPostTips.toUserId,
          token: quickPostTips.token,
          amount: quickPostTips.amount,
          message: quickPostTips.message,
          txHash: quickPostTips.txHash,
          createdAt: quickPostTips.createdAt,
          fromWalletAddress: users.walletAddress,
          fromHandle: users.handle
        })
        .from(quickPostTips)
        .leftJoin(users, eq(quickPostTips.fromUserId, users.id))
        .where(eq(quickPostTips.quickPostId, quickPostId))
        .orderBy(desc(quickPostTips.createdAt));

      return tips;
    } catch (error) {
      safeLogger.error('Error getting quick post tips:', error);
      throw new Error('Failed to retrieve quick post tips');
    }
  }

  private getTimeInterval(timeRange: string): string {
    switch (timeRange) {
      case 'hour': return '1 hour';
      case 'day': return '1 day';
      case 'week': return '1 week';
      case 'month': return '1 month';
      case 'year': return '1 year';
      default: return '1 day';
    }
  }
}