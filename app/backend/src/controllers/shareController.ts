/**
 * Share Controller
 *
 * Handles HTTP requests for share tracking
 */

import { Request, Response } from 'express';
import { shareService } from '../services/shareService';

class ShareController {
  /**
   * Track a share
   * POST /api/shares/track
   */
  async trackShare(req: Request, res: Response) {
    try {
      const { postId, targetType, targetId, message } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!postId || !targetType) {
        return res.status(400).json({ error: 'Post ID and target type are required' });
      }

      if (!['community', 'dm', 'external'].includes(targetType)) {
        return res.status(400).json({ error: 'Invalid target type' });
      }

      await shareService.trackShare({
        postId: parseInt(postId),
        userId,
        targetType,
        targetId,
        message
      });

      res.json({
        success: true,
        message: 'Share tracked successfully'
      });
    } catch (error) {
      console.error('Error in trackShare:', error);
      res.status(500).json({ error: 'Failed to track share' });
    }
  }

  /**
   * Get share count for a post
   * GET /api/shares/:postId/count
   */
  async getShareCount(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const count = await shareService.getShareCount(postId);

      res.json({ postId, shareCount: count });
    } catch (error) {
      console.error('Error in getShareCount:', error);
      res.status(500).json({ error: 'Failed to get share count' });
    }
  }

  /**
   * Get share breakdown for a post
   * GET /api/shares/:postId/breakdown
   */
  async getShareBreakdown(req: Request, res: Response) {
    try {
      const postId = parseInt(req.params.postId);

      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      const breakdown = await shareService.getShareBreakdown(postId);

      res.json({ postId, ...breakdown });
    } catch (error) {
      console.error('Error in getShareBreakdown:', error);
      res.status(500).json({ error: 'Failed to get share breakdown' });
    }
  }

  /**
   * Get user's sharing history
   * GET /api/shares/my-shares
   */
  async getUserShares(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await shareService.getUserShares(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error in getUserShares:', error);
      res.status(500).json({ error: 'Failed to retrieve shares' });
    }
  }
}

export const shareController = new ShareController();
