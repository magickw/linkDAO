import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { reportTemplateLibraryController } from '../controllers/reportTemplateLibraryController';
import { csrfProtection } from '../middleware/csrfProtection';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply admin authentication to all routes
router.use(adminAuthMiddleware);

// Category Management
router.post('/categories', csrfProtection,  reportTemplateLibraryController.createCategory.bind(reportTemplateLibraryController));
router.get('/categories', reportTemplateLibraryController.getCategories.bind(reportTemplateLibraryController));
router.get('/categories/:id', reportTemplateLibraryController.getCategory.bind(reportTemplateLibraryController));
router.put('/categories/:id', csrfProtection,  reportTemplateLibraryController.updateCategory.bind(reportTemplateLibraryController));
router.delete('/categories/:id', csrfProtection,  reportTemplateLibraryController.deleteCategory.bind(reportTemplateLibraryController));

// Template Categorization
router.post('/templates/:templateId/categories/:categoryId', csrfProtection,  reportTemplateLibraryController.addTemplateToCategory.bind(reportTemplateLibraryController));
router.delete('/templates/:templateId/categories/:categoryId', csrfProtection,  reportTemplateLibraryController.removeTemplateFromCategory.bind(reportTemplateLibraryController));
router.get('/categories/:categoryId/templates', reportTemplateLibraryController.getTemplatesByCategory.bind(reportTemplateLibraryController));

// Search and Discovery
router.get('/search', reportTemplateLibraryController.searchTemplates.bind(reportTemplateLibraryController));
router.get('/popular', reportTemplateLibraryController.getPopularTemplates.bind(reportTemplateLibraryController));
router.get('/trending', reportTemplateLibraryController.getTrendingTemplates.bind(reportTemplateLibraryController));

// Usage Analytics
router.post('/templates/:templateId/usage', csrfProtection,  reportTemplateLibraryController.recordTemplateUsage.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/stats', reportTemplateLibraryController.getTemplateUsageStats.bind(reportTemplateLibraryController));

// Rating System
router.post('/templates/:templateId/ratings', csrfProtection,  reportTemplateLibraryController.rateTemplate.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/ratings', reportTemplateLibraryController.getTemplateRatings.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/ratings/user', reportTemplateLibraryController.getUserRating.bind(reportTemplateLibraryController));

// Sharing and Collaboration
router.post('/templates/:templateId/shares', csrfProtection,  reportTemplateLibraryController.shareTemplate.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/shares', reportTemplateLibraryController.getTemplateShares.bind(reportTemplateLibraryController));
router.get('/shared-templates', reportTemplateLibraryController.getUserSharedTemplates.bind(reportTemplateLibraryController));
router.delete('/shares/:shareId', csrfProtection,  reportTemplateLibraryController.revokeShare.bind(reportTemplateLibraryController));

// Version Control
router.post('/templates/:templateId/versions', csrfProtection,  reportTemplateLibraryController.createTemplateVersion.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/versions', reportTemplateLibraryController.getTemplateVersions.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/versions/:version', reportTemplateLibraryController.getTemplateVersion.bind(reportTemplateLibraryController));

// Approval Workflow
router.post('/templates/:templateId/approval', csrfProtection,  reportTemplateLibraryController.submitTemplateForApproval.bind(reportTemplateLibraryController));
router.post('/approvals/:approvalId/approve', csrfProtection,  reportTemplateLibraryController.approveTemplate.bind(reportTemplateLibraryController));
router.post('/approvals/:approvalId/reject', csrfProtection,  reportTemplateLibraryController.rejectTemplate.bind(reportTemplateLibraryController));

// Recommendations
router.get('/recommendations', reportTemplateLibraryController.getRecommendedTemplates.bind(reportTemplateLibraryController));
router.get('/templates/:templateId/similar', reportTemplateLibraryController.getSimilarTemplates.bind(reportTemplateLibraryController));

export default router;