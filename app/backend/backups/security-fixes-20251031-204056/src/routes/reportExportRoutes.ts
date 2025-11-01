import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportExportController } from '../controllers/reportExportController';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Single Export
router.post('/export/:templateId', csrfProtection,  reportExportController.exportReport.bind(reportExportController));
router.post('/batch-export/:templateId', csrfProtection,  reportExportController.batchExport.bind(reportExportController));

// Format-specific exports
router.post('/export/:templateId/pdf', csrfProtection,  reportExportController.exportToPDF.bind(reportExportController));
router.post('/export/:templateId/excel', csrfProtection,  reportExportController.exportToExcel.bind(reportExportController));
router.post('/export/:templateId/csv', csrfProtection,  reportExportController.exportToCSV.bind(reportExportController));
router.post('/export/:templateId/html', csrfProtection,  reportExportController.exportToHTML.bind(reportExportController));
router.post('/export/:templateId/json', csrfProtection,  reportExportController.exportToJSON.bind(reportExportController));

// Export Templates
router.post('/templates', csrfProtection,  reportExportController.createExportTemplate.bind(reportExportController));
router.get('/templates', reportExportController.getExportTemplates.bind(reportExportController));

// Job Management
router.get('/jobs', reportExportController.listExportJobs.bind(reportExportController));
router.get('/jobs/:jobId', reportExportController.getExportJob.bind(reportExportController));
router.post('/jobs/:jobId/cancel', csrfProtection,  reportExportController.cancelExportJob.bind(reportExportController));

// Download
router.get('/download/*', reportExportController.downloadReport.bind(reportExportController));

// Bulk Operations
router.post('/bulk-export', csrfProtection,  reportExportController.bulkExportMultipleReports.bind(reportExportController));

// Statistics
router.get('/stats', reportExportController.getExportStats.bind(reportExportController));

export default router;