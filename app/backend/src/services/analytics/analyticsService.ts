import { db } from '../../db';
import { safeLogger } from '../utils/safeLogger';
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
  private redis: Redis | null = null;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    // Check if Redis is disabled via environment variable
    const redisEnabled = process.env.REDIS_ENABLED;
    if (redisEnabled === 'false' || redisEnabled === '0') {
      return;
    }

    const redisUrl = process.env.REDIS_URL;
    // Don't connect to localhost in production
    if (!redisUrl || redisUrl === 'redis://localhost:6379' || redisUrl === 'your_redis_url') {
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 2) return null;
          return Math.min(times * 500, 2000);
        }
      });

      this.redis.on('error', () => {
        if (this.redis) {
          this.redis = null;
        }
      });
    } catch {
      this.redis = null;
    }
  }

  async getOverviewMetrics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    try {
      const cacheKey = `analytics:overview:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
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

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      }
      return result;
    } catch (error) {
      safeLogger.error('Error getting overview metrics:', error);
      throw new Error('Failed to retrieve analytics metrics');
    }
  }

  async getUserBehaviorData(startDate?: Date, endDate?: Date): Promise<UserBehaviorData> {
    try {
      const cacheKey = `analytics:behavior:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
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

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      }
      return result;
    } catch (error) {
      safeLogger.error('Error getting user behavior data:', error);
      throw new Error('Failed to retrieve user behavior analytics');
    }
  }

  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    try {
      const cacheKey = `analytics:sales:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
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

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
      }
      return result;
    } catch (error) {
      safeLogger.error('Error getting sales analytics:', error);
      throw new Error('Failed to retrieve sales analytics');
    }
  }

  async getSellerAnalytics(sellerId: string, startDate?: Date, endDate?: Date): Promise<SellerAnalytics> {
    try {
      const cacheKey = `analytics:seller:${sellerId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Get seller-specific analytics
      const sellerMetrics = await this.calculateSellerMetrics(sellerId, startDate, endDate);

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(sellerMetrics));
      }
      return sellerMetrics;
    } catch (error) {
      safeLogger.error('Error getting seller analytics:', error);
      throw new Error('Failed to retrieve seller analytics');
    }
  }

  async getMarketTrends(): Promise<MarketTrends> {
    try {
      const cacheKey = 'analytics:market-trends';

      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const trends = await this.analyzeMarketTrends();

      if (this.redis) {
        await this.redis.setex(cacheKey, this.CACHE_TTL * 4, JSON.stringify(trends)); // Cache longer for trends
      }
      return trends;
    } catch (error) {
      safeLogger.error('Error getting market trends:', error);
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
      safeLogger.error('Error detecting anomalies:', error);
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
      // Get accurate geolocation data from IP if not provided
      let geoData = {
        country: metadata?.country,
        city: metadata?.city
      };

      if (metadata?.ipAddress && (!geoData.country || !geoData.city)) {
        geoData = await this.getLocationFromIP(metadata.ipAddress);
      }

      // Convert "anonymous" to NULL for UUID column compatibility
      const userIdValue = userId === 'anonymous' ? null : userId;

      // Truncate long strings to fit varchar constraints
      const truncateString = (str: string | null | undefined, maxLength: number): string | null => {
        if (!str) return null;
        return str.length > maxLength ? str.substring(0, maxLength) : str;
      };

      // Insert into user_analytics table with proper null handling and string truncation
      await db.execute(sql`
        INSERT INTO user_analytics (
          user_id, session_id, event_type, event_data,
          page_url, user_agent, ip_address, country, city,
          device_type, browser, referrer, timestamp
        ) VALUES (
          ${userIdValue}, ${sessionId}, ${eventType}, ${JSON.stringify(eventData)},
          ${truncateString(metadata?.pageUrl, 500)},
          ${truncateString(metadata?.userAgent, 500)},
          ${metadata?.ipAddress || null},
          ${truncateString(geoData.country, 2)},
          ${truncateString(geoData.city, 100)},
          ${truncateString(metadata?.deviceType, 50)},
          ${truncateString(metadata?.browser, 50)},
          ${truncateString(metadata?.referrer, 500)},
          NOW()
        )
      `);

      // Update real-time metrics
      await this.updateRealTimeMetrics(eventType, eventData);
    } catch (error) {
      safeLogger.error('Error tracking user event:', error);
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
      safeLogger.error('Error tracking transaction:', error);
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
      safeLogger.error('Error generating report:', error);
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

  /**
   * Enhanced geographic analytics with IP-based location tracking
   */
  async getGeographicDistribution(startDate: string, endDate: string, assetId?: string) {
    try {
      const behaviorData = await this.getUserBehaviorData(new Date(startDate), new Date(endDate));

      // Enhance with additional geographic insights
      const enhancedGeoData = await this.enhanceGeographicData(behaviorData.geographicDistribution);

      return enhancedGeoData;
    } catch (error) {
      safeLogger.error('Error getting geographic distribution:', error);
      return [];
    }
  }

  /**
   * Enhance geographic data with additional insights
   */
  private async enhanceGeographicData(geoData: any[]) {
    return geoData.map(location => ({
      ...location,
      percentage: 0, // Calculate percentage of total users
      growth: 0, // Calculate growth compared to previous period
      revenue: location.revenue || 0
    }));
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
    try {
      const dateFilter = startDate && endDate
        ? sql`WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}`
        : sql`WHERE timestamp >= NOW() - INTERVAL '30 days'`;

      // Get page views and session data
      const pageViewsResult = await db.execute(sql`
        SELECT COUNT(*) as total_page_views,
               AVG(EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))) as avg_session_duration
        FROM user_analytics
        ${dateFilter}
      `);

      // Get top pages
      const topPagesResult = await db.execute(sql`
        SELECT page_url as page,
               COUNT(*) as views,
               COUNT(DISTINCT user_id)::float / COUNT(*)::float * 100 as conversion_rate
        FROM user_analytics
        ${dateFilter}
        GROUP BY page_url
        ORDER BY views DESC
        LIMIT 10
      `);

      // Get device breakdown
      const deviceResult = await db.execute(sql`
        SELECT device_type,
               COUNT(*) as count
        FROM user_analytics
        ${dateFilter}
        GROUP BY device_type
      `);

      // Get accurate geographic distribution
      const geoResult = await db.execute(sql`
        SELECT country,
               city,
               COUNT(DISTINCT user_id) as users,
               COUNT(*) as sessions
        FROM user_analytics
        ${dateFilter}
        AND country IS NOT NULL
        GROUP BY country, city
        ORDER BY users DESC
        LIMIT 50
      `);

      // Get user journey data
      const journeyResult = await db.execute(sql`
        WITH user_sessions AS (
          SELECT user_id, session_id,
                 ROW_NUMBER() OVER (PARTITION BY user_id, session_id ORDER BY timestamp) as step_number,
                 event_type
          FROM user_analytics
          ${dateFilter}
        ),
        journey_steps AS (
          SELECT step_number, event_type,
                 COUNT(DISTINCT user_id) as users,
                 LAG(COUNT(DISTINCT user_id)) OVER (ORDER BY step_number) as prev_users
          FROM user_sessions
          GROUP BY step_number, event_type
          ORDER BY step_number
        )
        SELECT event_type as step,
               users,
               CASE WHEN prev_users > 0 THEN ((prev_users - users)::float / prev_users::float * 100) ELSE 0 END as dropoff_rate
        FROM journey_steps
        LIMIT 10
      `);

      // Calculate bounce rate
      const bounceResult = await db.execute(sql`
        WITH session_page_counts AS (
          SELECT session_id, COUNT(*) as page_count
          FROM user_analytics
          ${dateFilter}
          GROUP BY session_id
        )
        SELECT
          COUNT(CASE WHEN page_count = 1 THEN 1 END)::float / COUNT(*)::float * 100 as bounce_rate
        FROM session_page_counts
      `);

      const deviceBreakdown = deviceResult.reduce((acc: any, row: any) => {
        acc[row.device_type || 'unknown'] = Number(row.count);
        return acc;
      }, { mobile: 0, desktop: 0, tablet: 0, unknown: 0 });

      const geographicDistribution = geoResult.map((row: any) => ({
        country: row.country,
        city: row.city,
        users: Number(row.users),
        sessions: Number(row.sessions),
        revenue: 0 // Would need to join with orders table for revenue data
      }));

      return {
        totalPageViews: Number(pageViewsResult[0]?.total_page_views) || 0,
        avgSessionDuration: Number(pageViewsResult[0]?.avg_session_duration) || 0,
        bounceRate: Number(bounceResult[0]?.bounce_rate) || 0,
        topPages: topPagesResult.map((row: any) => ({
          page: row.page,
          views: Number(row.views),
          conversionRate: Number(row.conversion_rate)
        })),
        userJourney: journeyResult.map((row: any) => ({
          step: row.step,
          users: Number(row.users),
          dropoffRate: Number(row.dropoff_rate)
        })),
        deviceBreakdown,
        geographicDistribution
      };
    } catch (error) {
      safeLogger.error('Error querying user analytics:', error);
      // Return empty data structure if table doesn't exist or query fails
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
      safeLogger.error('Error storing anomaly:', error);
    }
  }

  private async updateRealTimeMetrics(eventType: string, eventData: any): Promise<void> {
    // Update real-time dashboard metrics cache
    if (this.redis) {
      const metricKey = `realtime:${eventType}`;
      await this.redis.incr(metricKey);
      await this.redis.expire(metricKey, 3600); // 1 hour TTL
    }
  }

  /**
   * Get accurate location data from IP address using multiple geolocation services
   */
  private async getLocationFromIP(ipAddress: string): Promise<{ country: string | null; city: string | null }> {
    try {
      // Skip localhost and private IPs
      if (ipAddress === '127.0.0.1' || ipAddress === '::1' ||
        ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') ||
        ipAddress.startsWith('172.')) {
        return { country: null, city: null };
      }

      // Try multiple geolocation services for accuracy
      const geoServices = [
        () => this.getLocationFromIPAPI(ipAddress),
        () => this.getLocationFromIPInfo(ipAddress),
        () => this.getLocationFromFreeGeoIP(ipAddress)
      ];

      for (const service of geoServices) {
        try {
          const result = await service();
          if (result.country) {
            return result;
          }
        } catch (error) {
          safeLogger.warn('Geolocation service failed, trying next:', error);
          continue;
        }
      }

      return { country: null, city: null };
    } catch (error) {
      safeLogger.error('Error getting location from IP:', error);
      return { country: null, city: null };
    }
  }

  /**
   * Get location from IP-API service (free, no API key required)
   */
  private async getLocationFromIPAPI(ipAddress: string): Promise<{ country: string | null; city: string | null }> {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
    const data: any = await response.json();

    if (data && data.status === 'success') {
      return {
        country: (data.countryCode as string) || null, // Use 2-letter ISO code instead of full name
        city: (data.city as string) || null
      };
    }

    throw new Error('IP-API request failed');
  }

  /**
   * Get location from IPInfo service (requires API key for production)
   */
  private async getLocationFromIPInfo(ipAddress: string): Promise<{ country: string | null; city: string | null }> {
    const apiKey = process.env.IPINFO_API_KEY;
    const url = apiKey
      ? `https://ipinfo.io/${ipAddress}?token=${apiKey}`
      : `https://ipinfo.io/${ipAddress}`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data && data.country) {
      return {
        country: (data.country as string) || null,
        city: (data.city as string) || null
      };
    }

    throw new Error('IPInfo request failed');
  }

  /**
   * Get location from FreeGeoIP service (backup option)
   */
  private async getLocationFromFreeGeoIP(ipAddress: string): Promise<{ country: string | null; city: string | null }> {
    const response = await fetch(`https://freegeoip.app/json/${ipAddress}`);
    const data: any = await response.json();

    if (data && data.country_code) {
      return {
        country: (data.country_code as string) || null, // Use 2-letter ISO code instead of full name
        city: (data.city as string) || null
      };
    }

    throw new Error('FreeGeoIP request failed');
  }
}

export const analyticsService = new AnalyticsService();
