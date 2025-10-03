import { Request, Response } from 'express';
import { reputationService, ReputationTransaction } from '../services/reputationService';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class ReputationController {
  /**
   * Get reputation data for a wallet address
   * GET /marketplace/reputation/:walletAddress
   */
  async getReputation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        res.status(400).json(errorResponse('Wallet address is required', 'MISSING_WALLET_ADDRESS'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(errorResponse('Invalid wallet address format', 'INVALID_WALLET_ADDRESS'));
        return;
      }

      logger.info(`Getting reputation for wallet: ${walletAddress}`);

      const reputation = await reputationService.getReputation(walletAddress);

      res.status(200).json(successResponse(reputation, {
        requestId: req.headers['x-request-id'] as string,
        cached: false, // Could implement cache hit detection
      }));

    } catch (error) {
      logger.error('Error getting reputation:', error);
      
      // Return default values instead of 500 error as per requirements
      const defaultReputation = {
        walletAddress: req.params.walletAddress,
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
      };

      res.status(200).json(successResponse(defaultReputation, {
        requestId: req.headers['x-request-id'] as string,
        fallback: true,
        error: 'Service temporarily unavailable, showing default values'
      }));
    }
  }

  /**
   * Update reputation for a wallet address
   * POST /marketplace/reputation/:walletAddress
   */
  async updateReputation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { eventType, transactionId, reviewId, metadata } = req.body;

      if (!walletAddress) {
        res.status(400).json(errorResponse('Wallet address is required', 'MISSING_WALLET_ADDRESS'));
        return;
      }

      if (!eventType) {
        res.status(400).json(errorResponse('Event type is required', 'MISSING_EVENT_TYPE'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(errorResponse('Invalid wallet address format', 'INVALID_WALLET_ADDRESS'));
        return;
      }

      // Validate event type
      const validEventTypes = [
        'review_received',
        'transaction_completed',
        'dispute_created',
        'dispute_resolved',
        'response_time',
        'completion_rate'
      ];

      if (!validEventTypes.includes(eventType)) {
        res.status(400).json(errorResponse(
          `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
          'INVALID_EVENT_TYPE'
        ));
        return;
      }

      logger.info(`Updating reputation for wallet: ${walletAddress}, event: ${eventType}`);

      const transaction: ReputationTransaction = {
        eventType,
        transactionId,
        reviewId,
        metadata
      };

      await reputationService.updateReputation(walletAddress, transaction);

      // Get updated reputation to return
      const updatedReputation = await reputationService.getReputation(walletAddress);

      res.status(200).json(successResponse({
        message: 'Reputation updated successfully',
        reputation: updatedReputation
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error updating reputation:', error);
      res.status(500).json(errorResponse(
        'Failed to update reputation',
        'REPUTATION_UPDATE_FAILED',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reputation history for a wallet address
   * GET /marketplace/reputation/:walletAddress/history
   */
  async getReputationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!walletAddress) {
        res.status(400).json(errorResponse('Wallet address is required', 'MISSING_WALLET_ADDRESS'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(errorResponse('Invalid wallet address format', 'INVALID_WALLET_ADDRESS'));
        return;
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json(errorResponse('Limit must be between 1 and 100', 'INVALID_LIMIT'));
        return;
      }

      logger.info(`Getting reputation history for wallet: ${walletAddress}, limit: ${limit}`);

      const history = await reputationService.getReputationHistory(walletAddress, limit);

      res.status(200).json(successResponse({
        walletAddress,
        history,
        count: history.length,
        limit
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error getting reputation history:', error);
      
      // Return empty history instead of error
      res.status(200).json(successResponse({
        walletAddress: req.params.walletAddress,
        history: [],
        count: 0,
        limit: parseInt(req.query.limit as string) || 50
      }, {
        requestId: req.headers['x-request-id'] as string,
        fallback: true,
        error: 'Service temporarily unavailable, showing empty history'
      }));
    }
  }

  /**
   * Get bulk reputation data for multiple wallet addresses
   * POST /marketplace/reputation/bulk
   */
  async getBulkReputation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddresses } = req.body;

      if (!walletAddresses || !Array.isArray(walletAddresses)) {
        res.status(400).json(errorResponse('Wallet addresses array is required', 'MISSING_WALLET_ADDRESSES'));
        return;
      }

      if (walletAddresses.length === 0) {
        res.status(400).json(errorResponse('At least one wallet address is required', 'EMPTY_WALLET_ADDRESSES'));
        return;
      }

      if (walletAddresses.length > 50) {
        res.status(400).json(errorResponse('Maximum 50 wallet addresses allowed', 'TOO_MANY_ADDRESSES'));
        return;
      }

      // Validate all wallet addresses
      const invalidAddresses = walletAddresses.filter(addr => !this.isValidWalletAddress(addr));
      if (invalidAddresses.length > 0) {
        res.status(400).json(errorResponse(
          `Invalid wallet address format: ${invalidAddresses.join(', ')}`,
          'INVALID_WALLET_ADDRESSES'
        ));
        return;
      }

      logger.info(`Getting bulk reputation for ${walletAddresses.length} addresses`);

      const reputationMap = await reputationService.getBulkReputation(walletAddresses);
      
      // Convert Map to object for JSON response
      const reputationData: Record<string, any> = {};
      reputationMap.forEach((reputation, address) => {
        reputationData[address] = reputation;
      });

      res.status(200).json(successResponse({
        reputations: reputationData,
        count: walletAddresses.length
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error getting bulk reputation:', error);
      
      // Return default values for all addresses
      const { walletAddresses } = req.body;
      const defaultReputations: Record<string, any> = {};
      
      if (Array.isArray(walletAddresses)) {
        walletAddresses.forEach(address => {
          defaultReputations[address] = {
            walletAddress: address,
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
          };
        });
      }

      res.status(200).json(successResponse({
        reputations: defaultReputations,
        count: Object.keys(defaultReputations).length
      }, {
        requestId: req.headers['x-request-id'] as string,
        fallback: true,
        error: 'Service temporarily unavailable, showing default values'
      }));
    }
  }

  /**
   * Calculate comprehensive reputation for a wallet address
   * POST /marketplace/reputation/:walletAddress/calculate
   */
  async calculateReputation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        res.status(400).json(errorResponse('Wallet address is required', 'MISSING_WALLET_ADDRESS'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(errorResponse('Invalid wallet address format', 'INVALID_WALLET_ADDRESS'));
        return;
      }

      logger.info(`Calculating comprehensive reputation for wallet: ${walletAddress}`);

      const score = await reputationService.calculateReputation(walletAddress);
      const updatedReputation = await reputationService.getReputation(walletAddress);

      res.status(200).json(successResponse({
        message: 'Reputation calculated successfully',
        score,
        reputation: updatedReputation
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error calculating reputation:', error);
      res.status(500).json(errorResponse(
        'Failed to calculate reputation',
        'REPUTATION_CALCULATION_FAILED',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reputation statistics and cache info
   * GET /marketplace/reputation/stats
   */
  async getReputationStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = reputationService.getCacheStats();

      res.status(200).json(successResponse({
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error getting reputation stats:', error);
      res.status(500).json(errorResponse(
        'Failed to get reputation statistics',
        'REPUTATION_STATS_FAILED',
        { error: error.message }
      ));
    }
  }

  /**
   * Clear reputation cache
   * DELETE /marketplace/reputation/cache
   */
  async clearReputationCache(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.query;

      if (walletAddress && typeof walletAddress === 'string') {
        // Validate wallet address if provided
        if (!this.isValidWalletAddress(walletAddress)) {
          res.status(400).json(errorResponse('Invalid wallet address format', 'INVALID_WALLET_ADDRESS'));
          return;
        }
        reputationService.clearCache(walletAddress);
        logger.info(`Cleared reputation cache for wallet: ${walletAddress}`);
      } else {
        reputationService.clearCache();
        logger.info('Cleared all reputation cache');
      }

      res.status(200).json(successResponse({
        message: walletAddress ? 
          `Cache cleared for wallet: ${walletAddress}` : 
          'All reputation cache cleared'
      }, {
        requestId: req.headers['x-request-id'] as string,
      }));

    } catch (error) {
      logger.error('Error clearing reputation cache:', error);
      res.status(500).json(errorResponse(
        'Failed to clear reputation cache',
        'CACHE_CLEAR_FAILED',
        { error: error.message }
      ));
    }
  }

  /**
   * Validate wallet address format
   */
  private isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

export const reputationController = new ReputationController();