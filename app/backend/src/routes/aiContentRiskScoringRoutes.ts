import { Router } from 'express';
import { aiContentRiskScoringController } from '../controllers/aiContentRiskScoringController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', aiContentRiskScoringController.healthCheck);

// Admin-only routes for AI content risk scoring
router.use(adminAuthMiddleware);

// Apply rate limiting for AI operations (expensive)
const aiRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  message: 'Too many AI risk assessment requests'
});

router.use(aiRateLimit);

/**
 * @route POST /api/ai-risk-scoring/assess
 * @desc Assess risk for a single piece of content
 * @access Admin
 * @body ContentInput
 */
router.post('/assess', aiContentRiskScoringController.assessContent);

/**
 * @route POST /api/ai-risk-scoring/assess/batch
 * @desc Assess risk for multiple pieces of content
 * @access Admin
 * @body { contents: ContentInput[] }
 */
router.post('/assess/batch', aiContentRiskScoringController.assessContentBatch);

/**
 * @route GET /api/ai-risk-scoring/metrics
 * @desc Get model performance metrics
 * @access Admin
 */
router.get('/metrics', aiContentRiskScoringController.getModelMetrics);

/**
 * @route POST /api/ai-risk-scoring/feedback
 * @desc Submit feedback on assessment accuracy
 * @access Admin
 * @body FeedbackSchema
 */
router.post('/feedback', aiContentRiskScoringController.submitFeedback);

/**
 * @route GET /api/ai-risk-scoring/explanation/:contentId
 * @desc Get detailed explanation for a risk assessment
 * @access Admin
 * @param contentId - ID of the content to explain
 */
router.get('/explanation/:contentId', aiContentRiskScoringController.getAssessmentExplanation);

/**
 * @route GET /api/ai-risk-scoring/configuration
 * @desc Get model configuration and thresholds for transparency
 * @access Admin
 */
router.get('/configuration', aiContentRiskScoringController.getModelConfiguration);

export default router;