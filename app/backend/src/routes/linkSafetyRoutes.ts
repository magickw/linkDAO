import { Router } from 'express';
import { LinkSafetyController } from '../controllers/linkSafetyController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { body, param, query } from 'express-validator';

const router = Router();
const linkSafetyController = new LinkSafetyController();

// Validation middleware
const validateUrl = [
  body('url')
    .isURL({ require_protocol: true })
    .withMessage('Valid URL with protocol is required'),
];

const validateUrls = [
  body('urls')
    .isArray({ min: 1, max: 100 })
    .withMessage('URLs must be an array with 1-100 items'),
  body('urls.*')
    .isURL({ require_protocol: true })
    .withMessage('Each URL must be valid with protocol'),
];

const validateContentLinks = [
  body('contentId')
    .isString()
    .isLength({ min: 1, max: 64 })
    .withMessage('Content ID is required and must be 1-64 characters'),
  body('contentType')
    .isIn(['post', 'comment', 'listing', 'dm'])
    .withMessage('Content type must be post, comment, listing, or dm'),
  body('content')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Content is required'),
];

const validateBlacklistEntry = [
  body('entryType')
    .isIn(['domain', 'url', 'pattern'])
    .withMessage('Entry type must be domain, url, or pattern'),
  body('entryValue')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Entry value is required and must be 1-500 characters'),
  body('category')
    .isString()
    .isLength({ min: 1, max: 32 })
    .withMessage('Category is required and must be 1-32 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must be 500 characters or less'),
];

const validateDomain = [
  param('domain')
    .isString()
    .matches(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .withMessage('Valid domain is required'),
];

const validateContentParams = [
  param('contentId')
    .isString()
    .isLength({ min: 1, max: 64 })
    .withMessage('Content ID is required and must be 1-64 characters'),
  param('contentType')
    .isIn(['post', 'comment', 'listing', 'dm'])
    .withMessage('Content type must be post, comment, listing, or dm'),
];

const validateAlertId = [
  param('alertId')
    .isInt({ min: 1 })
    .withMessage('Valid alert ID is required'),
];

// Public routes (with rate limiting)
router.post(
  '/analyze',
  validateUrl,
  validateRequest,
  linkSafetyController.analyzeUrl
);

router.post(
  '/analyze/batch',
  validateUrls,
  validateRequest,
  linkSafetyController.analyzeUrls
);

router.post(
  '/analyze/content',
  validateContentLinks,
  validateRequest,
  linkSafetyController.analyzeContentLinks
);

router.get(
  '/domain/:domain/reputation',
  validateDomain,
  validateRequest,
  linkSafetyController.getDomainReputation
);

router.get(
  '/domain/:domain/analytics',
  validateDomain,
  validateRequest,
  linkSafetyController.getDomainAnalytics
);

// Protected routes (require authentication)
router.use(authMiddleware);

router.post(
  '/blacklist',
  validateBlacklistEntry,
  validateRequest,
  linkSafetyController.addToBlacklist
);

router.get(
  '/monitoring/alerts',
  [
    query('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be low, medium, high, or critical'),
    query('alertType')
      .optional()
      .isString()
      .isLength({ max: 32 })
      .withMessage('Alert type must be 32 characters or less'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
  ],
  validateRequest,
  linkSafetyController.getMonitoringAlerts
);

router.get(
  '/monitoring/stats',
  linkSafetyController.getMonitoringStats
);

router.get(
  '/content/:contentType/:contentId/impact',
  validateContentParams,
  validateRequest,
  linkSafetyController.assessContentImpact
);

router.post(
  '/monitoring/alerts/:alertId/resolve',
  [
    ...validateAlertId,
    body('resolution')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Resolution must be 500 characters or less'),
  ],
  validateRequest,
  linkSafetyController.resolveAlert
);

router.get(
  '/domains/top',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('category')
      .optional()
      .isString()
      .isLength({ max: 32 })
      .withMessage('Category must be 32 characters or less'),
  ],
  validateRequest,
  linkSafetyController.getTopDomains
);

// Admin routes (require admin privileges)
// Note: Add admin middleware here when available
router.post(
  '/monitoring/start',
  linkSafetyController.startMonitoring
);

router.post(
  '/monitoring/stop',
  linkSafetyController.stopMonitoring
);

router.get(
  '/vendors/test',
  linkSafetyController.testVendorConnections
);

router.post(
  '/domain/:domain/verify',
  [
    ...validateDomain,
    body('category')
      .optional()
      .isString()
      .isLength({ max: 32 })
      .withMessage('Category must be 32 characters or less'),
  ],
  validateRequest,
  linkSafetyController.verifyDomain
);

router.post(
  '/domain/:domain/blacklist',
  [
    ...validateDomain,
    body('reason')
      .isString()
      .isLength({ min: 1, max: 500 })
      .withMessage('Reason is required and must be 1-500 characters'),
    body('severity')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Severity must be low, medium, high, or critical'),
  ],
  validateRequest,
  linkSafetyController.blacklistDomain
);

export default router;