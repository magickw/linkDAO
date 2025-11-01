import { db } from '../db/connection';
import { eq, and, or, desc, asc, sql, inArray, lt, gte } from 'drizzle-orm';
import { 
  WorkflowNotification,
  NotificationType,
  NotificationStatus,
  NotificationTemplate
} from '../types/workflow';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  dataSource: DataSourceConfig;
  format: ReportFormat;
  template: ReportTemplateConfig;
  schedule?: ScheduleConfig;
  recipients: ReportRecipient[];
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  templateId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  parameters: Record<string, any>;
  generatedAt?: Date;
  completedAt?: Date;
  filePath?: string;
  fileSize?: number;
  errorMessage?: string;
  executedBy?: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: NotificationTriggerType;
  conditions: NotificationCondition[];
  template: NotificationTemplate;
  recipients: NotificationRecipient[];
  priority: NotificationPriority;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationQueue {
  id: string;
  ruleId?: string;
  recipientId: string;
  notificationType: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  status: NotificationStatus;
  createdAt: Date;
  lastAttemptAt?: Date;
  sentAt?: Date;
  errorMessage?: string;
}

export type ReportType = 
  | 'workflow_performance' 
  | 'task_completion' 
  | 'sla_compliance' 
  | 'user_productivity' 
  | 'escalation_summary'
  | 'bottleneck_analysis'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html';

export type NotificationTriggerType = 
  | 'workflow_completed' 
  | 'workflow_failed' 
  | 'task_assigned' 
  | 'task_overdue' 
  | 'escalation_triggered'
  | 'sla_breach'
  | 'performance_alert'
  | 'scheduled'
  | 'manual';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';

export interface DataSourceConfig {
  type: 'workflow_metrics' | 'task_data' | 'user_data' | 'custom_query';
  query?: string;
  parameters?: Record<string, any>;
  timeRange?: { start: Date; end: Date };
  filters?: Record<string, any>;
}

export interface ReportTemplateConfig {
  layout: 'standard' | 'executive' | 'detailed' | 'custom';
  sections: ReportSection[];
  styling?: ReportStyling;
  branding?: ReportBranding;
}

export interface ReportSection {
  id: string;
  type: 'header' | 'summary' | 'chart' | 'table' | 'text' | 'metrics' | 'footer';
  title?: string;
  content?: any;
  config?: Record<string, any>;
}

export interface ReportStyling {
  theme: 'light' | 'dark' | 'corporate';
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

export interface ReportBranding {
  logo?: string;
  companyName?: string;
  colors?: Record<string, string>;
}

export interface ScheduleConfig {
  type: 'cron' | 'interval' | 'once';
  expression: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ReportRecipient {
  id: string;
  type: 'user' | 'role' | 'email';
  value: string;
  deliveryMethod: 'email' | 'download' | 'api';
}

export interface NotificationRecipient {
  id: string;
  type: 'user' | 'role' | 'email';
  value: string;
  channels: NotificationChannel[];
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export class AutomatedReportingService extends EventEmitter {
  private static instance: AutomatedReportingService;
  private reportTemplates: Map<string, ReportTemplate> = new Map();
  private notificationRules: Map<string, NotificationRule> = new Map();
  private reportQueue: Map<string, ReportExecution> = new Map();
  private notificationQueue: Map<string, NotificationQueue> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.loadReportTemplates();
    this.loadNotificationRules();
    this.startReportProcessor();
    this.startNotificationProcessor();
  }

  static getInstance(): AutomatedReportingService {
    if (!AutomatedReportingService.instance) {
      AutomatedReportingService.instance = new AutomatedReportingService();
    }
    return AutomatedReportingService.instance;
  }

  // Report Template Management
  async createReportTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    try {
      const newTemplate: ReportTemplate = {
        id: this.generateId(),
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      // await db.insert(reportTemplates).values(newTemplate);

      this.reportTemplates.set(newTemplate.id, newTemplate);

      // Schedule if needed
      if (newTemplate.schedule && newTemplate.isActive) {
        await this.scheduleReport(newTemplate);
      }

      logger.info(`Report template created: ${newTemplate.id}`, {
        templateId: newTemplate.id,
        name: newTemplate.name,
        reportType: newTemplate.reportType
      });

      this.emit('templateCreated', newTemplate);
      return newTemplate;
    } catch (error) {
      logger.error('Failed to create report template', { error, template });
      throw new Error(`Failed to create report template: ${error.message}`);
    }
  }

