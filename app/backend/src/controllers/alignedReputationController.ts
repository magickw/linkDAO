import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { reputationService } from '../services/reputationService';
import { userReputationSystemService } from '../services/userReputationSystemService';
import { createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { ReputationDataTransformer } from '../services/reputationDataTransformer';

export class AlignedReputationController {
  /**
   * Get user reputation with frontend-compatible data structure
   * GET /api/reputation/:identifier
   */
  async getUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        res.status(400).json(createErrorResponse('MISSING_IDENTIFIER', 'Identifier (wallet address or user ID) is required'));
        return;
      }

      // Determine if identifier is a wallet address or user ID
      let walletAddress = identifier;
      if (!this.isValidWalletAddress(identifier)) {
        // If not a valid wallet address, treat as user ID and try to get wallet address
        // In a real implementation, you would look up the wallet address for the user ID
        // For now, we'll assume it's a wallet address for backward compatibility
        walletAddress = identifier;
      }

      logger.info(`Getting reputation for identifier: ${identifier} (resolved to wallet: ${walletAddress})`);

      // Get reputation data from service
      const backendReputation = await reputationService.getReputation(walletAddress);
      
      // Transform to frontend format
      const frontendReputation = ReputationDataTransformer.transformReputationData(backendReputation);

      res.status(200).json(createSuccessResponse(frontendReputation, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error getting user reputation:', error);
      
      // Return default values instead of 500 error as per requirements
      const defaultReputation = ReputationDataTransformer.transformReputationData({
        walletAddress: req.params.identifier,
        score: 50.0,
        totalTransactions: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        neutralReviews: 0,
        successfulSales: 0,
        successfulPurchases: 0,
        disputedTransactions: 0,
        resolvedDisputes: 0,
        averageResponseTime: 0,
        completionRate: 100,
        lastUpdated: new Date(),
      });

      res.status(200).json(createSuccessResponse(defaultReputation, {
        requestId: res.locals.requestId,
      }));
    }
  }

  /**
   * Get reputation events/history with frontend-compatible data structure
   * GET /api/reputation/:identifier/events
   */
  async getReputationEvents(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!identifier) {
        res.status(400).json(createErrorResponse('MISSING_IDENTIFIER', 'Identifier (wallet address or user ID) is required'));
        return;
      }

      // Determine if identifier is a wallet address or user ID
      let walletAddress = identifier;
      if (!this.isValidWalletAddress(identifier)) {
        // If not a valid wallet address, treat as user ID and try to get wallet address
        // For now, we'll assume it's a wallet address for backward compatibility
        walletAddress = identifier;
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json(createErrorResponse('INVALID_LIMIT', 'Limit must be between 1 and 100'));
        return;
      }

      logger.info(`Getting reputation events for identifier: ${identifier} (resolved to wallet: ${walletAddress}), limit: ${limit}`);

      // Get reputation history from service
      const backendHistory = await reputationService.getReputationHistory(walletAddress, limit);
      
      // Transform to frontend format
      const frontendEvents = ReputationDataTransformer.transformReputationHistory(backendHistory, identifier);

      res.status(200).json(createSuccessResponse({
        userId: identifier,
        events: frontendEvents,
        count: frontendEvents.length,
        limit
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error getting reputation events:', error);
      
      // Return empty history instead of error
      res.status(200).json(createSuccessResponse({
        userId: req.params.identifier,
        events: [],
        count: 0,
        limit: parseInt(req.query.limit as string) || 50
      }, {
        requestId: res.locals.requestId,
      }));
    }
  }

  /**
   * Award reputation points
   * POST /api/reputation/:identifier/award
   */
  async awardPoints(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;
      const { category, points, description } = req.body;

      if (!identifier) {
        res.status(400).json(createErrorResponse('MISSING_IDENTIFIER', 'Identifier (wallet address or user ID) is required'));
        return;
      }

      if (!category || points === undefined) {
        res.status(400).json(createErrorResponse('MISSING_DATA', 'Category and points are required'));
        return;
      }

      // Determine if identifier is a wallet address or user ID
      let walletAddress = identifier;
      if (!this.isValidWalletAddress(identifier)) {
        // If not a valid wallet address, treat as user ID and try to get wallet address
        // For now, we'll assume it's a wallet address for backward compatibility
        walletAddress = identifier;
      }

      logger.info(`Awarding ${points} points in category ${category} to identifier: ${identifier} (resolved to wallet: ${walletAddress})`);

      // Map frontend category to backend event type
      const eventType = this.mapCategoryToEventType(category);
      
      // Update reputation
      await reputationService.updateReputation(walletAddress, {
        eventType,
        metadata: { category, points, description }
      });

      // Get updated reputation
      const updatedReputation = await reputationService.getReputation(walletAddress);
      const frontendReputation = ReputationDataTransformer.transformReputationData(updatedReputation);

      res.status(200).json(createSuccessResponse({
        message: 'Reputation points awarded successfully',
        reputation: frontendReputation
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error awarding reputation points:', error);
      res.status(500).json(createErrorResponse(
        'REPUTATION_AWARD_FAILED',
        'Failed to award reputation points',
        { error: error.message }
      ));
    }
  }

  /**
   * Check for new achievements
   * GET /api/reputation/:identifier/achievements/check
   */
  async checkForAchievements(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        res.status(400).json(createErrorResponse('MISSING_IDENTIFIER', 'Identifier (wallet address or user ID) is required'));
        return;
      }

      // For now, we'll use the user reputation system service to calculate metrics
      // In a real implementation, this would check for actual achievements
      
      // Return empty achievements array as placeholder
      res.status(200).json(createSuccessResponse([], {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error checking for achievements:', error);
      res.status(200).json(createSuccessResponse([], {
        requestId: res.locals.requestId,
      }));
    }
  }

  /**
   * Validate wallet address format
   */
  private isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  
  /**
   * Map frontend category to backend event type
   */
  private mapCategoryToEventType(category: string): string {
    const categoryMap: Record<string, string> = {
      'posting': 'review_received',
      'governance': 'review_received',
      'community': 'completion_rate',
      'trading': 'transaction_completed',
      'moderation': 'dispute_resolved'
    };
    
    return categoryMap[category] || 'review_received';
  }
}

export const alignedReputationController = new AlignedReputationController();