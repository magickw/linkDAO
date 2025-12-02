import { db } from '../db/index';
import { refundProviderTransactions } from '../db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Provider Health History Service
 * Tracks and stores provider health metrics over time
 */

export interface HealthSnapshot {
  timestamp: Date;
  provider: 'stripe' | 'paypal' | 'blockchain';
  status: 'operational' | 'degraded' | 'down';
  successRate: number;
  errorRate: number;
  averageResponseTime: number;
  transactionCount: number;
}

export interface HealthTrend {
  provider: 'stripe' | 'paypal' | 'blockchain';
  period: {
    start: Date;
    end: Date;
  };
  snapshots: HealthSnapshot[];
  trends: {
    successRateTrend: 'improving' | 'stable' | 'declining';
    responseTimeTrend: 'improving' | 'stable' | 'declining';
    volumeTrend: 'increasing' | 'stable' | 'decreasing';
  };
  statistics: {
    averageSuccessRate: number;
    averageResponseTime: number;
    totalTransactions: number;
    uptimePercentage: number;
  };
}

export class ProviderHealthHistoryService {
  /**
   * Get health snapshots for a provider over a time period
   * @param provider - Provider name
   * @param startDate - Start of period
   * @param endDate - End of period
   * @param intervalMinutes - Interval between snapshots (default: 15 minutes)
   * @returns Array of health snapshots
   */
  async getHealthSnapshots(
    provider: 'stripe' | 'paypal' | 'blockchain',
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 15
  ): Promise<HealthSnapshot[]> {
    try {
      const snapshots: HealthSnapshot[] = [];
      const intervalMs = intervalMinutes * 60 * 1000;
      
      let currentTime = new Date(startDate);
      
      while (currentTime <= endDate) {
        const windowStart = new Date(currentTime);
        const windowEnd = new Date(currentTime.getTime() + intervalMs);

        // Get statistics for this time window
        const [stats] = await db
          .select({
            successCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'completed' THEN 1 END)`,
            failureCount: sql<number>`COUNT(CASE WHEN ${refundProviderTransactions.providerStatus} = 'failed' THEN 1 END)`,
            totalCount: sql<number>`COUNT(*)`,
            averageResponseTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${refundProviderTransactions.completedAt} - ${refundProviderTransactions.createdAt})) * 1000)`
          })
          .from(refundProviderTransactions)
          .where(
            and(
              eq(refundProviderTransactions.providerName, provider),
              gte(refundProviderTransactions.createdAt, windowStart),
              lte(refundProviderTransactions.createdAt, windowEnd)
            )
          );

        const successCount = Number(stats.successCount) || 0;
        const failureCount = Number(stats.failureCount) || 0;
        const totalCount = Number(stats.totalCount) || 0;
        const avgResponseTime = Number(stats.averageResponseTime) || 0;

        const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;
        const errorRate = totalCount > 0 ? (failureCount / totalCount) * 100 : 0;

        // Determine status
        let status: 'operational' | 'degraded' | 'down';
        if (successRate >= 95) {
          status = 'operational';
        } else if (successRate >= 80) {
          status = 'degraded';
        } else {
          status = 'down';
        }

        snapshots.push({
          timestamp: windowStart,
          provider,
          status,
          successRate,
          errorRate,
          averageResponseTime: avgResponseTime,
          transactionCount: totalCount
        });

        currentTime = windowEnd;
      }

      return snapshots;
    } catch (error) {
      logger.error('Error getting health snapshots:', error);
      throw new Error('Failed to retrieve health snapshots');
    }
  }

  /**
   * Get health trends for a provider
   * @param provider - Provider name
   * @param startDate - Start of period
   * @param endDate - End of period
   * @returns Health trend analysis
   */
  async getHealthTrends(
    provider: 'stripe' | 'paypal' | 'blockchain',
    startDate: Date,
    endDate: Date
  ): Promise<HealthTrend> {
    try {
      const snapshots = await this.getHealthSnapshots(provider, startDate, endDate, 15);

      if (snapshots.length === 0) {
        return {
          provider,
          period: { start: startDate, end: endDate },
          snapshots: [],
          trends: {
            successRateTrend: 'stable',
            responseTimeTrend: 'stable',
            volumeTrend: 'stable'
          },
          statistics: {
            averageSuccessRate: 100,
            averageResponseTime: 0,
            totalTransactions: 0,
            uptimePercentage: 100
          }
        };
      }

      // Calculate trends
      const firstHalf = snapshots.slice(0, Math.floor(snapshots.length / 2));
      const secondHalf = snapshots.slice(Math.floor(snapshots.length / 2));

      const firstHalfAvgSuccess = firstHalf.reduce((sum, s) => sum + s.successRate, 0) / firstHalf.length;
      const secondHalfAvgSuccess = secondHalf.reduce((sum, s) => sum + s.successRate, 0) / secondHalf.length;

      const firstHalfAvgResponse = firstHalf.reduce((sum, s) => sum + s.averageResponseTime, 0) / firstHalf.length;
      const secondHalfAvgResponse = secondHalf.reduce((sum, s) => sum + s.averageResponseTime, 0) / secondHalf.length;

      const firstHalfAvgVolume = firstHalf.reduce((sum, s) => sum + s.transactionCount, 0) / firstHalf.length;
      const secondHalfAvgVolume = secondHalf.reduce((sum, s) => sum + s.transactionCount, 0) / secondHalf.length;

      // Determine trends
      const successRateTrend = 
        secondHalfAvgSuccess > firstHalfAvgSuccess + 2 ? 'improving' :
        secondHalfAvgSuccess < firstHalfAvgSuccess - 2 ? 'declining' : 'stable';

      const responseTimeTrend = 
        secondHalfAvgResponse < firstHalfAvgResponse * 0.9 ? 'improving' :
        secondHalfAvgResponse > firstHalfAvgResponse * 1.1 ? 'declining' : 'stable';

      const volumeTrend = 
        secondHalfAvgVolume > firstHalfAvgVolume * 1.2 ? 'increasing' :
        secondHalfAvgVolume < firstHalfAvgVolume * 0.8 ? 'decreasing' : 'stable';

      // Calculate statistics
      const averageSuccessRate = snapshots.reduce((sum, s) => sum + s.successRate, 0) / snapshots.length;
      const averageResponseTime = snapshots.reduce((sum, s) => sum + s.averageResponseTime, 0) / snapshots.length;
      const totalTransactions = snapshots.reduce((sum, s) => sum + s.transactionCount, 0);
      const operationalSnapshots = snapshots.filter(s => s.status === 'operational').length;
      const uptimePercentage = (operationalSnapshots / snapshots.length) * 100;

      return {
        provider,
        period: { start: startDate, end: endDate },
        snapshots,
        trends: {
          successRateTrend,
          responseTimeTrend,
          volumeTrend
        },
        statistics: {
          averageSuccessRate,
          averageResponseTime,
          totalTransactions,
          uptimePercentage
        }
      };
    } catch (error) {
      logger.error('Error getting health trends:', error);
      throw new Error('Failed to retrieve health trends');
    }
  }

  /**
   * Compare health metrics across providers
   * @param startDate - Start of period
   * @param endDate - End of period
   * @returns Comparative health analysis
   */
  async compareProviderHealth(
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    providers: Array<{
      provider: 'stripe' | 'paypal' | 'blockchain';
      rank: number;
      score: number;
      metrics: {
        successRate: number;
        responseTime: number;
        uptime: number;
        volume: number;
      };
    }>;
    recommendations: string[];
  }> {
    try {
      const providers: Array<'stripe' | 'paypal' | 'blockchain'> = ['stripe', 'paypal', 'blockchain'];
      const providerMetrics = [];

      for (const provider of providers) {
        const trend = await this.getHealthTrends(provider, startDate, endDate);
        
        // Calculate a composite health score (0-100)
        const successRateScore = trend.statistics.averageSuccessRate;
        const responseTimeScore = Math.max(0, 100 - (trend.statistics.averageResponseTime / 100));
        const uptimeScore = trend.statistics.uptimePercentage;
        const volumeScore = Math.min(100, (trend.statistics.totalTransactions / 100) * 10);

        const compositeScore = (
          successRateScore * 0.4 +
          responseTimeScore * 0.3 +
          uptimeScore * 0.2 +
          volumeScore * 0.1
        );

        providerMetrics.push({
          provider,
          score: compositeScore,
          metrics: {
            successRate: trend.statistics.averageSuccessRate,
            responseTime: trend.statistics.averageResponseTime,
            uptime: trend.statistics.uptimePercentage,
            volume: trend.statistics.totalTransactions
          }
        });
      }

      // Sort by score and assign ranks
      providerMetrics.sort((a, b) => b.score - a.score);
      const rankedProviders = providerMetrics.map((p, index) => ({
        ...p,
        rank: index + 1
      }));

      // Generate recommendations
      const recommendations: string[] = [];
      
      const bestProvider = rankedProviders[0];
      const worstProvider = rankedProviders[rankedProviders.length - 1];

      if (bestProvider.score - worstProvider.score > 20) {
        recommendations.push(
          `Consider routing more traffic to ${bestProvider.provider} (score: ${bestProvider.score.toFixed(1)}) ` +
          `and less to ${worstProvider.provider} (score: ${worstProvider.score.toFixed(1)})`
        );
      }

      rankedProviders.forEach(p => {
        if (p.metrics.successRate < 95) {
          recommendations.push(
            `${p.provider} has low success rate (${p.metrics.successRate.toFixed(1)}%) - investigate and resolve issues`
          );
        }
        if (p.metrics.responseTime > 3000) {
          recommendations.push(
            `${p.provider} has slow response time (${p.metrics.responseTime.toFixed(0)}ms) - optimize or consider alternatives`
          );
        }
        if (p.metrics.uptime < 99) {
          recommendations.push(
            `${p.provider} has low uptime (${p.metrics.uptime.toFixed(1)}%) - implement redundancy or failover`
          );
        }
      });

      if (recommendations.length === 0) {
        recommendations.push('All providers performing well - continue monitoring');
      }

      return {
        period: { start: startDate, end: endDate },
        providers: rankedProviders,
        recommendations
      };
    } catch (error) {
      logger.error('Error comparing provider health:', error);
      throw new Error('Failed to compare provider health');
    }
  }
}

export const providerHealthHistoryService = new ProviderHealthHistoryService();
