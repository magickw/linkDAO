import { db } from '../db/index';
import {
  returns,
  refundTransactions,
  returnEvents,
  returnAnalyticsHourly,
  returnAnalyticsDaily,
  returnMetricsRealtime
} from '../db/schema';
import { eq, and, gte, lte, sql, desc, count, avg, sum, max, min } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';
import { returnTrendAnalysisService, ReturnTrendAnalysis } from './returnTrendAnalysisService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AnalyticsPeriod {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface ReturnMetrics {
  totalReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  pendingReturns: number;
  cancelledReturns: number;
  statusDistribution: Record<string, number>;
}

export interface FinancialMetrics {
  totalRefundAmount: number;
  averageRefundAmount: number;
  maxRefundAmount: number;
  minRefundAmount: number;
  totalRestockingFees: number;
  totalShippingCosts: number;
  netRefundImpact: number;
}

export interface ProcessingTimeMetrics {
  averageApprovalTime: number; // In hours
  averageRefundTime: number;
  averageTotalResolutionTime: number;
  medianApprovalTime: number;
  p95ApprovalTime: number;
  p99ApprovalTime: number;
}

export interface RiskMetrics {
  highRiskReturns: number;
  mediumRiskReturns: number;
  lowRiskReturns: number;
  flaggedForReview: number;
  fraudDetected: number;
  averageRiskScore: number;
}

export interface ReturnAnalytics {
  metrics: ReturnMetrics;
  financial: FinancialMetrics;
  processingTime: ProcessingTimeMetrics;
  risk: RiskMetrics;
  topReturnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  returnsByDay: Array<{
    date: string;
    count: number;
  }>;
  returnRate: number;
  customerSatisfaction: number;
  returnTrends: {
    monthOverMonth: number;
    weeklyTrend: Array<{
      week: string;
      returns: number;
      refunds: number;
    }>;
  };
}

export interface ReturnEvent {
  id: string;
  returnId: string;
  eventType: string;
  eventCategory: string;
  eventData: any;
  previousState?: any;
  newState?: any;
  actorId?: string;
  actorRole?: string;
  automated: boolean;
  timestamp: Date;
}

// ============================================================================
// RETURN ANALYTICS SERVICE
// ============================================================================

export class ReturnAnalyticsService {
  private readonly CACHE_TTL = {
    REALTIME: 30,      // 30 seconds for real-time metrics
    HOURLY: 300,       // 5 minutes for hourly aggregates
    DAILY: 1800,       // 30 minutes for daily aggregates
    ANALYTICS: 600,    // 10 minutes for comprehensive analytics
  };

  // ========================================================================
  // REAL-TIME METRICS CALCULATION
  // ========================================================================

  /**
   * Get real-time return metrics with caching
   */
  async getRealtimeMetrics(): Promise<any> {
    const cacheKey = 'return:metrics:realtime';

    try {
      // Try to get from cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached realtime metrics');
        return cached;
      }

      // Get latest realtime metrics from database
      const latestMetrics = await db
        .select()
        .from(returnMetricsRealtime)
        .orderBy(desc(returnMetricsRealtime.timestamp))
        .limit(1);

      if (latestMetrics.length === 0) {
        // Calculate fresh metrics if none exist
        const metrics = await this.calculateRealtimeMetrics();
        await redisService.set(cacheKey, metrics, this.CACHE_TTL.REALTIME);
        return metrics;
      }

      const result = latestMetrics[0];

      // Cache the result
      await redisService.set(cacheKey, result, this.CACHE_TTL.REALTIME);

      return result;
    } catch (error) {
      safeLogger.error('Error getting realtime metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate current real-time metrics
   */
  private async calculateRealtimeMetrics(): Promise<any> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // Get active returns count
      const activeReturns = await db
        .select({ count: count() })
        .from(returns)
        .where(
          sql`${returns.status} IN ('requested', 'approved', 'in_transit', 'received', 'inspected', 'refund_processing')`
        );

      // Get pending approval count
      const pendingApproval = await db
        .select({ count: count() })
        .from(returns)
        .where(eq(returns.status, 'requested'));

      // Get pending refund count
      const pendingRefund = await db
        .select({ count: count() })
        .from(returns)
        .where(eq(returns.status, 'refund_processing'));

      // Get in-transit returns
      const inTransit = await db
        .select({ count: count() })
        .from(returns)
        .where(eq(returns.status, 'in_transit'));

      // Calculate rate metrics (returns in last 5 minutes)
      const recentReturns = await db
        .select({ count: count() })
        .from(returns)
        .where(gte(returns.createdAt, fiveMinutesAgo));

      const returnsPerMinute = recentReturns[0].count / 5;

      return {
        timestamp: now,
        activeReturns: activeReturns[0].count,
        pendingApproval: pendingApproval[0].count,
        pendingRefund: pendingRefund[0].count,
        inTransitReturns: inTransit[0].count,
        returnsPerMinute,
        approvalsPerMinute: 0, // Would need approval events
        refundsPerMinute: 0,   // Would need refund events
        manualReviewQueueDepth: 0,
        refundProcessingQueueDepth: pendingRefund[0].count,
        inspectionQueueDepth: 0,
        volumeSpikeDetected: false,
      };
    } catch (error) {
      safeLogger.error('Error calculating realtime metrics:', error);
      throw error;
    }
  }

