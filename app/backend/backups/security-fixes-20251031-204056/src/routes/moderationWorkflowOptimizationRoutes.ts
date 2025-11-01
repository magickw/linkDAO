import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { moderationWorkflowOptimizationController } from '../controllers/moderationWorkflowOptimizationController';
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

// Admin-only routes for moderation workflow optimization
router.use(adminAuthMiddleware);

// Apply rate limiting for optimization operations
const optimizationRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per admin
  message: 'Too many workflow optimization requests'
});

router.use(optimizationRateLimit);

/**
 * @route POST /api/moderation-workflow/optimize
 * @desc Optimize the moderation queue with intelligent prioritization
 * @access Admin
 * @body OptimizationRequestSchema
 */
router.post('/optimize', csrfProtection,  moderationWorkflowOptimizationController.optimizeQueue);

/**
 * @route GET /api/moderation-workflow/metrics
 * @desc Get comprehensive workflow metrics and analytics
 * @access Admin
 */
router.get('/metrics', moderationWorkflowOptimizationController.getWorkflowMetrics);

/**
 * @route GET /api/moderation-workflow/bottlenecks
 * @desc Analyze workflow bottlenecks with detailed insights
 * @access Admin
 * @query BottleneckAnalysisSchema
 */
router.get('/bottlenecks', moderationWorkflowOptimizationController.analyzeBottlenecks);

/**
 * @route POST /api/moderation-workflow/balance-workload
 * @desc Balance workload across moderators
 * @access Admin
 * @body WorkloadBalancingSchema
 */
router.post('/balance-workload', csrfProtection,  moderationWorkflowOptimizationController.balanceWorkload);

/**
 * @route GET /api/moderation-workflow/efficiency
 * @desc Get efficiency tracking and analytics for moderators
 * @access Admin
 */
router.get('/efficiency', moderationWorkflowOptimizationController.getEfficiencyTracking);

/**
 * @route GET /api/moderation-workflow/recommendations
 * @desc Get workflow optimization recommendations
 * @access Admin
 */
router.get('/recommendations', moderationWorkflowOptimizationController.getOptimizationRecommendations);

export default router;