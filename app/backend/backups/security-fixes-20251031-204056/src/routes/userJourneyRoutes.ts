import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { userJourneyController } from '../controllers/userJourneyController';
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
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}));

/**
 * @route POST /api/admin/user-journey/track
 * @desc Track a user journey event
 * @access Admin
 */
router.post('/track', csrfProtection,  userJourneyController.trackEvent.bind(userJourneyController));

/**
 * @route GET /api/admin/user-journey/maps
 * @desc Get user journey maps for a date range
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query pathType - Optional path type filter
 */
router.get('/maps', userJourneyController.getJourneyMaps.bind(userJourneyController));

/**
 * @route POST /api/admin/user-journey/funnel
 * @desc Get conversion funnel analysis
 * @access Admin
 * @body funnelSteps - Array of funnel step names
 * @body startDate - Start date (ISO string)
 * @body endDate - End date (ISO string)
 */
router.post('/funnel', csrfProtection,  userJourneyController.getConversionFunnel.bind(userJourneyController));

/**
 * @route GET /api/admin/user-journey/sessions
 * @desc Get user sessions with journey details
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query userId - Optional user ID filter
 * @query limit - Optional limit (default: 100, max: 1000)
 */
router.get('/sessions', userJourneyController.getUserSessions.bind(userJourneyController));

/**
 * @route GET /api/admin/user-journey/dropoff
 * @desc Get drop-off analysis for a specific path
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 * @query pathSteps - Comma-separated list of path steps
 */
router.get('/dropoff', userJourneyController.getDropOffAnalysis.bind(userJourneyController));

/**
 * @route GET /api/admin/user-journey/realtime
 * @desc Get real-time journey metrics
 * @access Admin
 */
router.get('/realtime', userJourneyController.getRealTimeMetrics.bind(userJourneyController));

/**
 * @route GET /api/admin/user-journey/summary
 * @desc Get journey analytics summary
 * @access Admin
 * @query startDate - Start date (ISO string)
 * @query endDate - End date (ISO string)
 */
router.get('/summary', userJourneyController.getJourneySummary.bind(userJourneyController));

export default router;