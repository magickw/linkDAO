import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { socialMediaIntegrationController } from '../controllers/socialMediaIntegrationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', socialMediaIntegrationController.healthCheck);

// Admin-only routes for social media integration
router.use(adminAuthMiddleware);

// Apply rate limiting for social media operations
const socialMediaRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per user
  message: 'Too many social media requests'
});

router.use(socialMediaRateLimit);

/**
 * @route POST /api/social-media/cross-post
 * @desc Cross-post content to multiple social media platforms
 * @access Admin
 * @body CrossPostSchema
 */
router.post('/cross-post', csrfProtection,  socialMediaIntegrationController.crossPostContent);

/**
 * @route GET /api/social-media/analytics
 * @desc Get social media analytics for a community
 * @access Admin
 * @query communityId - ID of the community to get analytics for
 * @query timeframe - Timeframe for analytics (24h, 7d, 30d)
 */
router.get('/analytics', socialMediaIntegrationController.getSocialMediaAnalytics);

/**
 * @route POST /api/social-media/optimize
 * @desc Optimize content for social sharing
 * @access Admin
 * @body ContentOptimizationSchema
 */
router.post('/optimize', csrfProtection,  socialMediaIntegrationController.optimizeContentForSocialSharing);

/**
 * @route POST /api/social-media/schedule
 * @desc Schedule content for future posting
 * @access Admin
 * @body ScheduleContentSchema
 */
router.post('/schedule', csrfProtection,  socialMediaIntegrationController.scheduleContent);

/**
 * @route GET /api/social-media/scheduled
 * @desc Get scheduled posts
 * @access Admin
 * @query limit - Maximum number of scheduled posts to return
 */
router.get('/scheduled', socialMediaIntegrationController.getScheduledPosts);

/**
 * @route POST /api/social-media/cancel
 * @desc Cancel scheduled post
 * @access Admin
 * @body CancelScheduledPostSchema
 */
router.post('/cancel', csrfProtection,  socialMediaIntegrationController.cancelScheduledPost);

export default router;
