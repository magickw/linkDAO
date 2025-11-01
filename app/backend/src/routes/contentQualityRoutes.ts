/**
 * Content Quality Routes
 * API routes for content quality and maintenance workflows
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { contentQualityController } from '../controllers/contentQualityController';

const router = Router();

// Document Freshness Routes
router.get('/freshness/report', contentQualityController.getFreshnessReport.bind(contentQualityController));
router.get('/freshness/check', contentQualityController.checkDocumentFreshness.bind(contentQualityController));

// Review Workflow Routes
router.post('/review/tasks', csrfProtection,  contentQualityController.createReviewTask.bind(contentQualityController));
router.put('/review/tasks/:taskId/status', csrfProtection,  contentQualityController.updateReviewTaskStatus.bind(contentQualityController));
router.put('/review/tasks/:taskId/checklist/:itemId', csrfProtection,  contentQualityController.completeChecklistItem.bind(contentQualityController));
router.post('/review/tasks/:taskId/comments', csrfProtection,  contentQualityController.addReviewComment.bind(contentQualityController));
router.get('/review/report', contentQualityController.getWorkflowReport.bind(contentQualityController));
router.get('/review/overdue', contentQualityController.getOverdueTasks.bind(contentQualityController));

// Performance Monitoring Routes
router.post('/performance/metrics', csrfProtection,  contentQualityController.recordPerformanceMetric.bind(contentQualityController));
router.post('/performance/errors', csrfProtection,  contentQualityController.recordError.bind(contentQualityController));
router.get('/performance/report', contentQualityController.getPerformanceReport.bind(contentQualityController));
router.get('/performance/documents/:documentPath/metrics', contentQualityController.getDocumentMetrics.bind(contentQualityController));

// Content Suggestion Routes
router.post('/suggestions/behavior', csrfProtection,  contentQualityController.recordUserBehavior.bind(contentQualityController));
router.get('/suggestions/report', contentQualityController.getContentSuggestionReport.bind(contentQualityController));

export { router as contentQualityRoutes };
