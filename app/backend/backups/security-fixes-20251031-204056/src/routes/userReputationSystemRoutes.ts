import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { userReputationSystemController } from '../controllers/userReputationSystemController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', userReputationSystemController.healthCheck);

// Public routes for user reputation
/**
 * @route GET /api/user-reputation/:userId
 * @desc Get user reputation by user ID
 * @access Public
 * @param userId - ID of the user to retrieve reputation for
 */
router.get('/:userId', userReputationSystemController.getUserReputation);

/**
 * @route GET /api/user-reputation/history/:userId
 * @desc Get user's reputation history
 * @access Public
 * @param userId - ID of the user to retrieve history for
 */
router.get('/history/:userId', userReputationSystemController.getReputationHistory);

/**
 * @route GET /api/user-reputation/metrics/:userId
 * @desc Calculate multi-dimensional reputation metrics
 * @access Public
 * @param userId - ID of the user to calculate metrics for
 */
router.get('/metrics/:userId', userReputationSystemController.calculateReputationMetrics);

// Admin-only routes for user reputation management
router.use(adminAuthMiddleware);

// Apply rate limiting for reputation operations
const reputationRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  message: 'Too many reputation requests'
});

router.use(reputationRateLimit);

/**
 * @route POST /api/user-reputation/update
 * @desc Update user reputation based on an event
 * @access Admin
 * @body UpdateReputationSchema
 */
router.post('/update', csrfProtection,  userReputationSystemController.updateUserReputation);

/**
 * @route POST /api/user-reputation/penalty
 * @desc Apply reputation-based penalties
 * @access Admin
 * @body ApplyPenaltySchema
 */
router.post('/penalty', csrfProtection,  userReputationSystemController.applyReputationPenalty);

/**
 * @route GET /api/user-reputation/leaderboard
 * @desc Get reputation leaderboard
 * @access Admin
 */
router.get('/leaderboard', userReputationSystemController.getReputationLeaderboard);

/**
 * @route GET /api/user-reputation/tiers
 * @desc Get reputation tiers configuration
 * @access Admin
 */
router.get('/tiers', userReputationSystemController.getReputationTiers);

export default router;