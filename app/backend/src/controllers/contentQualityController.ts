/**
 * Content Quality Controller
 * Handles API endpoints for content quality and maintenance workflows
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { documentFreshnessService } from '../services/documentFreshnessService';
import { contentReviewWorkflowService } from '../services/contentReviewWorkflowService';
import { documentPerformanceMonitoringService } from '../services/documentPerformanceMonitoringService';
import { contentSuggestionService } from '../services/contentSuggestionService';

export class ContentQualityController {
  /**
   * Get document freshness report
   */
  async getFreshnessReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await documentFreshnessService.generateFreshnessReport();
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating freshness report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate freshness report',
        message: error.message
      });
    }
  }

  /**
   * Check freshness for specific documents
   */
  async checkDocumentFreshness(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await documentFreshnessService.checkDocumentFreshness();
      res.json({
        success: true,
        data: {
          alerts,
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.alertLevel === 'critical').length
        }
      });
    } catch (error) {
      safeLogger.error('Error checking document freshness:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check document freshness',
        message: error.message
      });
    }
  }

  /**
   * Create review task
   */
  async createReviewTask(req: Request, res: Response): Promise<void> {
    try {
      const { documentPath, reviewType, priority, assignedTo } = req.body;

      if (!documentPath || !reviewType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: documentPath and reviewType'
        });
        return;
      }

      const task = await contentReviewWorkflowService.createReviewTask(
        documentPath,
        reviewType,
        priority,
        assignedTo
      );

      res.status(201).json({
        success: true,
        data: task
      });
    } catch (error) {
      safeLogger.error('Error creating review task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create review task',
        message: error.message
      });
    }
  }

  /**
   * Update review task status
   */
  async updateReviewTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { status, comment } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: status'
        });
        return;
      }

      const task = await contentReviewWorkflowService.updateTaskStatus(taskId, status, comment);

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      safeLogger.error('Error updating review task:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update review task',
        message: error.message
      });
    }
  }

  /**
   * Complete checklist item
   */
  async completeChecklistItem(req: Request, res: Response): Promise<void> {
    try {
      const { taskId, itemId } = req.params;
      const { reviewer, notes } = req.body;

      if (!reviewer) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: reviewer'
        });
        return;
      }

      const task = await contentReviewWorkflowService.completeChecklistItem(
        taskId,
        itemId,
        reviewer,
        notes
      );

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      safeLogger.error('Error completing checklist item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete checklist item',
        message: error.message
      });
    }
  }

  /**
   * Add comment to review task
   */
  async addReviewComment(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { author, content, type } = req.body;

      if (!author || !content) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: author and content'
        });
        return;
      }

      const task = await contentReviewWorkflowService.addComment(taskId, author, content, type);

      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      safeLogger.error('Error adding review comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add review comment',
        message: error.message
      });
    }
  }

  /**
   * Get review workflow report
   */
  async getWorkflowReport(req: Request, res: Response): Promise<void> {
    try {
      const report = contentReviewWorkflowService.generateWorkflowReport();
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      safeLogger.error('Error generating workflow report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate workflow report',
        message: error.message
      });
    }
  }

  /**
   * Get overdue review tasks
   */
  async getOverdueTasks(req: Request, res: Response): Promise<void> {
    try {
      const overdueTasks = contentReviewWorkflowService.getOverdueTasks();
      res.json({
        success: true,
        data: {
          tasks: overdueTasks,
          count: overdueTasks.length
        }
      });
    } catch (error) {
      safeLogger.error('Error getting overdue tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get overdue tasks',
        message: error.message
      });
    }
  }

  /**
   * Record performance metric
   */
  async recordPerformanceMetric(req: Request, res: Response): Promise<void> {
    try {
      const metric = req.body;

      if (!metric.documentPath || !metric.loadTime) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: documentPath and loadTime'
        });
        return;
      }

      documentPerformanceMonitoringService.recordMetric(metric);

      res.json({
        success: true,
        message: 'Performance metric recorded'
      });
    } catch (error) {
      safeLogger.error('Error recording performance metric:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record performance metric',
        message: error.message
      });
    }
  }

  /**
   * Record error
   */
  async recordError(req: Request, res: Response): Promise<void> {
    try {
      const errorData = req.body;

      if (!errorData.documentPath || !errorData.errorType) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: documentPath and errorType'
        });
        return;
      }

      documentPerformanceMonitoringService.recordError(errorData);

      res.json({
        success: true,
        message: 'Error recorded'
      });
    } catch (error) {
      safeLogger.error('Error recording error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record error',
        message: error.message
      });
    }
  }

  /**
   * Get performance report
   */
  async getPerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const report = documentPerformanceMonitoringService.generatePerformanceReport(hours);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      safeLogger.error('Error generating performance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate performance report',
        message: error.message
      });
    }
  }

  /**
   * Get document metrics
   */
  async getDocumentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { documentPath } = req.params;
      const hours = parseInt(req.query.hours as string) || 24;

      const metrics = documentPerformanceMonitoringService.getDocumentMetrics(documentPath, hours);
      const errors = documentPerformanceMonitoringService.getDocumentErrors(documentPath, hours);

      res.json({
        success: true,
        data: {
          metrics,
          errors,
          summary: {
            totalRequests: metrics.length,
            averageLoadTime: metrics.length > 0 
              ? metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length 
              : 0,
            errorCount: errors.length,
            errorRate: metrics.length > 0 ? errors.length / metrics.length : 0
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting document metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get document metrics',
        message: error.message
      });
    }
  }

  /**
   * Record user behavior
   */
  async recordUserBehavior(req: Request, res: Response): Promise<void> {
    try {
      const behaviorData = req.body;

      if (!behaviorData.sessionId || !behaviorData.action) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId and action'
        });
        return;
      }

      contentSuggestionService.recordUserBehavior(behaviorData);

      res.json({
        success: true,
        message: 'User behavior recorded'
      });
    } catch (error) {
      safeLogger.error('Error recording user behavior:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record user behavior',
        message: error.message
      });
    }
  }

  /**
   * Get content suggestion report
   */
  async getContentSuggestionReport(req: Request, res: Response): Promise<void> {
    try {
      const report = contentSuggestionService.generateSuggestionReport();

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      safeLogger.error('Error generating content suggestion report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content suggestion report',
        message: error.message
      });
    }
  }
}

export const contentQualityController = new ContentQualityController();
