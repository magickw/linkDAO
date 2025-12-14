import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportSchedulerController } from '../controllers/reportSchedulerController';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication to all routes
router.use(validateAdminRole);

// Scheduled Reports
router.post('/schedule', csrfProtection, reportSchedulerController.scheduleReport.bind(reportSchedulerController));
router.get('/scheduled', reportSchedulerController.listScheduledReports.bind(reportSchedulerController));
router.get('/scheduled/:id', reportSchedulerController.getScheduledReport.bind(reportSchedulerController));
router.put('/scheduled/:id', csrfProtection, reportSchedulerController.updateScheduledReport.bind(reportSchedulerController));
router.delete('/scheduled/:id', csrfProtection, reportSchedulerController.deleteScheduledReport.bind(reportSchedulerController));

// Report Execution
router.post('/execute/:templateId', csrfProtection, reportSchedulerController.executeReport.bind(reportSchedulerController));
router.get('/executions', reportSchedulerController.listExecutions.bind(reportSchedulerController));
router.get('/executions/:id', reportSchedulerController.getExecution.bind(reportSchedulerController));
router.post('/executions/:id/cancel', csrfProtection, reportSchedulerController.cancelExecution.bind(reportSchedulerController));

// Parameter Management
router.post('/validate/:templateId', csrfProtection, reportSchedulerController.validateParameters.bind(reportSchedulerController));

// History and Version Control
router.get('/history/:templateId', reportSchedulerController.getExecutionHistory.bind(reportSchedulerController));
router.get('/compare/:executionId1/:executionId2', reportSchedulerController.compareExecutions.bind(reportSchedulerController));

// Bulk Operations
router.post('/bulk/schedule', csrfProtection, reportSchedulerController.bulkSchedule.bind(reportSchedulerController));
router.post('/bulk/execute', csrfProtection, reportSchedulerController.bulkExecute.bind(reportSchedulerController));

// Statistics and Monitoring
router.get('/stats', reportSchedulerController.getSchedulerStats.bind(reportSchedulerController));

export default router;