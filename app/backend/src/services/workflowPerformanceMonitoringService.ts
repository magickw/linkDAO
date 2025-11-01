import { db } from '../db/connection';
import { eq, and, or, desc, asc, sql, inArray, lt, gte, between } from 'drizzle-orm';
import { 
  WorkflowMetric,
  WorkflowInstance,
  WorkflowTemplate,
  WorkflowStepExecution,
  WorkflowTaskAssignment,
  MetricType,
  BottleneckAnalysis,
  FailureReason
} from '../types/workflow';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  executionTime: ExecutionTimeMetrics;
  throughput: ThroughputMetrics;
  successRate: SuccessRateMetrics;
  bottlenecks: BottleneckMetrics;
  slaCompliance: SLAComplianceMetrics;
  resourceUtilization: ResourceUtilizationMetrics;
}

export interface ExecutionTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  trend: TrendData[];
}

export interface ThroughputMetrics {
  workflowsPerHour: number;
  tasksPerHour: number;
  completionRate: number;
  trend: TrendData[];
}

export interface SuccessRateMetrics {
  overall: number;
  byTemplate: Record<string, number>;
  byTaskType: Record<string, number>;
  trend: TrendData[];
}

export interface BottleneckMetrics {
  topBottlenecks: BottleneckAnalysis[];
  stepPerformance: StepPerformanceMetrics[];
  queueDepth: QueueDepthMetrics;
}

export interface SLAComplianceMetrics {
  overallCompliance: number;
  breachesByType: Record<string, number>;
  averageBreachTime: number;
  trend: TrendData[];
}

export interface ResourceUtilizationMetrics {
  userWorkload: UserWorkloadMetrics[];
  systemLoad: SystemLoadMetrics;
  concurrentExecutions: number;
}

export interface TrendData {
  timestamp: Date;
  value: number;
}

export interface StepPerformanceMetrics {
  stepId: string;
  stepType: string;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
}

export interface QueueDepthMetrics {
  current: number;
  average: number;
  peak: number;
  trend: TrendData[];
}

export interface UserWorkloadMetrics {
  userId: string;
  activeTasks: number;
  completedTasks: number;
  averageCompletionTime: number;
  efficiency: number;
}

export interface SystemLoadMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'bottleneck' | 'sla_breach' | 'high_error_rate' | 'resource_exhaustion' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, any>;
  threshold: number;
  currentValue: number;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'workflow_design' | 'resource_allocation' | 'task_assignment' | 'escalation_rules' | 'automation';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  metrics: Record<string, any>;
  createdAt: Date;
}

