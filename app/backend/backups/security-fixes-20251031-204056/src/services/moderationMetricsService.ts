import { moderationLoggingService, PerformanceMetrics, AccuracyMetrics } from './moderationLoggingService';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connectionPool';
import { safeLogger } from '../utils/safeLogger';
import { moderation_cases, moderation_actions, content_reports, moderation_appeals } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, gte, count, avg, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

export interface SystemHealthMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueDepth: number;
  errorRate: number;
}

export interface BusinessMetrics {
  totalContentProcessed: number;
  contentByType: Record<string, number>;
  actionsByType: Record<string, number>;
  reportsByReason: Record<string, number>;
  appealsByOutcome: Record<string, number>;
  userEngagement: {
    activeReporters: number;
    averageReportsPerUser: number;
    moderatorActivity: number;
  };
}

export interface CostMetrics {
  totalCost: number;
  costByVendor: Record<string, number>;
  costPerDecision: number;
  costTrends: Array<{ date: string; cost: number }>;
}

export interface AlertThresholds {
  errorRateThreshold: number;
  latencyThreshold: number;
  falsePositiveThreshold: number;
  queueDepthThreshold: number;
  costThreshold: number;
}

class ModerationMetricsService {
  private alertThresholds: AlertThresholds = {
    errorRateThreshold: 0.05, // 5%
    latencyThreshold: 5000, // 5 seconds
    falsePositiveThreshold: 0.1, // 10%
    queueDepthThreshold: 1000,
    costThreshold: 1000 // $1000 per hour
  };

