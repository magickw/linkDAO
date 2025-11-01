import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { reportSchedulerService } from '../services/reportSchedulerService';
import { SchedulingConfig } from '../types/reporting';

export class ReportSchedulerController {
  // Scheduled Reports
  async scheduleReport(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, schedule, parameters } = req.body;
      const createdBy = req.user?.id || 'anonymous';

      if (!templateId || !schedule) {
        res.status(400).json({
          success: false,
          error: 'Template ID and schedule are required'
        });
        return;
      }

      const scheduledReport = await reportSchedulerService.scheduleReport(
        templateId,
        schedule,
        parameters || {},
        createdBy
      );

      res.status(201).json({
        success: true,
        data: scheduledReport,
        message: 'Report scheduled successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule report'
      });
    }
  }

  async getScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scheduledReport = await reportSchedulerService.getScheduledReport(id);

      if (!scheduledReport) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found'
        });
        return;
      }

      res.json({
        success: true,
        data: scheduledReport
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled report'
      });
    }
  }

  async updateScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const scheduledReport = await reportSchedulerService.updateScheduledReport(id, updates);

      res.json({
        success: true,
        data: scheduledReport,
        message: 'Scheduled report updated successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update scheduled report'
      });
    }
  }

  async listScheduledReports(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        templateId: req.query.templateId as string,
        createdBy: req.query.createdBy as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined
      };

      const scheduledReports = await reportSchedulerService.listScheduledReports(filters);

      res.json({
        success: true,
        data: scheduledReports,
        total: scheduledReports.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list scheduled reports'
      });
    }
  }

  async deleteScheduledReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await reportSchedulerService.deleteScheduledReport(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Scheduled report not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Scheduled report deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete scheduled report'
      });
    }
  }

  // Report Execution
  async executeReport(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { parameters, format } = req.body;
      const executedBy = req.user?.id || 'anonymous';

      const execution = await reportSchedulerService.executeReport(
        templateId,
        parameters || {},
        format || 'pdf',
        executedBy
      );

      res.status(201).json({
        success: true,
        data: execution,
        message: 'Report execution started'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute report'
      });
    }
  }

  async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const execution = await reportSchedulerService.getExecution(id);

      if (!execution) {
        res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
        return;
      }

      res.json({
        success: true,
        data: execution
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get execution'
      });
    }
  }

  async listExecutions(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        templateId: req.query.templateId as string,
        status: req.query.status as string,
        executedBy: req.query.executedBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
      };

      const executions = await reportSchedulerService.listExecutions(filters);

      res.json({
        success: true,
        data: executions,
        total: executions.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list executions'
      });
    }
  }

  async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cancelled = await reportSchedulerService.cancelExecution(id);

      if (!cancelled) {
        res.status(400).json({
          success: false,
          error: 'Execution cannot be cancelled (not found or already running)'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Execution cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel execution'
      });
    }
  }

  // Parameter Management
  async validateParameters(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { parameters } = req.body;

      const validation = await reportSchedulerService.validateParameters(
        templateId,
        parameters || {}
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate parameters'
      });
    }
  }

  // History and Version Control
  async getExecutionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const history = await reportSchedulerService.getExecutionHistory(templateId, limit);

      res.json({
        success: true,
        data: history,
        total: history.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get execution history'
      });
    }
  }

  async compareExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { executionId1, executionId2 } = req.params;

      const comparison = await reportSchedulerService.compareExecutions(
        executionId1,
        executionId2
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to compare executions'
      });
    }
  }

  // Bulk Operations
  async bulkSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { reports } = req.body;
      const createdBy = req.user?.id || 'anonymous';

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
          const scheduledReport = await reportSchedulerService.scheduleReport(
            report.templateId,
            report.schedule,
            report.parameters || {},
            createdBy
          );
          results.push(scheduledReport);
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
          scheduled: results,
          errors: errors
        },
        message: `Scheduled ${results.length} reports, ${errors.length} errors`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk schedule reports'
      });
    }
  }

  async bulkExecute(req: Request, res: Response): Promise<void> {
    try {
      const { executions } = req.body;
      const executedBy = req.user?.id || 'anonymous';

      if (!Array.isArray(executions)) {
        res.status(400).json({
          success: false,
          error: 'Executions must be an array'
        });
        return;
      }

      const results = [];
      const errors = [];

      for (const exec of executions) {
        try {
          const execution = await reportSchedulerService.executeReport(
            exec.templateId,
            exec.parameters || {},
            exec.format || 'pdf',
            executedBy
          );
          results.push(execution);
        } catch (error) {
          errors.push({
            templateId: exec.templateId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          executions: results,
          errors: errors
        },
        message: `Started ${results.length} executions, ${errors.length} errors`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to bulk execute reports'
      });
    }
  }

  // Statistics and Monitoring
  async getSchedulerStats(req: Request, res: Response): Promise<void> {
    try {
      const scheduledReports = await reportSchedulerService.listScheduledReports();
      const recentExecutions = await reportSchedulerService.listExecutions({ limit: 100 });

      const stats = {
        totalScheduled: scheduledReports.length,
        activeScheduled: scheduledReports.filter(r => r.isActive).length,
        totalExecutions: recentExecutions.length,
        completedExecutions: recentExecutions.filter(e => e.status === 'completed').length,
        failedExecutions: recentExecutions.filter(e => e.status === 'failed').length,
        runningExecutions: recentExecutions.filter(e => e.status === 'running').length,
        pendingExecutions: recentExecutions.filter(e => e.status === 'pending').length,
        averageExecutionTime: this.calculateAverageExecutionTime(recentExecutions),
        successRate: this.calculateSuccessRate(recentExecutions)
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduler stats'
      });
    }
  }

  // Private helper methods
  private calculateAverageExecutionTime(executions: any[]): number {
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.duration);
    if (completedExecutions.length === 0) return 0;

    const totalTime = completedExecutions.reduce((sum, e) => sum + e.duration, 0);
    return Math.round(totalTime / completedExecutions.length);
  }

  private calculateSuccessRate(executions: any[]): number {
    const finishedExecutions = executions.filter(e => 
      e.status === 'completed' || e.status === 'failed'
    );
    if (finishedExecutions.length === 0) return 0;

    const successfulExecutions = finishedExecutions.filter(e => e.status === 'completed');
    return Math.round((successfulExecutions.length / finishedExecutions.length) * 100);
  }
}

export const reportSchedulerController = new ReportSchedulerController();
