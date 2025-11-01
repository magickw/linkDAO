import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentIngestionController } from '../controllers/contentIngestionController';
import { csrfProtection } from '../middleware/csrfProtection';
import { 
  handleFileUploads, 
  validateContent, 
  contentRateLimit, 
  validateContentType,
  validateUserReputation 
} from '../middleware/contentValidation';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { generalLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Apply general rate limiting
router.use(generalLimiter);

/**
 * POST /api/content/submit
 * Submit content for moderation
 */
router.post('/submit', csrfProtection, 
  contentRateLimit,
  handleFileUploads,
  validateContent,
  contentIngestionController.submitContent
);

/**
 * POST /api/content/submit/post
 * Submit a post for moderation
 */
router.post('/submit/post', csrfProtection, 
  contentRateLimit,
  validateContentType(['post']),
  validateUserReputation(0), // No minimum reputation for posts
  handleFileUploads,
  validateContent,
  contentIngestionController.submitContent
);

/**
 * POST /api/content/submit/comment
 * Submit a comment for moderation
 */
router.post('/submit/comment', csrfProtection, 
  contentRateLimit,
  validateContentType(['comment']),
  validateUserReputation(0), // No minimum reputation for comments
  handleFileUploads,
  validateContent,
  contentIngestionController.submitContent
);

/**
 * POST /api/content/submit/listing
 * Submit a marketplace listing for moderation
 */
router.post('/submit/listing', csrfProtection, 
  contentRateLimit,
  validateContentType(['listing']),
  validateUserReputation(10), // Minimum reputation for listings
  handleFileUploads,
  validateContent,
  contentIngestionController.submitContent
);

/**
 * POST /api/content/submit/dm
 * Submit a direct message for moderation (opt-in only)
 */
router.post('/submit/dm', csrfProtection, 
  contentRateLimit,
  validateContentType(['dm']),
  validateUserReputation(0), // No minimum reputation for DMs
  handleFileUploads,
  validateContent,
  contentIngestionController.submitContent
);

/**
 * POST /api/content/submit/username
 * Submit a username for moderation
 */
router.post('/submit/username', csrfProtection, 
  contentRateLimit,
  validateContentType(['username']),
  validateUserReputation(0), // No minimum reputation for usernames
  validateContent,
  contentIngestionController.submitContent
);

/**
 * GET /api/content/status/:contentId
 * Check moderation status of content
 */
router.get('/status/:contentId',
  contentIngestionController.getModerationStatus
);

/**
 * POST /api/content/retry/:contentId
 * Retry failed moderation
 */
router.post('/retry/:contentId', csrfProtection, 
  contentRateLimit,
  contentIngestionController.retryModeration
);

/**
 * GET /api/content/history
 * Get user's moderation history
 */
router.get('/history',
  contentIngestionController.getModerationHistory
);

// Admin routes
/**
 * GET /api/content/admin/stats
 * Get queue and staging statistics (admin only)
 */
router.get('/admin/stats',
  contentIngestionController.getQueueStats
);

/**
 * POST /api/content/admin/cleanup
 * Clean up expired staged content (admin only)
 */
router.post('/admin/cleanup', csrfProtection, 
  contentIngestionController.cleanupStagedContent
);

export default router;