  async updateReportTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ReportTemplate> {
    try {
      const existingTemplate = this.reportTemplates.get(templateId);
      if (!existingTemplate) {
        throw new Error(`Report template not found: ${templateId}`);
      }

      const updatedTemplate: ReportTemplate = {
        ...existingTemplate,
        ...updates,
        updatedAt: new Date()
      };

      // Update in database
      // await db.update(reportTemplates).set(updates).where(eq(reportTemplates.id, templateId));

      this.reportTemplates.set(templateId, updatedTemplate);

      // Reschedule if needed
      if (updates.schedule !== undefined || updates.isActive !== undefined) {
        this.unscheduleReport(templateId);
        if (updatedTemplate.schedule && updatedTemplate.isActive) {
          await this.scheduleReport(updatedTemplate);
        }
      }

      logger.info(`Report template updated: ${templateId}`, { templateId, updates });
      this.emit('templateUpdated', updatedTemplate);

      return updatedTemplate;
    } catch (error) {
      logger.error('Failed to update report template', { error, templateId, updates });
      throw new Error(`Failed to update report template: ${error.message}`);
    }
  }

  async getReportTemplate(templateId: string): Promise<ReportTemplate | null> {
    return this.reportTemplates.get(templateId) || null;
  }

  async listReportTemplates(reportType?: ReportType): Promise<ReportTemplate[]> {
    const templates = Array.from(this.reportTemplates.values());
    return reportType ? templates.filter(t => t.reportType === reportType) : templates;
  }

  // Report Generation
  async generateReport(
    templateId: string,
    parameters?: Record<string, any>,
    executedBy?: string
  ): Promise<ReportExecution> {
    try {
      const template = this.reportTemplates.get(templateId);
      if (!template) {
        throw new Error(`Report template not found: ${templateId}`);
      }

      const execution: ReportExecution = {
        id: this.generateId(),
        templateId,
        status: 'pending',
        parameters: parameters || {},
        executedBy
      };

      this.reportQueue.set(execution.id, execution);

      logger.info(`Report generation queued: ${execution.id}`, {
        executionId: execution.id,
        templateId,
        executedBy
      });

      this.emit('reportQueued', execution);
      return execution;
    } catch (error) {
      logger.error('Failed to queue report generation', { error, templateId, parameters });
      throw new Error(`Failed to queue report generation: ${error.message}`);
    }
  }

  async getReportExecution(executionId: string): Promise<ReportExecution | null> {
    // Check in-memory queue first
    const queuedExecution = this.reportQueue.get(executionId);
    if (queuedExecution) {
      return queuedExecution;
    }

    // Check database for completed executions
    try {
      // return await db.query.reportExecutions.findFirst({
      //   where: eq(reportExecutions.id, executionId)
      // });
      return null;
    } catch (error) {
      logger.error('Failed to get report execution', { error, executionId });
      return null;
    }
  }

  async listReportExecutions(
    templateId?: string,
    status?: ReportExecution['status']
  ): Promise<ReportExecution[]> {
    try {
      // Get from queue
      const queuedExecutions = Array.from(this.reportQueue.values());
      
      // Get from database
      // const completedExecutions = await db.query.reportExecutions.findMany({
      //   where: templateId ? eq(reportExecutions.templateId, templateId) : undefined,
      //   orderBy: desc(reportExecutions.createdAt)
      // });

      const allExecutions = [...queuedExecutions]; // , ...completedExecutions];
      
      return status ? allExecutions.filter(e => e.status === status) : allExecutions;
    } catch (error) {
      logger.error('Failed to list report executions', { error, templateId, status });
      throw new Error(`Failed to list report executions: ${error.message}`);
    }
  }

