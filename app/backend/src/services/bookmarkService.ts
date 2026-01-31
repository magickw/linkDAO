/**
 * Bookmark Service
 *
 * Handles user bookmarking of posts and statuses
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { bookmarks, posts, statuses, users } from '../db/schema';
import communityNotificationService from './communityNotificationService';
import { bookmarkCacheService } from './bookmarkCacheService';
import { eq, and, sql, or, ilike } from 'drizzle-orm';

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

      // Invalidate caches
      bookmarkCacheService.invalidateUserBookmarks(userId);
      bookmarkCacheService.invalidateBookmarkCount(contentId);
      bookmarkCacheService.invalidateIsBookmarked(userId, contentId);

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

      // Invalidate caches
      bookmarkCacheService.invalidateUserBookmarks(userId);
      bookmarkCacheService.invalidateBookmarkCount(contentId);
      bookmarkCacheService.invalidateIsBookmarked(userId, contentId);

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
      // Check cache first
      const cached = bookmarkCacheService.getIsBookmarked(userId, contentId);
      if (cached !== null) {
        return cached;
      }

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

      const isBookmarked = result.length > 0;
      
      // Cache result
      bookmarkCacheService.setIsBookmarked(userId, contentId, isBookmarked);
      
      return isBookmarked;
    } catch (error) {
      safeLogger.error('Error checking bookmark:', error);
      return false;
    }
  }

  /**
   * Get all bookmarks for a user with filtering and sorting
   */
  async getUserBookmarks(
    userId: string, 
    page: number = 1, 
    limit: number = 20,
    contentType?: string,
    sortBy: string = 'newest',
    search?: string
  ) {
    try {
      const offset = (page - 1) * limit;

      // Check cache first (only if no search, as search results shouldn't be cached)
      if (!search) {
        const cached = bookmarkCacheService.getUserBookmarks(userId, page, limit);
        if (cached) {
          return cached;
        }
      }

      // Build conditions
      const conditions = [eq(bookmarks.userId, userId)];
      
      if (contentType && contentType !== 'all') {
        conditions.push(eq(bookmarks.contentType, contentType));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(and(...conditions));
      
      const total = Number(countResult[0]?.count || 0);

      // Determine sort order for the main query
      let orderBy;
      if (sortBy === 'oldest') {
        orderBy = [bookmarks.createdAt];
      } else {
        orderBy = [desc(bookmarks.createdAt)];
      }

      // Get bookmark entries
      const bookmarkEntries = await db
        .select()
        .from(bookmarks)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);

      // Populate content for each bookmark
      const populatedBookmarks = await Promise.all(bookmarkEntries.map(async (bookmark) => {
        let contentData: any = null;

        if (bookmark.contentType === 'post' && bookmark.postId) {
          const postResult = await db
            .select({
              id: posts.id,
              contentCid: posts.contentCid,
              authorId: posts.authorId,
              title: posts.title,
              content: posts.content,
              media: posts.mediaCids,
              createdAt: posts.createdAt,
              updatedAt: posts.updatedAt,
              communityId: posts.communityId,
              upvotes: posts.upvotes,
              downvotes: posts.downvotes,
              views: posts.views,
              authorAddress: users.walletAddress,
              authorHandle: users.handle
            })
            .from(posts)
            .leftJoin(users, eq(posts.authorId, users.id))
            .where(eq(posts.id, bookmark.postId))
            .limit(1);
          
          if (postResult[0]) {
            contentData = {
              ...postResult[0],
              commentsCount: 0 // Default or fetch if needed
            };
          }
        } else if (bookmark.contentType === 'status' && bookmark.statusId) {
          const statusResult = await db
            .select({
              id: statuses.id,
              contentCid: statuses.contentCid,
              authorId: statuses.authorId,
              content: statuses.content,
              media: statuses.mediaCids,
              createdAt: statuses.createdAt,
              updatedAt: statuses.updatedAt,
              upvotes: statuses.upvotes,
              downvotes: statuses.downvotes,
              views: statuses.views,
              authorAddress: users.walletAddress,
              authorHandle: users.handle
            })
            .from(statuses)
            .leftJoin(users, eq(statuses.authorId, users.id))
            .where(eq(statuses.id, bookmark.statusId))
            .limit(1);
          
          if (statusResult[0]) {
            contentData = {
              ...statusResult[0],
              title: null,
              communityId: null,
              commentsCount: 0 // Default
            };
          }
        }

        return {
          postId: bookmark.postId || bookmark.statusId,
          bookmarkedAt: bookmark.createdAt,
          contentType: bookmark.contentType,
          post: contentData
        };
      }));

      // Filter out bookmarks where content might have been deleted
      const validBookmarks = populatedBookmarks.filter(b => b.post !== null);

      // Apply search in-memory if provided (since it's a small paginated set)
      // Note: Ideally search should be done in SQL, but with two different tables it's complex
      let finalBookmarks = validBookmarks;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        finalBookmarks = validBookmarks.filter(b => 
          (b.post.title && b.post.title.toLowerCase().includes(searchLower)) ||
          (b.post.content && b.post.content.toLowerCase().includes(searchLower))
        );
      }

      const result = {
        bookmarks: finalBookmarks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache result if no search
      if (!search) {
        bookmarkCacheService.setUserBookmarks(userId, page, limit, result);
      }

      return result;
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
      // Check cache first
      const cached = bookmarkCacheService.getBookmarkCount(contentId);
      if (cached !== null) {
        return cached;
      }

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(bookmarks)
        .where(or(
          eq(bookmarks.postId, contentId),
          eq(bookmarks.statusId, contentId)
        ));

      const count = result[0]?.count || 0;
      
      // Cache result
      bookmarkCacheService.setBookmarkCount(contentId, count);
      
      return count;
    } catch (error) {
      safeLogger.error('Error getting bookmark count:', error);
      return 0;
    }
  }
}

export const bookmarkService = new BookmarkService();
