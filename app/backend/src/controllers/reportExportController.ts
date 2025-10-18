import { Request, Response } from 'express';
import { reportExportService } from '../services/reportExportService.js';
import { reportBuilderService } from '../services/reportBuilderService.js';

export class ReportExportController {
  // Single Export
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { format, parameters, branding, layout, compression, password, watermark } = req.body;

      if (!format) {
        res.status(400).json({
          success: false,
          error: 'Export format is required'
        });
        return;
      }

      // Get template
      const template = await reportBuilderService.getTemplate(templateId);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      // Generate report data (preview)
      const reportData = await reportBuilderService.previewTemplate(templateId, parameters || {});

      // Export options
      const exportOptions = {
        format,
        branding,
        layout,
        compression,
        password,
        watermark
      };

      const result = await reportExportService.exportReport(template, reportData, exportOptions);

      if (result.success) {
        res.json({
          success: true,
          data: result,
          message: 'Report exported successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Export failed'
        });
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export report'
      });
    }
  }

  // Batch Export
  async batchExport(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { formats, parameters } = req.body;

      if (!formats || !Array.isArray(formats) || formats.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Formats array is required'
        });
        return;
      }

      // Get template
      const template = await reportBuilderService.getTemplate(templateId);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      // Generate report data
      const reportData = await reportBuilderService.previewTemplate(templateId, parameters || {});

      // Batch export
      const results = await reportExportService.batchExport(template, reportData, formats);

      const successCount = Object.values(results).filter(r => r.success).length;
      const totalCount = Object.keys(results).length;

      res.json({
        success: true,
        data: results,
        message: `Exported ${successCount}/${totalCount} formats successfully`
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to batch export'
      });
    }
  }

  // Export Templates
  async createExportTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name, config } = req.body;

      if (!name || !config) {
        res.status(400).json({
          success: false,
          error: 'Name and config are required'
        });
        return;
      }

      const templateId = await reportExportService.createExportTemplate(name, config);

      res.status(201).json({
        success: true,
        data: { id: templateId, name, config },
        message: 'Export template created successfully'
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create export template'
      });
    }
  }

  async getExportTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = await reportExportService.getExportTemplates();

      res.json({
        success: true,
        data: templates
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export templates'
      });
    }
  }

  // Job Management
  async getExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = reportExportService.getExportJob(jobId);

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

  async listExportJobs(req: Request, res: Response): Promise<void> {
    try {
      const jobs = reportExportService.listExportJobs();

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

  async cancelExportJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const cancelled = reportExportService.cancelExportJob(jobId);

      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled (not found or not in progress)'
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

  // Download Handler
  async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const { filePath } = req.params;
      
      // In a real implementation, this would:
      // 1. Validate the file path and user permissions
      // 2. Check if the file exists
      // 3. Set appropriate headers
      // 4. Stream the file to the response

      // For now, simulate a download response
      const fileName = filePath.split('/').pop() || 'report';
      const fileExtension = fileName.split('.').pop() || 'pdf';
      
      let contentType = 'application/octet-stream';
      switch (fileExtension.toLowerCase()) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'csv':
          contentType = 'text/csv';
          break;
        case 'html':
          contentType = 'text/html';
          break;
        case 'json':
          contentType = 'application/json';
          break;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Simulate file content
      const mockContent = `Mock ${fileExtension.toUpperCase()} content for ${fileName}`;
      res.send(mockContent);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download report'
      });
    }
  }

  // Format-specific exports
  async exportToPDF(req: Request, res: Response): Promise<void> {
    req.body.format = 'pdf';
    await this.exportReport(req, res);
  }

  async exportToExcel(req: Request, res: Response): Promise<void> {
    req.body.format = 'excel';
    await this.exportReport(req, res);
  }

  async exportToCSV(req: Request, res: Response): Promise<void> {
    req.body.format = 'csv';
    await this.exportReport(req, res);
  }

  async exportToHTML(req: Request, res: Response): Promise<void> {
    req.body.format = 'html';
    await this.exportReport(req, res);
  }

  async exportToJSON(req: Request, res: Response): Promise<void> {
    req.body.format = 'json';
    await this.exportReport(req, res);
  }

  // Bulk operations
  async bulkExportMultipleReports(req: Request, res: Response): Promise<void> {
    try {
      const { reports } = req.body;

      if (!Array.isArray(reports)) {
        res.status(400).json({
          success: false,
          error: 'Reports must be an array'
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const report of reports) {
        try {
          const template = await reportBuilderService.getTemplate(report.templateId);
          if (!template) {
            errors.push({
              templateId: report.templateId,
              error: 'Template not found'
            });
            continue;
          }

          const reportData = await reportBuilderService.previewTemplate(
            report.templateId, 
            report.parameters || {}
          );

          const result = await reportExportService.exportReport(
            template, 
            reportData, 
            report.options || { format: 'pdf' }
          );

          results.push({
            templateId: report.templateId,
            result
          });

        } catch (error) {
          errors.push({
            templateId: report.templateId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          exports: results,
          errors: errors
        },
        message: `Exported ${results.length} reports, ${errors.length} errors`
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk export reports'
      });
    }
  }

  // Statistics
  async getExportStats(req: Request, res: Response): Promise<void> {
    try {
      const jobs = reportExportService.listExportJobs();
      
      const stats = {
        totalExports: jobs.length,
        completedExports: jobs.filter(j => j.status === 'completed').length,
        failedExports: jobs.filter(j => j.status === 'failed').length,
        processingExports: jobs.filter(j => j.status === 'processing').length,
        formatBreakdown: this.calculateFormatBreakdown(jobs),
        averageExportTime: this.calculateAverageExportTime(jobs),
        successRate: this.calculateSuccessRate(jobs)
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get export stats'
      });
    }
  }

  // Private helper methods
  private calculateFormatBreakdown(jobs: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    jobs.forEach(job => {
      const format = job.options?.format || 'unknown';
      breakdown[format] = (breakdown[format] || 0) + 1;
    });

    return breakdown;
  }

  private calculateAverageExportTime(jobs: any[]): number {
    const completedJobs = jobs.filter(j => j.status === 'completed' && j.endTime);
    if (completedJobs.length === 0) return 0;

    const totalTime = completedJobs.reduce((sum, job) => {
      const duration = job.endTime.getTime() - job.startTime.getTime();
      return sum + duration;
    }, 0);

    return Math.round(totalTime / completedJobs.length);
  }

  private calculateSuccessRate(jobs: any[]): number {
    const finishedJobs = jobs.filter(j => 
      j.status === 'completed' || j.status === 'failed'
    );
    if (finishedJobs.length === 0) return 0;

    const successfulJobs = finishedJobs.filter(j => j.status === 'completed');
    return Math.round((successfulJobs.length / finishedJobs.length) * 100);
  }
}

export const reportExportController = new ReportExportController();