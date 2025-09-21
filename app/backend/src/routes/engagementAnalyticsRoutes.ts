import { Router } from 'express';
import { EngagementAnalyticsController } from '../controllers/engagementAnalyticsController';
import { auth } from '../middleware/auth';

const router = Router();

// Engagement analytics routes
router.get('/engagement', EngagementAnalyticsController.getEngagementAnalytics);
router.get('/engagement/trends', EngagementAnalyticsController.getEngagementTrends);
router.post('/engagement/track', auth, EngagementAnalyticsController.trackEngagementInteraction);
router.post('/engagement/track-batch', auth, EngagementAnalyticsController.trackEngagementBatch);

// Post-specific analytics
router.get('/posts/top-performing', EngagementAnalyticsController.getTopPerformingPosts);
router.get('/posts/:postId/social-proof', EngagementAnalyticsController.getSocialProofIndicators);
router.get('/posts/:postId/aggregate', EngagementAnalyticsController.getEngagementAggregate);
router.post('/posts/bulk', EngagementAnalyticsController.getBulkPostAnalytics);

// User-specific analytics
router.get('/users/:userId/engagement-profile', EngagementAnalyticsController.getUserEngagementProfile);

export default router;