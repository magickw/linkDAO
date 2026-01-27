/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { marketplaceRewardsService, MarketplaceChallengeData, ChallengeWithProgress } from '../services/marketplaceRewardsService';
import { z } from 'zod';

// Validation schemas
const createChallengeSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().min(10).max(1000),
  challengeType: z.enum(['daily', 'weekly', 'monthly', 'milestone']),
  targetValue: z.number().min(1),
  rewardAmount: z.number().min(1),
  bonusMultiplier: z.number().min(1).max(5).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxParticipants: z.number().min(1).optional()
});

const getRewardsHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0)
});

export class MarketplaceRewardsController {
  /**
   * Get user's marketplace statistics
   */
  async getUserMarketplaceStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const stats = await marketplaceRewardsService.getUserMarketplaceStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      safeLogger.error('Error getting user marketplace stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get active marketplace challenges
   */
  async getActiveMarketplaceChallenges(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      const challenges = await marketplaceRewardsService.getActiveMarketplaceChallenges(userId);

      res.json({
        success: true,
        data: {
          challenges
        }
      });

    } catch (error) {
      safeLogger.error('Error getting active marketplace challenges:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get marketplace rewards history
   */
  async getMarketplaceRewardsHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { limit, offset } = getRewardsHistorySchema.parse(req.query);

      const history = await marketplaceRewardsService.getMarketplaceRewardsHistory(userId, limit, offset);

      res.json({
        success: true,
        data: {
          rewards: history,
          pagination: {
            limit,
            offset,
            hasMore: history.length === limit
          }
        }
      });

    } catch (error) {
      safeLogger.error('Error getting marketplace rewards history:', error);
      
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
   * Get volume tiers information
   */
  async getVolumeTiers(req: Request, res: Response) {
    try {
      const tiers = marketplaceRewardsService.getVolumeTiers();

      res.json({
        success: true,
        data: {
          tiers
        }
      });

    } catch (error) {
      safeLogger.error('Error getting volume tiers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create marketplace challenge (Admin only)
   */
  async createMarketplaceChallenge(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // TODO: Add admin authorization check
      // if (!req.user?.isAdmin) {
      //   return res.status(403).json({ error: 'Admin access required' });
      // }

      const validatedData = createChallengeSchema.parse(req.body);

      const challengeData: MarketplaceChallengeData = {
        name: validatedData.name || 'Untitled Challenge',
        description: validatedData.description || 'No description provided',
        challengeType: validatedData.challengeType || 'daily',
        targetValue: validatedData.targetValue || 0,
        rewardAmount: validatedData.rewardAmount || 0,
        bonusMultiplier: validatedData.bonusMultiplier,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        maxParticipants: validatedData.maxParticipants
      };

      const result = await marketplaceRewardsService.createMarketplaceChallenge(challengeData);

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      res.json({
        success: true,
        data: {
          challengeId: result.challengeId,
          message: result.message
        }
      });

    } catch (error) {
      safeLogger.error('Error creating marketplace challenge:', error);
      
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
   * Process marketplace transaction (Internal API)
   */
  async processMarketplaceTransaction(req: Request, res: Response) {
    try {
      // This endpoint should be called internally when marketplace transactions occur
      const { orderId, buyerId, sellerId, transactionAmount, isPremiumBuyer, isPremiumSeller } = req.body;

      if (!orderId || !transactionAmount) {
        return res.status(400).json({ error: 'Order ID and transaction amount are required' });
      }

      await marketplaceRewardsService.processMarketplaceRewards({
        orderId,
        buyerId,
        sellerId,
        transactionAmount,
        isPremiumBuyer,
        isPremiumSeller
      });

      res.json({
        success: true,
        message: 'Marketplace rewards processed successfully'
      });

    } catch (error) {
      safeLogger.error('Error processing marketplace transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get marketplace analytics dashboard data
   */
  async getMarketplaceAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const stats = await marketplaceRewardsService.getUserMarketplaceStats(userId);
      const challenges: ChallengeWithProgress[] = await marketplaceRewardsService.getActiveMarketplaceChallenges(userId);
      const recentRewards = await marketplaceRewardsService.getMarketplaceRewardsHistory(userId, 10, 0);
      const tiers = marketplaceRewardsService.getVolumeTiers();

      const analytics = {
        overview: stats,
        activeChallenges: challenges.filter(c => c.userProgress && !c.userProgress.isCompleted),
        completedChallenges: challenges.filter(c => c.userProgress && c.userProgress.isCompleted),
        recentActivity: recentRewards,
        tierProgression: {
          currentTier: stats.currentTier,
          nextTier: stats.nextTier,
          progress: stats.progressToNextTier,
          allTiers: tiers
        }
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      safeLogger.error('Error getting marketplace analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get marketplace leaderboard
   */
  async getMarketplaceLeaderboard(req: Request, res: Response) {
    try {
      const period = req.query.period as string || 'monthly';
      const limit = parseInt(req.query.limit as string) || 10;

      // TODO: Implement marketplace leaderboard logic
      // This would show top earners, most active traders, etc.

      res.json({
        success: true,
        data: {
          leaderboard: [],
          period,
          limit,
          message: 'Marketplace leaderboard feature coming soon'
        }
      });

    } catch (error) {
      safeLogger.error('Error getting marketplace leaderboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const marketplaceRewardsController = new MarketplaceRewardsController();
