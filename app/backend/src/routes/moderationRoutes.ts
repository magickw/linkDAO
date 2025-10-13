import express from 'express';
import { ModerationController } from '../controllers/moderationController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const moderationController = new ModerationController();

// Profile and authentication
router.get('/profile', authenticateToken, asyncHandler(moderationController.getProfile));
router.post('/session/start', authenticateToken, asyncHandler(moderationController.startSession));
router.post('/session/end', authenticateToken, asyncHandler(moderationController.endSession));

// Review queue
router.get('/queue', authenticateToken, asyncHandler(moderationController.getReviewQueue));
router.get('/queue/next', authenticateToken, asyncHandler(moderationController.getNextCase));
router.get('/queue/stats', authenticateToken, asyncHandler(moderationController.getQueueStats));
router.post('/queue/cases/:caseId/assign', authenticateToken, asyncHandler(moderationController.assignCase));
router.post('/queue/cases/:caseId/release', authenticateToken, asyncHandler(moderationController.releaseCase));

// Moderation decisions
router.post('/decisions', authenticateToken, asyncHandler(moderationController.makeDecision));
router.post('/decisions/bulk', authenticateToken, asyncHandler(moderationController.makeBulkDecisions));
router.get('/decisions/history', authenticateToken, asyncHandler(moderationController.getDecisionHistory));

// Policy templates
router.get('/templates', authenticateToken, asyncHandler(moderationController.getPolicyTemplates));

// Performance and reporting
router.get('/dashboard', authenticateToken, asyncHandler(moderationController.getPerformanceDashboard));
router.get('/report', authenticateToken, asyncHandler(moderationController.getPerformanceReport));

// Health check
router.get('/health', authenticateToken, asyncHandler(moderationController.healthCheck));

export default router;