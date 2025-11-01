import { ReportTemplate, ReportExecution, SchedulingConfig } from '../types/reporting';
import { safeLogger } from '../utils/safeLogger';
import { reportBuilderService } from './reportBuilderService';
import { safeLogger } from '../utils/safeLogger';

interface ScheduledReport {
  id: string;
  templateId: string;
  schedule: SchedulingConfig;
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  parameters: Record<string, any>;
  executionHistory: ReportExecution[];
}

export class ReportSchedulerService {
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private executionQueue: ReportExecution[] = [];
  private isProcessing = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  // Scheduling Management
  async scheduleReport(
    templateId: string, 
    schedule: SchedulingConfig, 
    parameters: Record<string, any> = {},
    createdBy: string
  ): Promise<ScheduledReport> {
    const template = await reportBuilderService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    const scheduledReport: ScheduledReport = {
      id: this.generateId(),
      templateId,
      schedule,
      nextRun: this.calculateNextRun(schedule),
      isActive: schedule.enabled,
      createdBy,
      createdAt: new Date(),
      parameters,
      executionHistory: []
    };

    this.scheduledReports.set(scheduledReport.id, scheduledReport);
    return scheduledReport;
  }

  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const existing = this.scheduledReports.get(id);
    if (!existing) {
      throw new Error(`Scheduled report with id ${id} not found`);
    }

