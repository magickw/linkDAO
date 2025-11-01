import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { cohortAnalysisController } from '../controllers/cohortAnalysisController';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Apply rate limiting
router.use(rateLimitingMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}));

/**
 * @route GET /api/admin/cohort-analysis
 * @desc Get comprehensive cohort analysis
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 * @query retentionPeriods - Number of retention periods to analyze (default: 12)
 */
router.get('/', cohortAnalysisController.getCohortAnalysis.bind(cohortAnalysisController));

/**
 * @route POST /api/admin/cohort-analysis/compare
 * @desc Compare two specific cohorts
 * @access Admin
 * @body cohortA - First cohort period identifier
 * @body cohortB - Second cohort period identifier
 * @body cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 */
router.post('/compare', csrfProtection,  cohortAnalysisController.compareCohorts.bind(cohortAnalysisController));

/**
 * @route GET /api/admin/cohort-analysis/user/:userId
 * @desc Get user retention metrics
 * @access Admin
 * @param userId - User ID
 * @query cohortPeriod - Optional cohort period identifier
 */
router.get('/user/:userId', cohortAnalysisController.getUserRetentionMetrics.bind(cohortAnalysisController));

/**
 * @route GET /api/admin/cohort-analysis/heatmap
 * @desc Get cohort retention heatmap data
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 * @query retentionPeriods - Number of retention periods to analyze (default: 12)
 */
router.get('/heatmap', cohortAnalysisController.getCohortHeatmapData.bind(cohortAnalysisController));

/**
 * @route GET /api/admin/cohort-analysis/trends
 * @desc Get retention trends analysis
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 * @query retentionPeriods - Number of retention periods to analyze (default: 12)
 */
router.get('/trends', cohortAnalysisController.getRetentionTrends.bind(cohortAnalysisController));

/**
 * @route GET /api/admin/cohort-analysis/churn
 * @desc Get churn analysis
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 * @query retentionPeriods - Number of retention periods to analyze (default: 12)
 */
router.get('/churn', cohortAnalysisController.getChurnAnalysis.bind(cohortAnalysisController));

/**
 * @route GET /api/admin/cohort-analysis/summary
 * @desc Get cohort summary statistics
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query cohortType - Cohort type: daily, weekly, monthly (default: monthly)
 * @query retentionPeriods - Number of retention periods to analyze (default: 12)
 */
router.get('/summary', cohortAnalysisController.getCohortSummary.bind(cohortAnalysisController));

export default router;