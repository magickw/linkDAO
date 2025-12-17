import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportController } from '../controllers/reportController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas (converted from Zod to ValidationSchema format)
const submitReportSchema = {
  body: {
    contentId: { type: 'string', required: true, minLength: 1, maxLength: 64 },
    contentType: { type: 'string', required: true, enum: ['post', 'comment', 'listing', 'dm', 'username', 'nft', 'service'] },
    reason: { type: 'string', required: true, minLength: 1, maxLength: 48 },
    details: { type: 'string', optional: true },
    category: { type: 'string', optional: true, enum: ['spam', 'harassment', 'hate_speech', 'violence', 'nsfw', 'scam', 'copyright', 'other'] }
  }
};

const getReportsSchema = {
  query: {
    contentId: { type: 'string', optional: true },
    status: { type: 'string', optional: true, enum: ['open', 'under_review', 'resolved', 'dismissed'] },
    page: { type: 'number', optional: true },
    limit: { type: 'number', optional: true }
  }
};

const updateReportStatusSchema = {
  params: {
    reportId: { type: 'number', required: true }
  },
  body: {
    status: { type: 'string', required: true, enum: ['under_review', 'resolved', 'dismissed'] },
    resolution: { type: 'string', optional: true },
    moderatorNotes: { type: 'string', optional: true }
  }
};

// Public routes
router.post('/submit', csrfProtection,  
  authMiddleware,
  rateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10 }), // 10 reports per 15 minutes
  validateRequest(submitReportSchema),
  reportController.submitReport
);

router.get('/my-reports',
  authMiddleware,
  reportController.getUserReports
);

router.get('/status/:contentId',
  authMiddleware,
  reportController.getReportStatus
);

// Moderator routes
router.get('/queue',
  authMiddleware,
  // TODO: Add moderator role check middleware
  validateRequest(getReportsSchema),
  reportController.getModerationQueue
);

router.put('/:reportId/status', csrfProtection, 
  authMiddleware,
  // TODO: Add moderator role check middleware
  validateRequest(updateReportStatusSchema),
  reportController.updateReportStatus
);

router.get('/analytics',
  authMiddleware,
  // TODO: Add admin role check middleware
  reportController.getReportAnalytics
);

// Internal routes for aggregation
router.post('/_internal/aggregate', csrfProtection, 
  reportController.aggregateReports
);

router.post('/_internal/reputation-update', csrfProtection, 
  reportController.updateReporterReputation
);

export default router;