/**
 * Bookmark Service
 *
 * Handles user bookmarking of posts and statuses
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { bookmarks, posts, statuses, users } from '../db/schema';
import communityNotificationService from './communityNotificationService';
import { eq, and, sql, or } from 'drizzle-orm';

type ContentType = 'post' | 'status';

class BookmarkService {
  /**
   * Add a bookmark
   */
  async addBookmark(userId: string, contentId: string, contentType: ContentType = 'post'): Promise<boolean> {
    try {
      // Check if content exists based on type
      if (contentType === 'post') {
        const post = await db
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.id, contentId))
          .limit(1);

        if (post.length === 0) {
          throw new Error('Post not found');
        }
      } else if (contentType === 'status') {
        const status = await db
          .select({ id: statuses.id })
          .from(statuses)
          .where(eq(statuses.id, contentId))
          .limit(1);

        if (status.length === 0) {
          throw new Error('Status not found');
        }
      }

      // Check if already bookmarked
      const existing = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          contentType === 'post'
            ? eq(bookmarks.postId, contentId)
            : eq(bookmarks.statusId, contentId)
        ))
        .limit(1);

      if (existing.length > 0) {
        return false; // Already bookmarked
      }

      // Add bookmark with appropriate content reference
      const insertData: any = {
        userId,
        contentType
      };

      if (contentType === 'post') {
        insertData.postId = contentId;
      } else {
        insertData.statusId = contentId;
      }

      await db.insert(bookmarks).values(insertData);

      // Trigger notification
      try {
        let authorId: string | undefined;
        let contentPreview: string | undefined;
        let contentIdForUrl: string = contentId;
        let communityId: string = 'global';
        let communityName: string = 'LinkDAO';
        let actionUrl = '';

        if (contentType === 'status') {
          const status = await db
            .select({
              authorId: statuses.authorId,
              content: statuses.content,
              contentCid: statuses.contentCid
            })
            .from(statuses)
            .where(eq(statuses.id, contentId))
            .limit(1);

          if (status[0]) {
            authorId = status[0].authorId;
            contentPreview = status[0].content || status[0].contentCid;
            actionUrl = `/status/${contentId}`;
          }
        } else {
          // Post
          const post = await db
            .select({
              authorId: posts.authorId,
              contentCid: posts.contentCid
            })
            .from(posts)
            .where(eq(posts.id, contentId))
            .limit(1);

          if (post[0]) {
            authorId = post[0].authorId;
            contentPreview = post[0].contentCid; // Posts use CID, might need IPFS fetch but we use CID as preview text for now or 'New Post'
            actionUrl = `/post/${contentId}`; // Assuming route
            // Attempts to find community? For now default to global
          }
        }

        if (authorId && authorId !== userId) {
          // Get bookmarker user details
          const bookmarker = await db
            .select({
              walletAddress: users.walletAddress,
              displayName: users.displayName,
              handle: users.handle
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          // Get author wallet address
          const author = await db
            .select({ walletAddress: users.walletAddress })
            .from(users)
            .where(eq(users.id, authorId))
            .limit(1);

          if (bookmarker[0] && author[0]) {
            const bookmarkerName = bookmarker[0].displayName || bookmarker[0].handle || bookmarker[0].walletAddress.substring(0, 6);

            await communityNotificationService.sendNotification({
              userAddress: author[0].walletAddress,
              communityId,
              communityName,
              type: 'bookmark',
              title: 'New Bookmark',
              message: `${bookmarkerName} bookmarked your ${contentType}`,
              contentPreview: contentPreview?.substring(0, 100),
              userName: bookmarkerName,
              actionUrl,
              metadata: {
                bookmarkerId: userId,
                contentType,
                contentId
              }
            });
          }
        }
      } catch (notifyError) {
        safeLogger.error('Error sending bookmark notification:', notifyError);
        // Don't fail the bookmark action
      }

      return true;
    } catch (error) {
      safeLogger.error('Error adding bookmark:', error);
      throw new Error('Failed to add bookmark');
    }
  }

  /**
   * Remove a bookmark
   */
  async removeBookmark(userId: string, contentId: string, contentType: ContentType = 'post'): Promise<boolean> {
    try {
      await db
        .delete(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          contentType === 'post'
            ? eq(bookmarks.postId, contentId)
            : eq(bookmarks.statusId, contentId)
        ));

      return true;
    } catch (error) {
      safeLogger.error('Error removing bookmark:', error);
      throw new Error('Failed to remove bookmark');
    }
  }

  /**
   * Toggle bookmark (add if not exists, remove if exists)
   * Automatically detects content type by checking both tables
   */
  async toggleBookmark(userId: string, contentId: string, providedContentType?: ContentType): Promise<{ bookmarked: boolean }> {
    try {
      // Determine content type if not provided
      let contentType: ContentType = providedContentType || 'post';

      if (!providedContentType) {
        // Auto-detect: first check posts table, then statuses
        const postExists = await db
          .select({ id: posts.id })
          .from(posts)
          .where(eq(posts.id, contentId))
          .limit(1);

        if (postExists.length === 0) {
          // Not a post, check if it's a status
          const statusExists = await db
            .select({ id: statuses.id })
            .from(statuses)
            .where(eq(statuses.id, contentId))
            .limit(1);

          if (statusExists.length > 0) {
            contentType = 'status';
          } else {
            throw new Error('Content not found');
          }
        }
      }

      // Check if already bookmarked
      const existing = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          contentType === 'post'
            ? eq(bookmarks.postId, contentId)
            : eq(bookmarks.statusId, contentId)
        ))
        .limit(1);

      if (existing.length > 0) {
        await this.removeBookmark(userId, contentId, contentType);
        return { bookmarked: false };
      } else {
        await this.addBookmark(userId, contentId, contentType);
        return { bookmarked: true };
      }
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      throw new Error('Failed to toggle bookmark');
    }
  }

  /**
   * Check if a content is bookmarked by a user
   */
  async isBookmarked(userId: string, contentId: string): Promise<boolean> {
    try {
      // Check both post and status bookmarks
      const result = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.userId, userId),
          or(
            eq(bookmarks.postId, contentId),
            eq(bookmarks.statusId, contentId)
          )
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

      // Get post bookmarks
      const postBookmarks = await db
        .select({
          postId: bookmarks.postId,
          bookmarkedAt: bookmarks.createdAt,
          contentType: bookmarks.contentType,
          post: posts
        })
        .from(bookmarks)
        .leftJoin(posts, eq(bookmarks.postId, posts.id))
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.contentType, 'post')
        ))
        .orderBy(sql`${bookmarks.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      // Get status bookmarks
      const statusBookmarks = await db
        .select({
          postId: bookmarks.statusId,
          bookmarkedAt: bookmarks.createdAt,
          contentType: bookmarks.contentType,
          post: {
            id: statuses.id,
            contentCid: statuses.contentCid,
            authorAddress: statuses.authorId,
            title: sql<string>`NULL`,
            content: statuses.content,
            media: statuses.mediaCids,
            createdAt: statuses.createdAt,
            updatedAt: statuses.updatedAt,
            communityId: sql<string>`NULL`,
            upvotes: statuses.upvotes,
            downvotes: statuses.downvotes,
            commentsCount: sql<number>`0`,
            views: statuses.views
          }
        })
        .from(bookmarks)
        .leftJoin(statuses, eq(bookmarks.statusId, statuses.id))
        .where(and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.contentType, 'status')
        ))
        .orderBy(sql`${bookmarks.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      // Combine and sort by bookmarkedAt
      const allBookmarks = [...postBookmarks, ...statusBookmarks]
        .sort((a, b) => {
          const dateA = a.bookmarkedAt ? new Date(a.bookmarkedAt).getTime() : 0;
          const dateB = b.bookmarkedAt ? new Date(b.bookmarkedAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId));

      return {
        bookmarks: allBookmarks,
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
   * Get bookmark count for a content
   */
  async getBookmarkCount(contentId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(or(
          eq(bookmarks.postId, contentId),
          eq(bookmarks.statusId, contentId)
        ));

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting bookmark count:', error);
      return 0;
    }
  }
}

export const bookmarkService = new BookmarkService();