export class WorkflowPerformanceMonitoringService extends EventEmitter {
  private static instance: WorkflowPerformanceMonitoringService;
  private metricsCache: Map<string, any> = new Map();
  private alertThresholds: Map<string, number> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeAlertThresholds();
    this.startPerformanceMonitoring();
  }

  static getInstance(): WorkflowPerformanceMonitoringService {
    if (!WorkflowPerformanceMonitoringService.instance) {
      WorkflowPerformanceMonitoringService.instance = new WorkflowPerformanceMonitoringService();
    }
    return WorkflowPerformanceMonitoringService.instance;
  }

  // Core Metrics Collection
  async collectPerformanceMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    try {
      const cacheKey = `metrics_${templateId || 'all'}_${timeRange?.start?.getTime() || 'all'}_${timeRange?.end?.getTime() || 'all'}`;
      
      // Check cache first (cache for 5 minutes)
      const cached = this.metricsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }

      const [
        executionTime,
        throughput,
        successRate,
        bottlenecks,
        slaCompliance,
        resourceUtilization
      ] = await Promise.all([
        this.collectExecutionTimeMetrics(templateId, timeRange),
        this.collectThroughputMetrics(templateId, timeRange),
        this.collectSuccessRateMetrics(templateId, timeRange),
        this.collectBottleneckMetrics(templateId, timeRange),
        this.collectSLAComplianceMetrics(templateId, timeRange),
        this.collectResourceUtilizationMetrics()
      ]);

      const metrics: PerformanceMetrics = {
        executionTime,
        throughput,
        successRate,
        bottlenecks,
        slaCompliance,
        resourceUtilization
      };

      // Cache the results
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to collect performance metrics', { error, templateId, timeRange });
      throw new Error(`Failed to collect performance metrics: ${error.message}`);
    }
  }

  async recordMetric(
    templateId: string,
    instanceId: string,
    metricType: MetricType,
    value: number,
    unit?: string,
    dimensions?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(workflowMetrics).values({
        templateId,
        instanceId,
        metricType,
        metricValue: value,
        metricUnit: unit,
        dimensions,
        recordedAt: new Date()
      });

      // Check for performance alerts
      await this.checkPerformanceAlerts(metricType, value, { templateId, instanceId, ...dimensions });

      this.emit('metricRecorded', { templateId, instanceId, metricType, value });
    } catch (error) {
      logger.error('Failed to record metric', { error, templateId, instanceId, metricType, value });
    }
  }

  // Execution Time Metrics
  private async collectExecutionTimeMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ExecutionTimeMetrics> {
    try {
      const conditions = [eq(workflowInstances.status, 'completed')];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          gte(workflowInstances.createdAt, timeRange.start),
          lt(workflowInstances.createdAt, timeRange.end)
        );
      }

      const executionTimes = await db
        .select({
          duration: sql<number>`extract(epoch from (completed_at - started_at))`,
          createdAt: workflowInstances.createdAt
        })
        .from(workflowInstances)
        .where(and(...conditions))
        .orderBy(asc(workflowInstances.createdAt));

      if (executionTimes.length === 0) {
        return {
          average: 0,
          median: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0,
          trend: []
        };
      }

      const durations = executionTimes.map(et => et.duration).sort((a, b) => a - b);
      const sum = durations.reduce((acc, d) => acc + d, 0);

      // Calculate trend data (group by hour)
      const trendData = this.calculateTrendData(
        executionTimes.map(et => ({ timestamp: et.createdAt, value: et.duration }))
      );

      return {
        average: sum / durations.length,
        median: this.calculatePercentile(durations, 50),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        min: Math.min(...durations),
        max: Math.max(...durations),
        trend: trendData
      };
    } catch (error) {
      logger.error('Failed to collect execution time metrics', { error, templateId, timeRange });
      throw error;
    }
  }

  // Throughput Metrics
  private async collectThroughputMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<ThroughputMetrics> {
    try {
      const conditions = [];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          gte(workflowInstances.createdAt, timeRange.start),
          lt(workflowInstances.createdAt, timeRange.end)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Workflows per hour
      const [workflowCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(whereClause);

      // Tasks per hour
      const [taskCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(whereClause);

      // Completion rate
      const [completedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'completed')));

      const totalWorkflows = workflowCountResult.count;
      const completionRate = totalWorkflows > 0 ? (completedResult.count / totalWorkflows) * 100 : 0;

      // Calculate hourly rates
      const hours = timeRange 
        ? (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)
        : 24; // Default to 24 hours if no range specified

      return {
        workflowsPerHour: totalWorkflows / hours,
        tasksPerHour: taskCountResult.count / hours,
        completionRate,
        trend: [] // TODO: Implement trend calculation
      };
    } catch (error) {
      logger.error('Failed to collect throughput metrics', { error, templateId, timeRange });
      throw error;
    }
  }

  // Success Rate Metrics
  private async collectSuccessRateMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SuccessRateMetrics> {
    try {
      const conditions = [];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          gte(workflowInstances.createdAt, timeRange.start),
          lt(workflowInstances.createdAt, timeRange.end)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Overall success rate
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(whereClause);

      const [successResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(and(whereClause, eq(workflowInstances.status, 'completed')));

      const overall = totalResult.count > 0 ? (successResult.count / totalResult.count) * 100 : 0;

      // Success rate by template
      const templateResults = await db
        .select({
          templateId: workflowInstances.templateId,
          total: sql<number>`count(*)`,
          successful: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`
        })
        .from(workflowInstances)
        .where(whereClause)
        .groupBy(workflowInstances.templateId);

      const byTemplate = templateResults.reduce((acc, result) => {
        acc[result.templateId] = result.total > 0 ? (result.successful / result.total) * 100 : 0;
        return acc;
      }, {} as Record<string, number>);

      // Success rate by task type
      const taskTypeResults = await db
        .select({
          taskType: workflowTaskAssignments.taskType,
          total: sql<number>`count(*)`,
          successful: sql<number>`sum(case when workflow_task_assignments.status = 'completed' then 1 else 0 end)`
        })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(whereClause)
        .groupBy(workflowTaskAssignments.taskType);

      const byTaskType = taskTypeResults.reduce((acc, result) => {
        acc[result.taskType] = result.total > 0 ? (result.successful / result.total) * 100 : 0;
        return acc;
      }, {} as Record<string, number>);

      return {
        overall,
        byTemplate,
        byTaskType,
        trend: [] // TODO: Implement trend calculation
      };
    } catch (error) {
      logger.error('Failed to collect success rate metrics', { error, templateId, timeRange });
      throw error;
    }
  }

  // Bottleneck Analysis
  private async collectBottleneckMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<BottleneckMetrics> {
    try {
      const conditions = [];
      if (templateId) {
        conditions.push(eq(workflowInstances.templateId, templateId));
      }
      if (timeRange) {
        conditions.push(
          gte(workflowStepExecutions.createdAt, timeRange.start),
          lt(workflowStepExecutions.createdAt, timeRange.end)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Step performance analysis
      const stepPerformance = await db
        .select({
          stepId: workflowStepExecutions.stepId,
          stepType: workflowSteps.stepType,
          avgExecutionTime: sql<number>`avg(extract(epoch from (completed_at - started_at)))`,
          totalExecutions: sql<number>`count(*)`,
          successfulExecutions: sql<number>`sum(case when workflow_step_executions.status = 'completed' then 1 else 0 end)`,
          failedExecutions: sql<number>`sum(case when workflow_step_executions.status = 'failed' then 1 else 0 end)`
        })
        .from(workflowStepExecutions)
        .innerJoin(workflowSteps, eq(workflowStepExecutions.stepId, workflowSteps.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(whereClause)
        .groupBy(workflowStepExecutions.stepId, workflowSteps.stepType)
        .orderBy(desc(sql`avg(extract(epoch from (completed_at - started_at)))`));

      const stepPerformanceMetrics: StepPerformanceMetrics[] = stepPerformance.map(sp => ({
        stepId: sp.stepId,
        stepType: sp.stepType,
        averageExecutionTime: sp.avgExecutionTime || 0,
        successRate: sp.totalExecutions > 0 ? (sp.successfulExecutions / sp.totalExecutions) * 100 : 0,
        errorRate: sp.totalExecutions > 0 ? (sp.failedExecutions / sp.totalExecutions) * 100 : 0,
        throughput: sp.totalExecutions
      }));

      // Identify top bottlenecks
      const topBottlenecks: BottleneckAnalysis[] = stepPerformanceMetrics
        .slice(0, 5)
        .map(sp => ({
          stepId: sp.stepId,
          stepName: `${sp.stepType} Step`,
          averageTime: sp.averageExecutionTime,
          frequency: sp.throughput,
          impact: sp.averageExecutionTime > 300 ? 'high' : sp.averageExecutionTime > 60 ? 'medium' : 'low'
        }));

      // Queue depth metrics
      const [currentQueueDepth] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(eq(workflowInstances.status, 'pending'));

      const queueDepth: QueueDepthMetrics = {
        current: currentQueueDepth.count,
        average: 0, // TODO: Calculate from historical data
        peak: 0, // TODO: Calculate from historical data
        trend: [] // TODO: Implement trend calculation
      };

      return {
        topBottlenecks,
        stepPerformance: stepPerformanceMetrics,
        queueDepth
      };
    } catch (error) {
      logger.error('Failed to collect bottleneck metrics', { error, templateId, timeRange });
      throw error;
    }
  }

  // SLA Compliance Metrics
  private async collectSLAComplianceMetrics(
    templateId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<SLAComplianceMetrics> {
    try {
      const conditions = [];
      if (templateId) conditions.push(eq(workflowInstances.templateId, templateId));
      if (timeRange) {
        conditions.push(
          gte(workflowTaskAssignments.createdAt, timeRange.start),
          lt(workflowTaskAssignments.createdAt, timeRange.end)
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Overall SLA compliance
      const [totalTasks] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(whereClause, eq(workflowTaskAssignments.status, 'completed')));

      const [onTimeTasks] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(
          whereClause,
          eq(workflowTaskAssignments.status, 'completed'),
          sql`workflow_task_assignments.completed_at <= workflow_task_assignments.due_date`
        ));

      const overallCompliance = totalTasks.count > 0 ? (onTimeTasks.count / totalTasks.count) * 100 : 0;

      // SLA breaches by task type
      const breachesByType = await db
        .select({
          taskType: workflowTaskAssignments.taskType,
          breaches: sql<number>`count(*)`
        })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(
          whereClause,
          sql`workflow_task_assignments.completed_at > workflow_task_assignments.due_date`
        ))
        .groupBy(workflowTaskAssignments.taskType);

      const breachesByTypeMap = breachesByType.reduce((acc, breach) => {
        acc[breach.taskType] = breach.breaches;
        return acc;
      }, {} as Record<string, number>);

      // Average breach time
      const [avgBreachTime] = await db
        .select({
          avg: sql<number>`avg(extract(epoch from (completed_at - due_date)))`
        })
        .from(workflowTaskAssignments)
        .innerJoin(workflowStepExecutions, eq(workflowTaskAssignments.stepExecutionId, workflowStepExecutions.id))
        .innerJoin(workflowInstances, eq(workflowStepExecutions.instanceId, workflowInstances.id))
        .where(and(
          whereClause,
          sql`workflow_task_assignments.completed_at > workflow_task_assignments.due_date`
        ));

      return {
        overallCompliance,
        breachesByType: breachesByTypeMap,
        averageBreachTime: avgBreachTime.avg || 0,
        trend: [] // TODO: Implement trend calculation
      };
    } catch (error) {
      logger.error('Failed to collect SLA compliance metrics', { error, templateId, timeRange });
      throw error;
    }
  }

  // Resource Utilization Metrics
  private async collectResourceUtilizationMetrics(): Promise<ResourceUtilizationMetrics> {
    try {
      // User workload metrics
      const userWorkload = await db
        .select({
          userId: workflowTaskAssignments.assignedTo,
          activeTasks: sql<number>`sum(case when workflow_task_assignments.status in ('assigned', 'in_progress') then 1 else 0 end)`,
          completedTasks: sql<number>`sum(case when workflow_task_assignments.status = 'completed' then 1 else 0 end)`,
          avgCompletionTime: sql<number>`avg(case when workflow_task_assignments.status = 'completed' then extract(epoch from (completed_at - assigned_at)) else null end)`
        })
        .from(workflowTaskAssignments)
        .groupBy(workflowTaskAssignments.assignedTo);

      const userWorkloadMetrics: UserWorkloadMetrics[] = userWorkload.map(uw => ({
        userId: uw.userId,
        activeTasks: uw.activeTasks,
        completedTasks: uw.completedTasks,
        averageCompletionTime: uw.avgCompletionTime || 0,
        efficiency: uw.completedTasks > 0 ? uw.completedTasks / (uw.activeTasks + uw.completedTasks) : 0
      }));

      // System load metrics (mock data - would integrate with actual system monitoring)
      const systemLoad: SystemLoadMetrics = {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        activeConnections: Math.floor(Math.random() * 1000),
        queueSize: Math.floor(Math.random() * 100)
      };

      // Concurrent executions
      const [concurrentExecutions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(workflowInstances)
        .where(eq(workflowInstances.status, 'running'));

      return {
        userWorkload: userWorkloadMetrics,
        systemLoad,
        concurrentExecutions: concurrentExecutions.count
      };
    } catch (error) {
      logger.error('Failed to collect resource utilization metrics', { error });
      throw error;
    }
  }

  // Performance Alerts
  async checkPerformanceAlerts(
    metricType: MetricType,
    value: number,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const threshold = this.alertThresholds.get(metricType);
      if (!threshold) return;

      const shouldAlert = this.shouldTriggerAlert(metricType, value, threshold);
      if (shouldAlert) {
        await this.createPerformanceAlert(metricType, value, threshold, context);
      }
    } catch (error) {
      logger.error('Failed to check performance alerts', { error, metricType, value });
    }
  }

  async getPerformanceAlerts(severity?: string): Promise<PerformanceAlert[]> {
    try {
      const alerts = Array.from(this.activeAlerts.values());
      return severity ? alerts.filter(alert => alert.severity === severity) : alerts;
    } catch (error) {
      logger.error('Failed to get performance alerts', { error, severity });
      throw new Error(`Failed to get performance alerts: ${error.message}`);
    }
  }

  async resolvePerformanceAlert(alertId: string, resolvedBy: string): Promise<void> {
    try {
      const alert = this.activeAlerts.get(alertId);
      if (!alert) {
        throw new Error(`Performance alert not found: ${alertId}`);
      }

      alert.resolvedAt = new Date();
      this.activeAlerts.delete(alertId);

      logger.info(`Performance alert resolved: ${alertId}`, { alertId, resolvedBy });
      this.emit('alertResolved', { alertId, resolvedBy });
    } catch (error) {
      logger.error('Failed to resolve performance alert', { error, alertId });
      throw new Error(`Failed to resolve performance alert: ${error.message}`);
    }
  }

  // Optimization Recommendations
  async generateOptimizationRecommendations(
    templateId?: string
  ): Promise<OptimizationRecommendation[]> {
    try {
      const metrics = await this.collectPerformanceMetrics(templateId);
      const recommendations: OptimizationRecommendation[] = [];

      // Analyze bottlenecks
      if (metrics.bottlenecks.topBottlenecks.length > 0) {
        const topBottleneck = metrics.bottlenecks.topBottlenecks[0];
        if (topBottleneck.impact === 'high') {
          recommendations.push({
            id: this.generateId(),
            type: 'workflow_design',
            priority: 'high',
            title: 'Optimize High-Impact Bottleneck',
            description: `Step "${topBottleneck.stepName}" is causing significant delays with an average execution time of ${topBottleneck.averageTime} seconds.`,
            expectedImpact: 'Reduce overall workflow execution time by 20-30%',
            implementationEffort: 'medium',
            metrics: { bottleneck: topBottleneck },
            createdAt: new Date()
          });
        }
      }

      // Analyze success rates
      if (metrics.successRate.overall < 90) {
        recommendations.push({
          id: this.generateId(),
          type: 'workflow_design',
          priority: 'high',
          title: 'Improve Workflow Success Rate',
          description: `Current success rate is ${metrics.successRate.overall.toFixed(1)}%, which is below the recommended 90% threshold.`,
          expectedImpact: 'Increase workflow reliability and reduce manual intervention',
          implementationEffort: 'high',
          metrics: { successRate: metrics.successRate },
          createdAt: new Date()
        });
      }

      // Analyze SLA compliance
      if (metrics.slaCompliance.overallCompliance < 95) {
        recommendations.push({
          id: this.generateId(),
          type: 'escalation_rules',
          priority: 'medium',
          title: 'Optimize SLA Compliance',
          description: `SLA compliance is at ${metrics.slaCompliance.overallCompliance.toFixed(1)}%. Consider adjusting escalation rules or task assignments.`,
          expectedImpact: 'Improve SLA compliance to 95%+',
          implementationEffort: 'low',
          metrics: { slaCompliance: metrics.slaCompliance },
          createdAt: new Date()
        });
      }

      // Analyze resource utilization
      const overloadedUsers = metrics.resourceUtilization.userWorkload.filter(u => u.activeTasks > 10);
      if (overloadedUsers.length > 0) {
        recommendations.push({
          id: this.generateId(),
          type: 'resource_allocation',
          priority: 'medium',
          title: 'Balance User Workload',
          description: `${overloadedUsers.length} users have more than 10 active tasks. Consider redistributing workload.`,
          expectedImpact: 'Improve task completion times and user satisfaction',
          implementationEffort: 'low',
          metrics: { overloadedUsers },
          createdAt: new Date()
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Failed to generate optimization recommendations', { error, templateId });
      throw new Error(`Failed to generate optimization recommendations: ${error.message}`);
    }
  }

  // Private Helper Methods
  private initializeAlertThresholds(): void {
    this.alertThresholds.set('execution_time', 300); // 5 minutes
    this.alertThresholds.set('success_rate', 90); // 90%
    this.alertThresholds.set('sla_breach', 5); // 5 breaches per hour
    this.alertThresholds.set('error_rate', 10); // 10%
    this.alertThresholds.set('throughput', 10); // 10 workflows per hour minimum
  }

  private startPerformanceMonitoring(): void {
    // Monitor performance every 10 minutes
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performPerformanceCheck();
      } catch (error) {
        logger.error('Performance monitoring error', { error });
      }
    }, 10 * 60 * 1000);
  }

  private async performPerformanceCheck(): Promise<void> {
    try {
      const metrics = await this.collectPerformanceMetrics();
      
      // Check for performance issues
      if (metrics.executionTime.average > 300) {
        await this.createPerformanceAlert(
          'execution_time',
          metrics.executionTime.average,
          300,
          { type: 'average_execution_time' }
        );
      }

      if (metrics.successRate.overall < 90) {
        await this.createPerformanceAlert(
          'success_rate',
          metrics.successRate.overall,
          90,
          { type: 'overall_success_rate' }
        );
      }

      if (metrics.slaCompliance.overallCompliance < 95) {
        await this.createPerformanceAlert(
          'sla_breach',
          metrics.slaCompliance.overallCompliance,
          95,
          { type: 'sla_compliance' }
        );
      }
    } catch (error) {
      logger.error('Failed to perform performance check', { error });
    }
  }

  private shouldTriggerAlert(metricType: MetricType, value: number, threshold: number): boolean {
    switch (metricType) {
      case 'execution_time':
      case 'sla_breach':
      case 'error_rate':
        return value > threshold;
      case 'success_rate':
      case 'throughput':
        return value < threshold;
      default:
        return false;
    }
  }

  private async createPerformanceAlert(
    metricType: MetricType,
    value: number,
    threshold: number,
    context: Record<string, any>
  ): Promise<void> {
    try {
      const alertId = this.generateId();
      const severity = this.calculateAlertSeverity(metricType, value, threshold);
      
      const alert: PerformanceAlert = {
        id: alertId,
        type: this.mapMetricTypeToAlertType(metricType),
        severity,
        title: this.generateAlertTitle(metricType, value),
        description: this.generateAlertDescription(metricType, value, threshold),
        metrics: context,
        threshold,
        currentValue: value,
        createdAt: new Date()
      };

      this.activeAlerts.set(alertId, alert);

      logger.warn(`Performance alert created: ${alert.type}`, {
        alertId,
        metricType,
        value,
        threshold,
        severity
      });

      this.emit('alertCreated', alert);
    } catch (error) {
      logger.error('Failed to create performance alert', { error, metricType, value });
    }
  }

  private calculateAlertSeverity(metricType: MetricType, value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const deviation = Math.abs(value - threshold) / threshold;
    
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.3) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }

  private mapMetricTypeToAlertType(metricType: MetricType): PerformanceAlert['type'] {
    switch (metricType) {
      case 'execution_time':
        return 'performance_degradation';
      case 'success_rate':
      case 'error_rate':
        return 'high_error_rate';
      case 'sla_breach':
        return 'sla_breach';
      case 'throughput':
        return 'bottleneck';
      default:
        return 'performance_degradation';
    }
  }

  private generateAlertTitle(metricType: MetricType, value: number): string {
    switch (metricType) {
      case 'execution_time':
        return `High Execution Time Detected (${value.toFixed(1)}s)`;
      case 'success_rate':
        return `Low Success Rate Detected (${value.toFixed(1)}%)`;
      case 'sla_breach':
        return `SLA Compliance Below Threshold (${value.toFixed(1)}%)`;
      case 'error_rate':
        return `High Error Rate Detected (${value.toFixed(1)}%)`;
      case 'throughput':
        return `Low Throughput Detected (${value.toFixed(1)}/hour)`;
      default:
        return `Performance Issue Detected`;
    }
  }

  private generateAlertDescription(metricType: MetricType, value: number, threshold: number): string {
    return `${metricType} is ${value.toFixed(1)}, which exceeds the threshold of ${threshold}. Immediate attention may be required.`;
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  private calculateTrendData(dataPoints: Array<{ timestamp: Date; value: number }>): TrendData[] {
    // Group by hour and calculate averages
    const hourlyData = new Map<string, { sum: number; count: number }>();
    
    dataPoints.forEach(point => {
      const hour = new Date(point.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      
      const existing = hourlyData.get(key) || { sum: 0, count: 0 };
      existing.sum += point.value;
      existing.count += 1;
      hourlyData.set(key, existing);
    });

    return Array.from(hourlyData.entries()).map(([timestamp, data]) => ({
      timestamp: new Date(timestamp),
      value: data.sum / data.count
    }));
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.metricsCache.clear();
    this.activeAlerts.clear();
  }
}

// Import statements for database tables
const workflowMetrics = {} as any;
const workflowInstances = {} as any;
const workflowStepExecutions = {} as any;
const workflowSteps = {} as any;
const workflowTaskAssignments = {} as any;

export default WorkflowPerformanceMonitoringService;