  // ========================================================================
  // STATUS DISTRIBUTION AGGREGATION
  // ========================================================================

  /**
   * Get status distribution for a given period
   */
  async getStatusDistribution(period: AnalyticsPeriod): Promise<Record<string, number>> {
    const cacheKey = `return:status:${period.start}:${period.end}`;

    try {
      // Try cache first
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      const statusCounts = await db
        .select({
          status: returns.status,
          count: count()
        })
        .from(returns)
        .where(
          and(
            gte(returns.createdAt, startDate),
            lte(returns.createdAt, endDate)
          )
        )
        .groupBy(returns.status);

      const distribution: Record<string, number> = {};
      statusCounts.forEach(({ status, count }) => {
        distribution[status || 'unknown'] = count;
      });

      // Cache for 10 minutes
      await redisService.set(cacheKey, distribution, this.CACHE_TTL.ANALYTICS);

      return distribution;
    } catch (error) {
      safeLogger.error('Error getting status distribution:', error);
      throw error;
    }
  }

  // ========================================================================
  // PROCESSING TIME ANALYTICS
  // ========================================================================

  /**
   * Calculate processing time metrics
   */
  async getProcessingTimeMetrics(sellerId: string, period: AnalyticsPeriod): Promise<ProcessingTimeMetrics> {
    const cacheKey = `return:processing:${sellerId}:${period.start}:${period.end}`;

    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Get all completed returns with timing data
      const completedReturns = await db
        .select()
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            gte(returns.createdAt, startDate),
            lte(returns.createdAt, endDate),
            sql`${returns.completedAt} IS NOT NULL`
          )
        );

      const approvalTimes: number[] = [];
      const refundTimes: number[] = [];
      const totalResolutionTimes: number[] = [];

      completedReturns.forEach(ret => {
        // Calculate approval time
        if (ret.approvedAt) {
          const approvalTime = (ret.approvedAt.getTime() - ret.createdAt.getTime()) / (1000 * 60 * 60);
          approvalTimes.push(approvalTime);
        }

        // Calculate refund time
        if (ret.refundedAt && ret.approvedAt) {
          const refundTime = (ret.refundedAt.getTime() - ret.approvedAt.getTime()) / (1000 * 60 * 60);
          refundTimes.push(refundTime);
        }

        // Calculate total resolution time
        if (ret.completedAt) {
          const totalTime = (ret.completedAt.getTime() - ret.createdAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTimes.push(totalTime);
        }
      });

      const metrics: ProcessingTimeMetrics = {
        averageApprovalTime: this.calculateAverage(approvalTimes),
        averageRefundTime: this.calculateAverage(refundTimes),
        averageTotalResolutionTime: this.calculateAverage(totalResolutionTimes),
        medianApprovalTime: this.calculateMedian(approvalTimes),
        p95ApprovalTime: this.calculatePercentile(approvalTimes, 95),
        p99ApprovalTime: this.calculatePercentile(approvalTimes, 99),
      };

      await redisService.set(cacheKey, metrics, this.CACHE_TTL.ANALYTICS);

      return metrics;
    } catch (error) {
      safeLogger.error('Error calculating processing time metrics:', error);
      throw error;
    }
  }

  // ========================================================================
  // EVENT PROCESSING PIPELINE
  // ========================================================================

  /**
   * Ingest and process a return event
   */
  async processReturnEvent(event: Omit<ReturnEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Validate event
      this.validateEvent(event);

      // Store event in database immediately for data integrity
      await db.insert(returnEvents).values({
        returnId: event.returnId,
        eventType: event.eventType,
        eventCategory: event.eventCategory,
        eventData: event.eventData,
        previousState: event.previousState,
        newState: event.newState,
        actorId: event.actorId,
        actorRole: event.actorRole,
        automated: event.automated,
      });

      // Invalidate relevant caches
      await this.invalidateEventCaches(event.returnId);

      // Queue for background processing (metrics calculation, etc.)
      const { queueReturnEvent } = await import('../queues/returnEventQueue');
      await queueReturnEvent(event);

      // Trigger real-time updates immediately
      await this.triggerRealtimeUpdate(event);

      safeLogger.info('Return event processed successfully', {
        returnId: event.returnId,
        eventType: event.eventType,
      });
    } catch (error) {
      safeLogger.error('Error processing return event:', error);
      throw error;
    }
  }

  /**
   * Get event history for a return
   */
  async getReturnEventHistory(returnId: string): Promise<ReturnEvent[]> {
    const cacheKey = `return:events:${returnId}`;

    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const events = await db
        .select()
        .from(returnEvents)
        .where(eq(returnEvents.returnId, returnId))
        .orderBy(desc(returnEvents.timestamp));

      await redisService.set(cacheKey, events, this.CACHE_TTL.ANALYTICS);

      return events as ReturnEvent[];
    } catch (error) {
      safeLogger.error('Error getting return event history:', error);
      throw error;
    }
  }

  // ========================================================================
  // COMPREHENSIVE ANALYTICS
  // ========================================================================

  /**
   * Get comprehensive return analytics for a seller
   */
  async getEnhancedAnalytics(sellerId: string, period: AnalyticsPeriod): Promise<ReturnAnalytics> {
    const cacheKey = `return:analytics:${sellerId}:${period.start}:${period.end}`;

    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        safeLogger.debug('Returning cached analytics');
        return cached;
      }

      const startDate = new Date(period.start);
      const endDate = new Date(period.end);

      // Fetch all returns for the period
      const allReturns = await db
        .select()
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            gte(returns.createdAt, startDate),
            lte(returns.createdAt, endDate)
          )
        );

      // Calculate metrics
      const metrics = this.calculateReturnMetrics(allReturns);
      const financial = await this.calculateFinancialMetrics(allReturns, period);
      const processingTime = await this.getProcessingTimeMetrics(sellerId, period);
      const risk = this.calculateRiskMetrics(allReturns);
      const topReturnReasons = this.calculateTopReasons(allReturns);
      const returnsByDay = this.calculateReturnsByDay(allReturns, startDate, endDate);

      // Get trend analysis
      const trendAnalysis = await returnTrendAnalysisService.getComprehensiveTrendAnalysis(period, sellerId);

      const analytics: ReturnAnalytics = {
        metrics,
        financial,
        processingTime,
        risk,
        topReturnReasons,
        returnsByDay,
        returnRate: 0, // Would need total orders data
        customerSatisfaction: 4.2, // Would come from satisfaction surveys
        returnTrends: {
          monthOverMonth: trendAnalysis.periodComparison.percentageChange,
          weeklyTrend: [],
        },
      };

      // Cache the result
      await redisService.set(cacheKey, analytics, this.CACHE_TTL.ANALYTICS);

      return analytics;
    } catch (error) {
      safeLogger.error('Error getting enhanced analytics:', error);
      throw error;
    }
  }

  /**
   * Get detailed trend analysis
   * Validates: Property 4 - Comprehensive Trend Analysis
   */
  async getTrendAnalysis(sellerId: string, period: AnalyticsPeriod): Promise<ReturnTrendAnalysis> {
    try {
      return await returnTrendAnalysisService.getComprehensiveTrendAnalysis(period, sellerId);
    } catch (error) {
      safeLogger.error('Error getting trend analysis:', error);
      throw error;
    }
  }

  // ========================================================================
  // CACHE MANAGEMENT
  // ========================================================================

  /**
   * Invalidate caches related to a return
   */
  private async invalidateEventCaches(returnId: string): Promise<void> {
    try {
      await redisService.del(`return:events:${returnId}`);
      await redisService.del('return:metrics:realtime');

      // Invalidate pattern-based caches
      const keys = await redisService.keys('return:analytics:*');
      for (const key of keys) {
        await redisService.del(key);
      }
    } catch (error) {
      safeLogger.error('Error invalidating caches:', error);
    }
  }

  /**
   * Warm cache with commonly accessed data
   */
  async warmCache(sellerId: string): Promise<void> {
    try {
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const period: AnalyticsPeriod = {
        start: last30Days.toISOString(),
        end: now.toISOString(),
      };

      // Pre-load analytics
      await this.getEnhancedAnalytics(sellerId, period);
      await this.getRealtimeMetrics();

      safeLogger.info('Cache warmed successfully', { sellerId });
    } catch (error) {
      safeLogger.error('Error warming cache:', error);
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private calculateReturnMetrics(returns: any[]): ReturnMetrics {
    const statusDistribution: Record<string, number> = {};

    returns.forEach(ret => {
      const status = ret.status || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    return {
      totalReturns: returns.length,
      approvedReturns: returns.filter(r => r.status === 'approved').length,
      rejectedReturns: returns.filter(r => r.status === 'rejected').length,
      completedReturns: returns.filter(r => r.status === 'completed').length,
      pendingReturns: returns.filter(r =>
        ['requested', 'approved', 'label_generated', 'in_transit', 'received'].includes(r.status)
      ).length,
      cancelledReturns: returns.filter(r => r.status === 'cancelled').length,
      statusDistribution,
    };
  }

  private async calculateFinancialMetrics(returns: any[], period: AnalyticsPeriod): Promise<FinancialMetrics> {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);

    const refunds = await db
      .select()
      .from(refundTransactions)
      .where(
        and(
          gte(refundTransactions.createdAt, startDate),
          lte(refundTransactions.createdAt, endDate),
          eq(refundTransactions.status, 'completed')
        )
      );

    const amounts = refunds.map(r => Number(r.amount));
    const restockingFees = returns.map(r => Number(r.restockingFee || 0));
    const shippingCosts = returns.map(r => Number(r.returnShippingCost || 0));

    return {
      totalRefundAmount: amounts.reduce((sum, amt) => sum + amt, 0),
      averageRefundAmount: this.calculateAverage(amounts),
      maxRefundAmount: amounts.length > 0 ? Math.max(...amounts) : 0,
      minRefundAmount: amounts.length > 0 ? Math.min(...amounts) : 0,
      totalRestockingFees: restockingFees.reduce((sum, fee) => sum + fee, 0),
      totalShippingCosts: shippingCosts.reduce((sum, cost) => sum + cost, 0),
      netRefundImpact: 0, // Would calculate: refunds - restocking - shipping
    };
  }

  private calculateRiskMetrics(returns: any[]): RiskMetrics {
    const riskScores = returns.map(r => r.riskScore || 0);

    return {
      highRiskReturns: returns.filter(r => r.riskLevel === 'high').length,
      mediumRiskReturns: returns.filter(r => r.riskLevel === 'medium').length,
      lowRiskReturns: returns.filter(r => r.riskLevel === 'low').length,
      flaggedForReview: returns.filter(r => r.requiresManualReview).length,
      fraudDetected: 0, // Would come from fraud detection service
      averageRiskScore: this.calculateAverage(riskScores),
    };
  }

  private calculateTopReasons(returns: any[]): Array<{ reason: string; count: number; percentage: number }> {
    const reasonCounts: Record<string, number> = {};

    returns.forEach(ret => {
      const reason = ret.returnReason || 'unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const total = returns.length;

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateReturnsByDay(
    returns: any[],
    startDate: Date,
    endDate: Date
  ): Array<{ date: string; count: number }> {
    const dateMap: Record<string, number> = {};

    returns.forEach(ret => {
      const date = ret.createdAt.toISOString().split('T')[0];
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    const result: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        count: dateMap[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  private validateEvent(event: Omit<ReturnEvent, 'id' | 'timestamp'>): void {
    if (!event.returnId) {
      throw new Error('Return ID is required');
    }
    if (!event.eventType) {
      throw new Error('Event type is required');
    }
    if (!event.eventCategory) {
      throw new Error('Event category is required');
    }
  }

  private async triggerRealtimeUpdate(event: Omit<ReturnEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Get fresh metrics
      const metrics = await this.getRealtimeMetrics();

      // Get admin WebSocket service instance
      const { getWebSocketService } = await import('./webSocketService');
      const wsService = getWebSocketService();

      if (wsService && (wsService as any).io) {
        // We need to access the AdminWebSocketService instance or use the io instance directly
        // Since AdminWebSocketService wraps the io instance, we can emit to the admin namespace
        (wsService as any).io.of('/admin').to('metrics:returns').emit('return_metrics_update', {
          data: metrics,
          event: {
            type: event.eventType,
            returnId: event.returnId
          },
          timestamp: new Date().toISOString()
        });

        safeLogger.debug('Triggered realtime update for return event', { eventType: event.eventType });
      }
    } catch (error) {
      safeLogger.error('Error triggering realtime update:', error);
      // Don't throw here to avoid failing the main request
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Singleton instance
export const returnAnalyticsService = new ReturnAnalyticsService();