  // Notification Rule Management
  async createNotificationRule(rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationRule> {
    try {
      const newRule: NotificationRule = {
        id: this.generateId(),
        ...rule,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database
      // await db.insert(notificationRules).values(newRule);

      this.notificationRules.set(newRule.id, newRule);

      logger.info(`Notification rule created: ${newRule.id}`, {
        ruleId: newRule.id,
        name: newRule.name,
        triggerType: newRule.triggerType
      });

      this.emit('notificationRuleCreated', newRule);
      return newRule;
    } catch (error) {
      logger.error('Failed to create notification rule', { error, rule });
      throw new Error(`Failed to create notification rule: ${error.message}`);
    }
  }

  async updateNotificationRule(
    ruleId: string,
    updates: Partial<Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationRule> {
    try {
      const existingRule = this.notificationRules.get(ruleId);
      if (!existingRule) {
        throw new Error(`Notification rule not found: ${ruleId}`);
      }

      const updatedRule: NotificationRule = {
        ...existingRule,
        ...updates,
        updatedAt: new Date()
      };

      // Update in database
      // await db.update(notificationRules).set(updates).where(eq(notificationRules.id, ruleId));

      this.notificationRules.set(ruleId, updatedRule);

      logger.info(`Notification rule updated: ${ruleId}`, { ruleId, updates });
      this.emit('notificationRuleUpdated', updatedRule);

      return updatedRule;
    } catch (error) {
      logger.error('Failed to update notification rule', { error, ruleId, updates });
      throw new Error(`Failed to update notification rule: ${error.message}`);
    }
  }

  async getNotificationRule(ruleId: string): Promise<NotificationRule | null> {
    return this.notificationRules.get(ruleId) || null;
  }

  async listNotificationRules(triggerType?: NotificationTriggerType): Promise<NotificationRule[]> {
    const rules = Array.from(this.notificationRules.values());
    return triggerType ? rules.filter(r => r.triggerType === triggerType) : rules;
  }

  // Notification Processing
  async sendNotification(
    recipientId: string,
    notificationType: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    channels?: NotificationChannel[],
    priority: NotificationPriority = 'medium'
  ): Promise<void> {
    try {
      const notification: NotificationQueue = {
        id: this.generateId(),
        recipientId,
        notificationType,
        priority,
        title,
        message,
        data,
        channels: channels || ['in_app'],
        attempts: 0,
        maxAttempts: 3,
        status: 'pending',
        createdAt: new Date()
      };

      this.notificationQueue.set(notification.id, notification);

      logger.info(`Notification queued: ${notification.id}`, {
        notificationId: notification.id,
        recipientId,
        notificationType,
        priority
      });

      this.emit('notificationQueued', notification);
    } catch (error) {
      logger.error('Failed to queue notification', { error, recipientId, notificationType });
    }
  }

  async processNotificationTrigger(
    triggerType: NotificationTriggerType,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      const matchingRules = Array.from(this.notificationRules.values())
        .filter(rule => rule.isActive && rule.triggerType === triggerType);

      for (const rule of matchingRules) {
        if (this.evaluateNotificationConditions(rule.conditions, eventData)) {
          await this.executeNotificationRule(rule, eventData);
        }
      }
    } catch (error) {
      logger.error('Failed to process notification trigger', { error, triggerType, eventData });
    }
  }

  // Private Methods
  private async loadReportTemplates(): Promise<void> {
    try {
      // Load from database
      // const templates = await db.query.reportTemplates.findMany();
      // templates.forEach(template => {
      //   this.reportTemplates.set(template.id, template);
      //   if (template.schedule && template.isActive) {
      //     this.scheduleReport(template);
      //   }
      // });

      // Create default templates for demo
      await this.createDefaultReportTemplates();
    } catch (error) {
      logger.error('Failed to load report templates', { error });
    }
  }

  private async createDefaultReportTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Daily Workflow Performance Report',
        description: 'Daily summary of workflow performance metrics',
        reportType: 'workflow_performance' as ReportType,
        dataSource: {
          type: 'workflow_metrics' as const,
          timeRange: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() }
        },
        format: 'pdf' as ReportFormat,
        template: {
          layout: 'standard' as const,
          sections: [
            { id: '1', type: 'header' as const, title: 'Daily Workflow Performance Report' },
            { id: '2', type: 'summary' as const, title: 'Executive Summary' },
            { id: '3', type: 'metrics' as const, title: 'Key Performance Indicators' },
            { id: '4', type: 'chart' as const, title: 'Execution Time Trends' },
            { id: '5', type: 'table' as const, title: 'Top Bottlenecks' }
          ]
        },
        schedule: {
          type: 'cron' as const,
          expression: '0 8 * * *', // Daily at 8 AM
          timezone: 'UTC'
        },
        recipients: [
          { id: '1', type: 'role' as const, value: 'admin', deliveryMethod: 'email' as const }
        ],
        isActive: true
      },
      {
        name: 'Weekly SLA Compliance Report',
        description: 'Weekly report on SLA compliance and breaches',
        reportType: 'sla_compliance' as ReportType,
        dataSource: {
          type: 'workflow_metrics' as const,
          timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
        },
        format: 'excel' as ReportFormat,
        template: {
          layout: 'detailed' as const,
          sections: [
            { id: '1', type: 'header' as const, title: 'Weekly SLA Compliance Report' },
            { id: '2', type: 'summary' as const, title: 'SLA Overview' },
            { id: '3', type: 'chart' as const, title: 'Compliance Trends' },
            { id: '4', type: 'table' as const, title: 'SLA Breaches by Type' },
            { id: '5', type: 'table' as const, title: 'Escalation Summary' }
          ]
        },
        schedule: {
          type: 'cron' as const,
          expression: '0 9 * * 1', // Weekly on Monday at 9 AM
          timezone: 'UTC'
        },
        recipients: [
          { id: '1', type: 'role' as const, value: 'manager', deliveryMethod: 'email' as const }
        ],
        isActive: true
      }
    ];

