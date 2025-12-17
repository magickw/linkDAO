import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { aiContentModerationController } from '../controllers/aiContentModerationController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', aiContentModerationController.healthCheck);

// Admin-only routes for AI content moderation
router.use(adminAuthMiddleware);

// Apply rate limiting for AI operations (expensive)
const aiRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per user
  message: 'Too many AI moderation requests'
});

router.use(aiRateLimit);

/**
 * @route POST /api/ai-moderation/moderate
 * @desc Moderate a single piece of content
 * @access Admin
 * @body ContentModerationSchema
 */
router.post('/moderate', csrfProtection,  aiContentModerationController.moderateContent);

/**
 * @route POST /api/ai-moderation/moderate/batch
 * @desc Moderate multiple pieces of content
 * @access Admin
 * @body { contents: ContentModerationSchema[] }
 */
router.post('/moderate/batch', csrfProtection,  aiContentModerationController.moderateContentBatch);

/**
 * @route GET /api/ai-moderation/spam/:contentId
 * @desc Get spam detection results for a specific content
 * @access Admin
 * @param contentId - ID of the content to analyze
 */
router.get('/spam/:contentId', aiContentModerationController.getSpamDetection);

/**
 * @route GET /api/ai-moderation/policy/:contentId
 * @desc Get content policy enforcement results for a specific content
 * @access Admin
 * @param contentId - ID of the content to analyze
 */
router.get('/policy/:contentId', aiContentModerationController.getContentPolicy);

/**
 * @route GET /api/ai-moderation/toxicity/:contentId
 * @desc Get toxicity detection results for a specific content
 * @access Admin
 * @param contentId - ID of the content to analyze
 */
router.get('/toxicity/:contentId', aiContentModerationController.getToxicityDetection);

/**
 * @route GET /api/ai-moderation/copyright/:contentId
 * @desc Get copyright detection results for a specific content
 * @access Admin
 * @param contentId - ID of the content to analyze
 */
router.get('/copyright/:contentId', aiContentModerationController.getCopyrightDetection);

export default router;
