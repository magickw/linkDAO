import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { resolutionRecommendationController } from '../controllers/resolutionRecommendationController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route POST /api/resolution-recommendation/generate/:disputeId
 * @desc Generate comprehensive resolution recommendation
 * @access Private (Admin/Arbitrator)
 */
router.post(
  '/generate/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.generateRecommendation.bind(resolutionRecommendationController)
);

/**
 * @route GET /api/resolution-recommendation/precedents/:disputeId
 * @desc Find precedent cases for a dispute
 * @access Private (Admin/Arbitrator)
 */
router.get(
  '/precedents/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.findPrecedentCases.bind(resolutionRecommendationController)
);

/**
 * @route POST /api/resolution-recommendation/policy-compliance/:disputeId
 * @desc Check policy compliance for a proposed resolution
 * @access Private (Admin/Arbitrator)
 */
router.post(
  '/policy-compliance/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.checkPolicyCompliance.bind(resolutionRecommendationController)
);

/**
 * @route POST /api/resolution-recommendation/impact-assessment/:disputeId
 * @desc Get impact assessment for different resolution outcomes
 * @access Private (Admin/Arbitrator)
 */
router.post(
  '/impact-assessment/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.getImpactAssessment.bind(resolutionRecommendationController)
);

/**
 * @route POST /api/resolution-recommendation/compare/:disputeId
 * @desc Compare multiple resolution options
 * @access Private (Admin/Arbitrator)
 */
router.post(
  '/compare/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.compareResolutionOptions.bind(resolutionRecommendationController)
);

/**
 * @route POST /api/resolution-recommendation/confidence/:disputeId
 * @desc Get resolution confidence score
 * @access Private (Admin/Arbitrator)
 */
router.post(
  '/confidence/:disputeId',
  adminAuthMiddleware,
  resolutionRecommendationController.getResolutionConfidence.bind(resolutionRecommendationController)
);

/**
 * @route GET /api/resolution-recommendation/analytics
 * @desc Get resolution analytics and trends
 * @access Private (Admin/Arbitrator)
 */
router.get(
  '/analytics',
  adminAuthMiddleware,
  resolutionRecommendationController.getResolutionAnalytics.bind(resolutionRecommendationController)
);

export default router;