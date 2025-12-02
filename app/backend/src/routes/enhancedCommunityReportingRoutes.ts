import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { enhancedCommunityReportingController } from '../controllers/enhancedCommunityReportingController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Enhanced Community Report Submission
router.post('/enhanced/submit', csrfProtection, enhancedCommunityReportingController.submitEnhancedReport.bind(enhancedCommunityReportingController));

// Consensus-based Reporting Weight Calculation
router.get('/enhanced/weight/:userId', enhancedCommunityReportingController.calculateReportingWeight.bind(enhancedCommunityReportingController));

// Process Validation Result (Workflow Integration)
router.post('/enhanced/validate', csrfProtection, enhancedCommunityReportingController.processValidationResult.bind(enhancedCommunityReportingController));

// Enhanced Reporting Analytics
router.get('/enhanced/analytics', enhancedCommunityReportingController.getEnhancedAnalytics.bind(enhancedCommunityReportingController));

// Report Details with Validation Status
router.get('/enhanced/report/:reportId', enhancedCommunityReportingController.getReportDetails.bind(enhancedCommunityReportingController));

// User Reporting History
router.get('/enhanced/user/:userId/history', enhancedCommunityReportingController.getUserReportingHistory.bind(enhancedCommunityReportingController));

// Reporting Leaderboard
router.get('/enhanced/leaderboard', enhancedCommunityReportingController.getReportingLeaderboard.bind(enhancedCommunityReportingController));

export default router;