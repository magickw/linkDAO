import { db } from '../db';
import { 
  system_metrics, 
  vendor_configurations,
  moderationCases,
  contentReports,
  moderationAppeals
} from '../db/schema';
import { eq, gte, lte, desc, count, avg, sum } from 'drizzle-orm';

export interface SystemMetric {
  id?: number;
  metricName: string;
  metricValue: number;
  metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
  tags: Record<string, any>;
  timestamp: Date;
}

export interface DashboardMetrics {
  moderationStats: {
    totalCases: number;
    pendingCases: number;
    blockedContent: number;
    quarantinedContent: number;
    allowedContent: number;
    averageProcessingTime: number;
  };
  vendorHealth: {
    totalVendors: number;
    healthyVendors: number;
    degradedVendors: number;
    unhealthyVendors: number;
  };
  communityReports: {
    totalReports: number;
    openReports: number;
    resolvedReports: number;
    falsePositiveRate: number;
  };
  appeals: {
    totalAppeals: number;
    pendingAppeals: number;
    overturnRate: number;
    averageResolutionTime: number;
  };
  performance: {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  costs: {
    totalCost: number;
    costPerRequest: number;
    vendorCostBreakdown: Record<string, number>;
  };
}

export interface AlertStatus {
  id: number;
  alertName: string;
  status: 'ok' | 'warning' | 'critical';
  currentValue: number;
  thresholdValue: number;
  lastTriggered?: Date;
}

export class SystemStatusDashboardService {
  // Record system metrics
  async recordMetric(metric: SystemMetric): Promise<void> {
    await db.insert(system_metrics).values({
      metricName: metric.metricName,
      metricValue: metric.metricValue.toString(),
      metricType: metric.metricType,
      tags: JSON.stringify(metric.tags),
      timestamp: metric.timestamp || new Date(),
    });
  }

  async recordMetrics(metrics: SystemMetric[]): Promise<void> {
    const values = metrics.map(metric => ({
      metricName: metric.metricName,
      metricValue: metric.metricValue.toString(),
      metricType: metric.metricType,
      tags: JSON.stringify(metric.tags),
      timestamp: metric.timestamp || new Date(),
    }));

    await db.insert(system_metrics).values(values);
  }

  // Get comprehensive dashboard metrics
  async getDashboardMetrics(timeRange: { start: Date; end: Date }): Promise<DashboardMetrics> {
    const [
      moderationStats,
      vendorHealth,
      communityReports,
      appeals,
      performance,
      costs
    ] = await Promise.all([
      this.getModerationStats(timeRange),
      this.getVendorHealth(),
      this.getCommunityReportsStats(timeRange),
      this.getAppealsStats(timeRange),
      this.getPerformanceMetrics(timeRange),
      this.getCostMetrics(timeRange)
    ]);

    return {
      moderationStats,
      vendorHealth,
      communityReports,
      appeals,
      performance,
      costs
    };
  }

