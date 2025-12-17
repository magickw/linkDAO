import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reputationController } from '../controllers/reputationController';
import { userReputationSystemController } from '../controllers/userReputationSystemController';
import { alignedReputationController } from '../controllers/alignedReputationController';
import { authMiddleware } from '../middleware/authMiddleware';
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
  max: 300, // 300 requests per minute for general reputation queries
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
  max: 20, // 20 updates per minute
  message: {
    success: false,
    error: {
      code: 'UPDATE_RATE_LIMIT_EXCEEDED',
      message: 'Too many reputation updates, please try again later',
    }
  }
});

// Aligned routes for frontend compatibility
// GET /api/reputation/:userId - Get user reputation (supports both userId and walletAddress)
router.get(
  '/:identifier',
  reputationRateLimit,
  alignedReputationController.getUserReputation.bind(alignedReputationController)
);

// GET /api/reputation/:userId/events - Get reputation events/history
router.get(
  '/:identifier/events',
  reputationRateLimit,
  alignedReputationController.getReputationEvents.bind(alignedReputationController)
);

// POST /api/reputation/:userId/award - Award reputation points
router.post(
  '/:identifier/award',
  reputationUpdateRateLimit,
  csrfProtection,
  alignedReputationController.awardPoints.bind(alignedReputationController)
);

// GET /api/reputation/:userId/achievements/check - Check for new achievements
router.get(
  '/:identifier/achievements/check',
  reputationRateLimit,
  alignedReputationController.checkForAchievements.bind(alignedReputationController)
);

// POST /api/reputation/bulk - Bulk reputation queries
router.post(
  '/bulk',
  reputationRateLimit,
  reputationController.getBulkReputation.bind(reputationController)
);

// GET /api/reputation/stats - Service statistics
router.get(
  '/stats',
  reputationRateLimit,
  reputationController.getReputationStats.bind(reputationController)
);

// DELETE /api/reputation/cache - Clear cache
router.delete(
  '/cache',
  reputationUpdateRateLimit,
  reputationController.clearReputationCache.bind(reputationController)
);

export { router as alignedReputationRoutes };
export default router;