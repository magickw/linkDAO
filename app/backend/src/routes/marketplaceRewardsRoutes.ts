import { Router } from 'express';
import { marketplaceRewardsController } from '../controllers/marketplaceRewardsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route GET /api/marketplace-rewards/stats
 * @desc Get user's marketplace statistics
 * @access Private
 */
router.get('/stats', marketplaceRewardsController.getUserMarketplaceStats.bind(marketplaceRewardsController));

/**
 * @route GET /api/marketplace-rewards/challenges
 * @desc Get active marketplace challenges
 * @access Private
 */
router.get('/challenges', marketplaceRewardsController.getActiveMarketplaceChallenges.bind(marketplaceRewardsController));

/**
 * @route GET /api/marketplace-rewards/history
 * @desc Get marketplace rewards history
 * @access Private
 */
router.get('/history', marketplaceRewardsController.getMarketplaceRewardsHistory.bind(marketplaceRewardsController));

/**
 * @route GET /api/marketplace-rewards/tiers
 * @desc Get volume tiers information
 * @access Private
 */
router.get('/tiers', marketplaceRewardsController.getVolumeTiers.bind(marketplaceRewardsController));

/**
 * @route POST /api/marketplace-rewards/challenges
 * @desc Create marketplace challenge (Admin only)
 * @access Private (Admin)
 */
router.post('/challenges', marketplaceRewardsController.createMarketplaceChallenge.bind(marketplaceRewardsController));

/**
 * @route POST /api/marketplace-rewards/process-transaction
 * @desc Process marketplace transaction rewards (Internal API)
 * @access Private (Internal)
 */
router.post('/process-transaction', marketplaceRewardsController.processMarketplaceTransaction.bind(marketplaceRewardsController));

/**
 * @route GET /api/marketplace-rewards/analytics
 * @desc Get marketplace analytics dashboard data
 * @access Private
 */
router.get('/analytics', marketplaceRewardsController.getMarketplaceAnalytics.bind(marketplaceRewardsController));

/**
 * @route GET /api/marketplace-rewards/leaderboard
 * @desc Get marketplace leaderboard
 * @access Private
 */
router.get('/leaderboard', marketplaceRewardsController.getMarketplaceLeaderboard.bind(marketplaceRewardsController));

export default router;