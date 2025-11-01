import { moderationMetricsService } from './moderationMetricsService';
import { safeLogger } from '../utils/safeLogger';
import { moderationLoggingService } from './moderationLoggingService';
import { db } from '../db/connectionPool';
import { moderation_cases, moderation_appeals, content_reports, moderation_actions } from '../db/schema';
import { eq, gte, count, avg, sql, desc } from 'drizzle-orm';

export interface DashboardData {
  overview: {
    totalDecisions: number;
    averageLatency: number;
    errorRate: number;
    queueDepth: number;
    costToday: number;
  };
  accuracy: {
    falsePositiveRate: number;
    falseNegativeRate: number;
    appealOverturnRate: number;
    humanAgreementRate: number;
    accuracyTrend: Array<{ date: string; accuracy: number }>;
  };
  appeals: {
    totalAppeals: number;
    pendingAppeals: number;
    overturnRate: number;
    averageResolutionTime: number;
    appealsByOutcome: Record<string, number>;
    appealsTrend: Array<{ date: string; appeals: number; overturns: number }>;
  };
  performance: {
    throughput: number;
    latencyP95: number;
    vendorPerformance: Record<string, {
      latency: number;
      errorRate: number;
      cost: number;
    }>;
    performanceTrend: Array<{ time: string; latency: number; throughput: number }>;
  };
  content: {
    contentByType: Record<string, number>;
    actionsByType: Record<string, number>;
    topViolationCategories: Array<{ category: string; count: number; percentage: number }>;
    contentTrend: Array<{ date: string; processed: number; blocked: number }>;
  };
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
}

export interface DetailedAnalytics {
  falsePositiveAnalysis: {
    byCategory: Record<string, { count: number; rate: number }>;
    byConfidenceRange: Record<string, { count: number; rate: number }>;
    byUserReputation: Record<string, { count: number; rate: number }>;
    commonPatterns: Array<{ pattern: string; frequency: number }>;
  };
  appealAnalysis: {
    successRateByCategory: Record<string, number>;
    averageStakeAmount: number;
    jurorPerformance: Array<{ jurorId: string; accuracy: number; totalVotes: number }>;
    timeToResolution: Record<string, number>; // by category
  };
  costAnalysis: {
    costByVendor: Record<string, number>;
    costByContentType: Record<string, number>;
    costEfficiency: number; // cost per accurate decision
    projectedMonthlyCost: number;
  };
  userBehavior: {
    reportingPatterns: {
      topReporters: Array<{ userId: string; reports: number; accuracy: number }>;
      reportsByTime: Array<{ hour: number; count: number }>;
      falseReportRate: number;
    };
    moderatorEfficiency: {
      topModerators: Array<{ moderatorId: string; decisions: number; accuracy: number }>;
      averageDecisionTime: number;
      workloadDistribution: Record<string, number>;
    };
  };
}

class ModerationDashboardService {
  private dashboardCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(timeWindow: number = 86400000): Promise<DashboardData> {
    const cacheKey = `dashboard_${timeWindow}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const [overview, accuracy, appeals, performance, content, alerts] = await Promise.all([
      this.getOverviewData(timeWindow),
      this.getAccuracyData(timeWindow),
      this.getAppealsData(timeWindow),
      this.getPerformanceData(timeWindow),
      this.getContentData(timeWindow),
      this.getAlertsData()
    ]);

    const dashboardData: DashboardData = {
      overview,
      accuracy,
      appeals,
      performance,
      content,
      alerts
    };

    this.setCachedData(cacheKey, dashboardData);
    return dashboardData;
  }

  /**
   * Get detailed analytics for deep-dive analysis
   */
  async getDetailedAnalytics(timeWindow: number = 86400000): Promise<DetailedAnalytics> {
    const cacheKey = `analytics_${timeWindow}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const [falsePositiveAnalysis, appealAnalysis, costAnalysis, userBehavior] = await Promise.all([
      this.getFalsePositiveAnalysis(timeWindow),
      this.getAppealAnalysis(timeWindow),
      this.getCostAnalysis(timeWindow),
      this.getUserBehaviorAnalysis(timeWindow)
    ]);

    const analytics: DetailedAnalytics = {
      falsePositiveAnalysis,
      appealAnalysis,
      costAnalysis,
      userBehavior
    };

    this.setCachedData(cacheKey, analytics);
    return analytics;
  }

