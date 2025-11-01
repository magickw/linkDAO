import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { appealsController } from '../controllers/appealsController';
import { authenticateToken } from '../middleware/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for appeals endpoints
const appealSubmissionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 appeal submissions per hour
  message: 'Too many appeal submissions. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated
    return (req as any).user?.id || req.ip;
  }
});

const generalAppealsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per 15 minutes
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Higher limit for admin operations
  message: 'Admin rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication to all routes
router.use(authenticateToken);
router.use(generalAppealsRateLimit);

// Public appeal endpoints (authenticated users)
/**
 * @route POST /api/appeals
 * @desc Submit a new appeal
 * @access Private (authenticated users)
 * @body {
 *   caseId: number,
 *   reasoning: string,
 *   stakeAmount: string,
 *   evidenceUrls?: string[],
 *   contactInfo?: string
 * }
 */
router.post('/', csrfProtection,  appealSubmissionRateLimit, appealsController.submitAppeal);

/**
 * @route GET /api/appeals/my
 * @desc Get current user's appeals
 * @access Private (authenticated users)
 * @query {
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/my', appealsController.getMyAppeals);

/**
 * @route GET /api/appeals/check/:caseId
 * @desc Check if a case can be appealed
 * @access Private (authenticated users)
 * @params {
 *   caseId: number
 * }
 */
router.get('/check/:caseId', appealsController.checkAppealEligibility);

/**
 * @route GET /api/appeals/:appealId
 * @desc Get specific appeal details
 * @access Private (appeal owner, moderators, admins)
 * @params {
 *   appealId: number
 * }
 */
router.get('/:appealId', appealsController.getAppeal);

// User-specific appeals (with access control)
/**
 * @route GET /api/appeals/user/:userId
 * @desc Get appeals for a specific user
 * @access Private (user themselves, moderators, admins)
 * @params {
 *   userId: string
 * }
 * @query {
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/user/:userId', appealsController.getUserAppeals);

// Administrative endpoints (moderator/admin only)
/**
 * @route GET /api/appeals/status/:status
 * @desc Get appeals by status
 * @access Private (moderators, admins)
 * @params {
 *   status: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed'
 * }
 * @query {
 *   page?: number,
 *   limit?: number
 * }
 */
router.get('/status/:status', adminRateLimit, appealsController.getAppealsByStatus);

/**
 * @route GET /api/appeals/stats
 * @desc Get appeal statistics
 * @access Private (moderators, admins)
 */
router.get('/stats', adminRateLimit, appealsController.getAppealStats);

/**
 * @route PUT /api/appeals/:appealId/status
 * @desc Update appeal status
 * @access Private (admins only)
 * @params {
 *   appealId: number
 * }
 * @body {
 *   status: 'open' | 'jury_selection' | 'voting' | 'decided' | 'executed',
 *   juryDecision?: 'uphold' | 'overturn' | 'partial',
 *   decisionCid?: string
 * }
 */
router.put('/:appealId/status', csrfProtection,  adminRateLimit, appealsController.updateAppealStatus);

export default router;
