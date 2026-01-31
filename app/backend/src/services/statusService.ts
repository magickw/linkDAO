import { databaseService } from './databaseService';
import { statuses, statusReactions, statusTips, users, statusTags, statusViews } from '../db/schema';
import { eq, and, sql, desc, asc, isNull, aliasedTable, or } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { trendingCacheService } from './trendingCacheService';
import { getWebSocketService } from './webSocketService';
import { generateShareId } from '../utils/shareIdGenerator';
import communityNotificationService from './communityNotificationService';
import { enhancedNotificationService } from './enhancedNotificationService';
import { mentionService } from './mentionService';

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
  private get db() {
    return databaseService.getDatabase();
  }

  async incrementView(statusId: string, userId?: string, ipAddress?: string) {
    try {
      // 1. Record the view in the status_views table for analytics/deduplication
      await this.db.insert(statusViews).values({
        statusId,
        userId: userId || null,
        ipAddress: ipAddress || null
      });

      // 2. Increment the counter on the status itself
      const [updatedStatus] = await this.db
        .update(statuses)
        .set({
          views: sql`${statuses.views} + 1`
        })
        .where(eq(statuses.id, statusId))
        .returning({ views: statuses.views });

      return updatedStatus?.views || 0;
    } catch (error) {
      safeLogger.error('Error incrementing status view:', error);
      return 0;
    }
  }

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

      console.log('🔍 [STATUS SERVICE] Inserting status data:', JSON.stringify(insertData));

      const [newPost] = await this.db.insert(statuses).values(insertData).returning();

      if (!newPost) {
        throw new Error('Failed to create status - no data returned from database');
      }

      // Update cache with error handling
      try {
        trendingCacheService.updatePost(newPost.id);
      } catch (cacheError) {
        safeLogger.warn('Cache update failed, but post was created:', cacheError);
      }

      // Process @mentions
      try {
        // Fetch author information for mention notifications
        const author = await this.db
          .select({
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName
          })
          .from(users)
          .where(eq(users.id, postData.authorId))
          .limit(1);

        if (author && author.length > 0) {
          const mentionCount = await mentionService.processMentions({
            statusId: newPost.id,
            authorId: postData.authorId,
            authorWalletAddress: author[0].walletAddress,
            authorHandle: author[0].displayName || author[0].handle || author[0].walletAddress.substring(0, 10),
            content: postData.content || '',
            contentUrl: `/status/${newPost.id}`
          });

          if (mentionCount > 0) {
            safeLogger.info(`[StatusService] Processed ${mentionCount} mentions in status ${newPost.id}`);
          }
        }
      } catch (mentionError) {
        safeLogger.error('[StatusService] Failed to process mentions:', mentionError);
        // Don't fail status creation if mention processing fails
      }

      return newPost;
    } catch (error: any) {
      safeLogger.error('Error creating status:', error);
      throw new Error(`Failed to create quick post: ${error.message}`);
    }
  }

  async getStatus(id: string) {
    try {
      const results = await this.db
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
          views: statuses.views,
          createdAt: statuses.createdAt,
          updatedAt: statuses.updatedAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          displayName: users.displayName,
          avatarCid: users.avatarCid,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        .where(eq(statuses.id, id))
        .limit(1);

      const rawPost = results[0];
      if (!rawPost) return null;

      // Transform to match frontend expectations
      const { handle, walletAddress, ...rest } = rawPost;
      return {
        ...rawPost,
        author: walletAddress || rawPost.authorId,
        authorProfile: {
          handle: handle || undefined,
          walletAddress: walletAddress || undefined,
          displayName: (rawPost as any).displayName || undefined,
          avatarCid: (rawPost as any).avatarCid || undefined
        }
      };
    } catch (error: any) {
      safeLogger.error('Error getting status:', error);
      throw new Error(`Failed to retrieve quick post: ${error.message}`);
    }
  }

  async getStatusByShareId(shareId: string) {
    try {
      const results = await this.db
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
          displayName: users.displayName,
          avatarCid: users.avatarCid,
          isRepost: statuses.isRepost
        })
        .from(statuses)
        .leftJoin(users, eq(statuses.authorId, users.id))
        .where(eq(statuses.shareId, shareId))
        .limit(1);

      const rawPost = results[0];
      if (!rawPost) return null;

      // Transform to match frontend expectations
      const { handle, walletAddress, ...rest } = rawPost;
      return {
        ...rawPost,
        author: walletAddress || rawPost.authorId,
        authorProfile: {
          handle: handle || undefined,
          walletAddress: walletAddress || undefined,
          displayName: (rawPost as any).displayName || undefined,
          avatarCid: (rawPost as any).avatarCid || undefined
        }
      };
    } catch (error: any) {
      safeLogger.error('Error getting status by share ID:', error);
      throw new Error(`Failed to retrieve quick post by share ID: ${error.message}`);
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

      const [updatedPost] = await this.db
        .update(statuses)
        .set(updateFields)
        .where(eq(statuses.id, id))
        .returning();

      return updatedPost || null;
    } catch (error: any) {
      safeLogger.error('Error updating status:', error);
      throw new Error(`Failed to update quick post: ${error.message}`);
    }
  }

  async deleteStatus(id: string, userId?: string) {
    try {
      // First, check if the post exists and get its author
      const [existingPost] = await this.db
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
      const result = await this.db
        .delete(statuses)
        .where(eq(statuses.id, id))
        .returning();

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

      const posts = await this.db
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
      const countResult = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          eq(statuses.authorId, authorId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
        ));

      const count = Number(countResult[0]?.count || 0);

      return {
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error: any) {
      safeLogger.error('Error getting status by author:', error);
      throw new Error(`Failed to retrieve quick posts: ${error.message}`);
    }
  }

  async addReaction(statusId: string, userId: string, type: string, amount: string) {
    try {
      // Check if reaction already exists
      const existingReactions = await this.db
        .select()
        .from(statusReactions)
        .where(and(
          eq(statusReactions.statusId, statusId),
          eq(statusReactions.userId, userId)
        ))
        .limit(1);

      let reaction;
      if (existingReactions.length > 0) {
        const oldType = existingReactions[0].type;

        if (oldType === type) {
          // Toggle off (remove reaction)
          await this.db
            .delete(statusReactions)
            .where(and(
              eq(statusReactions.statusId, statusId),
              eq(statusReactions.userId, userId)
            ));

          // Decrement count
          if (type === 'upvote') {
            await this.db.update(statuses).set({ upvotes: sql`${statuses.upvotes} - 1` }).where(eq(statuses.id, statusId));
          } else if (type === 'downvote') {
            await this.db.update(statuses).set({ downvotes: sql`${statuses.downvotes} - 1` }).where(eq(statuses.id, statusId));
          }

          reaction = null; // Reaction removed
        } else {
          // Update existing reaction (Change type)
          [reaction] = await this.db
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

          // Update counts if type changed
          const updates: any = {};

          // Decrement old type
          if (oldType === 'upvote') updates.upvotes = sql`${statuses.upvotes} - 1`;
          else if (oldType === 'downvote') updates.downvotes = sql`${statuses.downvotes} - 1`;

          // Increment new type
          if (type === 'upvote') updates.upvotes = updates.upvotes ? sql`${updates.upvotes} + 1` : sql`${statuses.upvotes} + 1`;
          else if (type === 'downvote') updates.downvotes = updates.downvotes ? sql`${updates.downvotes} + 1` : sql`${statuses.downvotes} + 1`;

          if (Object.keys(updates).length > 0) {
            await this.db.update(statuses).set(updates).where(eq(statuses.id, statusId));
          }
        }
      } else {
        // Create new reaction
        [reaction] = await this.db
          .insert(statusReactions)
          .values({
            statusId,
            userId,
            type,
            amount,
            createdAt: new Date()
          })
          .returning();

        // Increment count for new reaction
        if (type === 'upvote') {
          await this.db.update(statuses).set({ upvotes: sql`${statuses.upvotes} + 1` }).where(eq(statuses.id, statusId));
        } else if (type === 'downvote') {
          await this.db.update(statuses).set({ downvotes: sql`${statuses.downvotes} + 1` }).where(eq(statuses.id, statusId));
        }
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

      // Trigger user notification
      try {
        if (userId) { // Ensure reactor is known
          const status = await this.db
            .select({
              authorId: statuses.authorId,
              content: statuses.content,
              contentCid: statuses.contentCid
            })
            .from(statuses)
            .where(eq(statuses.id, statusId))
            .limit(1);

          if (status[0] && status[0].authorId !== userId) {
            const reactor = await this.db
              .select({
                displayName: users.displayName,
                handle: users.handle,
                walletAddress: users.walletAddress
              })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            const author = await this.db
              .select({ walletAddress: users.walletAddress })
              .from(users)
              .where(eq(users.id, status[0].authorId))
              .limit(1);

            if (reactor[0] && author[0]) {
              const reactorName = reactor[0].displayName || reactor[0].handle || reactor[0].walletAddress.substring(0, 6);

              let notifType: any = 'award';
              let title = 'New Award';
              let message = `${reactorName} awarded your status`;

              if (type === 'upvote') {
                notifType = 'post_upvote';
                title = 'New Upvote';
                message = `${reactorName} upvoted your status`;
              } else if (type === 'downvote') {
                notifType = 'post_downvote';
                title = 'New Downvote';
                message = `${reactorName} downvoted your status`;
              } else {
                // Emoji or other reaction, treat as award/reaction
                message = `${reactorName} reacted with ${type} to your status`;
              }

              await communityNotificationService.sendNotification({
                userAddress: author[0].walletAddress,
                communityId: 'global',
                communityName: 'LinkDAO',
                type: notifType,
                title: title,
                message: message,
                contentPreview: (status[0].content || status[0].contentCid || '').substring(0, 100),
                userName: reactorName,
                actionUrl: `/status/${statusId}`,
                metadata: {
                  reactorId: userId,
                  reactionType: type,
                  amount,
                  statusId
                }
              });

              // Also send via enhanced notification service for email
              await enhancedNotificationService.createSocialNotification({
                userId: author[0].walletAddress,
                type: 'reaction',
                priority: 'low', // Reactions are low priority
                title,
                message,
                actionUrl: `/status/${statusId}`,
                actorId: reactor[0].walletAddress,
                actorHandle: reactorName,
                actorAvatar: undefined, // TODO: fetch avatar from reactor
                postId: statusId,
                metadata: {
                  reactionType: type,
                  reactionEmoji: type !== 'upvote' && type !== 'downvote' ? type : undefined,
                  amount
                }
              });
            }
          }
        }
      } catch (notifyError) {
        safeLogger.error('Error sending reaction notification:', notifyError);
      }

      return reaction;
    } catch (error: any) {
      safeLogger.error('Error adding reaction:', error);
      throw new Error(`Failed to add reaction: ${error.message}`);
    }
  }

  async addTip(statusId: string, fromUserId: string, toUserId: string, token: string, amount: string, message?: string) {
    try {
      const [tip] = await this.db
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

      // Trigger user notification
      try {
        if (fromUserId !== toUserId) {
          const tipper = await this.db
            .select({
              displayName: users.displayName,
              handle: users.handle,
              walletAddress: users.walletAddress
            })
            .from(users)
            .where(eq(users.id, fromUserId))
            .limit(1);

          const recipient = await this.db
            .select({ walletAddress: users.walletAddress })
            .from(users)
            .where(eq(users.id, toUserId))
            .limit(1);

          // Fetch status for preview
          const status = await this.db
            .select({
              content: statuses.content,
              contentCid: statuses.contentCid
            })
            .from(statuses)
            .where(eq(statuses.id, statusId))
            .limit(1);

          if (tipper[0] && recipient[0]) {
            const tipperName = tipper[0].displayName || tipper[0].handle || tipper[0].walletAddress.substring(0, 6);

            await communityNotificationService.sendNotification({
              userAddress: recipient[0].walletAddress,
              communityId: 'global',
              communityName: 'LinkDAO',
              type: 'tip',
              title: 'New Tip!',
              message: `${tipperName} tipped you ${amount} ${token}`,
              contentPreview: (status[0]?.content || status[0]?.contentCid || '').substring(0, 100),
              userName: tipperName,
              actionUrl: `/status/${statusId}`,
              metadata: {
                tipperId: fromUserId,
                amount,
                token,
                message,
                statusId
              }
            });
          }
        }
      } catch (notifyError) {
        safeLogger.error('Error sending tip notification:', notifyError);
      }

      return tip;
    } catch (error: any) {
      safeLogger.error('Error adding tip:', error);
      throw new Error(`Failed to add tip: ${error.message}`);
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

      const rawPosts = await this.db
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
          displayName: users.displayName,
          avatarCid: users.avatarCid,
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
          original_author_avatar: originalAuthors.avatarCid,
          original_author_displayName: originalAuthors.displayName
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
              displayName: (post as any).original_author_displayName || undefined,
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
      const countResult = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          timeFilter,
          authorFilter,
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`,
          or(isNull(statuses.parentId), eq(statuses.isRepost, true))
        ));

      const count = Number(countResult[0]?.count || 0);

      return {
        posts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error: any) {
      safeLogger.error('Error getting status feed:', error);
      throw new Error(`Failed to retrieve quick post feed: ${error.message}`);
    }
  }

  async getStatusReplies(statusId: string, options: { page?: number; limit?: number; sort?: 'new' | 'old' }) {
    const { page = 1, limit = 20, sort = 'new' } = options;
    const offset = (page - 1) * limit;

    try {
      // Build sort order
      const orderByClause = sort === 'new' ? desc(statuses.createdAt) : asc(statuses.createdAt);

      const replies = await this.db
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
      const countResult = await this.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(statuses)
        .where(and(
          eq(statuses.parentId, statusId),
          sql`${statuses.moderationStatus} IS NULL OR ${statuses.moderationStatus} != 'blocked'`
        ));

      const count = Number(countResult[0]?.count || 0);

      return {
        replies,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error: any) {
      safeLogger.error('Error getting status replies:', error);
      throw new Error(`Failed to retrieve quick post replies: ${error.message}`);
    }
  }

  async getStatusReactions(statusId: string) {
    try {
      const reactionsResult = await this.db
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

      return reactionsResult;
    } catch (error: any) {
      safeLogger.error('Error getting status reactions:', error);
      throw new Error(`Failed to retrieve quick post reactions: ${error.message}`);
    }
  }

  async getStatusTips(statusId: string) {
    try {
      const tipsResult = await this.db
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

      return tipsResult;
    } catch (error: any) {
      safeLogger.error('Error getting status tips:', error);
      throw new Error(`Failed to retrieve quick post tips: ${error.message}`);
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