  /**
   * Get overview metrics
   */
  private async getOverviewData(timeWindow: number) {
    const metrics = await moderationMetricsService.getSystemMetrics(timeWindow);
    
    return {
      totalDecisions: metrics.performance.totalDecisions,
      averageLatency: metrics.performance.averageLatency,
      errorRate: metrics.performance.errorRate,
      queueDepth: metrics.health.queueDepth,
      costToday: metrics.costs.totalCost
    };
  }

  /**
   * Get accuracy metrics with trends
   */
  private async getAccuracyData(timeWindow: number) {
    const cutoff = new Date(Date.now() - timeWindow);
    
    try {
      // Get appeal overturn rate
      const appealsResult = await db
        .select({
          total: count(),
          overturned: sql<number>`COUNT(CASE WHEN ${moderation_appeals.juryDecision} != 'uphold' THEN 1 END)`
        })
        .from(moderation_appeals)
        .where(gte(moderation_appeals.createdAt, cutoff));

      const appeals = appealsResult[0];
      const overturnRate = appeals?.total > 0 ? appeals.overturned / appeals.total : 0;

      // Generate accuracy trend (mock data for now)
      const accuracyTrend = this.generateAccuracyTrend(7);

      return {
        falsePositiveRate: 0.08, // Would calculate from actual data
        falseNegativeRate: 0.05, // Would calculate from actual data
        appealOverturnRate: overturnRate,
        humanAgreementRate: 0.92, // Would calculate from human vs AI agreement
        accuracyTrend
      };

    } catch (error) {
      safeLogger.error('Failed to get accuracy data:', error);
      return {
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        appealOverturnRate: 0,
        humanAgreementRate: 0,
        accuracyTrend: []
      };
    }
  }

