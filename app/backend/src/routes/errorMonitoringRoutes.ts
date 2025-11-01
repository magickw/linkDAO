import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { ErrorMonitoringController } from '../controllers/errorMonitoringController';

const router = Router();

// Get error statistics
router.get('/stats', ErrorMonitoringController.getErrorStats);

// Search errors
router.get('/search', ErrorMonitoringController.searchErrors);

// Get error trends
router.get('/trends', ErrorMonitoringController.getErrorTrends);

// Get system health status
router.get('/health', ErrorMonitoringController.getHealthStatus);

// Get specific error details
router.get('/:errorId', ErrorMonitoringController.getErrorDetails);

// Resolve an error
router.patch('/:errorId/resolve', csrfProtection,  ErrorMonitoringController.resolveError);

// Export error logs
router.get('/export/logs', ErrorMonitoringController.exportLogs);

export default router;
