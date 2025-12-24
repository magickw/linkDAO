/// <reference path="../types/express.d.ts" />
/**
 * Token Reaction Controller
 * Handles HTTP requests for token-based reactions
 */

import { Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/auth';
import tokenReactionService, { ReactionType, REACTION_TYPES } from '../services/tokenReactionService';

export class TokenReactionController {
  /**
   * Purchase a reaction (new simplified system)
   * POST /api/reactions/purchase
   */
  async purchaseReaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId, reactionType, txHash } = req.body;
      const userId = req.user?.id;
      const userAddress = req.user?.walletAddress;

      if (!userId || !userAddress) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!postId || !reactionType || !txHash) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: postId, reactionType, txHash'
        });
      }

      const result = await tokenReactionService.purchaseReaction({
        postId,
        userId,
        userAddress,
        reactionType,
        txHash
      });

      res.status(201).json(result);
    } catch (error: any) {
      safeLogger.error('Error purchasing reaction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to purchase reaction'
      });
    }
  }

  async createReaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId, type, amount } = req.body;
      const userId = req.user?.id; // Assuming auth middleware sets req.user

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Validate input
      if (!postId || !type || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: postId, type, amount'
        });
      }

      const validation = tokenReactionService.validateReactionInput(type as ReactionType, amount);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.errors[0],
          errors: validation.errors
        });
      }

      const result = await tokenReactionService.createReaction({
        postId,
        userId,
        type: type as ReactionType,
        amount: parseInt(amount)
      });

      res.status(201).json(result);
    } catch (error: any) {
      safeLogger.error('Error creating reaction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create reaction'
      });
    }
  }

  /**
   * Get reactions for a post
   * GET /api/reactions?postId=123&reactionType=🔥&limit=20&offset=0
   */
  async getReactions(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId, reactionType, limit = '20', offset = '0' } = req.query;
      const userId = req.user?.id;

      if (!postId) {
        return res.status(400).json({
          success: false,
          message: 'postId is required'
        });
      }

      const result = await tokenReactionService.getReactions(
        postId as string,
        reactionType as ReactionType,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // Also get summaries for the response
      const summaries = await tokenReactionService.getReactionSummaries(
        postId as string,
        userId
      );

      // Get analytics
      const analytics = await tokenReactionService.getReactionAnalytics(
        postId as string
      );

      res.json({
        reactions: result.reactions,
        summaries,
        analytics,
        hasMore: result.hasMore
      });
    } catch (error: any) {
      safeLogger.error('Error getting reactions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reactions'
      });
    }
  }

  /**
   * Get reaction summaries for a post
   * GET /api/reactions/:postId/summaries
   */
  async getReactionSummaries(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId } = req.params;
      const userId = req.user?.id;

      const summaries = await tokenReactionService.getReactionSummaries(
        postId,
        userId
      );

      res.json(summaries);
    } catch (error: any) {
      safeLogger.error('Error getting reaction summaries:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reaction summaries'
      });
    }
  }

  /**
   * Get reaction analytics for a post
   * GET /api/reactions/:postId/analytics
   */
  async getReactionAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId } = req.params;

      const analytics = await tokenReactionService.getReactionAnalytics(
        postId
      );

      res.json(analytics);
    } catch (error: any) {
      safeLogger.error('Error getting reaction analytics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reaction analytics'
      });
    }
  }

  /**
   * Get user's reactions for a post
   * GET /api/reactions/:postId/user/:userId
   */
  async getUserReactions(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId, userId } = req.params;
      const requestingUserId = req.user?.id;

      // Users can only see their own reactions unless they're admin
      if (userId !== requestingUserId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const reactions = await tokenReactionService.getUserReactions(
        postId as string,
        userId
      );

      res.json(reactions);
    } catch (error: any) {
      safeLogger.error('Error getting user reactions:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user reactions'
      });
    }
  }

  /**
   * Remove a reaction (unstake tokens)
   * DELETE /api/reactions/:reactionId
   */
  async removeReaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { reactionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const result = await tokenReactionService.removeReaction(
        parseInt(reactionId),
        userId
      );

      res.json(result);
    } catch (error: any) {
      safeLogger.error('Error removing reaction:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove reaction'
      });
    }
  }

  /**
   * Get top reactors for a post
   * GET /api/reactions/:postId/top-reactors?limit=10
   */
  async getTopReactors(req: AuthenticatedRequest, res: Response) {
    try {
      const { postId } = req.params;
      const { limit = '10' } = req.query;

      // Get all summaries and extract top contributors
      const summaries = await tokenReactionService.getReactionSummaries(
        postId
      );

      // Aggregate contributors across all reaction types
      const contributorMap = new Map();
      
      summaries.forEach(summary => {
        summary.topContributors.forEach(contributor => {
          const existing = contributorMap.get(contributor.userId);
          if (existing) {
            existing.totalAmount += contributor.amount;
            existing.reactionTypes.push(summary.type);
          } else {
            contributorMap.set(contributor.userId, {
              userId: contributor.userId,
              walletAddress: contributor.walletAddress,
              handle: contributor.handle,
              totalAmount: contributor.amount,
              reactionTypes: [summary.type]
            });
          }
        });
      });

      // Sort by total amount and limit results
      const topReactors = Array.from(contributorMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, parseInt(limit as string));

      res.json(topReactors);
    } catch (error: any) {
      safeLogger.error('Error getting top reactors:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get top reactors'
      });
    }
  }

  /**
   * Get reaction types configuration
   * GET /api/reactions/types
   */
  async getReactionTypes(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({
        reactionTypes: REACTION_TYPES
      });
    } catch (error: any) {
      safeLogger.error('Error getting reaction types:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reaction types'
      });
    }
  }
}

export const tokenReactionController = new TokenReactionController();