  /**
   * Get appeals data with trends
   */
  private async getAppealsData(timeWindow: number) {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      // Total appeals
      const totalAppealsResult = await db
        .select({ count: count() })
        .from(moderation_appeals)
        .where(gte(moderation_appeals.createdAt, cutoff));

      // Pending appeals
      const pendingAppealsResult = await db
        .select({ count: count() })
        .from(moderation_appeals)
        .where(eq(moderation_appeals.status, 'open'));

      // Appeals by outcome
      const appealsByOutcomeResult = await db
        .select({
          outcome: moderation_appeals.juryDecision,
          count: count()
        })
        .from(moderation_appeals)
        .where(gte(moderation_appeals.createdAt, cutoff))
        .groupBy(moderation_appeals.juryDecision);

      const appealsByOutcome = appealsByOutcomeResult.reduce((acc, row) => {
        if (row.outcome) {
          acc[row.outcome] = row.count;
        }
        return acc;
      }, {} as Record<string, number>);

      const totalAppeals = totalAppealsResult[0]?.count || 0;
      const pendingAppeals = pendingAppealsResult[0]?.count || 0;
      const overturns = appealsByOutcome['overturn'] || 0;
      const overturnRate = totalAppeals > 0 ? overturns / totalAppeals : 0;

      // Generate appeals trend
      const appealsTrend = this.generateAppealsTrend(7);

      return {
        totalAppeals,
        pendingAppeals,
        overturnRate,
        averageResolutionTime: 2.5, // days - would calculate from actual data
        appealsByOutcome,
        appealsTrend
      };

    } catch (error) {
      safeLogger.error('Failed to get appeals data:', error);
      return {
        totalAppeals: 0,
        pendingAppeals: 0,
        overturnRate: 0,
        averageResolutionTime: 0,
        appealsByOutcome: {},
        appealsTrend: []
      };
    }
  }

  /**
   * Get performance data
   */
  private async getPerformanceData(timeWindow: number) {
    const metrics = await moderationMetricsService.getSystemMetrics(timeWindow);

    // Generate performance trend
    const performanceTrend = this.generatePerformanceTrend(24);

    return {
      throughput: metrics.performance.throughput,
      latencyP95: metrics.performance.averageLatency * 1.5, // Approximate P95
      vendorPerformance: this.calculateVendorPerformance(metrics),
      performanceTrend
    };
  }

  /**
   * Get content processing data
   */
  private async getContentData(timeWindow: number) {
    const business = await moderationMetricsService.getBusinessMetrics(timeWindow);

    // Get top violation categories
    const topViolationCategories = await this.getTopViolationCategories(timeWindow);

    // Generate content trend
    const contentTrend = this.generateContentTrend(7);

    return {
      contentByType: business.contentByType,
      actionsByType: business.actionsByType,
      topViolationCategories,
      contentTrend
    };
  }

  /**
   * Get current alerts
   */
  private async getAlertsData() {
    // This would integrate with the alerting service
    return [
      {
        id: 'alert_1',
        severity: 'warning' as const,
        message: 'Latency above threshold for 5 minutes',
        timestamp: new Date(),
        acknowledged: false
      }
    ];
  }

  /**
   * Get false positive analysis
   */
  private async getFalsePositiveAnalysis(timeWindow: number) {
    // This would analyze actual false positive data
    return {
      byCategory: {
        'harassment': { count: 45, rate: 0.12 },
        'spam': { count: 23, rate: 0.08 },
        'violence': { count: 12, rate: 0.05 }
      },
      byConfidenceRange: {
        '0.7-0.8': { count: 35, rate: 0.15 },
        '0.8-0.9': { count: 28, rate: 0.08 },
        '0.9-1.0': { count: 17, rate: 0.03 }
      },
      byUserReputation: {
        'low': { count: 42, rate: 0.18 },
        'medium': { count: 25, rate: 0.09 },
        'high': { count: 13, rate: 0.04 }
      },
      commonPatterns: [
        { pattern: 'Sarcasm misclassified as harassment', frequency: 23 },
        { pattern: 'Technical crypto terms flagged as spam', frequency: 18 },
        { pattern: 'Gaming content flagged as violence', frequency: 12 }
      ]
    };
  }

  /**
   * Get appeal analysis
   */
  private async getAppealAnalysis(timeWindow: number) {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      // Average stake amount
      const avgStakeResult = await db
        .select({ avg: avg(moderation_appeals.stakeAmount) })
        .from(moderation_appeals)
        .where(gte(moderation_appeals.createdAt, cutoff));

      const averageStakeAmount = Number(avgStakeResult[0]?.avg || 0);

      return {
        successRateByCategory: {
          'harassment': 0.35,
          'spam': 0.28,
          'violence': 0.15,
          'scam': 0.12
        },
        averageStakeAmount,
        jurorPerformance: [
          { jurorId: 'juror_1', accuracy: 0.89, totalVotes: 45 },
          { jurorId: 'juror_2', accuracy: 0.92, totalVotes: 38 },
          { jurorId: 'juror_3', accuracy: 0.85, totalVotes: 52 }
        ],
        timeToResolution: {
          'harassment': 2.3,
          'spam': 1.8,
          'violence': 3.1,
          'scam': 2.7
        }
      };

    } catch (error) {
      safeLogger.error('Failed to get appeal analysis:', error);
      return {
        successRateByCategory: {},
        averageStakeAmount: 0,
        jurorPerformance: [],
        timeToResolution: {}
      };
    }
  }

  /**
   * Get cost analysis
   */
  private async getCostAnalysis(timeWindow: number) {
    const metrics = await moderationMetricsService.getSystemMetrics(timeWindow);

    return {
      costByVendor: metrics.costs.costByVendor,
      costByContentType: {
        'text': 0.002,
        'image': 0.015,
        'video': 0.045,
        'link': 0.001
      },
      costEfficiency: metrics.costs.costPerDecision,
      projectedMonthlyCost: metrics.costs.totalCost * 30 * 24 // Rough projection
    };
  }

  /**
   * Get user behavior analysis
   */
  private async getUserBehaviorAnalysis(timeWindow: number) {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      // Top reporters
      const topReportersResult = await db
        .select({
          userId: content_reports.reporterId,
          reports: count(),
          avgWeight: avg(content_reports.weight)
        })
        .from(content_reports)
        .where(gte(content_reports.createdAt, cutoff))
        .groupBy(content_reports.reporterId)
        .orderBy(desc(count()))
        .limit(10);

      const topReporters = topReportersResult.map(row => ({
        userId: row.userId,
        reports: row.reports,
        accuracy: Number(row.avgWeight) || 0
      }));

      // Reports by hour
      const reportsByTime = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: Math.floor(Math.random() * 50) + 10 // Mock data
      }));

      return {
        reportingPatterns: {
          topReporters,
          reportsByTime,
          falseReportRate: 0.15
        },
        moderatorEfficiency: {
          topModerators: [
            { moderatorId: 'mod_1', decisions: 234, accuracy: 0.94 },
            { moderatorId: 'mod_2', decisions: 189, accuracy: 0.91 },
            { moderatorId: 'mod_3', decisions: 156, accuracy: 0.96 }
          ],
          averageDecisionTime: 45, // seconds
          workloadDistribution: {
            'mod_1': 0.35,
            'mod_2': 0.28,
            'mod_3': 0.22,
            'mod_4': 0.15
          }
        }
      };

    } catch (error) {
      safeLogger.error('Failed to get user behavior analysis:', error);
      return {
        reportingPatterns: {
          topReporters: [],
          reportsByTime: [],
          falseReportRate: 0
        },
        moderatorEfficiency: {
          topModerators: [],
          averageDecisionTime: 0,
          workloadDistribution: {}
        }
      };
    }
  }

  // Helper methods for generating trend data

  private generateAccuracyTrend(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        date: date.toISOString().split('T')[0],
        accuracy: 0.85 + Math.random() * 0.1 // 85-95% accuracy
      };
    });
  }

  private generateAppealsTrend(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const appeals = Math.floor(Math.random() * 20) + 5;
      return {
        date: date.toISOString().split('T')[0],
        appeals,
        overturns: Math.floor(appeals * (0.2 + Math.random() * 0.2)) // 20-40% overturn rate
      };
    });
  }

  private generatePerformanceTrend(hours: number) {
    return Array.from({ length: hours }, (_, i) => {
      const time = new Date();
      time.setHours(time.getHours() - (hours - 1 - i));
      return {
        time: time.toISOString(),
        latency: 1000 + Math.random() * 2000, // 1-3 second latency
        throughput: 50 + Math.random() * 100 // 50-150 decisions/hour
      };
    });
  }

  private generateContentTrend(days: number) {
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const processed = Math.floor(Math.random() * 5000) + 1000;
      return {
        date: date.toISOString().split('T')[0],
        processed,
        blocked: Math.floor(processed * (0.05 + Math.random() * 0.1)) // 5-15% blocked
      };
    });
  }

  private calculateVendorPerformance(metrics: any) {
    const vendors = Object.keys(metrics.performance.vendorLatencies);
    return vendors.reduce((acc, vendor) => {
      acc[vendor] = {
        latency: metrics.performance.vendorLatencies[vendor] || 0,
        errorRate: Math.random() * 0.02, // Mock error rate
        cost: metrics.performance.vendorCosts[vendor] || 0
      };
      return acc;
    }, {} as Record<string, any>);
  }

  private async getTopViolationCategories(timeWindow: number) {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      const result = await db
        .select({
          category: moderation_cases.reasonCode,
          count: count()
        })
        .from(moderation_cases)
        .where(gte(moderation_cases.createdAt, cutoff))
        .groupBy(moderation_cases.reasonCode)
        .orderBy(desc(count()))
        .limit(10);

      const total = result.reduce((sum, row) => sum + row.count, 0);

      return result
        .filter(row => row.category)
        .map(row => ({
          category: row.category!,
          count: row.count,
          percentage: total > 0 ? (row.count / total) * 100 : 0
        }));

    } catch (error) {
      safeLogger.error('Failed to get top violation categories:', error);
      return [];
    }
  }

  // Cache management

  private getCachedData(key: string): any {
    const cached = this.dashboardCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.dashboardCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear dashboard cache
   */
  clearCache(): void {
    this.dashboardCache.clear();
  }
}

export const moderationDashboardService = new ModerationDashboardService();
