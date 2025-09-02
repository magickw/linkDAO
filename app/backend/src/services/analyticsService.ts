import { db } from '../db/connection';
import { users, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';

// Enhanced interfaces for comprehensive analytics
export interface AnalyticsMetrics {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  gmv: number; // Gross Merchandise Value
  userAcquisitionRate: number;
  transactionSuccessRate: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface UserBehaviorData {
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; conversionRate: number }>;
  userJourney: Array<{ step: string; users: number; dropoffRate: number }>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  geographicDistribution: Array<{ country: string; users: number; revenue: number }>;
}

export interface SalesAnalytics {
  dailySales: Array<{ date: string; sales: number; orders: number; gmv: number }>;
  topProducts: Array<{ productId: string; title: string; sales: number; revenue: number; units: number }>;
  topCategories: Array<{ category: string; sales: number; revenue: number; growth: number }>;
  revenueByPaymentMethod: Array<{ method: string; revenue: number; percentage: number }>;
  customerSegments: Array<{ segment: string; revenue: number; count: number; ltv: number }>;
}

export interface SellerAnalytics {
  sellerId: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  returnRate: number;
  disputeRate: number;
  responseTime: number;
  shippingTime: number;
  repeatCustomerRate: number;
  revenueGrowth: number;
  topProducts: Array<{ productId: string; title: string; sales: number }>;
  customerInsights: {
    demographics: any;
    preferences: any;
    behavior: any;
  };
}

export interface MarketTrends {
  trending: Array<{ category: string; growth: number; volume: number }>;
  seasonal: Array<{ period: string; categories: string[]; multiplier: number }>;
  priceAnalysis: Array<{ category: string; avgPrice: number; priceChange: number }>;
  demandForecast: Array<{ category: string; predictedDemand: number; confidence: number }>;
}

export interface AnomalyAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntity: string;
  detectionTime: Date;
  confidence: number;
  suggestedActions: string[];
}

export class AnalyticsService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async getOverviewMetrics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    try {
      const cacheKey = `analytics:overview:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFilter = startDate && endDate 
        ? and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        : undefined;

      // Get comprehensive metrics in parallel
      const [
        totalUsersResult,
        totalProductsResult,
        orderMetrics,
        activeUsersMetrics,
        transactionMetrics
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(products),
        db.select({
          totalOrders: count(),
          totalRevenue: sum(orders.amount),
          averageOrderValue: avg(orders.amount),
          gmv: sum(orders.amount)
        }).from(orders).where(dateFilter),
        this.getActiveUsersMetrics(startDate, endDate),
        this.getTransactionSuccessRate(startDate, endDate)
      ]);

      const totalUsers = totalUsersResult[0]?.count || 0;
      const totalProducts = totalProductsResult[0]?.count || 0;
      const metrics = orderMetrics[0] || { 
        totalOrders: 0, 
        totalRevenue: 0, 
        averageOrderValue: 0, 
        gmv: 0 
      };

      const conversionRate = totalUsers > 0 ? (Number(metrics.totalOrders) / totalUsers) * 100 : 0;
      const userAcquisitionRate = await this.calculateUserAcquisitionRate(startDate, endDate);

      const result: AnalyticsMetrics = {
        totalUsers,
        totalProducts,
        totalOrders: Number(metrics.totalOrders),
        totalRevenue: Number(metrics.totalRevenue),
        averageOrderValue: Number(metrics.averageOrderValue),
        conversionRate,
        gmv: Number(metrics.gmv),
        userAcquisitionRate,
        transactionSuccessRate: transactionMetrics,
        activeUsers: activeUsersMetrics
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error getting overview metrics:', error);
      throw new Error('Failed to retrieve analytics metrics');
    }
  }

  async getUserBehaviorData(startDate?: Date, endDate?: Date): Promise<UserBehaviorData> {
    try {
      const cacheKey = `analytics:behavior:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user behavior analytics from user_analytics table
      const behaviorData = await this.queryUserAnalytics(startDate, endDate);
      
