import { Router } from 'express';
import { dataExportController } from '../controllers/dataExportController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimiting';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Export jobs
router.post('/export', csrfProtection, rateLimiter(10, 60), dataExportController.exportUserData.bind(dataExportController));
router.get('/jobs/:jobId', rateLimiter(100, 60), dataExportController.getExportJob.bind(dataExportController));
router.get('/jobs', rateLimiter(100, 60), dataExportController.listExportJobs.bind(dataExportController));
router.post('/jobs/:jobId/cancel', csrfProtection, rateLimiter(50, 60), dataExportController.cancelExportJob.bind(dataExportController));
router.get('/jobs/:jobId/download', rateLimiter(50, 60), dataExportController.downloadExport.bind(dataExportController));

// Scheduled exports
router.post('/scheduled', csrfProtection, rateLimiter(20, 60), dataExportController.scheduleExport.bind(dataExportController));
router.put('/scheduled/:scheduledExportId', csrfProtection, rateLimiter(50, 60), dataExportController.updateScheduledExport.bind(dataExportController));
router.get('/scheduled/:scheduledExportId', rateLimiter(100, 60), dataExportController.getScheduledExport.bind(dataExportController));
router.get('/scheduled', rateLimiter(100, 60), dataExportController.listScheduledExports.bind(dataExportController));
router.delete('/scheduled/:scheduledExportId', csrfProtection, rateLimiter(20, 60), dataExportController.deleteScheduledExport.bind(dataExportController));
router.post('/scheduled/:scheduledExportId/execute', csrfProtection, rateLimiter(10, 60), dataExportController.executeScheduledExport.bind(dataExportController));

export default router;