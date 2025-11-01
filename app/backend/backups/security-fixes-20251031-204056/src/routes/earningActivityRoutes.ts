import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { earningActivityController } from '../controllers/earningActivityController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/earning/activity
 * @desc Process an earning activity
 * @access Private
 */
router.post('/activity', csrfProtection,  earningActivityController.processEarningActivity.bind(earningActivityController));

/**
 * @route GET /api/earning/metrics
 * @desc Get user activity metrics
 * @access Private
 */
router.get('/metrics', earningActivityController.getUserActivityMetrics.bind(earningActivityController));

/**
 * @route GET /api/earning/feed
 * @desc Get user's activity feed
 * @access Private
 */
router.get('/feed', earningActivityController.getUserActivityFeed.bind(earningActivityController));

/**
 * @route POST /api/earning/feed/read
 * @desc Mark activity feed items as read
 * @access Private
 */
router.post('/feed/read', csrfProtection,  earningActivityController.markActivityFeedAsRead.bind(earningActivityController));

/**
 * @route GET /api/earning/leaderboard
 * @desc Get earning leaderboard
 * @access Private
 */
router.get('/leaderboard', earningActivityController.getEarningLeaderboard.bind(earningActivityController));

/**
 * @route GET /api/earning/stats
 * @desc Get user's earning statistics
 * @access Private
 */
router.get('/stats', earningActivityController.getUserEarningStats.bind(earningActivityController));

/**
 * @route GET /api/earning/config
 * @desc Get earning configuration
 * @access Private
 */
router.get('/config', earningActivityController.getEarningConfig.bind(earningActivityController));

/**
 * @route POST /api/earning/daily-login
 * @desc Trigger daily login reward
 * @access Private
 */
router.post('/daily-login', csrfProtection,  earningActivityController.triggerDailyLoginReward.bind(earningActivityController));

export default router;