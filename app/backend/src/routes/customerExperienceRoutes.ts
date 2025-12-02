import { Router } from 'express';
import { customerExperienceController } from '../controllers/customerExperienceController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to prevent abuse
router.use(apiLimiter);

/**
 * @route GET /api/customer-experience/satisfaction
 * @desc Get customer satisfaction metrics
 * @access Private (Admin)
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/satisfaction', adminAuthMiddleware, customerExperienceController.getSatisfactionMetrics.bind(customerExperienceController));

/**
 * @route POST /api/customer-experience/analyze-feedback
 * @desc Analyze customer feedback for themes and insights
 * @access Private (Admin)
 * @body feedbackTexts - Array of feedback texts to analyze
 */
router.post('/analyze-feedback', adminAuthMiddleware, csrfProtection, customerExperienceController.analyzeFeedback.bind(customerExperienceController));

/**
 * @route GET /api/customer-experience/score
 * @desc Get overall customer experience score
 * @access Private (Admin)
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/score', adminAuthMiddleware, customerExperienceController.getExperienceScore.bind(customerExperienceController));

/**
 * @route GET /api/customer-experience/issues
 * @desc Get issue correlations and their impact
 * @access Private (Admin)
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/issues', adminAuthMiddleware, customerExperienceController.getIssueCorrelations.bind(customerExperienceController));

/**
 * @route GET /api/customer-experience/report
 * @desc Generate comprehensive customer experience report
 * @access Private (Admin)
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/report', adminAuthMiddleware, customerExperienceController.generateExperienceReport.bind(customerExperienceController));

/**
 * @route GET /api/customer-experience/recommendations
 * @desc Get improvement recommendations
 * @access Private (Admin)
 * @query startDate - Optional start date for filtering
 * @query endDate - Optional end date for filtering
 */
router.get('/recommendations', adminAuthMiddleware, customerExperienceController.getImprovementRecommendations.bind(customerExperienceController));

export default router;