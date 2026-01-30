/**
 * Mention Controller
 * Handles API requests for mention-related operations
 */

import { Request, Response } from 'express';
import { mentionService } from '../services/mentionService';
import { safeLogger } from '../utils/safeLogger';

export class MentionController {
  /**
   * Get mentions for the authenticated user
   * GET /api/mentions
   */
  async getMentions(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unread === 'true';

      const mentions = await mentionService.getMentionsForUser(userId, {
        limit,
        offset,
        unreadOnly
      });

      return res.json({
        success: true,
        data: mentions,
        pagination: {
          limit,
          offset,
          hasMore: mentions.length === limit
        }
      });
    } catch (error) {
      safeLogger.error('[MentionController] Error getting mentions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch mentions'
      });
    }
  }

  /**
   * Get unread mention count for the authenticated user
   * GET /api/mentions/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const count = await mentionService.getUnreadCount(userId);

      return res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      safeLogger.error('[MentionController] Error getting unread count:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch unread count'
      });
    }
  }

  /**
   * Mark a mention as read
   * POST /api/mentions/:mentionId/read
   */
  async markAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { mentionId } = req.params;
      const success = await mentionService.markAsRead(mentionId, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Mention not found or already read'
        });
      }

      return res.json({
        success: true,
        message: 'Mention marked as read'
      });
    } catch (error) {
      safeLogger.error('[MentionController] Error marking mention as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark mention as read'
      });
    }
  }

  /**
   * Mark all mentions as read
   * POST /api/mentions/mark-all-read
   */
  async markAllAsRead(req: Request, res: Response): Promise<Response> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const success = await mentionService.markAllAsRead(userId);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to mark all mentions as read'
        });
      }

      return res.json({
        success: true,
        message: 'All mentions marked as read'
      });
    } catch (error) {
      safeLogger.error('[MentionController] Error marking all mentions as read:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark all mentions as read'
      });
    }
  }
}

// Export singleton instance
export const mentionController = new MentionController();
