import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { similarCaseMatchingController } from '../controllers/similarCaseMatchingController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Admin-only routes for similar case matching
router.use(adminAuthMiddleware);

// Apply rate limiting for case matching operations (computationally expensive)
const caseMatchingRateLimit = rateLimitingMiddleware({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute per admin
  message: 'Too many case matching requests'
});

router.use(caseMatchingRateLimit);

/**
 * @route POST /api/similar-cases/find
 * @desc Find similar cases for a given moderation case
 * @access Admin
 * @body FindSimilarCasesSchema
 */
router.post('/find', csrfProtection,  similarCaseMatchingController.findSimilarCases);

/**
 * @route POST /api/similar-cases/precedents/build
 * @desc Build and retrieve case precedent database
 * @access Admin
 */
router.post('/precedents/build', csrfProtection,  similarCaseMatchingController.buildPrecedentDatabase);

/**
 * @route GET /api/similar-cases/precedents/search
 * @desc Search precedents by pattern or criteria
 * @access Admin
 * @query PrecedentSearchSchema
 */
router.get('/precedents/search', similarCaseMatchingController.searchPrecedents);

/**
 * @route GET /api/similar-cases/consistency
 * @desc Analyze decision consistency across similar cases
 * @access Admin
 * @query ConsistencyAnalysisSchema
 */
router.get('/consistency', similarCaseMatchingController.analyzeConsistency);

/**
 * @route POST /api/similar-cases/recommendation
 * @desc Get decision recommendation based on similar cases and precedents
 * @access Admin
 * @body DecisionRecommendationSchema
 */
router.post('/recommendation', csrfProtection,  similarCaseMatchingController.getDecisionRecommendation);

/**
 * @route GET /api/similar-cases/patterns
 * @desc Get case pattern analysis for understanding decision patterns
 * @access Admin
 * @query { timeRange?: number }
 */
router.get('/patterns', similarCaseMatchingController.analyzePatterns);

/**
 * @route GET /api/similar-cases/moderation-patterns
 * @desc Get moderation decision pattern analysis
 * @access Admin
 * @query { moderatorId?: string, timeRange?: number }
 */
router.get('/moderation-patterns', similarCaseMatchingController.getModerationPatterns);

export default router;