import { Router } from 'express';
import { dataExportController } from '../controllers/dataExportController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply admin authentication to all routes
router.use(authMiddleware, validateAdminRole);

// Export jobs
router.post('/export', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 10 }), dataExportController.exportUserData.bind(dataExportController));
router.get('/jobs/:jobId', rateLimiter({ windowMs: 60 * 1000, max: 100 }), dataExportController.getExportJob.bind(dataExportController));
router.get('/jobs', rateLimiter({ windowMs: 60 * 1000, max: 100 }), dataExportController.listExportJobs.bind(dataExportController));
router.post('/jobs/:jobId/cancel', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 50 }), dataExportController.cancelExportJob.bind(dataExportController));
router.get('/jobs/:jobId/download', rateLimiter({ windowMs: 60 * 1000, max: 50 }), dataExportController.downloadExport.bind(dataExportController));

// Scheduled exports
router.post('/scheduled', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 20 }), dataExportController.scheduleExport.bind(dataExportController));
router.put('/scheduled/:scheduledExportId', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 50 }), dataExportController.updateScheduledExport.bind(dataExportController));
router.get('/scheduled/:scheduledExportId', rateLimiter({ windowMs: 60 * 1000, max: 100 }), dataExportController.getScheduledExport.bind(dataExportController));
router.get('/scheduled', rateLimiter({ windowMs: 60 * 1000, max: 100 }), dataExportController.listScheduledExports.bind(dataExportController));
router.delete('/scheduled/:scheduledExportId', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 20 }), dataExportController.deleteScheduledExport.bind(dataExportController));
router.post('/scheduled/:scheduledExportId/execute', csrfProtection, rateLimiter({ windowMs: 60 * 1000, max: 10 }), dataExportController.executeScheduledExport.bind(dataExportController));

export default router;