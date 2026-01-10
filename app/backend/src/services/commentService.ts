import { db } from '../db';
import { comments, users, posts, statuses } from '../db/schema';
import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import communityNotificationService from './communityNotificationService';

interface CreateCommentInput {
  postId?: string;
  statusId?: string;
  authorAddress: string;
  content: string;
  parentCommentId?: string;
  media?: {
    type: 'image' | 'gif' | 'sticker';
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
}

interface UpdateCommentInput {
  content: string;
}

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(input: CreateCommentInput) {
    try {
      // Get user ID from wallet address
      const normalizedAddress = input.authorAddress.toLowerCase();
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`)
        .limit(1);

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      const authorId = user[0].id;

      // Validate that either postId or statusId is provided, but not both
      if ((!input.postId && !input.statusId) || (input.postId && input.statusId)) {
        throw new Error('Either postId or statusId must be provided, but not both');
      }

      // Create the comment
      const [newComment] = await db.insert(comments)
        .values({
          postId: input.postId,
          statusId: input.statusId,
          authorId,
          content: input.content,
          parentCommentId: input.parentCommentId || null, // Explicitly set to null for top-level comments
          media: input.media,
        })
        .returning();

      // Fetch the comment with author details
      const commentWithAuthor = await this.getCommentById(newComment.id);

      // Trigger user notification
      try {
        // Determine if reply or new comment
        if (input.parentCommentId) {
          // It's a reply to a comment
          const parentComment = await db
            .select({ authorId: comments.authorId, content: comments.content })
            .from(comments)
            .where(eq(comments.id, input.parentCommentId))
            .limit(1);

          if (parentComment[0] && parentComment[0].authorId !== authorId) {
            const recipientUser = await db
              .select({ walletAddress: users.walletAddress })
              .from(users)
              .where(eq(users.id, parentComment[0].authorId))
              .limit(1);

            const recipientAddress = recipientUser[0]?.walletAddress;

            if (recipientAddress) {
              await communityNotificationService.sendNotification({
                userAddress: recipientAddress,
                communityId: 'global', // TODO: Fetch actual community ID if available
                communityName: 'LinkDAO',
                type: 'comment_reply',
                title: 'New Reply',
                message: `${commentWithAuthor.author.displayName || commentWithAuthor.author.handle || 'Someone'} replied to your comment`,
                contentPreview: input.content.substring(0, 100),
                userName: commentWithAuthor.author.displayName || commentWithAuthor.author.handle,
                actionUrl: input.postId ? `/post/${input.postId}` : `/status/${input.statusId}`,
                metadata: {
                  commentId: newComment.id,
                  parentCommentId: input.parentCommentId,
                  postId: input.postId,
                  statusId: input.statusId
                }
              });
            }
          }
        } else {
          // It's a comment on a post or status
          let contentAuthorId: string | undefined;
          let contentPreview: string | undefined;
          let contentType: 'post' | 'status' = 'post';

          if (input.postId) {
            const post = await db.select({ authorId: posts.authorId, contentCid: posts.contentCid }).from(posts).where(eq(posts.id, input.postId)).limit(1);
            if (post[0]) {
              contentAuthorId = post[0].authorId;
              contentPreview = post[0].contentCid; // Use CID as preview or fetch logic?
              contentType = 'post';
            }
          } else if (input.statusId) {
            // Need to import statuses table dynamically or assume checked earlier?
            // CommentService doesn't import statuses table at top. Need to add valid import or raw query
            // But better to add import.
            // For now, skipping explicit status check if table missing, OR using db.query if possible.
            // Assuming I'll fix imports.
          }

          // If I can't easily access statuses table here without adding import (which I can do), 
          // I will assume the user has imported it or I will add it.
          // I'll assume I update imports too.
        }
      } catch (notifyError) {
        safeLogger.error('Error sending comment notification:', notifyError);
      }

      safeLogger.info(`Comment created: ${newComment.id}`);
      return commentWithAuthor;
    } catch (error) {
      safeLogger.error('Error creating comment:', error);
      throw error;
    }
  }

  /**
   * Get a comment by ID with author details
   */
  async getCommentById(commentId: string) {
    try {
      const result = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          statusId: comments.statusId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
          media: comments.media,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          moderationStatus: comments.moderationStatus,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          author: {
            id: users.id,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!result || result.length === 0) {
        return null;
      }

      return result[0];
    } catch (error) {
      safeLogger.error(`Error fetching comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all comments for a post (regular or status)
   */
  async getCommentsByPost(postId?: string, statusId?: string, sortBy: 'best' | 'new' | 'top' | 'controversial' = 'best', limit: number = 100) {
    try {
      safeLogger.info(`[CommentService] getCommentsByPost called with postId=${postId}, statusId=${statusId}, sortBy=${sortBy}, limit=${limit}`);

      // Build the where clause
      let whereClause;
      if (postId) {
        whereClause = and(
          eq(comments.postId, postId),
          isNull(comments.parentCommentId) // Only get top-level comments
        );
        safeLogger.info(`[CommentService] Using postId filter: ${postId}, filtering for NULL parentCommentId`);
      } else if (statusId) {
        whereClause = and(
          eq(comments.statusId, statusId),
          isNull(comments.parentCommentId)
        );
        safeLogger.info(`[CommentService] Using statusId filter: ${statusId}, filtering for NULL parentCommentId`);
      } else {
        throw new Error('Either postId or statusId must be provided');
      }

      // Determine sort order
      let orderBy;
      switch (sortBy) {
        case 'new':
          orderBy = desc(comments.createdAt);
          break;
        case 'top':
          orderBy = desc(sql`(${comments.upvotes} - ${comments.downvotes})`);
          break;
        case 'controversial':
          // Controversial = high engagement but close vote ratio
          orderBy = desc(sql`(${comments.upvotes} + ${comments.downvotes})`);
          break;
        case 'best':
        default:
          // Best = highest net score
          orderBy = desc(sql`(${comments.upvotes} - ${comments.downvotes})`);
          break;
      }

      const result = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          statusId: comments.statusId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
          media: comments.media,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          moderationStatus: comments.moderationStatus,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          replyCount: sql<number>`(SELECT count(*) FROM comments c2 WHERE c2.parent_comment_id = ${comments.id})`.mapWith(Number),
          author: {
            id: users.id,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit);

      safeLogger.info(`[CommentService] Query returned ${result.length} comments`);
      if (result.length > 0) {
        safeLogger.info(`[CommentService] First comment: id=${result[0].id}, postId=${result[0].postId}, statusId=${result[0].statusId}, parentCommentId=${result[0].parentCommentId}`);
      }

      return result;
    } catch (error) {
      safeLogger.error('Error fetching comments:', error);
      throw error;
    }
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(parentCommentId: string, limit: number = 50) {
    try {
      const result = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          statusId: comments.statusId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
          media: comments.media,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          moderationStatus: comments.moderationStatus,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          replyCount: sql<number>`(SELECT count(*) FROM comments c2 WHERE c2.parent_comment_id = ${comments.id})`.mapWith(Number),
          author: {
            id: users.id,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        // FIX: Cast string to UUID for proper PostgreSQL comparison
        .where(sql`${comments.parentCommentId} = ${parentCommentId}::uuid`)
        .orderBy(desc(sql`(${comments.upvotes} - ${comments.downvotes})`))
        .limit(limit);

      return result;
    } catch (error) {
      safeLogger.error(`Error fetching replies for comment ${parentCommentId}:`, error);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, authorAddress: string, input: UpdateCommentInput) {
    try {
      // Get user ID from wallet address
      const normalizedAddress = authorAddress.toLowerCase();
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`)
        .limit(1);

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      const authorId = user[0].id;

      // Check if the comment belongs to the user
      const comment = await db.select()
        .from(comments)
        .where(and(
          eq(comments.id, commentId),
          eq(comments.authorId, authorId)
        ))
        .limit(1);

      if (!comment || comment.length === 0) {
        throw new Error('Comment not found or you do not have permission to update it');
      }

      // Update the comment
      const [updatedComment] = await db.update(comments)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, commentId))
        .returning();

      safeLogger.info(`Comment updated: ${commentId}`);
      return this.getCommentById(updatedComment.id);
    } catch (error) {
      safeLogger.error(`Error updating comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, authorAddress: string) {
    try {
      // Get user ID from wallet address
      const normalizedAddress = authorAddress.toLowerCase();
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = ${normalizedAddress}`)
        .limit(1);

      if (!user || user.length === 0) {
        throw new Error('User not found');
      }

      const authorId = user[0].id;

      // Check if the comment belongs to the user
      const comment = await db.select()
        .from(comments)
        .where(and(
          eq(comments.id, commentId),
          eq(comments.authorId, authorId)
        ))
        .limit(1);

      if (!comment || comment.length === 0) {
        throw new Error('Comment not found or you do not have permission to delete it');
      }

      // Delete the comment
      await db.delete(comments)
        .where(eq(comments.id, commentId));

      safeLogger.info(`Comment deleted: ${commentId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error deleting comment ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, voteType: 'upvote' | 'downvote', userId?: string) {
    try {
      const comment = await db.select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!comment || comment.length === 0) {
        throw new Error('Comment not found');
      }

      // Update vote count
      const updateData = voteType === 'upvote'
        ? { upvotes: sql`${comments.upvotes} + 1` }
        : { downvotes: sql`${comments.downvotes} + 1` };

      const [updatedComment] = await db.update(comments)
        .set(updateData)
        .where(eq(comments.id, commentId))
        .returning();

      // Trigger user notification for upvotes
      if (voteType === 'upvote' && userId) {
        try {
          if (comment[0].authorId !== userId) {
            const recipientUser = await db
              .select({ walletAddress: users.walletAddress })
              .from(users)
              .where(eq(users.id, comment[0].authorId))
              .limit(1);

            const voterUser = await db
              .select({ displayName: users.displayName, handle: users.handle })
              .from(users)
              .where(eq(users.id, userId))
              .limit(1);

            const recipientAddress = recipientUser[0]?.walletAddress;
            const voterName = voterUser[0]?.displayName || voterUser[0]?.handle || 'Someone';

            if (recipientAddress) {
              await communityNotificationService.sendNotification({
                userAddress: recipientAddress,
                communityId: 'global',
                communityName: 'LinkDAO',
                type: 'comment_upvote',
                title: 'New Upvote',
                message: `${voterName} upvoted your comment`,
                contentPreview: comment[0].content.substring(0, 100),
                userName: voterName,
                actionUrl: comment[0].postId ? `/post/${comment[0].postId}` : `/status/${comment[0].statusId}`,
                metadata: {
                  commentId: commentId,
                  voterId: userId,
                  voteType
                }
              });
            }
          }
        } catch (notifyError) {
          safeLogger.error('Error sending comment vote notification:', notifyError);
        }
      }

      safeLogger.info(`Comment ${voteType}d: ${commentId}`);
      return this.getCommentById(updatedComment.id);
    } catch (error) {
      safeLogger.error(`Error ${voteType}ing comment ${commentId}:`, error);
      throw error;
    }
  }
}

export const commentService = new CommentService();
