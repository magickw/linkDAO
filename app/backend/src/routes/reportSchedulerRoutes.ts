import { Router } from 'express';
import { reportSchedulerController } from '../controllers/reportSchedulerController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Scheduled Reports
router.post('/schedule', reportSchedulerController.scheduleReport.bind(reportSchedulerController));
router.get('/scheduled', reportSchedulerController.listScheduledReports.bind(reportSchedulerController));
router.get('/scheduled/:id', reportSchedulerController.getScheduledReport.bind(reportSchedulerController));
router.put('/scheduled/:id', reportSchedulerController.updateScheduledReport.bind(reportSchedulerController));
router.delete('/scheduled/:id', reportSchedulerController.deleteScheduledReport.bind(reportSchedulerController));

// Report Execution
router.post('/execute/:templateId', reportSchedulerController.executeReport.bind(reportSchedulerController));
router.get('/executions', reportSchedulerController.listExecutions.bind(reportSchedulerController));
router.get('/executions/:id', reportSchedulerController.getExecution.bind(reportSchedulerController));
router.post('/executions/:id/cancel', reportSchedulerController.cancelExecution.bind(reportSchedulerController));

// Parameter Management
router.post('/validate/:templateId', reportSchedulerController.validateParameters.bind(reportSchedulerController));

// History and Version Control
router.get('/history/:templateId', reportSchedulerController.getExecutionHistory.bind(reportSchedulerController));
router.get('/compare/:executionId1/:executionId2', reportSchedulerController.compareExecutions.bind(reportSchedulerController));

// Bulk Operations
router.post('/bulk/schedule', reportSchedulerController.bulkSchedule.bind(reportSchedulerController));
router.post('/bulk/execute', reportSchedulerController.bulkExecute.bind(reportSchedulerController));

// Statistics and Monitoring
router.get('/stats', reportSchedulerController.getSchedulerStats.bind(reportSchedulerController));

export default router;