      const result: UserBehaviorData = {
        pageViews: behaviorData.totalPageViews,
        sessionDuration: behaviorData.avgSessionDuration,
        bounceRate: behaviorData.bounceRate,
        topPages: behaviorData.topPages,
        userJourney: behaviorData.userJourney,
        deviceBreakdown: behaviorData.deviceBreakdown,
        geographicDistribution: behaviorData.geographicDistribution
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error getting user behavior data:', error);
      throw new Error('Failed to retrieve user behavior analytics');
    }
  }

  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    try {
      const cacheKey = `analytics:sales:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFilter = startDate && endDate 
        ? and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        : undefined;

      // Get comprehensive sales analytics
      const [
        dailySalesData,
        topProductsData,
        topCategoriesData,
        paymentMethodData,
        customerSegmentData
      ] = await Promise.all([
        this.getDailySalesData(dateFilter),
        this.getTopProductsData(dateFilter),
        this.getTopCategoriesData(dateFilter),
        this.getPaymentMethodAnalytics(dateFilter),
        this.getCustomerSegmentAnalytics(dateFilter)
      ]);

      const result: SalesAnalytics = {
        dailySales: dailySalesData,
        topProducts: topProductsData,
        topCategories: topCategoriesData,
        revenueByPaymentMethod: paymentMethodData,
        customerSegments: customerSegmentData
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error('Error getting sales analytics:', error);
      throw new Error('Failed to retrieve sales analytics');
    }
  }

  async getSellerAnalytics(sellerId: string, startDate?: Date, endDate?: Date): Promise<SellerAnalytics> {
    try {
      const cacheKey = `analytics:seller:${sellerId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // Get seller-specific analytics
      const sellerMetrics = await this.calculateSellerMetrics(sellerId, startDate, endDate);
      
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(sellerMetrics));
      return sellerMetrics;
    } catch (error) {
      console.error('Error getting seller analytics:', error);
      throw new Error('Failed to retrieve seller analytics');
    }
  }

  async getMarketTrends(): Promise<MarketTrends> {
    try {
      const cacheKey = 'analytics:market-trends';
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const trends = await this.analyzeMarketTrends();
      
      await this.redis.setex(cacheKey, this.CACHE_TTL * 4, JSON.stringify(trends)); // Cache longer for trends
      return trends;
    } catch (error) {
      console.error('Error getting market trends:', error);
      throw new Error('Failed to retrieve market trends');
    }
  }

  async detectAnomalies(): Promise<AnomalyAlert[]> {
    try {
      const anomalies: AnomalyAlert[] = [];

      // Check for various anomalies
      const [
        transactionAnomalies,
        userBehaviorAnomalies,
        salesAnomalies,
        systemAnomalies
      ] = await Promise.all([
        this.detectTransactionAnomalies(),
        this.detectUserBehaviorAnomalies(),
        this.detectSalesAnomalies(),
        this.detectSystemAnomalies()
      ]);

      anomalies.push(...transactionAnomalies, ...userBehaviorAnomalies, ...salesAnomalies, ...systemAnomalies);

      // Store anomalies in database
      for (const anomaly of anomalies) {
        await this.storeAnomaly(anomaly);
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      throw new Error('Failed to detect anomalies');
    }
  }

  async trackUserEvent(
    userId: string, 
    sessionId: string,
    eventType: string, 
    eventData: any,
    metadata?: {
      pageUrl?: string;
      userAgent?: string;
      ipAddress?: string;
      country?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      // Insert into user_analytics table
      await db.execute(sql`
        INSERT INTO user_analytics (
          user_id, session_id, event_type, event_data, 
          page_url, user_agent, ip_address, country, city,
          device_type, browser, referrer, timestamp
        ) VALUES (
          ${userId}, ${sessionId}, ${eventType}, ${JSON.stringify(eventData)},
          ${metadata?.pageUrl}, ${metadata?.userAgent}, ${metadata?.ipAddress},
          ${metadata?.country}, ${metadata?.city}, ${metadata?.deviceType},
          ${metadata?.browser}, ${metadata?.referrer}, NOW()
        )
      `);

      // Update real-time metrics
      await this.updateRealTimeMetrics(eventType, eventData);
    } catch (error) {
      console.error('Error tracking user event:', error);
    }
  }

  async trackTransaction(transactionData: {
    transactionId: string;
    orderId: string;
    type: string;
    amount: number;
    currency: string;
    feeAmount?: number;
    gasUsed?: number;
    gasPrice?: number;
    blockNumber?: number;
    transactionHash?: string;
    status: string;
    processingTime?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO transaction_analytics (
          transaction_id, order_id, transaction_type, amount, currency,
          fee_amount, gas_used, gas_price, block_number, transaction_hash,
          status, processing_time_ms, error_message, timestamp
        ) VALUES (
          ${transactionData.transactionId}, ${transactionData.orderId},
          ${transactionData.type}, ${transactionData.amount}, ${transactionData.currency},
          ${transactionData.feeAmount}, ${transactionData.gasUsed}, ${transactionData.gasPrice},
          ${transactionData.blockNumber}, ${transactionData.transactionHash},
          ${transactionData.status}, ${transactionData.processingTime},
          ${transactionData.errorMessage}, NOW()
        )
      `);
    } catch (error) {
      console.error('Error tracking transaction:', error);
    }
  }

  async generateReport(reportType: string, parameters: any): Promise<any> {
    try {
      switch (reportType) {
        case 'overview':
          return await this.getOverviewMetrics(parameters.startDate, parameters.endDate);
        case 'sales':
          return await this.getSalesAnalytics(parameters.startDate, parameters.endDate);
        case 'users':
          return await this.getUserBehaviorData(parameters.startDate, parameters.endDate);
        case 'seller':
          return await this.getSellerAnalytics(parameters.sellerId, parameters.startDate, parameters.endDate);
        case 'trends':
          return await this.getMarketTrends();
        case 'anomalies':
          return await this.detectAnomalies();
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error('Failed to generate analytics report');
    }
  }

  // Legacy methods for backward compatibility
  async getRealTimeStats(assetId?: string) {
    const metrics = await this.getOverviewMetrics();
    return {
      totalViews: metrics.activeUsers.daily,
      totalDownloads: metrics.totalOrders,
      activeUsers: metrics.activeUsers.daily,
      revenue: metrics.totalRevenue.toString()
    };
  }

  async getGeographicDistribution(startDate: string, endDate: string, assetId: string) {
    const behaviorData = await this.getUserBehaviorData(new Date(startDate), new Date(endDate));
    return behaviorData.geographicDistribution;
  }

  async getRevenueAnalytics(startDate: string, endDate: string, userId: string) {
    const salesData = await this.getSalesAnalytics(new Date(startDate), new Date(endDate));
    return {
      totalRevenue: salesData.dailySales.reduce((sum, day) => sum + day.sales, 0).toString(),
      revenueByPeriod: salesData.dailySales,
      topAssets: salesData.topProducts
    };
  }

  async getAnalytics(startDate: string, endDate: string, assetId: string, userId: string) {
    const metrics = await this.getOverviewMetrics(new Date(startDate), new Date(endDate));
    return {
      totalViews: metrics.activeUsers.daily,
      totalDownloads: metrics.totalOrders,
      revenue: metrics.totalRevenue.toString()
    };
  }

  async getTimeSeriesData(startDate: string, endDate: string, assetId: string, groupBy: 'day' | 'week' | 'month') {
    const salesData = await this.getSalesAnalytics(new Date(startDate), new Date(endDate));
    return salesData.dailySales;
  }

  async logAccess(userId: string, assetId: string, success: boolean, errorMessage?: string, ipAddress?: string, userAgent?: string) {
    await this.trackUserEvent(
      userId,
      `session_${Date.now()}`,
      success ? 'asset_access_success' : 'asset_access_failure',
      { assetId, success, errorMessage },
      { ipAddress, userAgent }
    );
  }

  async updateAnalytics(assetId: string, date: string) {
    await this.trackUserEvent(
      'system',
      `system_${Date.now()}`,
      'analytics_update',
      { assetId, date }
    );
  }

  // Private helper methods
  private async getActiveUsersMetrics(startDate?: Date, endDate?: Date) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [daily, weekly, monthly] = await Promise.all([
      this.getActiveUsersCount(oneDayAgo, now),
      this.getActiveUsersCount(oneWeekAgo, now),
      this.getActiveUsersCount(oneMonthAgo, now)
    ]);

    return { daily, weekly, monthly };
  }

  private async getActiveUsersCount(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_analytics 
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      `);
      return Number(result[0]?.count) || 0;
    } catch (error) {
      // If table doesn't exist yet, return 0
      return 0;
    }
  }

  private async getTransactionSuccessRate(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const dateFilter = startDate && endDate 
        ? sql`WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}`
        : sql`WHERE timestamp >= NOW() - INTERVAL '30 days'`;

      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful
        FROM transaction_analytics 
        ${dateFilter}
      `);

      const row = result[0];
      const total = Number(row?.total) || 0;
      const successful = Number(row?.successful) || 0;
      
      return total > 0 ? (successful / total) * 100 : 0;
    } catch (error) {
      return 0;
    }
  }

  private async calculateUserAcquisitionRate(startDate?: Date, endDate?: Date): Promise<number> {
    const dateFilter = startDate && endDate 
      ? and(gte(users.createdAt, startDate), lte(users.createdAt, endDate))
      : gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const result = await db.select({ count: count() }).from(users).where(dateFilter);
    return Number(result[0]?.count) || 0;
  }

  private async queryUserAnalytics(startDate?: Date, endDate?: Date) {
    // Mock implementation - would query actual user_analytics table
    return {
      totalPageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      topPages: [],
      userJourney: [],
      deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
      geographicDistribution: []
    };
  }

  private async getDailySalesData(dateFilter: any) {
    try {
      const result = await db.execute(sql`
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as sales,
          COUNT(*) as orders,
          SUM(total_amount) as gmv
        FROM orders 
        ${dateFilter ? sql`WHERE ${dateFilter}` : sql`WHERE created_at >= NOW() - INTERVAL '30 days'`}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);

      return result.map(row => ({
        date: String(row.date),
        sales: Number(row.sales),
        orders: Number(row.orders),
        gmv: Number(row.gmv)
      }));
    } catch (error) {
      return [];
    }
  }

  private async getTopProductsData(dateFilter: any) {
    // Mock implementation - would join with products table
    return [];
  }

  private async getTopCategoriesData(dateFilter: any) {
    // Mock implementation - would analyze category performance
    return [];
  }

  private async getPaymentMethodAnalytics(dateFilter: any) {
    // Mock implementation - would analyze payment methods
    return [];
  }

  private async getCustomerSegmentAnalytics(dateFilter: any) {
    // Mock implementation - would analyze customer segments
    return [];
  }

  private async calculateSellerMetrics(sellerId: string, startDate?: Date, endDate?: Date): Promise<SellerAnalytics> {
    // Mock implementation - would calculate comprehensive seller metrics
    return {
      sellerId,
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      conversionRate: 0,
      customerSatisfaction: 0,
      returnRate: 0,
      disputeRate: 0,
      responseTime: 0,
      shippingTime: 0,
      repeatCustomerRate: 0,
      revenueGrowth: 0,
      topProducts: [],
      customerInsights: {
        demographics: {},
        preferences: {},
        behavior: {}
      }
    };
  }

  private async analyzeMarketTrends(): Promise<MarketTrends> {
    // Mock implementation - would analyze market trends
    return {
      trending: [],
      seasonal: [],
      priceAnalysis: [],
      demandForecast: []
    };
  }

  private async detectTransactionAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would detect transaction anomalies
    return [];
  }

  private async detectUserBehaviorAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would detect user behavior anomalies
    return [];
  }

  private async detectSalesAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would detect sales anomalies
    return [];
  }

  private async detectSystemAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would detect system anomalies
    return [];
  }

  private async storeAnomaly(anomaly: AnomalyAlert): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO anomaly_detections (
          anomaly_type, severity, description, affected_entity_type,
          affected_entity_id, detection_data, confidence_score, status
        ) VALUES (
          ${anomaly.type}, ${anomaly.severity}, ${anomaly.description},
          'system', NULL, ${JSON.stringify(anomaly)}, ${anomaly.confidence}, 'detected'
        )
      `);
    } catch (error) {
      console.error('Error storing anomaly:', error);
    }
  }

  private async updateRealTimeMetrics(eventType: string, eventData: any): Promise<void> {
    // Update real-time dashboard metrics cache
    const metricKey = `realtime:${eventType}`;
    await this.redis.incr(metricKey);
    await this.redis.expire(metricKey, 3600); // 1 hour TTL
  }
}

export const analyticsService = new AnalyticsService();