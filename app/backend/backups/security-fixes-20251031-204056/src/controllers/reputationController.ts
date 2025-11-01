import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { reputationService, ReputationTransaction } from '../services/reputationService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { logger } from '../utils/logger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ReputationController {
  /**
   * Get reputation data for a wallet address
   * GET /marketplace/reputation/:walletAddress
   */
  async getReputation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        res.status(400).json(createErrorResponse('MISSING_WALLET_ADDRESS', 'Wallet address is required'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 'Invalid wallet address format'));
        return;
      }

      logger.info(`Getting reputation for wallet: ${walletAddress}`);

      const reputation = await reputationService.getReputation(walletAddress);

      res.status(200).json(createSuccessResponse(reputation, {
        requestId: res.locals.requestId,
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

      res.status(200).json(createSuccessResponse(defaultReputation, {
        requestId: res.locals.requestId,
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
        res.status(400).json(createErrorResponse('MISSING_WALLET_ADDRESS', 'Wallet address is required'));
        return;
      }

      if (!eventType) {
        res.status(400).json(createErrorResponse('MISSING_EVENT_TYPE', 'Event type is required'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 'Invalid wallet address format'));
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
        res.status(400).json(createErrorResponse('INVALID_EVENT_TYPE', 
          `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`));
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

      res.status(200).json(createSuccessResponse({
        message: 'Reputation updated successfully',
        reputation: updatedReputation
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error updating reputation:', error);
      res.status(500).json(createErrorResponse(
        'REPUTATION_UPDATE_FAILED',
        'Failed to update reputation',
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
        res.status(400).json(createErrorResponse('MISSING_WALLET_ADDRESS', 'Wallet address is required'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 'Invalid wallet address format'));
        return;
      }

      // Validate limit
      if (limit < 1 || limit > 100) {
        res.status(400).json(createErrorResponse('INVALID_LIMIT', 'Limit must be between 1 and 100'));
        return;
      }

      logger.info(`Getting reputation history for wallet: ${walletAddress}, limit: ${limit}`);

      const history = await reputationService.getReputationHistory(walletAddress, limit);

      res.status(200).json(createSuccessResponse({
        walletAddress,
        history,
        count: history.length,
        limit
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error getting reputation history:', error);
      
      // Return empty history instead of error
      res.status(200).json(createSuccessResponse({
        walletAddress: req.params.walletAddress,
        history: [],
        count: 0,
        limit: parseInt(req.query.limit as string) || 50
      }, {
        requestId: res.locals.requestId,
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

      if (!walletAddresses) {
        res.status(400).json(createErrorResponse('MISSING_WALLET_ADDRESSES', 'Wallet addresses array is required'));
        return;
      }

      if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
        res.status(400).json(createErrorResponse('EMPTY_WALLET_ADDRESSES', 'At least one wallet address is required'));
        return;
      }

      if (walletAddresses.length > 50) {
        res.status(400).json(createErrorResponse('TOO_MANY_ADDRESSES', 'Maximum 50 wallet addresses allowed'));
        return;
      }

      // Validate all wallet addresses
      for (const address of walletAddresses) {
        if (!this.isValidWalletAddress(address)) {
          res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 
            `Invalid wallet address format: ${address}`));
          return;
        }
      }

      logger.info(`Getting bulk reputation for ${walletAddresses.length} wallets`);

      const reputationData = await reputationService.getBulkReputation(walletAddresses);

      res.status(200).json(createSuccessResponse({
        reputations: reputationData,
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error getting bulk reputation:', error);
      
      // Return default values for all addresses
      const defaultReputations = req.body.walletAddresses.map((address: string) => ({
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
      }));

      res.status(200).json(createSuccessResponse({
        reputations: defaultReputations,
      }, {
        requestId: res.locals.requestId,
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
        res.status(400).json(createErrorResponse('MISSING_WALLET_ADDRESS', 'Wallet address is required'));
        return;
      }

      // Validate wallet address format
      if (!this.isValidWalletAddress(walletAddress)) {
        res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 'Invalid wallet address format'));
        return;
      }

      logger.info(`Calculating reputation for wallet: ${walletAddress}`);

      await reputationService.calculateReputation(walletAddress);

      // Get updated reputation to return
      const updatedReputation = await reputationService.getReputation(walletAddress);

      res.status(200).json(createSuccessResponse({
        message: 'Reputation calculated successfully',
        reputation: updatedReputation
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error calculating reputation:', error);
      res.status(500).json(createErrorResponse(
        'REPUTATION_CALCULATION_FAILED',
        'Failed to calculate reputation',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reputation service statistics
   * GET /marketplace/reputation/stats
   */
  async getReputationStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting reputation service statistics');

      const cacheStats = await reputationService.getCacheStats();

      res.status(200).json(createSuccessResponse({
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error getting reputation statistics:', error);
      res.status(500).json(createErrorResponse(
        'STATS_RETRIEVAL_FAILED',
        'Failed to get reputation statistics',
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

      if (walletAddress && !this.isValidWalletAddress(walletAddress as string)) {
        res.status(400).json(createErrorResponse('INVALID_WALLET_ADDRESS', 'Invalid wallet address format'));
        return;
      }

      logger.info(`Clearing reputation cache for: ${walletAddress || 'all'}`);

      await reputationService.clearCache(walletAddress as string);

      res.status(200).json(createSuccessResponse({
        message: walletAddress ?
          `Reputation cache cleared for ${walletAddress}` :
          'All reputation cache cleared',
        walletAddress: walletAddress || undefined
      }, {
        requestId: res.locals.requestId,
      }));

    } catch (error) {
      logger.error('Error clearing reputation cache:', error);
      res.status(500).json(createErrorResponse(
        'CACHE_CLEAR_FAILED',
        'Failed to clear reputation cache',
        { error: error.message }
      ));
    }
  }

  /**
   * Validate wallet address format
   * @param address Wallet address to validate
   * @returns boolean indicating if address is valid
   */
  private isValidWalletAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

export const reputationController = new ReputationController();