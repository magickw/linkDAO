/**
 * Document Queue Management Routes
 * REST API endpoints for document generation queue management
 */

import { Router, Request, Response } from 'express';
import { Queue } from 'bullmq';
import { safeLogger } from '../utils/safeLogger';
import { DocumentJobData, queueDocumentGeneration, getJobStatus, getQueueStats } from '../queues/documentQueue';
import { DocumentBatchService } from '../services/documentBatchService';

export function createQueueRoutes(
  documentQueue: Queue<DocumentJobData>,
  documentBatchService: DocumentBatchService
): Router {
  const router = Router();

  /**
   * POST /api/queue/documents
   * Queue a single document for generation
   */
  router.post('/documents', async (req: Request, res: Response) => {
    try {
      const { type, data, email, sendEmail, priority } = req.body;

      if (!type || !data) {
        return res.status(400).json({
          error: 'Missing required fields: type, data',
        });
      }

      const jobData: DocumentJobData = {
        id: `job-${Date.now()}`,
        type: type as any,
        data,
        email,
        sendEmail: sendEmail || false,
        priority: priority || 5,
      };

      const jobId = await queueDocumentGeneration(documentQueue, jobData);

      res.status(202).json({
        success: true,
        jobId,
        message: 'Document queued for generation',
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error queuing document:', error);
      res.status(500).json({
        error: 'Failed to queue document',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/queue/batch
   * Queue batch document generation
   */
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { documents, metadata } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({
          error: 'Missing required field: documents (array)',
        });
      }

      const result = await documentBatchService.queueBatchGeneration({
        documents,
        metadata,
      });

      res.status(202).json({
        success: true,
        ...result,
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error queuing batch:', error);
      res.status(500).json({
        error: 'Failed to queue batch',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/queue/job/:jobId
   * Get job status
   */
  router.get('/job/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const status = await getJobStatus(documentQueue, jobId);

      res.json({
        success: true,
        ...status,
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error fetching job status:', error);
      res.status(500).json({
        error: 'Failed to fetch job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/queue/stats
   * Get queue statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await getQueueStats(documentQueue);

      res.json({
        success: true,
        ...stats,
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error fetching queue stats:', error);
      res.status(500).json({
        error: 'Failed to fetch queue stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/queue/batch/:batchId/status
   * Get batch completion status
   */
  router.get('/batch/:batchId/status', async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;

      const status = await documentBatchService.getBatchCompletionStatus(batchId);
      const batchStatus = documentBatchService.getBatchStatus(batchId);

      res.json({
        success: true,
        batchId,
        ...status,
        batchInfo: batchStatus,
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error fetching batch status:', error);
      res.status(500).json({
        error: 'Failed to fetch batch status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/queue/batch/:batchId
   * Cancel batch generation
   */
  router.delete('/batch/:batchId', async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;

      const cancelledCount = await documentBatchService.cancelBatch(batchId);

      res.json({
        success: true,
        batchId,
        cancelledCount,
        message: `Cancelled ${cancelledCount} documents`,
      });
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error cancelling batch:', error);
      res.status(500).json({
        error: 'Failed to cancel batch',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/queue/health
   * Queue health check
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const stats = await getQueueStats(documentQueue);

      const health = {
        status: 'healthy',
        queue: {
          paused: stats.isPaused,
          waiting: stats.waiting || 0,
          active: stats.active || 0,
          completed: stats.completed || 0,
          failed: stats.failed || 0,
        },
        timestamp: new Date().toISOString(),
      };

      res.json(health);
    } catch (error) {
      safeLogger.error('[QueueRoutes] Error checking queue health:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}

export default createQueueRoutes;