    const updated: ScheduledReport = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt
    };

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      updated.nextRun = this.calculateNextRun(updates.schedule);
    }

    this.scheduledReports.set(id, updated);
    return updated;
  }

  async getScheduledReport(id: string): Promise<ScheduledReport | null> {
    return this.scheduledReports.get(id) || null;
  }

  async listScheduledReports(filters?: {
    templateId?: string;
    createdBy?: string;
    isActive?: boolean;
  }): Promise<ScheduledReport[]> {
    let reports = Array.from(this.scheduledReports.values());

    if (filters) {
      if (filters.templateId) {
        reports = reports.filter(r => r.templateId === filters.templateId);
      }
      if (filters.createdBy) {
        reports = reports.filter(r => r.createdBy === filters.createdBy);
      }
      if (filters.isActive !== undefined) {
        reports = reports.filter(r => r.isActive === filters.isActive);
      }
    }

    return reports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteScheduledReport(id: string): Promise<boolean> {
    return this.scheduledReports.delete(id);
  }

  // Report Execution
  async executeReport(
    templateId: string, 
    parameters: Record<string, any> = {},
    format: 'pdf' | 'excel' | 'csv' | 'html' | 'json' = 'pdf',
    executedBy: string
  ): Promise<ReportExecution> {
    const execution: ReportExecution = {
      id: this.generateId(),
      templateId,
      parameters,
      status: 'pending',
      startTime: new Date(),
      executedBy,
      format
    };

    this.executionQueue.push(execution);
    this.processExecutionQueue();

    return execution;
  }

  async getExecution(id: string): Promise<ReportExecution | null> {
    // Search in queue first
    const queuedExecution = this.executionQueue.find(e => e.id === id);
    if (queuedExecution) {
      return queuedExecution;
    }

    // Search in scheduled reports history
    for (const scheduledReport of this.scheduledReports.values()) {
      const execution = scheduledReport.executionHistory.find(e => e.id === id);
      if (execution) {
        return execution;
      }
    }

    return null;
  }

  async listExecutions(filters?: {
    templateId?: string;
    status?: string;
    executedBy?: string;
    limit?: number;
  }): Promise<ReportExecution[]> {
    let executions: ReportExecution[] = [];

    // Collect from queue
    executions.push(...this.executionQueue);

    // Collect from history
    for (const scheduledReport of this.scheduledReports.values()) {
      executions.push(...scheduledReport.executionHistory);
    }

    // Apply filters
    if (filters) {
      if (filters.templateId) {
        executions = executions.filter(e => e.templateId === filters.templateId);
      }
      if (filters.status) {
        executions = executions.filter(e => e.status === filters.status);
      }
      if (filters.executedBy) {
        executions = executions.filter(e => e.executedBy === filters.executedBy);
      }
    }

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply limit
    if (filters?.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  async cancelExecution(id: string): Promise<boolean> {
    const executionIndex = this.executionQueue.findIndex(e => e.id === id);
    if (executionIndex === -1) {
      return false;
    }

    const execution = this.executionQueue[executionIndex];
    if (execution.status === 'running') {
      // Cannot cancel running execution
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    return true;
  }

  // Parameter Management
  async validateParameters(templateId: string, parameters: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const template = await reportBuilderService.getTemplate(templateId);
    if (!template) {
      return { isValid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];

    for (const param of template.parameters) {
      const value = parameters[param.name];

      // Check required parameters
      if (param.required && (value === undefined || value === null || value === '')) {
        errors.push(`Parameter '${param.label}' is required`);
        continue;
      }

      // Skip validation if parameter is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      switch (param.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push(`Parameter '${param.label}' must be a number`);
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors.push(`Parameter '${param.label}' must be a valid date`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`Parameter '${param.label}' must be a boolean`);
          }
          break;
        case 'select':
        case 'multiselect':
          if (param.options) {
            const validValues = param.options.map(opt => opt.value);
            if (param.type === 'select') {
              if (!validValues.includes(value)) {
                errors.push(`Parameter '${param.label}' must be one of: ${validValues.join(', ')}`);
              }
            } else {
              // multiselect
              if (!Array.isArray(value) || !value.every(v => validValues.includes(v))) {
                errors.push(`Parameter '${param.label}' must be an array of: ${validValues.join(', ')}`);
              }
            }
          }
          break;
      }

      // Custom validation rules
      if (param.validation) {
        for (const rule of param.validation) {
          switch (rule.type) {
            case 'min':
              if (typeof value === 'number' && value < rule.value) {
                errors.push(rule.message || `Parameter '${param.label}' must be at least ${rule.value}`);
              }
              break;
            case 'max':
              if (typeof value === 'number' && value > rule.value) {
                errors.push(rule.message || `Parameter '${param.label}' must be at most ${rule.value}`);
              }
              break;
            case 'pattern':
              if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
                errors.push(rule.message || `Parameter '${param.label}' format is invalid`);
              }
              break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Version Control
  async getExecutionHistory(templateId: string, limit: number = 50): Promise<ReportExecution[]> {
    const executions = await this.listExecutions({ templateId, limit });
    return executions.filter(e => e.status === 'completed');
  }

  async compareExecutions(executionId1: string, executionId2: string): Promise<{
    execution1: ReportExecution | null;
    execution2: ReportExecution | null;
    differences: string[];
  }> {
    const execution1 = await this.getExecution(executionId1);
    const execution2 = await this.getExecution(executionId2);
    const differences: string[] = [];

    if (!execution1 || !execution2) {
      return { execution1, execution2, differences: ['One or both executions not found'] };
    }

    // Compare parameters
    const params1 = execution1.parameters || {};
    const params2 = execution2.parameters || {};
    const allParamKeys = new Set([...Object.keys(params1), ...Object.keys(params2)]);

    for (const key of allParamKeys) {
      if (params1[key] !== params2[key]) {
        differences.push(`Parameter '${key}': ${params1[key]} → ${params2[key]}`);
      }
    }

    // Compare execution metadata
    if (execution1.format !== execution2.format) {
      differences.push(`Format: ${execution1.format} → ${execution2.format}`);
    }

    if (execution1.executedBy !== execution2.executedBy) {
      differences.push(`Executed by: ${execution1.executedBy} → ${execution2.executedBy}`);
    }

    return { execution1, execution2, differences };
  }

  // Private methods
  private startScheduler(): void {
    // Check for scheduled reports every minute
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledReports();
    }, 60000);
  }

  private stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private async checkScheduledReports(): Promise<void> {
    const now = new Date();

    for (const scheduledReport of this.scheduledReports.values()) {
      if (!scheduledReport.isActive) continue;
      if (scheduledReport.nextRun > now) continue;

      // Execute the report
      try {
        const execution = await this.executeReport(
          scheduledReport.templateId,
          scheduledReport.parameters,
          scheduledReport.schedule.format,
          'scheduler'
        );

        // Update scheduled report
        scheduledReport.lastRun = now;
        scheduledReport.nextRun = this.calculateNextRun(scheduledReport.schedule, now);
        scheduledReport.executionHistory.unshift(execution);

        // Keep only last 100 executions
        if (scheduledReport.executionHistory.length > 100) {
          scheduledReport.executionHistory = scheduledReport.executionHistory.slice(0, 100);
        }

      } catch (error) {
        safeLogger.error(`Failed to execute scheduled report ${scheduledReport.id}:`, error);
      }
    }
  }

  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.executionQueue.length > 0) {
      const execution = this.executionQueue.shift()!;
      
      try {
        execution.status = 'running';
        
        // Generate the report
        const result = await this.generateReport(execution);
        
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.resultUrl = result.url;
        execution.size = result.size;

        // Send notifications if configured
        await this.sendNotifications(execution);

      } catch (error) {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        safeLogger.error(`Report execution failed:`, error);
      }
    }

    this.isProcessing = false;
  }

  private async generateReport(execution: ReportExecution): Promise<{ url: string; size: number }> {
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

    const mockUrl = `/api/reports/download/${execution.id}.${execution.format}`;
    const mockSize = Math.floor(Math.random() * 1000000) + 100000; // 100KB - 1MB

    return { url: mockUrl, size: mockSize };
  }

  private async sendNotifications(execution: ReportExecution): Promise<void> {
    // Find scheduled report to get recipients
    const scheduledReport = Array.from(this.scheduledReports.values())
      .find(sr => sr.templateId === execution.templateId);

    if (!scheduledReport || !scheduledReport.schedule.recipients.length) {
      return;
    }

    // Simulate sending notifications
    safeLogger.info(`Sending report notifications to: ${scheduledReport.schedule.recipients.join(', ')}`);
  }

  private calculateNextRun(schedule: SchedulingConfig, from: Date = new Date()): Date {
    const next = new Date(from);

    switch (schedule.frequency) {
      case 'once':
        // For one-time reports, set far future date to prevent re-execution
        next.setFullYear(next.getFullYear() + 10);
        break;

      case 'daily':
        next.setDate(next.getDate() + 1);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'weekly':
        next.setDate(next.getDate() + 7);
        if (schedule.dayOfWeek !== undefined) {
          const dayDiff = schedule.dayOfWeek - next.getDay();
          next.setDate(next.getDate() + (dayDiff >= 0 ? dayDiff : dayDiff + 7));
        }
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        if (schedule.dayOfMonth) {
          next.setDate(Math.min(schedule.dayOfMonth, this.getDaysInMonth(next)));
        }
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;

      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;
    }

    return next;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  destroy(): void {
    this.stopScheduler();
  }
}

export const reportSchedulerService = new ReportSchedulerService();