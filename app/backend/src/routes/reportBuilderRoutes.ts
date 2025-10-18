import { Router } from 'express';
import { reportBuilderController } from '../controllers/reportBuilderController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Template routes
router.post('/templates', reportBuilderController.createTemplate.bind(reportBuilderController));
router.get('/templates', reportBuilderController.listTemplates.bind(reportBuilderController));
router.get('/templates/:id', reportBuilderController.getTemplate.bind(reportBuilderController));
router.put('/templates/:id', reportBuilderController.updateTemplate.bind(reportBuilderController));
router.delete('/templates/:id', reportBuilderController.deleteTemplate.bind(reportBuilderController));
router.post('/templates/:id/duplicate', reportBuilderController.duplicateTemplate.bind(reportBuilderController));
router.post('/templates/:id/preview', reportBuilderController.previewTemplate.bind(reportBuilderController));

// Section routes
router.post('/templates/:templateId/sections', reportBuilderController.addSection.bind(reportBuilderController));
router.put('/templates/:templateId/sections/:sectionId', reportBuilderController.updateSection.bind(reportBuilderController));
router.delete('/templates/:templateId/sections/:sectionId', reportBuilderController.deleteSection.bind(reportBuilderController));

// Data source routes
router.post('/data-sources', reportBuilderController.createDataSource.bind(reportBuilderController));
router.get('/data-sources', reportBuilderController.getDataSources.bind(reportBuilderController));
router.post('/data-sources/test', reportBuilderController.testDataSource.bind(reportBuilderController));
router.post('/data-sources/:dataSourceId/query', reportBuilderController.executeQuery.bind(reportBuilderController));

// Component library routes
router.get('/components', reportBuilderController.getComponentLibrary.bind(reportBuilderController));
router.get('/components/:type', reportBuilderController.getComponentDefinition.bind(reportBuilderController));

// Validation routes
router.post('/validate', reportBuilderController.validateTemplate.bind(reportBuilderController));

export default router;