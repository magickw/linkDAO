import { db } from '../db/index.ts';
import { returns, returnPolicies, refundTransactions } from '../db/schema.ts';
import { eq, and, gte, lte, sql, desc, count } from 'drizzle-orm';
import { safeLogger } from '../utils/logger.ts';

export interface AnalyticsPeriod {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface ReturnAnalytics {
  totalReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  completedReturns: number;
  pendingReturns: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  returnRate: number;
  topReturnReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
  returnsByDay: Array<{
    date: string;
    count: number;
  }>;
  averageProcessingTime: number; // In days
  fraudAlerts: number;
  customerSatisfaction: number;
  returnTrends: {
    monthOverMonth: number; // Percentage change
    weeklyTrend: Array<{
      week: string;
      returns: number;
      refunds: number;
    }>;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    returnCount: number;
    returnRate: number;
  }>;
  carrierPerformance: Array<{
    carrier: string;
    averageDeliveryTime: number; // In days
    onTimeRate: number; // Percentage
  }>;
  refundMethodDistribution: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
  inspectionStats: {
    passedCount: number;
    failedCount: number;
    averageCondition: 'as_new' | 'good' | 'acceptable' | 'damaged' | 'unusable';
  };
}

export class ReturnAnalyticsService {
  /**
   * Get comprehensive return analytics for a seller
   */
  async getEnhancedAnalytics(sellerId: string, period: AnalyticsPeriod): Promise<ReturnAnalytics> {
    try {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      
      // Get all returns for the period
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
      
      // Get all refund transactions for the period
      const refundTransactionsForPeriod = await db
        .select()
        .from(refundTransactions)
        .where(
          and(
            gte(refundTransactions.createdAt, startDate),
            lte(refundTransactions.createdAt, endDate)
          )
        );
      
      // Calculate basic metrics
      const totalReturns = allReturns.length;
      const approvedReturns = allReturns.filter(r => r.status === 'approved').length;
      const rejectedReturns = allReturns.filter(r => r.status === 'rejected').length;
      const completedReturns = allReturns.filter(r => r.status === 'completed').length;
      const pendingReturns = allReturns.filter(r => ['requested', 'approved', 'label_generated', 'in_transit', 'received'].includes(r.status)).length;
      
      // Calculate total and average refund amount
      const totalRefundAmount = refundTransactionsForPeriod
        .filter(rt => rt.status === 'completed')
        .reduce((sum, rt) => sum + Number(rt.amount), 0);
      
      const completedRefunds = refundTransactionsForPeriod.filter(rt => rt.status === 'completed');
      const averageRefundAmount = completedRefunds.length > 0 
        ? totalRefundAmount / completedRefunds.length 
        : 0;
      
      // Get return reasons breakdown
      const reasonCounts: Record<string, number> = {};
      allReturns.forEach(ret => {
        const reason = ret.returnReason;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
      
      const totalReasons = Object.values(reasonCounts).reduce((sum, count) => sum + count, 0);
      const topReturnReasons = Object.entries(reasonCounts)
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalReasons > 0 ? (count / totalReasons) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Calculate returns by day
      const returnsByDay: Array<{ date: string; count: number }> = [];
      const dateMap: Record<string, number> = {};
      
      allReturns.forEach(ret => {
        const date = ret.createdAt.toISOString().split('T')[0];
        dateMap[date] = (dateMap[date] || 0) + 1;
      });
      
      // Create date range for the period
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        returnsByDay.push({
          date: dateStr,
          count: dateMap[dateStr] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Calculate average processing time (from request to completion)
      let totalProcessingTime = 0;
      let completedCount = 0;
      
      allReturns.forEach(ret => {
        if (ret.completedAt) {
          const requestDate = new Date(ret.createdAt);
          const completionDate = new Date(ret.completedAt);
          const diffTime = Math.abs(completionDate.getTime() - requestDate.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          totalProcessingTime += diffDays;
          completedCount++;
        }
      });
      
      const averageProcessingTime = completedCount > 0 ? totalProcessingTime / completedCount : 0;
      
      // Mock data for other metrics (in a real implementation, these would come from database queries)
      const returnTrends = {
        monthOverMonth: 5.2, // 5.2% increase
        weeklyTrend: Array.from({ length: 4 }, (_, i) => ({
          week: `Week ${i + 1}`,
          returns: Math.floor(Math.random() * 20) + 5,
          refunds: Math.floor(Math.random() * 15) + 3
        }))
      };
      
      const categoryBreakdown = Array.from({ length: 3 }, (_, i) => ({
        categoryId: `cat-${i + 1}`,
        categoryName: `Category ${i + 1}`,
        returnCount: Math.floor(Math.random() * 10) + 1,
        returnRate: parseFloat((Math.random() * 10).toFixed(2))
      }));
      
      const carrierPerformance = Array.from({ length: 3 }, (_, i) => ({
        carrier: ['FEDEX', 'UPS', 'USPS'][i],
        averageDeliveryTime: parseFloat((Math.random() * 5 + 2).toFixed(1)),
        onTimeRate: parseFloat((Math.random() * 30 + 70).toFixed(1))
      }));
      
      const refundMethodDistribution = [
        { method: 'original_payment', count: 25, percentage: 75.8 },
        { method: 'store_credit', count: 6, percentage: 18.2 },
        { method: 'exchange', count: 2, percentage: 6.0 }
      ];
      
      const inspectionStats = {
        passedCount: 28,
        failedCount: 4,
        averageCondition: 'good' as const
      };
      
      // Calculate return rate (returns / total orders) - this would need orders data
      const returnRate = totalReturns > 0 ? 4.2 : 0; // Placeholder value
      
      return {
        totalReturns,
        approvedReturns,
        rejectedReturns,
        completedReturns,
        pendingReturns,
        totalRefundAmount,
        averageRefundAmount,
        returnRate,
        topReturnReasons,
        returnsByDay,
        averageProcessingTime,
        fraudAlerts: 3, // Placeholder
        customerSatisfaction: 4.2, // Placeholder
        returnTrends,
        categoryBreakdown,
        carrierPerformance,
        refundMethodDistribution,
        inspectionStats
      };
    } catch (error) {
      safeLogger.error('Error getting enhanced return analytics:', error);
      throw error;
    }
  }

  /**
   * Get return analytics by return reason
   */
  async getAnalyticsByReason(sellerId: string, period: AnalyticsPeriod): Promise<Record<string, any>> {
    try {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      
      const returns = await db
        .select({
          returnReason: returns.returnReason,
          status: returns.status,
          originalAmount: returns.originalAmount,
          createdAt: returns.createdAt
        })
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            gte(returns.createdAt, startDate),
            lte(returns.createdAt, endDate)
          )
        );
      
      const result: Record<string, any> = {};
      
      returns.forEach(ret => {
        if (!result[ret.returnReason]) {
          result[ret.returnReason] = {
            count: 0,
            approved: 0,
            rejected: 0,
            totalAmount: 0,
            avgAmount: 0
          };
        }
        
        const reasonData = result[ret.returnReason];
        reasonData.count++;
        reasonData.totalAmount += Number(ret.originalAmount);
        
        if (ret.status === 'approved') reasonData.approved++;
        if (ret.status === 'rejected') reasonData.rejected++;
      });
      
      // Calculate averages
      Object.values(result).forEach((data: any) => {
        data.avgAmount = data.count > 0 ? data.totalAmount / data.count : 0;
      });
      
      return result;
    } catch (error) {
      safeLogger.error('Error getting analytics by reason:', error);
      throw error;
    }
  }

  /**
   * Get return analytics by time period
   */
  async getAnalyticsByTime(sellerId: string, period: AnalyticsPeriod, granularity: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> {
    try {
      const startDate = new Date(period.start);
      const endDate = new Date(period.end);
      
      const returns = await db
        .select({
          status: returns.status,
          createdAt: returns.createdAt,
          originalAmount: returns.originalAmount
        })
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            gte(returns.createdAt, startDate),
            lte(returns.createdAt, endDate)
          )
        );
      
      // Group by time period based on granularity
      const timeGroups: Record<string, any> = {};
      
      returns.forEach(ret => {
        let timeKey: string;
        
        if (granularity === 'daily') {
          timeKey = ret.createdAt.toISOString().split('T')[0];
        } else if (granularity === 'weekly') {
          const week = Math.floor((ret.createdAt.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          timeKey = `Week ${week + 1}`;
        } else { // monthly
          timeKey = `${ret.createdAt.getFullYear()}-${(ret.createdAt.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        
        if (!timeGroups[timeKey]) {
          timeGroups[timeKey] = {
            returns: 0,
            approved: 0,
            rejected: 0,
            totalAmount: 0,
            avgAmount: 0
          };
        }
        
        const group = timeGroups[timeKey];
        group.returns++;
        group.totalAmount += Number(ret.originalAmount);
        
        if (ret.status === 'approved') group.approved++;
        if (ret.status === 'rejected') group.rejected++;
      });
      
      // Calculate averages
      Object.values(timeGroups).forEach((group: any) => {
        group.avgAmount = group.returns > 0 ? group.totalAmount / group.returns : 0;
      });
      
      return {
        granularity,
        period,
        data: timeGroups
      };
    } catch (error) {
      safeLogger.error('Error getting analytics by time:', error);
      throw error;
    }
  }

  /**
   * Generate return performance report
   */
  async generatePerformanceReport(sellerId: string, period: AnalyticsPeriod): Promise<any> {
    try {
      const basicAnalytics = await this.getEnhancedAnalytics(sellerId, period);
      
      // Calculate additional performance metrics
      const performanceMetrics = {
        returnRateTrend: 'decreasing', // Would be calculated from historical data
        refundProcessingEfficiency: 85.5, // Percentage of refunds processed within SLA
        customerSatisfactionTrend: 'stable',
        costOfReturns: basicAnalytics.totalRefundAmount * 0.15, // Estimate of processing costs
        impactOnSales: -2.3 // Estimated impact on future sales (%)
      };
      
      return {
        ...basicAnalytics,
        performanceMetrics,
        recommendations: [
          'Implement stricter quality control to reduce "defective" returns',
          'Consider offering partial refunds instead of full returns for "changed mind" reasons',
          'Review return policy for high-return categories'
        ]
      };
    } catch (error) {
      safeLogger.error('Error generating performance report:', error);
      throw error;
    }
  }
}

export const returnAnalyticsService = new ReturnAnalyticsService();
