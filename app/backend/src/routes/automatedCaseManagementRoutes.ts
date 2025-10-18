import { Router } from 'express';
import { automatedCaseManagementController } from '../controllers/automatedCaseManagementController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/automated-case-management/categorize/:disputeId
 * @desc Automatically categorize a dispute using ML
 * @access Private (Admin/Moderator)
 */
router.post(
  '/categorize/:disputeId',
  adminAuthMiddleware,
  automatedCaseManagementController.categorizeDispute.bind(automatedCaseManagementController)
);

/**
 * @route POST /api/automated-case-management/priority/:disputeId
 * @desc Calculate priority score for a dispute
 * @access Private (Admin/Moderator)
 */
router.post(
  '/priority/:disputeId',
  adminAuthMiddleware,
  automatedCaseManagementController.calculatePriorityScore.bind(automatedCaseManagementController)
);

/**
 * @route POST /api/automated-case-management/assign/:disputeId
 * @desc Automatically assign dispute to best available arbitrator
 * @access Private (Admin/Moderator)
 */
router.post(
  '/assign/:disputeId',
  adminAuthMiddleware,
  automatedCaseManagementController.assignDisputeAutomatically.bind(automatedCaseManagementController)
);

/**
 * @route POST /api/automated-case-management/timeline/:disputeId
 * @desc Create case timeline with milestones
 * @access Private (Admin/Moderator)
 */
router.post(
  '/timeline/:disputeId',
  adminAuthMiddleware,
  automatedCaseManagementController.createCaseTimeline.bind(automatedCaseManagementController)
);

/**
 * @route PUT /api/automated-case-management/timeline/:disputeId/:milestoneId
 * @desc Update case timeline milestone
 * @access Private (Admin/Moderator)
 */
router.put(
  '/timeline/:disputeId/:milestoneId',
  adminAuthMiddleware,
  automatedCaseManagementController.updateCaseTimeline.bind(automatedCaseManagementController)
);

/**
 * @route GET /api/automated-case-management/workload-metrics
 * @desc Get arbitrator workload metrics
 * @access Private (Admin/Moderator)
 */
router.get(
  '/workload-metrics',
  adminAuthMiddleware,
  automatedCaseManagementController.getArbitratorWorkloadMetrics.bind(automatedCaseManagementController)
);

/**
 * @route POST /api/automated-case-management/optimize-routing
 * @desc Optimize case routing based on current workloads
 * @access Private (Admin/Moderator)
 */
router.post(
  '/optimize-routing',
  adminAuthMiddleware,
  automatedCaseManagementController.optimizeCaseRouting.bind(automatedCaseManagementController)
);

/**
 * @route POST /api/automated-case-management/batch-process
 * @desc Batch process multiple disputes
 * @access Private (Admin/Moderator)
 */
router.post(
  '/batch-process',
  adminAuthMiddleware,
  automatedCaseManagementController.batchProcessDisputes.bind(automatedCaseManagementController)
);

/**
 * @route GET /api/automated-case-management/analytics
 * @desc Get case management analytics
 * @access Private (Admin/Moderator)
 */
router.get(
  '/analytics',
  adminAuthMiddleware,
  automatedCaseManagementController.getCaseManagementAnalytics.bind(automatedCaseManagementController)
);

/**
 * @route GET /api/automated-case-management/recommendations/:disputeId
 * @desc Get case recommendations
 * @access Private (Admin/Moderator)
 */
router.get(
  '/recommendations/:disputeId',
  adminAuthMiddleware,
  automatedCaseManagementController.getCaseRecommendations.bind(automatedCaseManagementController)
);

export default router;