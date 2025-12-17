import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reputationController } from '../controllers/reputationController';
import { requestLoggingMiddleware } from '../middleware/requestLogging';
import { generalRateLimit } from '../middleware/marketplaceSecurity';
import { cachingMiddleware } from '../middleware/cachingMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Apply middleware to all reputation routes
router.use(requestLoggingMiddleware);

// Rate limiting for reputation endpoints
const reputationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 300, // 300 requests per minute for general reputation queries
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many reputation requests, please try again later',
    }
  }
});

const reputationUpdateRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 updates per minute
  message: {
    success: false,
    error: {
      code: 'UPDATE_RATE_LIMIT_EXCEEDED',
      message: 'Too many reputation updates, please try again later',
    }
  }
});

// Reputation Routes

/**
 * @route GET /marketplace/reputation/:walletAddress
 * @desc Get reputation data for a wallet address
 * @access Public
 * @param {string} walletAddress - The wallet address to get reputation for
 * @returns {ReputationData} Reputation data with score, transactions, reviews, etc.
 */
router.get(
  '/:walletAddress',
  reputationRateLimit,
  cachingMiddleware.reputationCache(),
  reputationController.getReputation.bind(reputationController)
);

/**
 * @route POST /marketplace/reputation/:walletAddress
 * @desc Update reputation for a wallet address based on an event
 * @access Protected (should be called by internal services)
 * @param {string} walletAddress - The wallet address to update reputation for
 * @body {ReputationTransaction} Transaction data with eventType, transactionId, etc.
 * @returns {Object} Success message with updated reputation data
 */
router.post(
  '/:walletAddress',
  reputationUpdateRateLimit,
  cachingMiddleware.invalidate('reputation'),
  reputationController.updateReputation.bind(reputationController)
);

/**
 * @route GET /marketplace/reputation/:walletAddress/history
 * @desc Get reputation history for a wallet address
 * @access Public
 * @param {string} walletAddress - The wallet address to get history for
 * @query {number} limit - Maximum number of history entries to return (default: 50, max: 100)
 * @returns {Object} Reputation history with events and score changes
 */
router.get(
  '/:walletAddress/history',
  reputationRateLimit,
  reputationController.getReputationHistory.bind(reputationController)
);

/**
 * @route GET /reputation/:walletAddress/events
 * @desc Get reputation events for a wallet address (alias for history)
 * @access Public
 * @param {string} walletAddress - The wallet address to get events for
 * @query {number} limit - Maximum number of events to return (default: 10, max: 100)
 * @returns {Object} Reputation events
 */
router.get(
  '/:walletAddress/events',
  reputationRateLimit,
  reputationController.getReputationHistory.bind(reputationController)
);

/**
 * @route POST /marketplace/reputation/:walletAddress/calculate
 * @desc Calculate comprehensive reputation for a wallet address
 * @access Protected (should be called by internal services)
 * @param {string} walletAddress - The wallet address to calculate reputation for
 * @returns {Object} Calculated reputation score and updated data
 */
router.post(
  '/:walletAddress/calculate',
  reputationUpdateRateLimit,
  reputationController.calculateReputation.bind(reputationController)
);

/**
 * @route POST /marketplace/reputation/bulk
 * @desc Get reputation data for multiple wallet addresses
 * @access Public
 * @body {string[]} walletAddresses - Array of wallet addresses (max 50)
 * @returns {Object} Map of wallet addresses to reputation data
 */
router.post(
  '/bulk',
  reputationRateLimit,
  reputationController.getBulkReputation.bind(reputationController)
);

/**
 * @route GET /marketplace/reputation/stats
 * @desc Get reputation service statistics and cache info
 * @access Public
 * @returns {Object} Service statistics including cache stats
 */
router.get(
  '/stats',
  reputationRateLimit,
  reputationController.getReputationStats.bind(reputationController)
);

/**
 * @route DELETE /marketplace/reputation/cache
 * @desc Clear reputation cache (all or specific wallet)
 * @access Protected (admin only)
 * @query {string} walletAddress - Optional wallet address to clear cache for
 * @returns {Object} Success message
 */
router.delete(
  '/cache',
  reputationUpdateRateLimit,
  reputationController.clearReputationCache.bind(reputationController)
);

export { router as reputationRoutes };

// Default export for easier importing
export default router;
