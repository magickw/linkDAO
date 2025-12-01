import { Router } from 'express';
import { returnReasonAnalysisController } from '../controllers/returnReasonAnalysisController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Return Reason Analysis Routes
 * All routes require admin authentication
 */

// Get reason categorization
router.get(
  '/categorization',
  adminAuthMiddleware,
  (req, res) => returnReasonAnalysisController.getCategorization(req, res)
);

// Get reason trends
router.get(
  '/trends',
  adminAuthMiddleware,
  (req, res) => returnReasonAnalysisController.getTrends(req, res)
);

// Get reason clusters
router.get(
  '/clusters',
  adminAuthMiddleware,
  (req, res) => returnReasonAnalysisController.getClusters(req, res)
);

// Get comprehensive reason analytics
router.get(
  '/analytics',
  adminAuthMiddleware,
  (req, res) => returnReasonAnalysisController.getComprehensiveAnalytics(req, res)
);

export default router;