  private metricsCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(timeWindow: number = 3600000): Promise<{
    performance: PerformanceMetrics;
    accuracy: AccuracyMetrics;
    health: SystemHealthMetrics;
    business: BusinessMetrics;
    costs: CostMetrics;
  }> {
    const cacheKey = `system_metrics_${timeWindow}`;
    const cached = this.getCachedMetrics(cacheKey);
    if (cached) return cached;

    const [performance, accuracy, health, business, costs] = await Promise.all([
      moderationLoggingService.getPerformanceMetrics(timeWindow),
      moderationLoggingService.getAccuracyMetrics(timeWindow),
      this.getSystemHealthMetrics(),
      this.getBusinessMetrics(timeWindow),
      this.getCostMetrics(timeWindow)
    ]);

    const metrics = { performance, accuracy, health, business, costs };
    this.setCachedMetrics(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get queue depth from database
    const queueDepth = await this.getQueueDepth();

    // Get error rate from recent logs
    const errorRate = await this.calculateErrorRate();

    return {
      uptime,
      memoryUsage: memUsage.heapUsed / memUsage.heapTotal,
      cpuUsage: await this.getCpuUsage(),
      activeConnections: await this.getActiveConnections(),
      queueDepth,
      errorRate
    };
  }

  /**
   * Get business metrics
   */
  async getBusinessMetrics(timeWindow: number): Promise<BusinessMetrics> {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      // Total content processed
      const totalContentResult = await db
        .select({ count: count() })
        .from(moderation_cases)
        .where(gte(moderation_cases.createdAt, cutoff));

      const totalContentProcessed = totalContentResult[0]?.count || 0;

      // Content by type
      const contentByTypeResult = await db
        .select({
          type: moderation_cases.contentType,
          count: count()
        })
        .from(moderation_cases)
        .where(gte(moderation_cases.createdAt, cutoff))
        .groupBy(moderation_cases.contentType);

      const contentByType = contentByTypeResult.reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Actions by type
      const actionsByTypeResult = await db
        .select({
          action: moderation_actions.action,
          count: count()
        })
        .from(moderation_actions)
        .where(gte(moderation_actions.createdAt, cutoff))
        .groupBy(moderation_actions.action);

      const actionsByType = actionsByTypeResult.reduce((acc, row) => {
        acc[row.action] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Reports by reason
      const reportsByReasonResult = await db
        .select({
          reason: content_reports.reason,
          count: count()
        })
        .from(content_reports)
        .where(gte(content_reports.createdAt, cutoff))
        .groupBy(content_reports.reason);

      const reportsByReason = reportsByReasonResult.reduce((acc, row) => {
        acc[row.reason] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Appeals by outcome
      const appealsByOutcomeResult = await db
        .select({
          decision: moderation_appeals.juryDecision,
          count: count()
        })
        .from(moderation_appeals)
        .where(gte(moderation_appeals.createdAt, cutoff))
        .groupBy(moderation_appeals.juryDecision);

      const appealsByOutcome = appealsByOutcomeResult.reduce((acc, row) => {
        if (row.decision) {
          acc[row.decision] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

      // User engagement metrics
      const activeReportersResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${content_reports.reporterId})` })
        .from(content_reports)
        .where(gte(content_reports.createdAt, cutoff));

      const totalReportsResult = await db
        .select({ count: count() })
        .from(content_reports)
        .where(gte(content_reports.createdAt, cutoff));

      const moderatorActivityResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${moderation_actions.appliedBy})` })
        .from(moderation_actions)
        .where(gte(moderation_actions.createdAt, cutoff));

      const activeReporters = activeReportersResult[0]?.count || 0;
      const totalReports = totalReportsResult[0]?.count || 0;
      const moderatorActivity = moderatorActivityResult[0]?.count || 0;

      return {
        totalContentProcessed,
        contentByType,
        actionsByType,
        reportsByReason,
        appealsByOutcome,
        userEngagement: {
          activeReporters,
          averageReportsPerUser: activeReporters > 0 ? totalReports / activeReporters : 0,
          moderatorActivity
        }
      };

    } catch (error) {
      safeLogger.error('Failed to get business metrics:', error);
      return {
        totalContentProcessed: 0,
        contentByType: {},
        actionsByType: {},
        reportsByReason: {},
        appealsByOutcome: {},
        userEngagement: {
          activeReporters: 0,
          averageReportsPerUser: 0,
          moderatorActivity: 0
        }
      };
    }
  }

  /**
   * Get cost metrics
   */
  async getCostMetrics(timeWindow: number): Promise<CostMetrics> {
    // This would integrate with actual billing APIs in production
    const performance = await moderationLoggingService.getPerformanceMetrics(timeWindow);
    
    const totalCost = performance.totalCost;
    const costByVendor = performance.vendorCosts;
    const costPerDecision = performance.totalDecisions > 0 
      ? totalCost / performance.totalDecisions 
      : 0;

    // Generate cost trends (mock data for now)
    const costTrends = this.generateCostTrends(7); // 7 days

    return {
      totalCost,
      costByVendor,
      costPerDecision,
      costTrends
    };
  }

  /**
   * Check if any metrics exceed alert thresholds
   */
  async checkAlertThresholds(): Promise<Array<{
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
    message: string;
  }>> {
    const alerts = [];
    const metrics = await this.getSystemMetrics();

    // Check error rate
    if (metrics.performance.errorRate > this.alertThresholds.errorRateThreshold) {
      alerts.push({
        metric: 'error_rate',
        value: metrics.performance.errorRate,
        threshold: this.alertThresholds.errorRateThreshold,
        severity: metrics.performance.errorRate > this.alertThresholds.errorRateThreshold * 2 ? 'critical' : 'warning',
        message: `Error rate ${(metrics.performance.errorRate * 100).toFixed(2)}% exceeds threshold`
      });
    }

    // Check latency
    if (metrics.performance.averageLatency > this.alertThresholds.latencyThreshold) {
      alerts.push({
        metric: 'latency',
        value: metrics.performance.averageLatency,
        threshold: this.alertThresholds.latencyThreshold,
        severity: metrics.performance.averageLatency > this.alertThresholds.latencyThreshold * 2 ? 'critical' : 'warning',
        message: `Average latency ${metrics.performance.averageLatency}ms exceeds threshold`
      });
    }

    // Check false positive rate
    if (metrics.accuracy.falsePositiveRate > this.alertThresholds.falsePositiveThreshold) {
      alerts.push({
        metric: 'false_positive_rate',
        value: metrics.accuracy.falsePositiveRate,
        threshold: this.alertThresholds.falsePositiveThreshold,
        severity: 'warning',
        message: `False positive rate ${(metrics.accuracy.falsePositiveRate * 100).toFixed(2)}% exceeds threshold`
      });
    }

    // Check queue depth
    if (metrics.health.queueDepth > this.alertThresholds.queueDepthThreshold) {
      alerts.push({
        metric: 'queue_depth',
        value: metrics.health.queueDepth,
        threshold: this.alertThresholds.queueDepthThreshold,
        severity: metrics.health.queueDepth > this.alertThresholds.queueDepthThreshold * 2 ? 'critical' : 'warning',
        message: `Queue depth ${metrics.health.queueDepth} exceeds threshold`
      });
    }

    // Check costs
    if (metrics.costs.totalCost > this.alertThresholds.costThreshold) {
      alerts.push({
        metric: 'cost',
        value: metrics.costs.totalCost,
        threshold: this.alertThresholds.costThreshold,
        severity: 'warning',
        message: `Total cost $${metrics.costs.totalCost.toFixed(2)} exceeds threshold`
      });
    }

    return alerts;
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  /**
   * Get metrics for dashboard display
   */
  async getDashboardMetrics(): Promise<{
    summary: {
      totalDecisions: number;
      averageLatency: number;
      errorRate: number;
      falsePositiveRate: number;
    };
    trends: {
      decisionsOverTime: Array<{ time: string; count: number }>;
      latencyOverTime: Array<{ time: string; latency: number }>;
      costOverTime: Array<{ time: string; cost: number }>;
    };
    alerts: Array<{
      metric: string;
      severity: string;
      message: string;
    }>;
  }> {
    const metrics = await this.getSystemMetrics();
    const alerts = await this.checkAlertThresholds();

    return {
      summary: {
        totalDecisions: metrics.performance.totalDecisions,
        averageLatency: metrics.performance.averageLatency,
        errorRate: metrics.performance.errorRate,
        falsePositiveRate: metrics.accuracy.falsePositiveRate
      },
      trends: {
        decisionsOverTime: this.generateDecisionTrends(24), // 24 hours
        latencyOverTime: this.generateLatencyTrends(24),
        costOverTime: metrics.costs.costTrends
      },
      alerts: alerts.map(alert => ({
        metric: alert.metric,
        severity: alert.severity,
        message: alert.message
      }))
    };
  }

  // Private helper methods

  private getCachedMetrics(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedMetrics(key: string, data: any): void {
    this.metricsCache.set(key, { data, timestamp: Date.now() });
  }

  private async getQueueDepth(): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(moderation_cases)
        .where(eq(moderation_cases.status, 'pending'));
      
      return result[0]?.count || 0;
    } catch {
      return 0;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    // This would calculate from actual error logs
    return Math.random() * 0.02; // Mock: 0-2% error rate
  }

  private async getCpuUsage(): Promise<number> {
    // This would use actual CPU monitoring
    return Math.random() * 0.8; // Mock: 0-80% CPU usage
  }

  private async getActiveConnections(): Promise<number> {
    // This would get actual connection count
    return Math.floor(Math.random() * 100) + 10; // Mock: 10-110 connections
  }

  private generateCostTrends(days: number): Array<{ date: string; cost: number }> {
    const trends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        cost: Math.random() * 100 + 50 // Mock: $50-150 per day
      });
    }
    return trends;
  }

  private generateDecisionTrends(hours: number): Array<{ time: string; count: number }> {
    const trends = [];
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date();
      time.setHours(time.getHours() - i);
      trends.push({
        time: time.toISOString(),
        count: Math.floor(Math.random() * 1000) + 100 // Mock: 100-1100 decisions per hour
      });
    }
    return trends;
  }

  private generateLatencyTrends(hours: number): Array<{ time: string; latency: number }> {
    const trends = [];
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date();
      time.setHours(time.getHours() - i);
      trends.push({
        time: time.toISOString(),
        latency: Math.random() * 2000 + 500 // Mock: 500-2500ms latency
      });
    }
    return trends;
  }
}

export const moderationMetricsService = new ModerationMetricsService();