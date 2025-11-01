import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { earningActivityService, EarningActivityData } from '../services/earningActivityService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const processEarningActivitySchema = z.object({
  activityType: z.enum(['post', 'comment', 'referral', 'marketplace', 'daily_login', 'profile_complete']),
  activityId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  qualityScore: z.number().min(0.5).max(2.0).optional(),
  isPremiumUser: z.boolean().optional()
});

const getUserMetricsSchema = z.object({
  days: z.number().min(1).max(365).optional().default(30)
});

const getActivityFeedSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
});

const markAsReadSchema = z.object({
  activityIds: z.array(z.string().uuid())
});

const getLeaderboardSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'all']).optional().default('weekly'),
  limit: z.number().min(1).max(50).optional().default(10)
});

export class EarningActivityController {
  /**
   * Process an earning activity
   */
  async processEarningActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validatedData = processEarningActivitySchema.parse(req.body);

      const earningData: EarningActivityData = {
        userId,
        ...validatedData
      };

      const result = await earningActivityService.processEarningActivity(earningData);

      if (!result.success) {
        return res.status(400).json({
          error: result.message,
          details: {
            dailyLimitReached: result.dailyLimitReached,
            baseReward: result.baseReward
          }
        });
      }

      res.json({
        success: true,
        data: {
          tokensEarned: result.tokensEarned,
          baseReward: result.baseReward,
          multiplier: result.multiplier,
          premiumBonus: result.premiumBonus,
          activityId: result.activityId,
          message: result.message
        }
      });

    } catch (error) {
      safeLogger.error('Error processing earning activity:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { days } = getUserMetricsSchema.parse(req.query);

      const metrics = await earningActivityService.getUserActivityMetrics(userId, days);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      safeLogger.error('Error getting user activity metrics:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user's activity feed
   */
  async getUserActivityFeed(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { limit, offset } = getActivityFeedSchema.parse(req.query);

      const activities = await earningActivityService.getUserActivityFeed(userId, limit, offset);

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            limit,
            offset,
            hasMore: activities.length === limit
          }
        }
      });

    } catch (error) {
      safeLogger.error('Error getting user activity feed:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark activity feed items as read
   */
  async markActivityFeedAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { activityIds } = markAsReadSchema.parse(req.body);

      await earningActivityService.markActivityFeedAsRead(userId, activityIds);

      res.json({
        success: true,
        message: 'Activity feed items marked as read'
      });

    } catch (error) {
      safeLogger.error('Error marking activity feed as read:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get earning leaderboard
   */
  async getEarningLeaderboard(req: Request, res: Response) {
    try {
      const { period, limit } = getLeaderboardSchema.parse(req.query);

      const leaderboard = await earningActivityService.getEarningLeaderboard(period, limit);

      res.json({
        success: true,
        data: {
          leaderboard,
          period,
          limit
        }
      });

    } catch (error) {
      safeLogger.error('Error getting earning leaderboard:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request parameters',
          details: error.errors
        });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user's earning statistics
   */
  async getUserEarningStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get user earning stats from database
      const stats = await earningActivityService.getUserEarningStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      safeLogger.error('Error getting user earning stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get earning configuration
   */
  async getEarningConfig(req: Request, res: Response) {
    try {
      const config = await earningActivityService.getEarningConfiguration();

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      safeLogger.error('Error getting earning configuration:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Trigger daily login reward
   */
  async triggerDailyLoginReward(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const result = await earningActivityService.processEarningActivity({
        userId,
        activityType: 'daily_login',
        metadata: {
          loginTime: new Date().toISOString(),
          userAgent: req.headers['user-agent']
        }
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.message,
          details: {
            dailyLimitReached: result.dailyLimitReached
          }
        });
      }

      res.json({
        success: true,
        data: {
          tokensEarned: result.tokensEarned,
          message: result.message
        }
      });

    } catch (error) {
      safeLogger.error('Error triggering daily login reward:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const earningActivityController = new EarningActivityController();