    for (const template of defaultTemplates) {
      await this.createReportTemplate(template);
    }
  }

  private async loadNotificationRules(): Promise<void> {
    try {
      // Load from database
      // const rules = await db.query.notificationRules.findMany();
      // rules.forEach(rule => {
      //   this.notificationRules.set(rule.id, rule);
      // });

      // Create default rules for demo
      await this.createDefaultNotificationRules();
    } catch (error) {
      logger.error('Failed to load notification rules', { error });
    }
  }

  private async createDefaultNotificationRules(): Promise<void> {
    const defaultRules = [
      {
        name: 'Task Assignment Notification',
        description: 'Notify users when tasks are assigned to them',
        triggerType: 'task_assigned' as NotificationTriggerType,
        conditions: [],
        template: {
          subject: 'New Task Assigned: {{taskType}}',
          body: 'You have been assigned a new {{taskType}} task. Priority: {{priority}}. Due: {{dueDate}}.',
          channels: ['email', 'in_app'] as NotificationChannel[],
          priority: 'medium' as const
        },
        recipients: [
          { id: '1', type: 'user' as const, value: '{{assignedTo}}', channels: ['email', 'in_app'] as NotificationChannel[] }
        ],
        priority: 'medium' as NotificationPriority,
        isActive: true
      },
      {
        name: 'SLA Breach Alert',
        description: 'Alert managers when SLA breaches occur',
        triggerType: 'sla_breach' as NotificationTriggerType,
        conditions: [
          { field: 'severity', operator: 'greater_than', value: 'medium' }
        ],
        template: {
          subject: 'SLA Breach Alert - {{taskType}}',
          body: 'SLA breach detected for {{taskType}} task. Breach time: {{breachTime}} minutes.',
          channels: ['email', 'sms', 'push'] as NotificationChannel[],
          priority: 'urgent' as const
        },
        recipients: [
          { id: '1', type: 'role' as const, value: 'manager', channels: ['email', 'sms'] as NotificationChannel[] }
        ],
        priority: 'urgent' as NotificationPriority,
        isActive: true
      },
      {
        name: 'Escalation Notification',
        description: 'Notify when tasks are escalated',
        triggerType: 'escalation_triggered' as NotificationTriggerType,
        conditions: [],
        template: {
          subject: 'Task Escalated - {{taskType}}',
          body: 'Task {{taskId}} has been escalated to level {{escalationLevel}}. Reason: {{reason}}.',
          channels: ['email', 'in_app'] as NotificationChannel[],
          priority: 'high' as const
        },
        recipients: [
          { id: '1', type: 'user' as const, value: '{{escalatedTo}}', channels: ['email', 'in_app'] as NotificationChannel[] },
          { id: '2', type: 'role' as const, value: 'supervisor', channels: ['in_app'] as NotificationChannel[] }
        ],
        priority: 'high' as NotificationPriority,
        isActive: true
      }
    ];

    for (const rule of defaultRules) {
      await this.createNotificationRule(rule);
    }
  }

  private startReportProcessor(): void {
    // Process report queue every 30 seconds
    setInterval(async () => {
      try {
        await this.processReportQueue();
      } catch (error) {
        logger.error('Report processor error', { error });
      }
    }, 30 * 1000);
  }

  private startNotificationProcessor(): void {
    // Process notification queue every 10 seconds
    setInterval(async () => {
      try {
        await this.processNotificationQueue();
      } catch (error) {
        logger.error('Notification processor error', { error });
      }
    }, 10 * 1000);
  }

