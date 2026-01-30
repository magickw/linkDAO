/**
 * Mute Controller
 * Handles API requests for user muting operations
 */

import { Request, Response } from 'express';
import { muteService } from '../services/muteService';
import { safeLogger } from '../utils/safeLogger';

export class MuteController {
  /**
   * Mute a user
   * POST /api/mute
   * Body: { mutedUserId: string, reason?: string }
   */
  async muteUser(req: Request, res: Response): Promise<Response> {
    try {
      const muterId = (req as any).user?.id;
      if (!muterId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { mutedUserId, reason } = req.body;

      if (!mutedUserId) {
        return res.status(400).json({
          success: false,
          error: 'mutedUserId is required'
        });
      }

      const success = await muteService.muteUser(muterId, mutedUserId, reason);

      return res.json({
        success: true,
        message: 'User muted successfully'
      });
    } catch (error: any) {
      safeLogger.error('[MuteController] Error muting user:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to mute user'
      });
    }
  }

  /**
   * Unmute a user
   * POST /api/unmute
   * Body: { mutedUserId: string }
   */
  async unmuteUser(req: Request, res: Response): Promise<Response> {
    try {
      const muterId = (req as any).user?.id;
      if (!muterId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { mutedUserId } = req.body;

      if (!mutedUserId) {
        return res.status(400).json({
          success: false,
          error: 'mutedUserId is required'
        });
      }

      const success = await muteService.unmuteUser(muterId, mutedUserId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'User is not muted'
        });
      }

      return res.json({
        success: true,
        message: 'User unmuted successfully'
      });
    } catch (error: any) {
      safeLogger.error('[MuteController] Error unmuting user:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to unmute user'
      });
    }
  }

  /**
   * Get muted users for the authenticated user
   * GET /api/muted-users
   */
  async getMutedUsers(req: Request, res: Response): Promise<Response> {
    try {
      const muterId = (req as any).user?.id;
      if (!muterId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const mutedUsers = await muteService.getMutedUsersWithDetails(muterId);

      return res.json({
        success: true,
        data: mutedUsers
      });
    } catch (error) {
      safeLogger.error('[MuteController] Error getting muted users:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch muted users'
      });
    }
  }

  /**
   * Check if a user is muted
   * GET /api/mute/status/:userId
   */
  async checkMuteStatus(req: Request, res: Response): Promise<Response> {
    try {
      const muterId = (req as any).user?.id;
      if (!muterId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required'
        });
      }

      const isMuted = await muteService.isMuted(muterId, userId);

      return res.json({
        success: true,
        data: { isMuted }
      });
    } catch (error) {
      safeLogger.error('[MuteController] Error checking mute status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check mute status'
      });
    }
  }
}

// Export singleton instance
export const muteController = new MuteController();
