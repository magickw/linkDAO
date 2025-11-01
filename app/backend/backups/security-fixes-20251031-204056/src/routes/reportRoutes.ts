import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportController } from '../controllers/reportController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validateRequest';
import { csrfProtection } from '../middleware/csrfProtection';
import { z } from 'zod';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Validation schemas
const submitReportSchema = z.object({
  body: z.object({
    contentId: z.string().min(1).max(64),
    contentType: z.enum(['post', 'comment', 'listing', 'dm', 'username', 'nft', 'service']),
    reason: z.string().min(1).max(48),
    details: z.string().optional().nullable(),
    category: z.enum(['spam', 'harassment', 'hate_speech', 'violence', 'nsfw', 'scam', 'copyright', 'other']).optional()
  })
});

const getReportsSchema = z.object({
  query: z.object({
    contentId: z.string().optional(),
    status: z.enum(['open', 'under_review', 'resolved', 'dismissed']).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional()
  })
});

const updateReportStatusSchema = z.object({
  params: z.object({
    reportId: z.string().transform(Number)
  }),
  body: z.object({
    status: z.enum(['under_review', 'resolved', 'dismissed']),
    resolution: z.string().optional(),
    moderatorNotes: z.string().optional()
  })
});

// Public routes
router.post('/submit', csrfProtection,  
  authMiddleware,
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), // 10 reports per 15 minutes
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