  // Get real-time system status
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    alerts: AlertStatus[];
  }> {
    const [vendorHealth, recentMetrics, activeAlerts] = await Promise.all([
      this.getVendorHealth(),
      this.getRecentMetrics(['error_rate', 'latency', 'throughput'], 5),
      this.getActiveAlerts()
    ]);

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const components: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {
      vendors: vendorHealth.unhealthyVendors > 0 ? 'unhealthy' : 
               vendorHealth.degradedVendors > 0 ? 'degraded' : 'healthy',
      moderation: 'healthy', // Based on recent metrics
      database: 'healthy', // Based on connection health
      cache: 'healthy' // Based on Redis health
    };

    // Check for critical alerts
    const criticalAlerts = activeAlerts.filter(alert => alert.status === 'critical');
    if (criticalAlerts.length > 0) {
      overallStatus = 'unhealthy';
    } else if (activeAlerts.some(alert => alert.status === 'warning')) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      components,
      alerts: activeAlerts
    };
  }

  // Get historical metrics for charts
  async getHistoricalMetrics(
    metricNames: string[], 
    timeRange: { start: Date; end: Date },
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<Record<string, Array<{ timestamp: Date; value: number }>>> {
    const results: Record<string, Array<{ timestamp: Date; value: number }>> = {};

    for (const metricName of metricNames) {
      const metrics = await db.select({
        timestamp: system_metrics.timestamp,
        value: system_metrics.metricValue
      })
      .from(system_metrics)
      .where(
        eq(system_metrics.metricName, metricName)
      )
      .orderBy(system_metrics.timestamp);

      results[metricName] = metrics.map(m => ({
        timestamp: m.timestamp!,
        value: parseFloat(m.value)
      }));
    }

    return results;
  }

  // Private helper methods
  private async getModerationStats(timeRange: { start: Date; end: Date }) {
    const totalCasesResult = await db.select({ count: count() })
      .from(moderationCases)
      .where(
        gte(moderationCases.createdAt, timeRange.start)
      );

    const statusCounts = await db.select({
      status: moderationCases.status,
      count: count()
    })
    .from(moderationCases)
    .where(
      gte(moderationCases.createdAt, timeRange.start)
    )
    .groupBy(moderationCases.status);

    const avgProcessingTime = await this.getAverageMetric('processing_time', timeRange);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCases: totalCasesResult[0]?.count || 0,
      pendingCases: statusMap['pending'] || 0,
      blockedContent: statusMap['blocked'] || 0,
      quarantinedContent: statusMap['quarantined'] || 0,
      allowedContent: statusMap['allowed'] || 0,
      averageProcessingTime: avgProcessingTime
    };
  }

  private async getVendorHealth() {
    const vendors = await db.select({
      healthStatus: vendor_configurations.healthStatus
    }).from(vendor_configurations);

    const healthCounts = vendors.reduce((acc, vendor) => {
      const status = vendor.healthStatus || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalVendors: vendors.length,
      healthyVendors: healthCounts['healthy'] || 0,
      degradedVendors: healthCounts['degraded'] || 0,
      unhealthyVendors: (healthCounts['unhealthy'] || 0) + (healthCounts['unknown'] || 0)
    };
  }

  private async getCommunityReportsStats(timeRange: { start: Date; end: Date }) {
    const totalReportsResult = await db.select({ count: count() })
      .from(contentReports)
      .where(
        gte(contentReports.createdAt, timeRange.start)
      );

    const statusCounts = await db.select({
      status: contentReports.status,
      count: count()
    })
    .from(contentReports)
    .where(
      gte(contentReports.createdAt, timeRange.start)
    )
    .groupBy(contentReports.status);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const falsePositiveRate = await this.getAverageMetric('false_positive_rate', timeRange);

    return {
      totalReports: totalReportsResult[0]?.count || 0,
      openReports: statusMap['open'] || 0,
      resolvedReports: statusMap['resolved'] || 0,
      falsePositiveRate: falsePositiveRate
    };
  }

  private async getAppealsStats(timeRange: { start: Date; end: Date }) {
    const totalAppealsResult = await db.select({ count: count() })
      .from(moderationAppeals)
      .where(
        gte(moderationAppeals.createdAt, timeRange.start)
      );

    const statusCounts = await db.select({
      status: moderationAppeals.status,
      count: count()
    })
    .from(moderationAppeals)
    .where(
      gte(moderationAppeals.createdAt, timeRange.start)
    )
    .groupBy(moderationAppeals.status);

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status || 'unknown'] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const overturnRate = await this.getAverageMetric('appeal_overturn_rate', timeRange);
    const avgResolutionTime = await this.getAverageMetric('appeal_resolution_time', timeRange);

    return {
      totalAppeals: totalAppealsResult[0]?.count || 0,
      pendingAppeals: statusMap['open'] || 0,
      overturnRate: overturnRate,
      averageResolutionTime: avgResolutionTime
    };
  }

  private async getPerformanceMetrics(timeRange: { start: Date; end: Date }) {
    const [averageLatency, throughput, errorRate, uptime] = await Promise.all([
      this.getAverageMetric('latency', timeRange),
      this.getAverageMetric('throughput', timeRange),
      this.getAverageMetric('error_rate', timeRange),
      this.getAverageMetric('uptime', timeRange)
    ]);

    return {
      averageLatency,
      throughput,
      errorRate,
      uptime
    };
  }

  private async getCostMetrics(timeRange: { start: Date; end: Date }) {
    const totalCost = await this.getSumMetric('cost', timeRange);
    const totalRequests = await this.getSumMetric('requests', timeRange);
    const costPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;

    // Get vendor cost breakdown
    const vendorCosts = await db.select({
      tags: system_metrics.tags,
      cost: sum(system_metrics.metricValue)
    })
    .from(system_metrics)
    .where(
      eq(system_metrics.metricName, 'vendor_cost')
    )
    .groupBy(system_metrics.tags);

    const vendorCostBreakdown = vendorCosts.reduce((acc, item) => {
      try {
        const tags = JSON.parse(item.tags || '{}');
        const vendorName = tags.vendor || 'unknown';
        acc[vendorName] = parseFloat(item.cost || '0');
      } catch (e) {
        // Handle JSON parse errors
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCost,
      costPerRequest,
      vendorCostBreakdown
    };
  }

  private async getAverageMetric(metricName: string, timeRange: { start: Date; end: Date }): Promise<number> {
    const result = await db.select({
      avg: avg(system_metrics.metricValue)
    })
    .from(system_metrics)
    .where(
      eq(system_metrics.metricName, metricName)
    );

    return parseFloat(result[0]?.avg || '0');
  }

  private async getSumMetric(metricName: string, timeRange: { start: Date; end: Date }): Promise<number> {
    const result = await db.select({
      sum: sum(system_metrics.metricValue)
    })
    .from(system_metrics)
    .where(
      eq(system_metrics.metricName, metricName)
    );

    return parseFloat(result[0]?.sum || '0');
  }

  private async getRecentMetrics(metricNames: string[], minutes: number): Promise<SystemMetric[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    const results = await db.select()
      .from(system_metrics)
      .where(
        gte(system_metrics.timestamp, cutoff)
      )
      .orderBy(desc(system_metrics.timestamp));

    return results.map(row => ({
      id: row.id,
      metricName: row.metricName,
      metricValue: parseFloat(row.metricValue),
      metricType: row.metricType as any,
      tags: JSON.parse(row.tags || '{}'),
      timestamp: row.timestamp!
    }));
  }

  private async getActiveAlerts(): Promise<AlertStatus[]> {
    // This would integrate with the alert system
    // For now, return empty array as placeholder
    return [];
  }
}

export const systemStatusDashboardService = new SystemStatusDashboardService();
