/**
 * Automated Tier Upgrade Routes
 * API endpoints for automated tier upgrade functionality
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { automatedTierUpgradeController } from '../controllers/automatedTierUpgradeController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
}));

/**
 * @route GET /api/marketplace/seller/tier/progression/:walletAddress
 * @desc Get tier progression tracking for a seller
 * @access Private
 */
router.get(
  '/progression/:walletAddress',
  automatedTierUpgradeController.getTierProgressionTracking.bind(automatedTierUpgradeController)
);

/**
 * @route POST /api/marketplace/seller/tier/evaluate
 * @desc Trigger manual tier evaluation for a seller
 * @access Private
 */
router.post(
  '/evaluate',
  rateLimitingMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit to 10 evaluations per 5 minutes
  }),
  automatedTierUpgradeController.triggerTierEvaluation.bind(automatedTierUpgradeController)
);

/**
 * @route GET /api/marketplace/seller/tier/criteria
 * @desc Get tier criteria and requirements
 * @access Private
 */
router.get(
  '/criteria',
  automatedTierUpgradeController.getTierCriteria.bind(automatedTierUpgradeController)
);

/**
 * @route GET /api/marketplace/seller/tier/statistics
 * @desc Get evaluation statistics
 * @access Private
 */
router.get(
  '/statistics',
  automatedTierUpgradeController.getEvaluationStatistics.bind(automatedTierUpgradeController)
);

/**
 * @route POST /api/marketplace/seller/tier/batch-evaluate
 * @desc Run batch tier evaluation (admin only)
 * @access Private (Admin)
 */
router.post(
  '/batch-evaluate',
  rateLimitingMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit to 5 batch evaluations per hour
  }),
  // TODO: Add admin authentication middleware
  automatedTierUpgradeController.runBatchEvaluation.bind(automatedTierUpgradeController)
);

/**
 * @route GET /api/marketplace/seller/tier/history/:walletAddress
 * @desc Get seller tier evaluation history
 * @access Private
 */
router.get(
  '/history/:walletAddress',
  automatedTierUpgradeController.getTierEvaluationHistory.bind(automatedTierUpgradeController)
);

/**
 * @route GET /api/marketplace/seller/tier/notifications/:walletAddress
 * @desc Get tier upgrade notifications for a seller
 * @access Private
 */
router.get(
  '/notifications/:walletAddress',
  automatedTierUpgradeController.getTierUpgradeNotifications.bind(automatedTierUpgradeController)
);

/**
 * @route GET /api/marketplace/seller/tier/health
 * @desc Health check for automated tier upgrade service
 * @access Public
 */
router.get(
  '/health',
  automatedTierUpgradeController.healthCheck.bind(automatedTierUpgradeController)
);

export default router;
