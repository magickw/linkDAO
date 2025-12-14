import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportBuilderController } from '../controllers/reportBuilderController';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

const router = Router();

// Apply admin authentication to all routes
router.use(validateAdminRole);

// Template routes
router.post('/templates', csrfProtection, reportBuilderController.createTemplate.bind(reportBuilderController));
router.get('/templates', reportBuilderController.listTemplates.bind(reportBuilderController));
router.get('/templates/:id', reportBuilderController.getTemplate.bind(reportBuilderController));
router.put('/templates/:id', csrfProtection, reportBuilderController.updateTemplate.bind(reportBuilderController));
router.delete('/templates/:id', csrfProtection, reportBuilderController.deleteTemplate.bind(reportBuilderController));
router.post('/templates/:id/duplicate', csrfProtection, reportBuilderController.duplicateTemplate.bind(reportBuilderController));
router.post('/templates/:id/preview', csrfProtection, reportBuilderController.previewTemplate.bind(reportBuilderController));

// Section routes
router.post('/templates/:templateId/sections', csrfProtection, reportBuilderController.addSection.bind(reportBuilderController));
router.put('/templates/:templateId/sections/:sectionId', csrfProtection, reportBuilderController.updateSection.bind(reportBuilderController));
router.delete('/templates/:templateId/sections/:sectionId', csrfProtection, reportBuilderController.deleteSection.bind(reportBuilderController));

// Data source routes
router.post('/data-sources', csrfProtection, reportBuilderController.createDataSource.bind(reportBuilderController));
router.get('/data-sources', reportBuilderController.getDataSources.bind(reportBuilderController));
router.post('/data-sources/test', csrfProtection, reportBuilderController.testDataSource.bind(reportBuilderController));
router.post('/data-sources/:dataSourceId/query', csrfProtection, reportBuilderController.executeQuery.bind(reportBuilderController));

// Component library routes
router.get('/components', reportBuilderController.getComponentLibrary.bind(reportBuilderController));
router.get('/components/:type', reportBuilderController.getComponentDefinition.bind(reportBuilderController));

// Validation routes
router.post('/validate', csrfProtection, reportBuilderController.validateTemplate.bind(reportBuilderController));

export default router;