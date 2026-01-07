import { db } from '../db';
import { statuses, statusReactions, statusTips, users, statusTags } from '../db/schema';
import { eq, and, sql, desc, asc, isNull, aliasedTable, or } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { trendingCacheService } from './trendingCacheService';
import { getWebSocketService } from './webSocketService';
import { generateShareId } from '../utils/shareIdGenerator';

// Define interfaces for input data
// Define interfaces for input data
interface StatusInput {
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
  mediaUrls?: string[];
  location?: any;
}

interface UpdateStatusInput {
  contentCid?: string; // This is now the CID, not the actual content
  content?: string;    // Actual content as fallback
  tags?: string;
}

interface StatusReactionInput {
  statusId: string;
  userId: string;
  type: string;
  amount: string;
}

interface StatusTipInput {
  statusId: string;
  fromUserId: string;
  toUserId: string;
  token: string;
  amount: string;
  message?: string;
}

export class StatusService {
  async createStatus(postData: StatusInput) {
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

      try {
        if (postData.mediaUrls !== undefined) {
          insertData.mediaUrls = JSON.stringify(postData.mediaUrls);
        }
      } catch (e) {
        safeLogger.warn('MediaUrls field not available, skipping');
      }

      try {
        if (postData.location !== undefined) {
          insertData.location = postData.location;
        }
      } catch (e) {
        safeLogger.warn('Location field not available, skipping');
      }

      console.log('🔍 [DEBUG-CREATE-SERVICE] Inserting quick post data:', JSON.stringify(insertData));

      const [newPost] = await db.insert(statuses).values(insertData).returning();

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

  async getStatus(id: string) {
    try {
      const posts = await db
        .select({
          id: statuses.id,
          shareId: statuses.shareId,
          authorId: statuses.authorId,
          contentCid: statuses.contentCid,
          content: statuses.content,
          parentId: statuses.parentId,
          mediaCids: statuses.mediaCids,
          tags: statuses.tags,
          stakedValue: statuses.stakedValue,
          reputationScore: statuses.reputationScore,
          isTokenGated: statuses.isTokenGated,
          gatedContentPreview: statuses.gatedContentPreview,
          moderationStatus: statuses.moderationStatus,
          moderationWarning: statuses.moderationWarning,
          riskScore: statuses.riskScore,
          upvotes: statuses.upvotes,
          downvotes: statuses.downvotes,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        .where(eq(statuses.id, id))
        .limit(1);

      return posts[0] || null;
    } catch (error) {
      safeLogger.error('Error getting quick post:', error);
      throw new Error('Failed to retrieve quick post');
    }
  }

  async getStatusByShareId(shareId: string) {
    try {
      const posts = await db
        .select({
          id: statuses.id,
          shareId: statuses.shareId,
          authorId: statuses.authorId,
          contentCid: statuses.contentCid,
          parentId: statuses.parentId,
          mediaCids: statuses.mediaCids,
          tags: statuses.tags,
          stakedValue: statuses.stakedValue,
          reputationScore: statuses.reputationScore,
          isTokenGated: statuses.isTokenGated,
          gatedContentPreview: statuses.gatedContentPreview,
          moderationStatus: statuses.moderationStatus,
          moderationWarning: statuses.moderationWarning,
          riskScore: statuses.riskScore,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        .where(eq(statuses.shareId, shareId))
        .limit(1);

      return posts[0] || null;
    } catch (error) {
      safeLogger.error('Error getting quick post by share ID:', error);
      throw new Error('Failed to retrieve quick post by share ID');
    }
  }

  async updateStatus(id: string, updateData: UpdateStatusInput) {
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
        .update(statuses)
        .set(updateFields)
        .where(eq(statuses.id, id))
        .returning();

      return updatedPost || null;
    } catch (error) {
      safeLogger.error('Error updating quick post:', error);
      throw new Error('Failed to update quick post');
    }
  }

  async deleteStatus(id: string, userId?: string) {
    try {
      // First, check if the post exists and get its author
      const [existingPost] = await db
        .select({
          id: statuses.id,
          authorId: statuses.authorId
        })
        .from(statuses)
        .where(eq(statuses.id, id))
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
        .delete(statuses)
        .where(eq(statuses.id, id));

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

  async getStatusesByAuthor(authorId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const posts = await db
        .select({
          id: statuses.id,
          authorId: statuses.authorId,
          contentCid: statuses.contentCid,
          parentId: statuses.parentId,
          mediaCids: statuses.mediaCids,
          tags: statuses.tags,
          stakedValue: statuses.stakedValue,
          reputationScore: statuses.reputationScore,
          isTokenGated: statuses.isTokenGated,
          gatedContentPreview: statuses.gatedContentPreview,
          moderationStatus: statuses.moderationStatus,
          moderationWarning: statuses.moderationWarning,
          riskScore: statuses.riskScore,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .where(and(
          eq(statuses.authorId, authorId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
        ))
        .orderBy(desc(statuses.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          eq(statuses.authorId, authorId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
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

  async addReaction(statusId: string, userId: string, type: string, amount: string) {
    try {
      // Check if reaction already exists
      const existingReactions = await db
        .select()
        .from(statusReactions)
        .where(and(
          eq(statusReactions.statusId, statusId),
          eq(statusReactions.userId, userId)
        ))
        .limit(1);

      let reaction;
      if (existingReactions.length > 0) {
        // Update existing reaction
        [reaction] = await db
          .update(statusReactions)
          .set({
            type,
            amount,
            createdAt: new Date()
          })
          .where(and(
            eq(statusReactions.statusId, statusId),
            eq(statusReactions.userId, userId)
          ))
          .returning();
      } else {
        // Create new reaction
        [reaction] = await db
          .insert(statusReactions)
          .values({
            statusId,
            userId,
            type,
            amount,
            createdAt: new Date()
          })
          .returning();
      }

      // Update trending cache
      trendingCacheService.updatePost(statusId);

      // Broadcast via WebSocket
      const wsService = getWebSocketService();
      if (wsService && typeof (wsService as any).broadcast === 'function') {
        (wsService as any).broadcast('status_update', {
          type: 'reaction',
          statusId,
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

  async addTip(statusId: string, fromUserId: string, toUserId: string, token: string, amount: string, message?: string) {
    try {
      const [tip] = await db
        .insert(statusTips)
        .values({
          statusId,
          fromUserId,
          toUserId,
          token,
          amount,
          message,
          createdAt: new Date()
        })
        .returning();

      // Update trending cache
      trendingCacheService.updatePost(statusId);

      // Broadcast via WebSocket
      const wsService = getWebSocketService();
      if (wsService && typeof (wsService as any).broadcast === 'function') {
        (wsService as any).broadcast('status_update', {
          type: 'tip',
          statusId,
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

  async getStatusFeed(options: {
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
        timeFilter = sql`${statuses.createdAt} > NOW() - INTERVAL '${sql.raw(interval)}'`;
      }

      // Build author filter
      let authorFilter = sql`1=1`;
      if (authorId) {
        authorFilter = eq(statuses.authorId, authorId);
      }

      // Build sort order
      let orderByClause;
      switch (sort) {
        case 'hot':
          orderByClause = desc(statuses.stakedValue);
          break;
        case 'top':
          orderByClause = desc(statuses.stakedValue);
          break;
        default: // 'new'
          orderByClause = desc(statuses.createdAt);
      }

      // Aliases for original post/author (for reposts)
      const originalPosts = aliasedTable(statuses, 'original_posts');
      const originalAuthors = aliasedTable(users, 'original_authors');

      const rawPosts = await db
        .select({
          id: statuses.id,
          shareId: statuses.shareId,
          authorId: statuses.authorId,
          contentCid: statuses.contentCid,
          content: statuses.content,
          parentId: statuses.parentId,
          mediaCids: statuses.mediaCids,
          tags: statuses.tags,
          stakedValue: statuses.stakedValue,
          reputationScore: statuses.reputationScore,
          isTokenGated: statuses.isTokenGated,
          gatedContentPreview: statuses.gatedContentPreview,
          moderationStatus: statuses.moderationStatus,
          moderationWarning: statuses.moderationWarning,
          riskScore: statuses.riskScore,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: statuses.isRepost,
          mediaUrls: statuses.mediaUrls,
          location: statuses.location,

          // Original Post Fields (prefixed)
          original_id: originalPosts.id,
          original_shareId: originalPosts.shareId,
          original_authorId: originalPosts.authorId,
          original_content: originalPosts.content,
          original_mediaCids: originalPosts.mediaCids,
          original_createdAt: originalPosts.createdAt,
          original_author_handle: originalAuthors.handle,
          original_author_walletAddress: originalAuthors.walletAddress,
          original_author_avatar: originalAuthors.avatarCid
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        // Join original post if it's a repost (parentId -> id)
        .leftJoin(originalPosts, eq(statuses.parentId, originalPosts.id))
        // Join original author
        .leftJoin(originalAuthors, eq(originalPosts.authorId, originalAuthors.id))
        .where(and(
          timeFilter,
          authorFilter,
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`,
          // Show if it's a root post OR a repost
          or(isNull(statuses.parentId), eq(statuses.isRepost, true))
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Post-process to nest originalPost
      const posts = rawPosts.map(post => {
        const {
          original_id, original_shareId, original_authorId, original_content,
          original_mediaCids, original_createdAt, original_author_handle,
          original_author_walletAddress, original_author_avatar,
          ...regularFields
        } = post;

        let originalPost = null;
        if (post.isRepost && original_id) {
          originalPost = {
            id: original_id,
            shareId: original_shareId,
            authorId: original_authorId,
            content: original_content,
            mediaCids: original_mediaCids,
            createdAt: original_createdAt,
            author: original_author_walletAddress,
            // Construct minimal profile for UI
            authorProfile: {
              handle: original_author_handle,
              avatar: original_author_avatar,
              verified: false // You might want to join isVerified if available
            }
          };
        }

        return {
          ...regularFields,
          originalPost
        };
      });

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          timeFilter,
          authorFilter,
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`,
          or(isNull(statuses.parentId), eq(statuses.isRepost, true))
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

  async getStatusReplies(statusId: string, options: { page?: number; limit?: number; sort?: 'new' | 'old' }) {
    const { page = 1, limit = 20, sort = 'new' } = options;
    const offset = (page - 1) * limit;

    try {
      // Build sort order
      const orderByClause = sort === 'new' ? desc(statuses.createdAt) : asc(statuses.createdAt);

      const replies = await db
        .select({
          id: statuses.id,
          authorId: statuses.authorId,
          contentCid: statuses.contentCid,
          parentId: statuses.parentId,
          mediaCids: statuses.mediaCids,
          tags: statuses.tags,
          stakedValue: statuses.stakedValue,
          reputationScore: statuses.reputationScore,
          isTokenGated: statuses.isTokenGated,
          gatedContentPreview: statuses.gatedContentPreview,
          moderationStatus: statuses.moderationStatus,
          moderationWarning: statuses.moderationWarning,
          riskScore: statuses.riskScore,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        .where(and(
          eq(statuses.parentId, statusId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          eq(statuses.parentId, statusId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
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

  async getStatusReactions(statusId: string) {
    try {
      const reactions = await db
        .select({
          id: statusReactions.id,
          statusId: statusReactions.statusId,
          userId: statusReactions.userId,
          type: statusReactions.type,
          amount: statusReactions.amount,
          createdAt: statusReactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(statusReactions)
        .leftJoin(users, eq(statusReactions.userId, users.id))
        .where(eq(statusReactions.statusId, statusId))
        .orderBy(desc(statusReactions.createdAt));

      return reactions;
    } catch (error) {
      safeLogger.error('Error getting quick post reactions:', error);
      throw new Error('Failed to retrieve quick post reactions');
    }
  }

  async getStatusTips(statusId: string) {
    try {
      const tips = await db
        .select({
          id: statusTips.id,
          statusId: statusTips.statusId,
          fromUserId: statusTips.fromUserId,
          toUserId: statusTips.toUserId,
          token: statusTips.token,
          amount: statusTips.amount,
          message: statusTips.message,
          txHash: statusTips.txHash,
          createdAt: statusTips.createdAt,
          fromWalletAddress: users.walletAddress,
          fromHandle: users.handle
        })
        .from(statusTips)
        .leftJoin(users, eq(statusTips.fromUserId, users.id))
        .where(eq(statusTips.statusId, statusId))
        .orderBy(desc(statusTips.createdAt));

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