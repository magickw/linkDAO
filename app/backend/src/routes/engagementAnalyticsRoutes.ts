import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { EngagementAnalyticsController } from '../controllers/engagementAnalyticsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Engagement analytics routes
router.get('/engagement', EngagementAnalyticsController.getEngagementAnalytics);
router.get('/engagement/trends', EngagementAnalyticsController.getEngagementTrends);
router.post('/engagement/track', csrfProtection,  authenticateToken, EngagementAnalyticsController.trackEngagementInteraction);
router.post('/engagement/track-batch', csrfProtection,  authenticateToken, EngagementAnalyticsController.trackEngagementBatch);

// Post-specific analytics
router.get('/posts/top-performing', EngagementAnalyticsController.getTopPerformingPosts);
router.get('/posts/:postId/social-proof', EngagementAnalyticsController.getSocialProofIndicators);
router.get('/posts/:postId/aggregate', EngagementAnalyticsController.getEngagementAggregate);
router.post('/posts/bulk', csrfProtection,  EngagementAnalyticsController.getBulkPostAnalytics);

// User-specific analytics
router.get('/users/:userId/engagement-profile', EngagementAnalyticsController.getUserEngagementProfile);

export default router;
