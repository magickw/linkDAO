/**
 * Bookmark Controller
 *
 * Handles HTTP requests for bookmark operations
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber, validateUUID } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { bookmarkService } from '../services/bookmarkService';

class BookmarkController {
  /**
   * Toggle bookmark for a post
   * POST /api/bookmarks/toggle
   */
  async toggleBookmark(req: Request, res: Response) {
    try {
      const { postId } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      // Validate postId as UUID
      const isValidUUID = validateUUID(postId);
      if (!isValidUUID) {
        return res.status(400).json({ error: 'Invalid post ID format' });
      }

      const result = await bookmarkService.toggleBookmark(userId, postId);

      res.json({
        success: true,
        bookmarked: result.bookmarked,
        message: result.bookmarked ? 'Post bookmarked' : 'Bookmark removed'
      });
    } catch (error) {
      safeLogger.error('Error in toggleBookmark:', error);
      res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
  }

  /**
   * Get user's bookmarks
   * GET /api/bookmarks
   */
  async getUserBookmarks(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const contentType = req.query.contentType as string;
      const sortBy = req.query.sortBy as string || 'newest';
      const search = req.query.search as string;
      const format = req.query.format as string || 'default'; // 'default' or 'mobile'

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await bookmarkService.getUserBookmarks(userId, page, limit, contentType, sortBy, search);

      // Support mobile API format
      if (format === 'mobile') {
        // Transform bookmarks to mobile-expected format
        const posts = result.bookmarks
          .filter(b => b.contentType === 'post')
          .map(b => ({
            id: b.post.id,
            content: b.post.content || '',
            author: {
              id: b.post.authorAddress,
              name: b.post.authorAddress?.substring(0, 8) || 'Anonymous',
              avatar: '#3b82f6'
            },
            timestamp: b.post.createdAt || new Date().toISOString(),
            likes: b.post.upvotes || 0,
            comments: b.post.commentsCount || 0,
            bookmarkedAt: b.bookmarkedAt || new Date().toISOString()
          }));

        const statuses = result.bookmarks
          .filter(b => b.contentType === 'status')
          .map(b => ({
            id: b.post.id,
            content: b.post.content || '',
            author: {
              id: b.post.authorAddress,
              name: b.post.authorAddress?.substring(0, 8) || 'Anonymous',
              avatar: '#3b82f6'
            },
            timestamp: b.post.createdAt || new Date().toISOString(),
            likes: b.post.upvotes || 0,
            comments: b.post.commentsCount || 0,
            bookmarkedAt: b.bookmarkedAt || new Date().toISOString()
          }));

        return res.json({
          success: true,
          data: {
            posts,
            communities: [], // Currently not supported
            users: [] // Currently not supported
          },
          pagination: result.pagination
        });
      }

      // Default API format
      res.json(result);
    } catch (error) {
      safeLogger.error('Error in getUserBookmarks:', error);
      res.status(500).json({ error: 'Failed to retrieve bookmarks' });
    }
  }

  /**
   * Check if post is bookmarked
   * GET /api/bookmarks/check/:postId
   */
  async checkBookmark(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const postId = req.params.postId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate postId as UUID
      const isValidUUID = validateUUID(postId);
      if (!isValidUUID) {
        return res.status(400).json({ error: 'Invalid post ID format' });
      }

      const bookmarked = await bookmarkService.isBookmarked(userId, postId);

      res.json({ postId, bookmarked });
    } catch (error) {
      safeLogger.error('Error in checkBookmark:', error);
      res.status(500).json({ error: 'Failed to check bookmark status' });
    }
  }

  /**
   * Get bookmark count for a post
   * GET /api/bookmarks/:postId/count
   */
  async getBookmarkCount(req: Request, res: Response) {
    try {
      const postId = req.params.postId;

      // Validate postId as UUID
      const isValidUUID = validateUUID(postId);
      if (!isValidUUID) {
        return res.status(400).json({ error: 'Invalid post ID format' });
      }

      const count = await bookmarkService.getBookmarkCount(postId);

      res.json({ postId, bookmarkCount: count });
    } catch (error) {
      safeLogger.error('Error in getBookmarkCount:', error);
      res.status(500).json({ error: 'Failed to get bookmark count' });
    }
  }
}

export const bookmarkController = new BookmarkController();
