import { db } from '../db';
import { comments, users, posts, quickPosts } from '../db/schema';
import { eq, and, desc, asc, isNull, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

interface CreateCommentInput {
  postId?: number;
  quickPostId?: string;
  authorAddress: string;
  content: string;
  parentCommentId?: string;
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

      // Validate that either postId or quickPostId is provided, but not both
      if ((!input.postId && !input.quickPostId) || (input.postId && input.quickPostId)) {
        throw new Error('Either postId or quickPostId must be provided, but not both');
      }

      // Create the comment
      const [newComment] = await db.insert(comments)
        .values({
          postId: input.postId,
          quickPostId: input.quickPostId,
          authorId,
          content: input.content,
          parentCommentId: input.parentCommentId,
        })
        .returning();

      // Fetch the comment with author details
      const commentWithAuthor = await this.getCommentById(newComment.id);

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
          quickPostId: comments.quickPostId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
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
   * Get all comments for a post (regular or quick post)
   */
  async getCommentsByPost(postId?: number, quickPostId?: string, sortBy: 'best' | 'new' | 'top' | 'controversial' = 'best', limit: number = 100) {
    try {
      // Build the where clause
      let whereClause;
      if (postId) {
        whereClause = and(
          eq(comments.postId, postId),
          isNull(comments.parentCommentId) // Only get top-level comments
        );
      } else if (quickPostId) {
        whereClause = and(
          eq(comments.quickPostId, quickPostId),
          isNull(comments.parentCommentId)
        );
      } else {
        throw new Error('Either postId or quickPostId must be provided');
      }

      // Determine sort order
      let orderBy;
      switch (sortBy) {
        case 'new':
          orderBy = desc(comments.createdAt);
          break;
        case 'top':
          orderBy = desc(sql`${comments.upvotes} - ${comments.downvotes}`);
          break;
        case 'controversial':
          // Controversial = high engagement but close vote ratio
          orderBy = desc(sql`${comments.upvotes} + ${comments.downvotes}`);
          break;
        case 'best':
        default:
          // Best = highest net score
          orderBy = desc(sql`${comments.upvotes} - ${comments.downvotes}`);
          break;
      }

      const result = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          quickPostId: comments.quickPostId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
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
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit);

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
          quickPostId: comments.quickPostId,
          content: comments.content,
          parentCommentId: comments.parentCommentId,
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
        .where(eq(comments.parentCommentId, parentCommentId))
        .orderBy(desc(sql`${comments.upvotes} - ${comments.downvotes}`))
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
  async voteComment(commentId: string, voteType: 'upvote' | 'downvote') {
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

      safeLogger.info(`Comment ${voteType}d: ${commentId}`);
      return this.getCommentById(updatedComment.id);
    } catch (error) {
      safeLogger.error(`Error ${voteType}ing comment ${commentId}:`, error);
      throw error;
    }
  }
}

export const commentService = new CommentService();
