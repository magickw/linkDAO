/**
 * Bookmark Service
 *
 * Handles user bookmarking of posts
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { bookmarks, posts } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

class BookmarkService {
  /**
   * Add a bookmark
   */
  async addBookmark(userId: string, postId: string): Promise<boolean> {
    try {
      // Check if post exists
      const post = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1);

      if (post.length === 0) {
        throw new Error('Post not found');
      }

      // Check if already bookmarked
      const existing = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.postId, postId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return false; // Already bookmarked
      }

      // Add bookmark
      await db.insert(bookmarks).values({
        userId,
        postId
      });

      return true;
    } catch (error) {
      safeLogger.error('Error adding bookmark:', error);
      throw new Error('Failed to add bookmark');
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, postId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.postId, postId)
        ));

      return true;
    } catch (error) {
      safeLogger.error('Error removing bookmark:', error);
      throw new Error('Failed to remove bookmark');
    }
  }

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   */
  async toggleBookmark(userId: string, postId: string): Promise<{ bookmarked: boolean }> {
    try {
      const existing = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.postId, postId)
        ))
        .limit(1);

      if (existing.length > 0) {
        await this.removeBookmark(userId, postId);
        return { bookmarked: false };
      } else {
        await this.addBookmark(userId, postId);
        return { bookmarked: true };
      }
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      throw new Error('Failed to toggle bookmark');
    }
  }

  /**
   * Check if a post is bookmarked by a user
   */
  async isBookmarked(userId: string, postId: string): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.postId, postId)
        ))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      safeLogger.error('Error checking bookmark:', error);
      return false;
    }
  }

  /**
   * Get all bookmarks for a user
   */
  async getUserBookmarks(userId: string, page: number = 1, limit: number = 20) {
    try {
      const offset = (page - 1) * limit;

      const userBookmarks = await db
        .select({
          postId: bookmarks.postId,
          bookmarkedAt: bookmarks.createdAt,
          post: posts
        })
        .from(bookmarks)
        .leftJoin(posts, eq(bookmarks.postId, posts.id))
        .where(eq(bookmarks.userId, userId))
        .orderBy(sql`${bookmarks.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId));

      return {
        bookmarks: userBookmarks,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting user bookmarks:', error);
      throw new Error('Failed to retrieve bookmarks');
    }
  }

  /**
   * Get bookmark count for a post
   */
  async getBookmarkCount(postId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(eq(bookmarks.postId, postId));

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting bookmark count:', error);
      return 0;
    }
  }
}

export const bookmarkService = new BookmarkService();
