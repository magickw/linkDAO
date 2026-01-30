import { Router } from 'express';
import { profileAnalyticsController } from '../controllers/profileAnalyticsController';
import rateLimit from 'express-rate-limit';

// Rate limiting for analytics endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: {
      code: 'ANALYTICS_RATE_LIMIT_EXCEEDED',
      message: 'Too many analytics requests, please try again later',
    }
  }
});

const router = Router();

/**
 * @route GET /api/profile-analytics/:userId
 * @desc Get comprehensive profile analytics for a user
 * @access Public (read-only analytics)
 */
router.get('/:userId', analyticsRateLimit, profileAnalyticsController.getProfileAnalytics.bind(profileAnalyticsController));

/**
 * @route GET /api/profile-analytics/:userId/engagement-profile
 * @desc Get detailed engagement profile for a user
 * @access Public (read-only analytics)
 */
router.get('/:userId/engagement-profile', analyticsRateLimit, profileAnalyticsController.getUserEngagementProfile.bind(profileAnalyticsController));

/**
 * @route GET /api/profile-analytics/:userId/trends
 * @desc Get engagement trends over time
 * @query timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 * @query granularity - 'hour', 'day', 'week' (default: 'day')
 * @access Public (read-only analytics)
 */
router.get('/:userId/trends', analyticsRateLimit, profileAnalyticsController.getEngagementTrends.bind(profileAnalyticsController));

/**
 * @route GET /api/profile-analytics/:userId/top-posts
 * @desc Get top performing posts for a user
 * @query timeRange - '7d', '30d', '90d', 'all' (default: '30d')
 * @query limit - number of posts to return (default: 10)
 * @access Public (read-only analytics)
 */
router.get('/:userId/top-posts', analyticsRateLimit, profileAnalyticsController.getTopPerformingPosts.bind(profileAnalyticsController));

export default router;