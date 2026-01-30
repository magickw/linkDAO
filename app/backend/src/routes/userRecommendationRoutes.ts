import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  getUserRecommendations,
  getCommunityRecommendations,
  recordRecommendationFeedback,
  getRecommendationInsights
} from '../controllers/userRecommendationController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Rate limiting for recommendation endpoints
const recommendationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: {
      code: 'RECOMMENDATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many recommendation requests, please try again later',
    }
  }
});

// Get personalized user recommendations
router.get(
  '/users',
  authMiddleware,
  recommendationRateLimit,
  getUserRecommendations
);

// Get community recommendations
router.get(
  '/communities',
  authMiddleware,
  recommendationRateLimit,
  getCommunityRecommendations
);

// Record feedback on recommendations
router.post(
  '/feedback',
  authMiddleware,
  recommendationRateLimit,
  recordRecommendationFeedback
);

// Get recommendation insights
router.get(
  '/insights',
  authMiddleware,
  getRecommendationInsights
);

export default router;