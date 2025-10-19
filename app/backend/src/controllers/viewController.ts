/**
 * View Tracking Controller
 *
 * Handles HTTP requests for tracking and retrieving post views
 */

import { Request, Response } from 'express';
import { viewService } from '../services/viewService';

class ViewController {
  /**
   * Track a post view
   * POST /api/views/track
   */
  async trackView(req: Request, res: Response) {
    try {
      const { postId } = req.body;
      const userId = (req as any).user?.id; // From JWT middleware
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      const tracked = await viewService.trackView({
        postId: parseInt(postId),
        userId,
        ipAddress,
        userAgent
      });

      res.json({
        success: true,
        tracked, // false if deduplicated
        message: tracked ? 'View tracked' : 'View already recorded'
      });
    } catch (error) {
      console.error('Error in trackView:', error);
      res.status(500).json({ error: 'Failed to track view' });
    }
  }

  /**
   * Get view count for a post
   * GET /api/views/:postId/count
   */
  async getViewCount(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const count = await viewService.getViewCount(postId);

      res.json({ postId, viewCount: count });
    } catch (error) {
      console.error('Error in getViewCount:', error);
      res.status(500).json({ error: 'Failed to get view count' });
    }
  }

  /**
   * Get view analytics for a post
   * GET /api/views/:postId/analytics
   */
  async getViewAnalytics(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const analytics = await viewService.getViewAnalytics(postId);

      res.json({ postId, ...analytics });
    } catch (error) {
      console.error('Error in getViewAnalytics:', error);
      res.status(500).json({ error: 'Failed to get view analytics' });
    }
  }

  /**
   * Track multiple post views (for feed browsing)
   * POST /api/views/track-batch
   */
  async trackBatchViews(req: Request, res: Response) {
    try {
      const { postIds } = req.body;
      const userId = (req as any).user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ error: 'Post IDs array is required' });
      }

      const results = await Promise.all(
        postIds.map(postId =>
          viewService.trackView({
            postId: parseInt(postId),
            userId,
            ipAddress,
            userAgent
          })
        )
      );

      const trackedCount = results.filter(r => r).length;

      res.json({
        success: true,
        tracked: trackedCount,
        total: postIds.length,
        message: `Tracked ${trackedCount} of ${postIds.length} views`
      });
    } catch (error) {
      console.error('Error in trackBatchViews:', error);
      res.status(500).json({ error: 'Failed to track batch views' });
    }
  }
}

export const viewController = new ViewController();
