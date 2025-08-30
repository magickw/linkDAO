import { Router } from 'express';
import { moderationController } from '../controllers/moderationController';
import { authenticateToken } from '../middleware/authMiddleware';
import { moderatorAuthService } from '../services/moderatorAuthService';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for moderation endpoints
const moderationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each moderator to 1000 requests per windowMs
  message: 'Too many requests from this moderator',
  standardHeaders: true,
  legacyHeaders: false,
});

const decisionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit decisions to 60 per minute
  message: 'Decision rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

const bulkActionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit bulk actions to 10 per 5 minutes
  message: 'Bulk action rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and moderator authorization to all routes
router.use(authenticateToken);
router.use(moderatorAuthService.requireModerator());
router.use(moderationRateLimit);

// Moderator profile and session management
router.get('/profile', moderationController.getProfile);
router.post('/session/start', moderationController.startSession);
router.post('/session/end', moderationController.endSession);
router.get('/health', moderationController.healthCheck);

// Review queue management
router.get('/queue', moderationController.getReviewQueue);
router.get('/queue/stats', moderationController.getQueueStats);
router.get('/queue/next', moderationController.getNextCase);
router.post('/queue/assign/:caseId', moderationController.assignCase);
router.post('/queue/release/:caseId', moderationController.releaseCase);

// Decision making
router.post('/decisions', 
  decisionRateLimit,
  moderatorAuthService.requireModeratorPermission('canMakeDecisions'),
  moderationController.makeDecision
);

router.post('/decisions/bulk',
  bulkActionRateLimit,
  moderatorAuthService.requireModeratorPermission('canAccessBulkActions'),
  moderationController.makeBulkDecisions
);

router.get('/decisions/history', moderationController.getDecisionHistory);

// Policy templates
router.get('/templates', moderationController.getPolicyTemplates);

// Performance and analytics
router.get('/dashboard', 
  moderatorAuthService.requireModeratorPermission('canViewAnalytics'),
  moderationController.getPerformanceDashboard
);

router.get('/reports/performance',
  moderatorAuthService.requireModeratorPermission('canViewAnalytics'),
  moderationController.getPerformanceReport
);

export default router;