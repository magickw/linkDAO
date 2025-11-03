import { db } from '../db/connection';
import { eq, and, or, desc, asc, sql, inArray, lt, gte } from 'drizzle-orm';
import { 
  WorkflowEscalation,
  WorkflowTaskAssignment,
  EscalationRule,
  NotificationTemplate
} from '../types/workflow';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface EscalationPolicy {
  id: string;
  name: string;
  taskType: string;
  rules: EscalationRule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationMetrics {
  totalEscalations: number;
  escalationsByReason: Record<string, number>;
  escalationsByLevel: Record<number, number>;
  averageResolutionTime: number;
  escalationRate: number;
  topEscalationReasons: Array<{ reason: string; count: number; percentage: number }>;
}

export interface EscalationAlert {
  id: string;
  taskId: string;
  escalationId: string;
  alertType: 'sla_breach' | 'multiple_escalations' | 'high_priority' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, any>;
  createdAt: Date;
}

export class EscalationManagementService extends EventEmitter {
  private static instance: EscalationManagementService;
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private activeEscalations: Map<string, WorkflowEscalation> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.loadEscalationPolicies();
    this.startEscalationMonitoring();
  }

  static getInstance(): EscalationManagementService {
    if (!EscalationManagementService.instance) {
      EscalationManagementService.instance = new EscalationManagementService();
    }
    return EscalationManagementService.instance;
  }

  // Escalation Policy Management
  async createEscalationPolicy(policy: Omit<EscalationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscalationPolicy> {
    try {
      const newPolicy: EscalationPolicy = {
        id: this.generateId(),
        ...policy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in database (assuming we have an escalation_policies table)
      // await db.insert(escalationPolicies).values(newPolicy);

      this.escalationPolicies.set(newPolicy.taskType, newPolicy);

      logger.info(`Escalation policy created: ${newPolicy.id}`, {
        policyId: newPolicy.id,
        taskType: newPolicy.taskType,
        rulesCount: newPolicy.rules.length
      });

      this.emit('policyCreated', newPolicy);
      return newPolicy;
    } catch (error) {
      logger.error('Failed to create escalation policy', { error, policy });
      throw new Error(`Failed to create escalation policy: ${error.message}`);
    }
  }

  async updateEscalationPolicy(
    policyId: string, 
    updates: Partial<Omit<EscalationPolicy, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<EscalationPolicy> {
    try {
      const existingPolicy = Array.from(this.escalationPolicies.values())
        .find(p => p.id === policyId);

      if (!existingPolicy) {
        throw new Error(`Escalation policy not found: ${policyId}`);
      }

      const updatedPolicy: EscalationPolicy = {
        ...existingPolicy,
        ...updates,
        updatedAt: new Date()
      };

      // Update in database
      // await db.update(escalationPolicies).set(updates).where(eq(escalationPolicies.id, policyId));

      this.escalationPolicies.set(updatedPolicy.taskType, updatedPolicy);

      logger.info(`Escalation policy updated: ${policyId}`, { policyId, updates });
      this.emit('policyUpdated', updatedPolicy);
      
      return updatedPolicy;
    } catch (error) {
      logger.error('Failed to update escalation policy', { error, policyId, updates });
      throw new Error(`Failed to update escalation policy: ${error.message}`);
    }
  }

  async getEscalationPolicy(taskType: string): Promise<EscalationPolicy | null> {
    return this.escalationPolicies.get(taskType) || null;
  }

  async listEscalationPolicies(): Promise<EscalationPolicy[]> {
    return Array.from(this.escalationPolicies.values());
  }

  // Escalation Execution
  async executeEscalation(
    taskId: string,
    reason: string,
    level: number = 1,
    escalatedBy?: string
  ): Promise<WorkflowEscalation> {
    try {
      const task = await this.getTaskAssignment(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const policy = await this.getEscalationPolicy(task.taskType);
      if (!policy || !policy.isActive) {
        throw new Error(`No active escalation policy found for task type: ${task.taskType}`);
      }

      // Find matching escalation rule
      const rule = this.findMatchingRule(policy.rules, reason, level);
      if (!rule) {
        throw new Error(`No matching escalation rule found for reason: ${reason}, level: ${level}`);
      }

      // Determine escalation target
      const escalatedTo = await this.resolveEscalationTarget(rule, task);
      if (!escalatedTo) {
        throw new Error('Could not resolve escalation target');
      }

      // Create escalation record
      const [escalation] = await db.insert(workflowEscalations).values({
        assignmentId: taskId,
        escalationLevel: level,
        escalatedTo,
        escalatedBy,
        escalationReason: reason,
        escalationData: {
          originalAssignee: task.assignedTo,
          escalationRule: rule,
          timestamp: new Date().toISOString()
        }
      }).returning();

      // Update task assignment
      await db.update(workflowTaskAssignments)
        .set({
          assignedTo: escalatedTo,
          status: 'escalated',
          assignedAt: new Date()
        })
        .where(eq(workflowTaskAssignments.id, taskId));

      // Track active escalation
      this.activeEscalations.set(escalation.id, escalation);

      // Send notifications
      await this.sendEscalationNotifications(escalation, task, rule);

      // Schedule next escalation if needed
      await this.scheduleNextEscalation(escalation, rule);

      // Generate alerts if necessary
      await this.checkEscalationAlerts(escalation, task);

      logger.info(`Escalation executed: ${escalation.id}`, {
        escalationId: escalation.id,
        taskId,
        reason,
        level,
        escalatedFrom: task.assignedTo,
        escalatedTo
      });

      this.emit('escalationExecuted', { escalation, task, rule });
      return escalation;
    } catch (error) {
      logger.error('Failed to execute escalation', { error, taskId, reason, level });
      throw new Error(`Failed to execute escalation: ${error.message}`);
    }
  }

  async resolveEscalation(
    escalationId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<void> {
    try {
      const escalation = this.activeEscalations.get(escalationId);
      if (!escalation) {
        throw new Error(`Active escalation not found: ${escalationId}`);
      }

      // Update escalation record
      await db.update(workflowEscalations)
        .set({
          resolvedAt: new Date(),
          escalationData: {
            ...escalation.escalationData,
            resolution,
            resolvedBy,
            resolvedAt: new Date().toISOString()
          }
        })
        .where(eq(workflowEscalations.id, escalationId));

      // Remove from active escalations
      this.activeEscalations.delete(escalationId);

      // Cancel any scheduled escalations
      const timer = this.escalationTimers.get(escalationId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(escalationId);
      }

      // Send resolution notifications
      await this.sendResolutionNotifications(escalation, resolution, resolvedBy);

      logger.info(`Escalation resolved: ${escalationId}`, {
        escalationId,
        resolution,
        resolvedBy
      });

      this.emit('escalationResolved', { escalationId, resolution, resolvedBy });
    } catch (error) {
      logger.error('Failed to resolve escalation', { error, escalationId, resolution });
      throw new Error(`Failed to resolve escalation: ${error.message}`);
    }
  }

  // Escalation Monitoring and Analytics
  async getEscalationMetrics(
    taskType?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<EscalationMetrics> {
    try {
      const conditions = [];
      if (taskType) {
        // Join with task assignments to filter by task type
        conditions.push(sql`ta.task_type = ${taskType}`);
      }
      if (timeRange) {
        conditions.push(
          sql`e.escalated_at >= ${timeRange.start}`,
          sql`e.escalated_at <= ${timeRange.end}`
        );
      }

      const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

      // Total escalations
      const [totalResult] = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM workflow_escalations e
        LEFT JOIN workflow_task_assignments ta ON e.assignment_id = ta.id
        ${whereClause}
      `);

      // Escalations by reason
      const reasonResults = await db.execute(sql`
        SELECT escalation_reason, COUNT(*) as count
        FROM workflow_escalations e
        LEFT JOIN workflow_task_assignments ta ON e.assignment_id = ta.id
        ${whereClause}
        GROUP BY escalation_reason
        ORDER BY count DESC
      `);

      // Escalations by level
      const levelResults = await db.execute(sql`
        SELECT escalation_level, COUNT(*) as count
        FROM workflow_escalations e
        LEFT JOIN workflow_task_assignments ta ON e.assignment_id = ta.id
        ${whereClause}
        GROUP BY escalation_level
        ORDER BY escalation_level
      `);

      // Average resolution time
      const [avgResolutionResult] = await db.execute(sql`
        SELECT AVG(EXTRACT(epoch FROM (resolved_at - escalated_at))) as avg_time
        FROM workflow_escalations e
        LEFT JOIN workflow_task_assignments ta ON e.assignment_id = ta.id
        ${whereClause}
        AND resolved_at IS NOT NULL
      `);

      const totalEscalations = Number(totalResult.rows[0]?.total || 0);
      
      const escalationsByReason = reasonResults.rows.reduce((acc, row) => {
        acc[row.escalation_reason] = Number(row.count);
        return acc;
      }, {} as Record<string, number>);

      const escalationsByLevel = levelResults.rows.reduce((acc, row) => {
        acc[Number(row.escalation_level)] = Number(row.count);
        return acc;
      }, {} as Record<number, number>);

      const topEscalationReasons = reasonResults.rows.map(row => ({
        reason: row.escalation_reason,
        count: Number(row.count),
        percentage: totalEscalations > 0 ? (Number(row.count) / totalEscalations) * 100 : 0
      }));

      return {
        totalEscalations,
        escalationsByReason,
        escalationsByLevel,
        averageResolutionTime: Number(avgResolutionResult.rows[0]?.avg_time || 0),
        escalationRate: 0, // TODO: Calculate based on total tasks
        topEscalationReasons
      };
    } catch (error) {
      logger.error('Failed to get escalation metrics', { error, taskType, timeRange });
      throw new Error(`Failed to get escalation metrics: ${error.message}`);
    }
  }

  async getEscalationAlerts(severity?: string): Promise<EscalationAlert[]> {
    try {
      // TODO: Implement escalation alerts retrieval from database
      return [];
    } catch (error) {
      logger.error('Failed to get escalation alerts', { error, severity });
      throw new Error(`Failed to get escalation alerts: ${error.message}`);
    }
  }

  async getEscalationHistory(taskId: string): Promise<WorkflowEscalation[]> {
    try {
      const escalations = await db.query.workflowEscalations.findMany({
        where: eq(workflowEscalations.assignmentId, taskId),
        orderBy: asc(workflowEscalations.escalatedAt)
      });

      return escalations;
    } catch (error) {
      logger.error('Failed to get escalation history', { error, taskId });
      throw new Error(`Failed to get escalation history: ${error.message}`);
    }
  }

  // Private Helper Methods
  private async loadEscalationPolicies(): Promise<void> {
    try {
      // Load policies from database
      // const policies = await db.query.escalationPolicies.findMany();
      // policies.forEach(policy => {
      //   this.escalationPolicies.set(policy.taskType, policy);
      // });

      // For now, create default policies
      await this.createDefaultPolicies();
    } catch (error) {
      logger.error('Failed to load escalation policies', { error });
    }
  }

  private async createDefaultPolicies(): Promise<void> {
    const defaultPolicies = [
      {
        name: 'Content Moderation Escalation',
        taskType: 'moderate',
        rules: [
          {
            condition: 'timeout' as const,
            timeoutMinutes: 30,
            escalateTo: 'senior_moderator',
            notificationTemplate: {
              subject: 'Content Moderation Task Escalated',
              body: 'A content moderation task has been escalated due to timeout.',
              channels: ['email', 'in_app'] as ('email' | 'sms' | 'push' | 'in_app')[],
              priority: 'high' as const
            }
          },
          {
            condition: 'sla_breach' as const,
            escalateTo: 'moderation_manager',
            notificationTemplate: {
              subject: 'SLA Breach - Moderation Task',
              body: 'A moderation task has breached its SLA and requires immediate attention.',
              channels: ['email', 'sms', 'in_app'] as ('email' | 'sms' | 'push' | 'in_app')[],
              priority: 'urgent' as const
            }
          }
        ],
        isActive: true
      },
      {
        name: 'Dispute Resolution Escalation',
        taskType: 'resolve',
        rules: [
          {
            condition: 'manual' as const,
            escalateTo: 'senior_resolver',
            notificationTemplate: {
              subject: 'Complex Dispute Escalated',
              body: 'A complex dispute has been escalated for expert review.',
              channels: ['email', 'in_app'] as ('email' | 'sms' | 'push' | 'in_app')[],
              priority: 'high' as const
            }
          },
          {
            condition: 'manual' as const,
            escalateTo: 'dispute_manager',
            notificationTemplate: {
              subject: 'Manual Dispute Escalation',
              body: 'A dispute has been manually escalated for management review.',
              channels: ['email', 'in_app'] as ('email' | 'sms' | 'push' | 'in_app')[],
              priority: 'medium' as const
            }
          }
        ],
        isActive: true
      }
    ];

    for (const policy of defaultPolicies) {
      await this.createEscalationPolicy(policy);
    }
  }

  private startEscalationMonitoring(): void {
    // Monitor escalations every 2 minutes
    setInterval(async () => {
      try {
        await this.monitorActiveEscalations();
      } catch (error) {
        logger.error('Escalation monitoring error', { error });
      }
    }, 2 * 60 * 1000);
  }

  private async monitorActiveEscalations(): Promise<void> {
    try {
      const activeEscalations = Array.from(this.activeEscalations.values());
      
      for (const escalation of activeEscalations) {
        // Check if escalation needs further action
        await this.checkEscalationStatus(escalation);
      }
    } catch (error) {
      logger.error('Failed to monitor active escalations', { error });
    }
  }

  private async checkEscalationStatus(escalation: WorkflowEscalation): Promise<void> {
    try {
      const task = await this.getTaskAssignment(escalation.assignmentId);
      if (!task) return;

      // Check if task is still escalated and overdue
      if (task.status === 'escalated' && task.dueDate && new Date() > task.dueDate) {
        // Further escalate if needed
        const nextLevel = escalation.escalationLevel + 1;
        if (nextLevel <= 3) { // Max 3 escalation levels
          await this.executeEscalation(
            escalation.assignmentId,
            'timeout',
            nextLevel,
            'system'
          );
        } else {
          // Create critical alert
          await this.createEscalationAlert({
            taskId: escalation.assignmentId,
            escalationId: escalation.id,
            alertType: 'multiple_escalations',
            severity: 'critical',
            message: `Task has reached maximum escalation level (${nextLevel - 1}) and remains unresolved`,
            data: { escalation, task }
          });
        }
      }
    } catch (error) {
      logger.error('Failed to check escalation status', { error, escalationId: escalation.id });
    }
  }

  private findMatchingRule(rules: EscalationRule[], reason: string, level: number): EscalationRule | null {
    return rules.find(rule => rule.condition === reason) || null;
  }

  private async resolveEscalationTarget(rule: EscalationRule, task: WorkflowTaskAssignment): Promise<string | null> {
    if (typeof rule.escalateTo === 'string') {
      return rule.escalateTo;
    }
    
    // TODO: Implement assignment rule resolution
    return null;
  }

  private async scheduleNextEscalation(escalation: WorkflowEscalation, rule: EscalationRule): Promise<void> {
    if (rule.timeoutMinutes && escalation.escalationLevel < 3) {
      const timeout = setTimeout(async () => {
        try {
          await this.executeEscalation(
            escalation.assignmentId,
            'timeout',
            escalation.escalationLevel + 1,
            'system'
          );
        } catch (error) {
          logger.error('Failed to execute scheduled escalation', { error, escalationId: escalation.id });
        }
      }, rule.timeoutMinutes * 60 * 1000);

      this.escalationTimers.set(escalation.id, timeout);
    }
  }

  private async checkEscalationAlerts(escalation: WorkflowEscalation, task: WorkflowTaskAssignment): Promise<void> {
    // Check for high priority tasks
    if (task.priority >= 8) {
      await this.createEscalationAlert({
        taskId: escalation.assignmentId,
        escalationId: escalation.id,
        alertType: 'high_priority',
        severity: 'high',
        message: `High priority task (priority ${task.priority}) has been escalated`,
        data: { escalation, task }
      });
    }

    // Check for multiple escalations on same task
    const escalationHistory = await this.getEscalationHistory(escalation.assignmentId);
    if (escalationHistory.length > 2) {
      await this.createEscalationAlert({
        taskId: escalation.assignmentId,
        escalationId: escalation.id,
        alertType: 'multiple_escalations',
        severity: 'medium',
        message: `Task has been escalated ${escalationHistory.length} times`,
        data: { escalation, task, history: escalationHistory }
      });
    }
  }

  private async createEscalationAlert(alert: Omit<EscalationAlert, 'id' | 'createdAt'>): Promise<void> {
    try {
      const newAlert: EscalationAlert = {
        id: this.generateId(),
        ...alert,
        createdAt: new Date()
      };

      // Store alert in database
      // await db.insert(escalationAlerts).values(newAlert);

      logger.warn(`Escalation alert created: ${newAlert.alertType}`, {
        alertId: newAlert.id,
        taskId: newAlert.taskId,
        severity: newAlert.severity
      });

      this.emit('alertCreated', newAlert);
    } catch (error) {
      logger.error('Failed to create escalation alert', { error, alert });
    }
  }

  private async getTaskAssignment(taskId: string): Promise<WorkflowTaskAssignment | null> {
    try {
      return await db.query.workflowTaskAssignments.findFirst({
        where: eq(workflowTaskAssignments.id, taskId)
      });
    } catch (error) {
      logger.error('Failed to get task assignment', { error, taskId });
      return null;
    }
  }

  private async sendEscalationNotifications(
    escalation: WorkflowEscalation,
    task: WorkflowTaskAssignment,
    rule: EscalationRule
  ): Promise<void> {
    try {
      if (rule.notificationTemplate) {
        // TODO: Implement notification sending using the notification service
        logger.info('Escalation notification sent', {
          escalationId: escalation.id,
          recipient: escalation.escalatedTo,
          template: rule.notificationTemplate.subject
        });
      }
    } catch (error) {
      logger.error('Failed to send escalation notifications', { error, escalationId: escalation.id });
    }
  }

  private async sendResolutionNotifications(
    escalation: WorkflowEscalation,
    resolution: string,
    resolvedBy: string
  ): Promise<void> {
    try {
      // TODO: Implement resolution notification sending
      logger.info('Resolution notification sent', {
        escalationId: escalation.id,
        resolution,
        resolvedBy
      });
    } catch (error) {
      logger.error('Failed to send resolution notifications', { error, escalationId: escalation.id });
    }
  }

  private generateId(): string {
    return `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Import statements for database tables
const workflowEscalations = {} as any;
const workflowTaskAssignments = {} as any;

export default EscalationManagementService;