  private async processReportQueue(): Promise<void> {
    const pendingReports = Array.from(this.reportQueue.values())
      .filter(report => report.status === 'pending')
      .slice(0, 5); // Process up to 5 reports concurrently

    for (const report of pendingReports) {
      try {
        await this.executeReportGeneration(report);
      } catch (error) {
        logger.error('Failed to execute report generation', { error, reportId: report.id });
        report.status = 'failed';
        report.errorMessage = error.message;
        report.completedAt = new Date();
      }
    }
  }

  private async processNotificationQueue(): Promise<void> {
    const pendingNotifications = Array.from(this.notificationQueue.values())
      .filter(notification => 
        notification.status === 'pending' && 
        (!notification.scheduledFor || notification.scheduledFor <= new Date())
      )
      .slice(0, 10); // Process up to 10 notifications concurrently

    for (const notification of pendingNotifications) {
      try {
        await this.executeNotificationDelivery(notification);
      } catch (error) {
        logger.error('Failed to execute notification delivery', { error, notificationId: notification.id });
        notification.attempts += 1;
        notification.lastAttemptAt = new Date();
        
        if (notification.attempts >= notification.maxAttempts) {
          notification.status = 'failed';
          notification.errorMessage = error.message;
        }
      }
    }
  }

  private async executeReportGeneration(execution: ReportExecution): Promise<void> {
    try {
      execution.status = 'generating';
      execution.generatedAt = new Date();

      const template = this.reportTemplates.get(execution.templateId);
      if (!template) {
        throw new Error(`Report template not found: ${execution.templateId}`);
      }

      // Generate report data
      const reportData = await this.generateReportData(template, execution.parameters);

      // Generate report file
      const filePath = await this.generateReportFile(template, reportData, execution.id);

      // Update execution
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.filePath = filePath;
      execution.fileSize = await this.getFileSize(filePath);

      // Distribute report
      await this.distributeReport(template, execution);

      // Remove from queue and store in database
      this.reportQueue.delete(execution.id);
      // await db.insert(reportExecutions).values(execution);

      logger.info(`Report generation completed: ${execution.id}`, {
        executionId: execution.id,
        templateId: execution.templateId,
        filePath
      });

      this.emit('reportCompleted', execution);
    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error.message;
      execution.completedAt = new Date();
      throw error;
    }
  }

  private async executeNotificationDelivery(notification: NotificationQueue): Promise<void> {
    try {
      notification.attempts += 1;
      notification.lastAttemptAt = new Date();

      // Send via each channel
      for (const channel of notification.channels) {
        await this.sendViaChannel(notification, channel);
      }

      notification.status = 'sent';
      notification.sentAt = new Date();

      // Store in database and remove from queue
      // await db.insert(workflowNotifications).values({
      //   workflowInstanceId: notification.data?.instanceId,
      //   recipientId: notification.recipientId,
      //   notificationType: notification.notificationType,
      //   title: notification.title,
      //   message: notification.message,
      //   data: notification.data,
      //   status: 'sent',
      //   sentAt: notification.sentAt
      // });

      this.notificationQueue.delete(notification.id);

      logger.info(`Notification delivered: ${notification.id}`, {
        notificationId: notification.id,
        recipientId: notification.recipientId,
        channels: notification.channels
      });

      this.emit('notificationDelivered', notification);
    } catch (error) {
      throw error;
    }
  }

  private async generateReportData(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    // Mock report data generation - in production, this would query actual data
    return {
      title: template.name,
      generatedAt: new Date(),
      parameters,
      sections: template.template.sections.map(section => ({
        ...section,
        data: this.generateSectionData(section.type)
      }))
    };
  }

