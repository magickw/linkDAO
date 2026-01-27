import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';
import { db } from '../../db';
import { 
  sellerScorecards, 
  sellerPerformanceHistory, 
  sellerPerformanceAlerts,
  sellers,
  orders,
  reviews,
  disputes,
  marketplaceListings
} from '../../db/schema';

export interface SellerScorecard {
  id: number;
  sellerWalletAddress: string;
  overallScore: number;
  dimensions: {
    customerSatisfaction: number;
    orderFulfillment: number;
    responseTime: number;
    disputeRate: number;
    growthRate: number;
  };
  performanceTier: string;
  trends: PerformanceTrend[];
  recommendations: string[];
  lastCalculatedAt: Date;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: string;
}

export interface PerformanceMetrics {
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  totalDisputes: number;
  averageResponseTime: number; // in hours
  monthlyRevenue: number;
  repeatCustomerRate: number;
}

class SellerScorecardService {
  
  // Calculate comprehensive seller scorecard
  async calculateSellerScorecard(sellerWalletAddress: string): Promise<SellerScorecard> {
    try {
      // Get current performance metrics
      const metrics = await this.getPerformanceMetrics(sellerWalletAddress);
      
      // Calculate individual dimension scores
      const dimensions = {
        customerSatisfaction: this.calculateCustomerSatisfactionScore(metrics),
        orderFulfillment: this.calculateOrderFulfillmentScore(metrics),
        responseTime: this.calculateResponseTimeScore(metrics),
        disputeRate: this.calculateDisputeRateScore(metrics),
        growthRate: await this.calculateGrowthRateScore(sellerWalletAddress)
      };

      // Calculate overall score (weighted average)
      const overallScore = this.calculateOverallScore(dimensions);
      
      // Determine performance tier
      const performanceTier = this.determinePerformanceTier(overallScore);
      
      // Get performance trends
      const trends = await this.getPerformanceTrends(sellerWalletAddress);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(dimensions, trends);

      // Save or update scorecard
      const scorecard = await this.saveScorecard(sellerWalletAddress, {
        overallScore,
        dimensions,
        performanceTier
      });

      return {
        id: scorecard.id,
        sellerWalletAddress,
        overallScore,
        dimensions,
        performanceTier,
        trends,
        recommendations,
        lastCalculatedAt: scorecard.lastCalculatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error calculating seller scorecard:', error);
      throw new Error('Failed to calculate seller scorecard');
    }
  }

  // Get seller scorecard (existing or calculate new)
  async getSellerScorecard(sellerWalletAddress: string): Promise<SellerScorecard | null> {
    try {
      // Check if scorecard exists and is recent (within 24 hours)
      const existingScorecard = await db
        .select()
        .from(sellerScorecards)
        .where(eq(sellerScorecards.sellerWalletAddress, sellerWalletAddress))
        .limit(1);

      if (existingScorecard.length > 0) {
        const scorecard = existingScorecard[0];
        const lastCalculated = new Date(scorecard.lastCalculatedAt || 0);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastCalculated.getTime()) / (1000 * 60 * 60);

        // If scorecard is less than 24 hours old, return it
        if (hoursDiff < 24) {
          const trends = await this.getPerformanceTrends(sellerWalletAddress);
          const recommendations = this.generateRecommendations({
            customerSatisfaction: Number(scorecard.customerSatisfaction),
            orderFulfillment: Number(scorecard.orderFulfillment),
            responseTime: Number(scorecard.responseTime),
            disputeRate: Number(scorecard.disputeRate),
            growthRate: Number(scorecard.growthRate)
          }, trends);

          return {
            id: scorecard.id,
            sellerWalletAddress,
            overallScore: Number(scorecard.overallScore),
            dimensions: {
              customerSatisfaction: Number(scorecard.customerSatisfaction),
              orderFulfillment: Number(scorecard.orderFulfillment),
              responseTime: Number(scorecard.responseTime),
              disputeRate: Number(scorecard.disputeRate),
              growthRate: Number(scorecard.growthRate)
            },
            performanceTier: scorecard.performanceTier || 'bronze',
            trends,
            recommendations,
            lastCalculatedAt: lastCalculated
          };
        }
      }

      // Calculate new scorecard
      return await this.calculateSellerScorecard(sellerWalletAddress);
    } catch (error) {
      safeLogger.error('Error getting seller scorecard:', error);
      return null;
    }
  }

