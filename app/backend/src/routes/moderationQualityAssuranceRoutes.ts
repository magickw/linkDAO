import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { moderationQualityAssuranceController } from '../controllers/moderationQualityAssuranceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Admin-only routes for moderation quality assurance
router.use(adminAuthMiddleware);

// Apply rate limiting for QA operations
const qaRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 requests per minute per admin
  message: 'Too many quality assurance requests'
});

router.use(qaRateLimit);

/**
 * @route POST /api/moderation-qa/audit
 * @desc Audit a moderation decision for quality assurance
 * @access Admin
 * @body AuditDecisionSchema
 */
router.post('/audit', csrfProtection,  moderationQualityAssuranceController.auditDecision);

/**
 * @route GET /api/moderation-qa/metrics
 * @desc Calculate quality metrics for a moderator
 * @access Admin
 * @query QualityMetricsSchema
 */
router.get('/metrics', moderationQualityAssuranceController.getQualityMetrics);

/**
 * @route POST /api/moderation-qa/evaluate
 * @desc Evaluate comprehensive moderator performance
 * @access Admin
 * @body PerformanceEvaluationSchema
 */
router.post('/evaluate', csrfProtection,  moderationQualityAssuranceController.evaluatePerformance);

/**
 * @route POST /api/moderation-qa/feedback
 * @desc Submit feedback for continuous improvement
 * @access Admin
 * @body FeedbackSchema
 */
router.post('/feedback', csrfProtection,  moderationQualityAssuranceController.submitFeedback);

/**
 * @route POST /api/moderation-qa/calibration/create
 * @desc Create a calibration session for moderator training
 * @access Admin
 * @body CalibrationSessionSchema
 */
router.post('/calibration/create', csrfProtection,  moderationQualityAssuranceController.createCalibrationSession);

/**
 * @route POST /api/moderation-qa/calibration/submit
 * @desc Submit calibration session results
 * @access Admin
 * @body CalibrationResultSchema
 */
router.post('/calibration/submit', csrfProtection,  moderationQualityAssuranceController.submitCalibrationResults);

/**
 * @route GET /api/moderation-qa/training-recommendations
 * @desc Get training recommendations for moderators
 * @access Admin
 * @query { moderatorId: string, timeRange?: number }
 */
router.get('/training-recommendations', moderationQualityAssuranceController.getTrainingRecommendations);

/**
 * @route GET /api/moderation-qa/dashboard
 * @desc Get quality assurance dashboard data
 * @access Admin
 * @query { timeRange?: number }
 */
router.get('/dashboard', moderationQualityAssuranceController.getQADashboard);

export default router;
