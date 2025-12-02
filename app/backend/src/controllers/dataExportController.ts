import { Request, Response } from 'express';
import { dataExportService, ExportRequest, ExportFormat, ScheduledExport } from '../services/dataExportService';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { rateLimiter } from '../middleware/rateLimitingMiddleware';

export class DataExportController {
  /**
   * Export user data in specified format
   */
  async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const { userId, categories, format, includeMetadata } = req.body;

      if (!userId || !categories || !format) {
        res.status(400).json({
          success: false,
          error: 'userId, categories, and format are required'
        });
        return;
      }

      const exportRequest: ExportRequest = {
        userId,
        categories,
        format,
        includeMetadata
      };

      const job = await dataExportService.exportUserData(exportRequest);

      res.status(202).json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          message: 'Export job started successfully'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export user data'
      });
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'jobId is required'
        });
        return;
      }

      const job = dataExportService.getExportJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Export job not found'
        });
        return;
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export job'
      });
    }
  }

  /**
   * List export jobs
   */
  async listExportJobs(req: Request, res: Response): Promise<void> {
    try {
      const { userId, status } = req.query;

      const filters: { userId?: string; status?: string } = {};
      if (userId && typeof userId === 'string') {
        filters.userId = userId;
      }
      if (status && typeof status === 'string') {
        filters.status = status as string;
      }

      const jobs = dataExportService.listExportJobs(filters);

      res.json({
        success: true,
        data: jobs,
        total: jobs.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list export jobs'
      });
    }
  }

  /**
   * Cancel an export job
   */
  async cancelExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'jobId is required'
        });
        return;
      }

      const cancelled = dataExportService.cancelExportJob(jobId);

      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled (not found or not in a cancellable state)'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Export job cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel export job'
      });
    }
  }

  /**
   * Schedule a recurring export
   */
  async scheduleExport(req: Request, res: Response): Promise<void> {
    try {
      const { userId, name, schedule, format, categories, emailDelivery, emailRecipients, archiveExports } = req.body;

      if (!userId || !name || !schedule || !format || !categories) {
        res.status(400).json({
          success: false,
          error: 'userId, name, schedule, format, and categories are required'
        });
        return;
      }

      const scheduledExport = await dataExportService.scheduleExport({
        userId,
        name,
        schedule,
        format,
        categories,
        emailDelivery: emailDelivery || false,
        emailRecipients: emailRecipients || [],
        archiveExports: archiveExports || false,
        isActive: true,
        nextRun: new Date() // Will be recalculated by the service
      });

      res.status(201).json({
        success: true,
        data: scheduledExport,
        message: 'Export scheduled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule export'
      });
    }
  }

  /**
   * Update a scheduled export
   */
  async updateScheduledExport(req: Request, res: Response): Promise<void> {
    try {
      const { scheduledExportId } = req.params;
      const updates = req.body;

      if (!scheduledExportId) {
        res.status(400).json({
          success: false,
          error: 'scheduledExportId is required'
        });
        return;
      }

      const updatedExport = await dataExportService.updateScheduledExport(scheduledExportId, updates);

      res.json({
        success: true,
        data: updatedExport,
        message: 'Scheduled export updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scheduled export'
      });
    }
  }

  /**
   * Get a scheduled export
   */
  async getScheduledExport(req: Request, res: Response): Promise<void> {
    try {
      const { scheduledExportId } = req.params;

      if (!scheduledExportId) {
        res.status(400).json({
          success: false,
          error: 'scheduledExportId is required'
        });
        return;
      }

      const scheduledExport = dataExportService.getScheduledExport(scheduledExportId);

      if (!scheduledExport) {
        res.status(404).json({
          success: false,
          error: 'Scheduled export not found'
        });
        return;
      }

      res.json({
        success: true,
        data: scheduledExport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled export'
      });
    }
  }

  /**
   * List scheduled exports
   */
  async listScheduledExports(req: Request, res: Response): Promise<void> {
    try {
      const { userId, isActive } = req.query;

      const filters: { userId?: string; isActive?: boolean } = {};
      if (userId && typeof userId === 'string') {
        filters.userId = userId;
      }
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      const scheduledExports = dataExportService.listScheduledExports(filters);

      res.json({
        success: true,
        data: scheduledExports,
        total: scheduledExports.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list scheduled exports'
      });
    }
  }

  /**
   * Delete a scheduled export
   */
  async deleteScheduledExport(req: Request, res: Response): Promise<void> {
    try {
      const { scheduledExportId } = req.params;

      if (!scheduledExportId) {
        res.status(400).json({
          success: false,
          error: 'scheduledExportId is required'
        });
        return;
      }

      const deleted = await dataExportService.deleteScheduledExport(scheduledExportId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Scheduled export not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Scheduled export deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete scheduled export'
      });
    }
  }

  /**
   * Execute a scheduled export immediately
   */
  async executeScheduledExport(req: Request, res: Response): Promise<void> {
    try {
      const { scheduledExportId } = req.params;

      if (!scheduledExportId) {
        res.status(400).json({
          success: false,
          error: 'scheduledExportId is required'
        });
        return;
      }

      const job = await dataExportService.executeScheduledExport(scheduledExportId);

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          message: 'Scheduled export executed successfully'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute scheduled export'
      });
    }
  }

  /**
   * Download export file
   */
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'jobId is required'
        });
        return;
      }

      const job = dataExportService.getExportJob(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Export job not found'
        });
        return;
      }

      if (job.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: 'Export job is not completed yet'
        });
        return;
      }

      if (!job.filePath) {
        res.status(500).json({
          success: false,
          error: 'Export file path is missing'
        });
        return;
      }

      // In a real implementation, we would stream the file to the response
      // For now, we'll just return the file information
      res.json({
        success: true,
        data: {
          filePath: job.filePath,
          fileSize: job.fileSize,
          format: job.format.type
        },
        message: 'Export file ready for download'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download export'
      });
    }
  }
}

export const dataExportController = new DataExportController();