  // Get performance metrics from database
  private async getPerformanceMetrics(sellerWalletAddress: string): Promise<PerformanceMetrics> {
    try {
      // Get order statistics
      const orderStats = await db
        .select({
          totalOrders: sql<number>`count(*)`,
          completedOrders: sql<number>`count(*) filter (where orders.status = 'completed')`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(eq(marketplaceListings.sellerAddress, sellerWalletAddress));

      // Get average rating
      const ratingStats = await db
        .select({
          averageRating: sql<number>`coalesce(avg(rating), 0)`,
        })
        .from(reviews)
        .where(eq(reviews.revieweeId, sellerWalletAddress));

      // Get dispute count
      const disputeStats = await db
        .select({
          totalDisputes: sql<number>`count(*)`,
        })
        .from(disputes)
        .innerJoin(orders, eq(disputes.escrowId, orders.escrowId))
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(eq(marketplaceListings.sellerAddress, sellerWalletAddress));

      // Get monthly revenue (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const revenueStats = await db
        .select({
          monthlyRevenue: sql<number>`coalesce(sum(orders.total_amount::numeric), 0)`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(and(
          eq(marketplaceListings.sellerAddress, sellerWalletAddress),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, thirtyDaysAgo)
        ));

      const orderData = orderStats[0] || { totalOrders: 0, completedOrders: 0 };
      const ratingData = ratingStats[0] || { averageRating: 0 };
      const disputeData = disputeStats[0] || { totalDisputes: 0 };
      const revenueData = revenueStats[0] || { monthlyRevenue: 0 };

      return {
        totalOrders: orderData.totalOrders,
        completedOrders: orderData.completedOrders,
        averageRating: Number(ratingData.averageRating),
        totalDisputes: disputeData.totalDisputes,
        averageResponseTime: 24, // Mock data - would need message response tracking
        monthlyRevenue: Number(revenueData.monthlyRevenue),
        repeatCustomerRate: 0.15 // Mock data - would need customer analysis
      };
    } catch (error) {
      safeLogger.error('Error getting performance metrics:', error);
      return {
        totalOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalDisputes: 0,
        averageResponseTime: 0,
        monthlyRevenue: 0,
        repeatCustomerRate: 0
      };
    }
  }

  // Calculate customer satisfaction score (0-100)
  private calculateCustomerSatisfactionScore(metrics: PerformanceMetrics): number {
    if (metrics.totalOrders === 0) return 0;
    
    // Base score from average rating (0-5 scale to 0-100)
    const ratingScore = (metrics.averageRating / 5) * 100;
    
    // Adjust for repeat customer rate
    const repeatBonus = metrics.repeatCustomerRate * 20; // Up to 20 bonus points
    
    return Math.min(100, Math.max(0, ratingScore + repeatBonus));
  }

  // Calculate order fulfillment score (0-100)
  private calculateOrderFulfillmentScore(metrics: PerformanceMetrics): number {
    if (metrics.totalOrders === 0) return 0;
    
    const fulfillmentRate = metrics.completedOrders / metrics.totalOrders;
    return Math.round(fulfillmentRate * 100);
  }

  // Calculate response time score (0-100)
  private calculateResponseTimeScore(metrics: PerformanceMetrics): number {
    // Excellent: < 2 hours (100), Good: < 12 hours (80), Fair: < 24 hours (60), Poor: > 24 hours (40)
    if (metrics.averageResponseTime <= 2) return 100;
    if (metrics.averageResponseTime <= 12) return 80;
    if (metrics.averageResponseTime <= 24) return 60;
    if (metrics.averageResponseTime <= 48) return 40;
    return 20;
  }

  // Calculate dispute rate score (0-100)
  private calculateDisputeRateScore(metrics: PerformanceMetrics): number {
    if (metrics.totalOrders === 0) return 100; // No orders, no disputes
    
    const disputeRate = metrics.totalDisputes / metrics.totalOrders;
    
    // Excellent: < 1% (100), Good: < 3% (80), Fair: < 5% (60), Poor: > 5% (40)
    if (disputeRate < 0.01) return 100;
    if (disputeRate < 0.03) return 80;
    if (disputeRate < 0.05) return 60;
    if (disputeRate < 0.10) return 40;
    return 20;
  }

  // Calculate growth rate score (0-100)
  private async calculateGrowthRateScore(sellerWalletAddress: string): Promise<number> {
    try {
      // Compare current month revenue to previous month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [currentRevenue, previousRevenue] = await Promise.all([
        this.getRevenueForPeriod(sellerWalletAddress, currentMonthStart, now),
        this.getRevenueForPeriod(sellerWalletAddress, previousMonthStart, previousMonthEnd)
      ]);

      if (previousRevenue === 0) {
        return currentRevenue > 0 ? 100 : 50; // New seller with sales gets high score
      }

      const growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
      
      // Excellent: > 20% (100), Good: > 10% (80), Fair: > 0% (60), Declining: < 0% (40)
      if (growthRate > 20) return 100;
      if (growthRate > 10) return 80;
      if (growthRate > 0) return 60;
      if (growthRate > -10) return 40;
      return 20;
    } catch (error) {
      safeLogger.error('Error calculating growth rate score:', error);
      return 50; // Default neutral score
    }
  }

  // Get revenue for a specific period
  private async getRevenueForPeriod(sellerWalletAddress: string, startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db
        .select({
          revenue: sql<number>`coalesce(sum(orders.total_amount::numeric), 0)`,
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(and(
          eq(marketplaceListings.sellerAddress, sellerWalletAddress),
          eq(orders.status, 'completed'),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate)
        ));

      return Number(result[0]?.revenue || 0);
    } catch (error) {
      safeLogger.error('Error getting revenue for period:', error);
      return 0;
    }
  }

  // Calculate overall score (weighted average)
  private calculateOverallScore(dimensions: SellerScorecard['dimensions']): number {
    const weights = {
      customerSatisfaction: 0.25,
      orderFulfillment: 0.25,
      responseTime: 0.20,
      disputeRate: 0.20,
      growthRate: 0.10
    };

    const weightedSum = 
      dimensions.customerSatisfaction * weights.customerSatisfaction +
      dimensions.orderFulfillment * weights.orderFulfillment +
      dimensions.responseTime * weights.responseTime +
      dimensions.disputeRate * weights.disputeRate +
      dimensions.growthRate * weights.growthRate;

    return Math.round(weightedSum);
  }

  // Determine performance tier based on overall score
  private determinePerformanceTier(overallScore: number): string {
    if (overallScore >= 90) return 'platinum';
    if (overallScore >= 80) return 'gold';
    if (overallScore >= 70) return 'silver';
    return 'bronze';
  }

  // Get performance trends
  private async getPerformanceTrends(sellerWalletAddress: string): Promise<PerformanceTrend[]> {
    try {
      // Get historical performance data for the last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const historicalData = await db
        .select()
        .from(sellerPerformanceHistory)
        .where(and(
          eq(sellerPerformanceHistory.sellerWalletAddress, sellerWalletAddress),
          gte(sellerPerformanceHistory.periodStart, threeMonthsAgo)
        ))
        .orderBy(desc(sellerPerformanceHistory.periodStart));

      const trends: PerformanceTrend[] = [];
      const metricTypes = ['customer_satisfaction', 'order_fulfillment', 'response_time', 'dispute_rate', 'growth_rate'];

      for (const metricType of metricTypes) {
        const metricData = historicalData.filter(d => d.metricType === metricType);
        if (metricData.length >= 2) {
          const latest = Number(metricData[0].metricValue);
          const previous = Number(metricData[1].metricValue);
          const changePercent = previous !== 0 ? ((latest - previous) / previous) * 100 : 0;

          let direction: 'up' | 'down' | 'stable' = 'stable';
          if (Math.abs(changePercent) > 5) {
            direction = changePercent > 0 ? 'up' : 'down';
          }

          trends.push({
            metric: metricType.replace('_', ' '),
            direction,
            changePercent: Math.round(changePercent * 100) / 100,
            period: 'last_month'
          });
        }
      }

      return trends;
    } catch (error) {
      safeLogger.error('Error getting performance trends:', error);
      return [];
    }
  }

  // Generate recommendations based on scores and trends
  private generateRecommendations(dimensions: SellerScorecard['dimensions'], trends: PerformanceTrend[]): string[] {
    const recommendations: string[] = [];

    // Customer satisfaction recommendations
    if (dimensions.customerSatisfaction < 70) {
      recommendations.push('Focus on improving customer communication and product quality to boost satisfaction ratings');
    }

    // Order fulfillment recommendations
    if (dimensions.orderFulfillment < 80) {
      recommendations.push('Improve order processing speed and shipping reliability to increase fulfillment rates');
    }

    // Response time recommendations
    if (dimensions.responseTime < 70) {
      recommendations.push('Reduce response time to customer inquiries - aim for under 12 hours');
    }

    // Dispute rate recommendations
    if (dimensions.disputeRate < 70) {
      recommendations.push('Review product descriptions and shipping processes to reduce dispute rates');
    }

    // Growth rate recommendations
    if (dimensions.growthRate < 60) {
      recommendations.push('Consider expanding product offerings or improving marketing to drive growth');
    }

    // Trend-based recommendations
    const decliningTrends = trends.filter(t => t.direction === 'down');
    if (decliningTrends.length > 0) {
      recommendations.push(`Address declining performance in: ${decliningTrends.map(t => t.metric).join(', ')}`);
    }

    return recommendations;
  }

  // Save or update scorecard in database
  private async saveScorecard(sellerWalletAddress: string, scorecardData: {
    overallScore: number;
    dimensions: SellerScorecard['dimensions'];
    performanceTier: string;
  }) {
    try {
      // Check if scorecard exists
      const existing = await db
        .select()
        .from(sellerScorecards)
        .where(eq(sellerScorecards.sellerWalletAddress, sellerWalletAddress))
        .limit(1);

      const now = new Date();

      if (existing.length > 0) {
        // Update existing scorecard
        const updated = await db
          .update(sellerScorecards)
          .set({
            overallScore: scorecardData.overallScore.toString(),
            customerSatisfaction: scorecardData.dimensions.customerSatisfaction.toString(),
            orderFulfillment: scorecardData.dimensions.orderFulfillment.toString(),
            responseTime: scorecardData.dimensions.responseTime.toString(),
            disputeRate: scorecardData.dimensions.disputeRate.toString(),
            growthRate: scorecardData.dimensions.growthRate.toString(),
            performanceTier: scorecardData.performanceTier,
            lastCalculatedAt: now,
            updatedAt: now
          })
          .where(eq(sellerScorecards.sellerWalletAddress, sellerWalletAddress))
          .returning();

        return updated[0];
      } else {
        // Create new scorecard
        const created = await db
          .insert(sellerScorecards)
          .values({
            sellerWalletAddress,
            overallScore: scorecardData.overallScore.toString(),
            customerSatisfaction: scorecardData.dimensions.customerSatisfaction.toString(),
            orderFulfillment: scorecardData.dimensions.orderFulfillment.toString(),
            responseTime: scorecardData.dimensions.responseTime.toString(),
            disputeRate: scorecardData.dimensions.disputeRate.toString(),
            growthRate: scorecardData.dimensions.growthRate.toString(),
            performanceTier: scorecardData.performanceTier,
            lastCalculatedAt: now,
            createdAt: now,
            updatedAt: now
          })
          .returning();

        return created[0];
      }
    } catch (error) {
      safeLogger.error('Error saving scorecard:', error);
      throw error;
    }
  }

  // Create performance alert
  async createPerformanceAlert(
    sellerWalletAddress: string,
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    message: string,
    thresholdValue?: number,
    currentValue?: number,
    recommendations: string[] = []
  ): Promise<void> {
    try {
      await db.insert(sellerPerformanceAlerts).values({
        sellerWalletAddress,
        alertType,
        severity,
        title,
        message,
        thresholdValue: thresholdValue?.toString(),
        currentValue: currentValue?.toString(),
        recommendations: JSON.stringify(recommendations),
        isAcknowledged: false,
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error creating performance alert:', error);
      throw error;
    }
  }

  // Get performance alerts for seller
  async getPerformanceAlerts(sellerWalletAddress: string, limit: number = 10): Promise<any[]> {
    try {
      const alerts = await db
        .select()
        .from(sellerPerformanceAlerts)
        .where(eq(sellerPerformanceAlerts.sellerWalletAddress, sellerWalletAddress))
        .orderBy(desc(sellerPerformanceAlerts.createdAt))
        .limit(limit);

      return alerts.map(alert => ({
        id: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        thresholdValue: alert.thresholdValue ? Number(alert.thresholdValue) : null,
        currentValue: alert.currentValue ? Number(alert.currentValue) : null,
        recommendations: alert.recommendations ? JSON.parse(alert.recommendations as string) : [],
        isAcknowledged: alert.isAcknowledged,
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: alert.acknowledgedBy,
        createdAt: alert.createdAt
      }));
    } catch (error) {
      safeLogger.error('Error getting performance alerts:', error);
      return [];
    }
  }

  // Record performance history
  async recordPerformanceHistory(
    sellerWalletAddress: string,
    metricType: string,
    metricValue: number,
    periodStart: Date,
    periodEnd: Date,
    metadata: any = {}
  ): Promise<void> {
    try {
      await db.insert(sellerPerformanceHistory).values({
        sellerWalletAddress,
        metricType,
        metricValue: metricValue.toString(),
        periodStart,
        periodEnd,
        metadata: JSON.stringify(metadata),
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error recording performance history:', error);
      throw error;
    }
  }
}

export const sellerScorecardService = new SellerScorecardService();
