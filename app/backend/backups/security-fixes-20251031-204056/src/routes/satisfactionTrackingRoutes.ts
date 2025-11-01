import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { satisfactionTrackingController } from '../controllers/satisfactionTrackingController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/satisfaction-tracking/survey/:disputeId
 * @desc Create satisfaction survey for dispute participants
 * @access Private (Admin/System)
 */
router.post(
  '/survey/:disputeId',
  adminAuthMiddleware,
  satisfactionTrackingController.createSatisfactionSurvey.bind(satisfactionTrackingController)
);

/**
 * @route POST /api/satisfaction-tracking/submit-response
 * @desc Submit satisfaction survey response
 * @access Private (Authenticated users)
 */
router.post(
  '/submit-response',
  satisfactionTrackingController.submitSurveyResponse.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/metrics/:disputeId
 * @desc Get satisfaction metrics for a dispute
 * @access Private (Admin/Arbitrator)
 */
router.get(
  '/metrics/:disputeId',
  adminAuthMiddleware,
  satisfactionTrackingController.getSatisfactionMetrics.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/predict/:disputeId
 * @desc Predict satisfaction for ongoing dispute
 * @access Private (Admin/Arbitrator)
 */
router.get(
  '/predict/:disputeId',
  adminAuthMiddleware,
  satisfactionTrackingController.predictSatisfaction.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/analytics
 * @desc Get comprehensive satisfaction analytics
 * @access Private (Admin)
 */
router.get(
  '/analytics',
  adminAuthMiddleware,
  satisfactionTrackingController.getSatisfactionAnalytics.bind(satisfactionTrackingController)
);

/**
 * @route POST /api/satisfaction-tracking/analyze-feedback
 * @desc Analyze feedback text for insights
 * @access Private (Admin)
 */
router.post(
  '/analyze-feedback',
  adminAuthMiddleware,
  satisfactionTrackingController.analyzeFeedback.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/recommendations/:disputeId?
 * @desc Generate improvement recommendations
 * @access Private (Admin)
 */
router.get(
  '/recommendations/:disputeId?',
  adminAuthMiddleware,
  satisfactionTrackingController.generateImprovementRecommendations.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/dashboard
 * @desc Get satisfaction dashboard data
 * @access Private (Admin)
 */
router.get(
  '/dashboard',
  adminAuthMiddleware,
  satisfactionTrackingController.getSatisfactionDashboard.bind(satisfactionTrackingController)
);

/**
 * @route GET /api/satisfaction-tracking/trends
 * @desc Get satisfaction trends over time
 * @access Private (Admin)
 */
router.get(
  '/trends',
  adminAuthMiddleware,
  satisfactionTrackingController.getSatisfactionTrends.bind(satisfactionTrackingController)
);

export default router;