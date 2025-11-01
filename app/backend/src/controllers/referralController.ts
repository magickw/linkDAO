import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { referralService } from '../services/referralService';
import { z } from 'zod';

// Validation schemas
const createReferralSchema = z.object({
  refereeId: z.string().uuid(),
  tier: z.number().min(1).max(5).optional(),
  bonusPercentage: z.number().min(5).max(50).optional(),
  expiresAt: z.string().datetime().optional()
});

const validateReferralCodeSchema = z.object({
  referralCode: z.string().min(6).max(12)
});

const getReferralHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
});

const getLeaderboardSchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10)
});

const deactivateReferralSchema = z.object({
  reason: z.string().optional()
});

export class ReferralController {
  /**
   * Create a new referral relationship
   */
  async createReferral(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const validatedData = createReferralSchema.parse(req.body);

      // Prevent self-referral
      if (validatedData.refereeId === userId) {
        return res.status(400).json({ error: 'Cannot refer yourself' });
      }

      const result = await referralService.createReferral({
        referrerId: userId,
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      });

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({
        success: true,
        data: {
          referralCode: result.referralCode,
          message: result.message
        }
      });

    } catch (error) {
      safeLogger.error('Error creating referral:', error);
      
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
   * Validate a referral code
   */
  async validateReferralCode(req: Request, res: Response) {
    try {
      const { referralCode } = validateReferralCodeSchema.parse(req.body);

      const result = await referralService.validateReferralCode(referralCode);

      res.json({
        success: result.valid,
        data: {
          valid: result.valid,
          referrerId: result.referrerId,
          message: result.message
        }
      });

    } catch (error) {
      safeLogger.error('Error validating referral code:', error);
      
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
   * Get user's referral statistics
   */
  async getReferralStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const stats = await referralService.getReferralStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      safeLogger.error('Error getting referral stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(req: Request, res: Response) {
    try {
      const { limit } = getLeaderboardSchema.parse(req.query);

      const leaderboard = await referralService.getReferralLeaderboard(limit);

      res.json({
        success: true,
        data: {
          leaderboard,
          limit
        }
      });

    } catch (error) {
      safeLogger.error('Error getting referral leaderboard:', error);
      
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
   * Get user's referral history
   */
  async getReferralHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { limit, offset } = getReferralHistorySchema.parse(req.query);

      const history = await referralService.getUserReferralHistory(userId, limit, offset);

      res.json({
        success: true,
        data: {
          referrals: history,
          pagination: {
            limit,
            offset,
            hasMore: history.length === limit
          }
        }
      });

    } catch (error) {
      safeLogger.error('Error getting referral history:', error);
      
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
   * Get referral rewards history
   */
  async getReferralRewards(req: Request, res: Response) {
    try {
      const { referralId } = req.params;

      if (!referralId) {
        return res.status(400).json({ error: 'Referral ID is required' });
      }

      const rewards = await referralService.getReferralRewardsHistory(referralId);

      res.json({
        success: true,
        data: {
          rewards
        }
      });

    } catch (error) {
      safeLogger.error('Error getting referral rewards:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Deactivate a referral
   */
  async deactivateReferral(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { referralId } = req.params;
      const { reason } = deactivateReferralSchema.parse(req.body);

      if (!referralId) {
        return res.status(400).json({ error: 'Referral ID is required' });
      }

      // TODO: Add authorization check to ensure user owns this referral

      const result = await referralService.deactivateReferral(referralId, reason);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      safeLogger.error('Error deactivating referral:', error);
      
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
   * Generate a new referral code for the user
   */
  async generateReferralCode(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Generate a unique referral code
      const referralCode = referralService.generateReferralCode();

      res.json({
        success: true,
        data: {
          referralCode,
          shareUrl: `${process.env.FRONTEND_URL}/signup?ref=${referralCode}`,
          message: 'Referral code generated successfully'
        }
      });

    } catch (error) {
      safeLogger.error('Error generating referral code:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get referral analytics for admin/advanced users
   */
  async getReferralAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const stats = await referralService.getReferralStats(userId);
      const history = await referralService.getUserReferralHistory(userId, 100, 0);

      // Calculate conversion rates and other analytics
      const analytics = {
        overview: stats,
        conversionRate: stats.totalReferrals > 0 ? (stats.activeReferrals / stats.totalReferrals) * 100 : 0,
        averageEarningPerReferral: stats.totalReferrals > 0 ? stats.totalEarned / stats.totalReferrals : 0,
        recentActivity: history.slice(0, 10),
        monthlyTrend: {
          thisMonth: stats.thisMonthEarned,
          // TODO: Add previous months data for trend analysis
        }
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      safeLogger.error('Error getting referral analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const referralController = new ReferralController();
