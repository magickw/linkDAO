import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentReportController } from '../controllers/contentReportController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting for report submissions to prevent abuse
const reportRateLimit = rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 reports per 15 minutes per user
  message: 'Too many reports submitted. Please wait before submitting more reports.'
});

/**
 * @route POST /api/moderation/report
 * @desc Submit a content report
 * @access Authenticated users
 * @body { contentId, contentType, reason, details? }
 */
router.post('/report', csrfProtection,  reportRateLimit, contentReportController.submitReport);

// Admin-only routes
router.use(adminAuthMiddleware);

/**
 * @route GET /api/moderation/reports/content/:contentId
 * @desc Get all reports for a specific content item
 * @access Admin
 * @param contentId - ID of the content
 */
router.get('/reports/content/:contentId', contentReportController.getReportsForContent);

/**
 * @route GET /api/moderation/reports/pending
 * @desc Get all pending (open) reports
 * @access Admin
 * @query page - Page number (default: 1)
 * @query limit - Results per page (default: 20)
 */
router.get('/reports/pending', contentReportController.getPendingReports);

/**
 * @route PUT /api/moderation/reports/:reportId
 * @desc Update report status
 * @access Admin
 * @param reportId - ID of the report
 * @body { status, resolution? }
 */
router.put('/reports/:reportId', csrfProtection,  contentReportController.updateReportStatus);

export default router;