  private generateSectionData(sectionType: string): any {
    switch (sectionType) {
      case 'summary':
        return {
          totalWorkflows: 150,
          completedWorkflows: 135,
          successRate: 90,
          averageExecutionTime: 245
        };
      case 'metrics':
        return {
          throughput: 12.5,
          slaCompliance: 94.2,
          errorRate: 2.1,
          userSatisfaction: 4.3
        };
      case 'chart':
        return {
          type: 'line',
          data: Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            value: Math.floor(Math.random() * 100)
          }))
        };
      case 'table':
        return {
          headers: ['Step', 'Avg Time', 'Success Rate', 'Impact'],
          rows: [
            ['Content Review', '120s', '95%', 'Medium'],
            ['Approval Process', '300s', '88%', 'High'],
            ['Notification Send', '5s', '99%', 'Low']
          ]
        };
      default:
        return {};
    }
  }

  private async generateReportFile(template: ReportTemplate, data: any, executionId: string): Promise<string> {
    const fileName = `report_${executionId}_${Date.now()}.${template.format}`;
    const filePath = path.join('/tmp', fileName); // In production, use proper storage

    switch (template.format) {
      case 'json':
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        break;
      case 'csv':
        // Generate CSV content
        const csvContent = this.generateCSV(data);
        await fs.writeFile(filePath, csvContent);
        break;
      case 'html':
        // Generate HTML content
        const htmlContent = this.generateHTML(data, template);
        await fs.writeFile(filePath, htmlContent);
        break;
      case 'pdf':
      case 'excel':
        // For PDF and Excel, you would use libraries like puppeteer or exceljs
        // For now, just create a placeholder file
        await fs.writeFile(filePath, `${template.format.toUpperCase()} report placeholder`);
        break;
      default:
        throw new Error(`Unsupported report format: ${template.format}`);
    }

    return filePath;
  }

  private generateCSV(data: any): string {
    // Simple CSV generation - in production, use a proper CSV library
    let csv = 'Section,Type,Value\n';
    
    data.sections.forEach((section: any) => {
      if (section.data && typeof section.data === 'object') {
        Object.entries(section.data).forEach(([key, value]) => {
          csv += `${section.title || section.type},${key},${value}\n`;
        });
      }
    });

    return csv;
  }

  private generateHTML(data: any, template: ReportTemplate): string {
    // Simple HTML generation - in production, use a proper template engine
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          .metrics { display: flex; gap: 20px; }
          .metric { background: #f5f5f5; padding: 10px; border-radius: 5px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p>Generated: ${data.generatedAt.toLocaleString()}</p>
        </div>
    `;

    data.sections.forEach((section: any) => {
      html += `<div class="section">`;
      html += `<h2>${section.title || section.type}</h2>`;
      
      if (section.type === 'metrics' && section.data) {
        html += `<div class="metrics">`;
        Object.entries(section.data).forEach(([key, value]) => {
          html += `<div class="metric"><strong>${key}:</strong> ${value}</div>`;
        });
        html += `</div>`;
      } else if (section.type === 'table' && section.data) {
        html += `<table>`;
        html += `<tr>${section.data.headers.map((h: string) => `<th>${h}</th>`).join('')}</tr>`;
        section.data.rows.forEach((row: any[]) => {
          html += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
        });
        html += `</table>`;
      }
      
      html += `</div>`;
    });

    html += `</body></html>`;
    return html;
  }

  private async distributeReport(template: ReportTemplate, execution: ReportExecution): Promise<void> {
    for (const recipient of template.recipients) {
      try {
        switch (recipient.deliveryMethod) {
          case 'email':
            await this.sendReportViaEmail(recipient, execution);
            break;
          case 'download':
            // Make available for download - would integrate with file storage service
            break;
          case 'api':
            // Send via API webhook
            await this.sendReportViaAPI(recipient, execution);
            break;
        }
      } catch (error) {
        logger.error('Failed to distribute report', { error, recipient, executionId: execution.id });
      }
    }
  }

  private async sendReportViaEmail(recipient: ReportRecipient, execution: ReportExecution): Promise<void> {
    // Mock email sending - in production, integrate with email service
    logger.info('Report sent via email', {
      recipient: recipient.value,
      executionId: execution.id,
      filePath: execution.filePath
    });
  }

  private async sendReportViaAPI(recipient: ReportRecipient, execution: ReportExecution): Promise<void> {
    // Mock API sending - in production, make HTTP request to webhook
    logger.info('Report sent via API', {
      recipient: recipient.value,
      executionId: execution.id,
      filePath: execution.filePath
    });
  }

  private async sendViaChannel(notification: NotificationQueue, channel: NotificationChannel): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'sms':
        await this.sendSMSNotification(notification);
        break;
      case 'push':
        await this.sendPushNotification(notification);
        break;
      case 'in_app':
        await this.sendInAppNotification(notification);
        break;
      case 'webhook':
        await this.sendWebhookNotification(notification);
        break;
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  private async sendEmailNotification(notification: NotificationQueue): Promise<void> {
    // Mock email sending - in production, integrate with email service
    logger.info('Email notification sent', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      title: notification.title
    });
  }

  private async sendSMSNotification(notification: NotificationQueue): Promise<void> {
    // Mock SMS sending - in production, integrate with SMS service
    logger.info('SMS notification sent', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      message: notification.message
    });
  }

  private async sendPushNotification(notification: NotificationQueue): Promise<void> {
    // Mock push notification - in production, integrate with push service
    logger.info('Push notification sent', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      title: notification.title
    });
  }

  private async sendInAppNotification(notification: NotificationQueue): Promise<void> {
    // Store in database for in-app display
    // await db.insert(workflowNotifications).values({
    //   workflowInstanceId: notification.data?.instanceId,
    //   recipientId: notification.recipientId,
    //   notificationType: notification.notificationType,
    //   title: notification.title,
    //   message: notification.message,
    //   data: notification.data,
    //   status: 'sent'
    // });

    logger.info('In-app notification stored', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      title: notification.title
    });
  }

  private async sendWebhookNotification(notification: NotificationQueue): Promise<void> {
    // Mock webhook sending - in production, make HTTP request
    logger.info('Webhook notification sent', {
      notificationId: notification.id,
      recipientId: notification.recipientId,
      data: notification.data
    });
  }

  private async scheduleReport(template: ReportTemplate): Promise<void> {
    if (!template.schedule) return;

    // Simple scheduling - in production, use a proper job scheduler like node-cron
    const interval = this.parseScheduleExpression(template.schedule.expression);
    if (interval) {
      const timer = setInterval(async () => {
        try {
          await this.generateReport(template.id, {}, 'system');
        } catch (error) {
          logger.error('Scheduled report generation failed', { error, templateId: template.id });
        }
      }, interval);

      this.scheduledJobs.set(template.id, timer);
    }
  }

  private unscheduleReport(templateId: string): void {
    const timer = this.scheduledJobs.get(templateId);
    if (timer) {
      clearInterval(timer);
      this.scheduledJobs.delete(templateId);
    }
  }

  private parseScheduleExpression(expression: string): number | null {
    // Simple cron parsing - in production, use a proper cron library
    if (expression === '0 8 * * *') return 24 * 60 * 60 * 1000; // Daily
    if (expression === '0 9 * * 1') return 7 * 24 * 60 * 60 * 1000; // Weekly
    return null;
  }

  private evaluateNotificationConditions(conditions: NotificationCondition[], eventData: Record<string, any>): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, eventData);
      
      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else if (currentLogicalOperator === 'OR') {
        result = result || conditionResult;
      }

      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }

    return result;
  }

  private evaluateCondition(condition: NotificationCondition, eventData: Record<string, any>): boolean {
    const fieldValue = this.getNestedValue(eventData, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private async executeNotificationRule(rule: NotificationRule, eventData: Record<string, any>): Promise<void> {
    try {
      for (const recipient of rule.recipients) {
        const recipientId = this.resolveRecipientId(recipient, eventData);
        if (recipientId) {
          const title = this.interpolateTemplate(rule.template.subject, eventData);
          const message = this.interpolateTemplate(rule.template.body, eventData);

          await this.sendNotification(
            recipientId,
            'assignment', // Default type - would be determined by rule
            title,
            message,
            eventData,
            recipient.channels,
            rule.priority
          );
        }
      }
    } catch (error) {
      logger.error('Failed to execute notification rule', { error, ruleId: rule.id, eventData });
    }
  }

  private resolveRecipientId(recipient: NotificationRecipient, eventData: Record<string, any>): string | null {
    if (recipient.type === 'user') {
      return this.interpolateTemplate(recipient.value, eventData);
    } else if (recipient.type === 'email') {
      return recipient.value;
    } else if (recipient.type === 'role') {
      // In production, resolve role to actual user IDs
      return recipient.value;
    }
    return null;
  }

  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.getNestedValue(data, key) || match;
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private generateId(): string {
    return `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  destroy(): void {
    // Clear all scheduled jobs
    this.scheduledJobs.forEach(timer => clearInterval(timer));
    this.scheduledJobs.clear();
    
    // Clear caches
    this.reportTemplates.clear();
    this.notificationRules.clear();
    this.reportQueue.clear();
    this.notificationQueue.clear();
  }
}

// Import statements for database tables
const workflowNotifications = {} as any;

export default AutomatedReportingService;