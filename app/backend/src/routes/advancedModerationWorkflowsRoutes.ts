import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { advancedModerationWorkflowsController } from '../controllers/advancedModerationWorkflowsController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Health check endpoint (no admin required)
router.get('/health', advancedModerationWorkflowsController.healthCheck);

// Admin-only routes for advanced moderation workflows
router.use(adminAuthMiddleware);

// Apply rate limiting for moderation operations
const moderationRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200, // 200 requests per minute per user
  message: 'Too many moderation requests'
});

router.use(moderationRateLimit);

/**
 * @route GET /api/advanced-moderation/workflows
 * @desc Get all active moderation workflows
 * @access Admin
 */
router.get('/workflows', advancedModerationWorkflowsController.getWorkflows);

/**
 * @route GET /api/advanced-moderation/workflows/:workflowId
 * @desc Get a specific moderation workflow by ID
 * @access Admin
 * @param workflowId - ID of the workflow to retrieve
 */
router.get('/workflows/:workflowId', advancedModerationWorkflowsController.getWorkflowById);

/**
 * @route POST /api/advanced-moderation/workflows
 * @desc Create a new moderation workflow
 * @access Admin
 * @body WorkflowSchema
 */
router.post('/workflows', csrfProtection,  advancedModerationWorkflowsController.createWorkflow);

/**
 * @route PUT /api/advanced-moderation/workflows/:workflowId
 * @desc Update an existing moderation workflow
 * @access Admin
 * @param workflowId - ID of the workflow to update
 * @body WorkflowSchema
 */
router.put('/workflows/:workflowId', csrfProtection,  advancedModerationWorkflowsController.updateWorkflow);

/**
 * @route DELETE /api/advanced-moderation/workflows/:workflowId
 * @desc Delete a moderation workflow
 * @access Admin
 * @param workflowId - ID of the workflow to delete
 */
router.delete('/workflows/:workflowId', csrfProtection,  advancedModerationWorkflowsController.deleteWorkflow);

/**
 * @route GET /api/advanced-moderation/rules
 * @desc Get all active automated moderation rules
 * @access Admin
 */
router.get('/rules', advancedModerationWorkflowsController.getRules);

/**
 * @route GET /api/advanced-moderation/rules/:ruleId
 * @desc Get a specific automated moderation rule by ID
 * @access Admin
 * @param ruleId - ID of the rule to retrieve
 */
router.get('/rules/:ruleId', advancedModerationWorkflowsController.getRuleById);

/**
 * @route POST /api/advanced-moderation/rules
 * @desc Create a new automated moderation rule
 * @access Admin
 * @body RuleSchema
 */
router.post('/rules', csrfProtection,  advancedModerationWorkflowsController.createRule);

/**
 * @route PUT /api/advanced-moderation/rules/:ruleId
 * @desc Update an existing automated moderation rule
 * @access Admin
 * @param ruleId - ID of the rule to update
 * @body RuleSchema
 */
router.put('/rules/:ruleId', csrfProtection,  advancedModerationWorkflowsController.updateRule);

/**
 * @route DELETE /api/advanced-moderation/rules/:ruleId
 * @desc Delete an automated moderation rule
 * @access Admin
 * @param ruleId - ID of the rule to delete
 */
router.delete('/rules/:ruleId', csrfProtection,  advancedModerationWorkflowsController.deleteRule);

/**
 * @route POST /api/advanced-moderation/process
 * @desc Process content through moderation workflows
 * @access Admin
 * @body ProcessContentSchema
 */
router.post('/process', csrfProtection,  advancedModerationWorkflowsController.processContent);

/**
 * @route GET /api/advanced-moderation/statistics
 * @desc Get moderation statistics
 * @access Admin
 * @query timeRange - Time range for statistics (24h, 7d, 30d)
 */
router.get('/statistics', advancedModerationWorkflowsController.getStatistics);

export default router;
