import { Router } from 'express';
import { reportExportController } from '../controllers/reportExportController';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Single Export
router.post('/export/:templateId', reportExportController.exportReport.bind(reportExportController));
router.post('/batch-export/:templateId', reportExportController.batchExport.bind(reportExportController));

// Format-specific exports
router.post('/export/:templateId/pdf', reportExportController.exportToPDF.bind(reportExportController));
router.post('/export/:templateId/excel', reportExportController.exportToExcel.bind(reportExportController));
router.post('/export/:templateId/csv', reportExportController.exportToCSV.bind(reportExportController));
router.post('/export/:templateId/html', reportExportController.exportToHTML.bind(reportExportController));
router.post('/export/:templateId/json', reportExportController.exportToJSON.bind(reportExportController));

// Export Templates
router.post('/templates', reportExportController.createExportTemplate.bind(reportExportController));
router.get('/templates', reportExportController.getExportTemplates.bind(reportExportController));

// Job Management
router.get('/jobs', reportExportController.listExportJobs.bind(reportExportController));
router.get('/jobs/:jobId', reportExportController.getExportJob.bind(reportExportController));
router.post('/jobs/:jobId/cancel', reportExportController.cancelExportJob.bind(reportExportController));

// Download
router.get('/download/*', reportExportController.downloadReport.bind(reportExportController));

// Bulk Operations
router.post('/bulk-export', reportExportController.bulkExportMultipleReports.bind(reportExportController));

// Statistics
router.get('/stats', reportExportController.getExportStats.bind(reportExportController));

export default router;