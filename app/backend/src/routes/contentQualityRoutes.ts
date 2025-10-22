/**
 * Content Quality Routes
 * API routes for content quality and maintenance workflows
 */

import { Router } from 'express';
import { contentQualityController } from '../controllers/contentQualityController';

const router = Router();

// Document Freshness Routes
router.get('/freshness/report', contentQualityController.getFreshnessReport.bind(contentQualityController));
router.get('/freshness/check', contentQualityController.checkDocumentFreshness.bind(contentQualityController));

// Review Workflow Routes
router.post('/review/tasks', contentQualityController.createReviewTask.bind(contentQualityController));
router.put('/review/tasks/:taskId/status', contentQualityController.updateReviewTaskStatus.bind(contentQualityController));
router.put('/review/tasks/:taskId/checklist/:itemId', contentQualityController.completeChecklistItem.bind(contentQualityController));
router.post('/review/tasks/:taskId/comments', contentQualityController.addReviewComment.bind(contentQualityController));
router.get('/review/report', contentQualityController.getWorkflowReport.bind(contentQualityController));
router.get('/review/overdue', contentQualityController.getOverdueTasks.bind(contentQualityController));

// Performance Monitoring Routes
router.post('/performance/metrics', contentQualityController.recordPerformanceMetric.bind(contentQualityController));
router.post('/performance/errors', contentQualityController.recordError.bind(contentQualityController));
router.get('/performance/report', contentQualityController.getPerformanceReport.bind(contentQualityController));
router.get('/performance/documents/:documentPath/metrics', contentQualityController.getDocumentMetrics.bind(contentQualityController));

// Content Suggestion Routes
router.post('/suggestions/behavior', contentQualityController.recordUserBehavior.bind(contentQualityController));
router.get('/suggestions/report', contentQualityController.getContentSuggestionReport.bind(contentQualityController));

export { router as contentQualityRoutes };