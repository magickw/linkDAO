import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { sellers, products, orders, users } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg, isNotNull } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

export interface SellerPerformanceMetrics {
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
  profitMargin: number;
  inventoryTurnover: number;
  customerLifetimeValue: number;
  topProducts: Array<{
    productId: string;
    title: string;
    sales: number;
    revenue: number;
    units: number;
    conversionRate: number;
  }>;
  customerInsights: {
    demographics: {
      ageGroups: Array<{ range: string; percentage: number }>;
      genderDistribution: Array<{ gender: string; percentage: number }>;
      locationDistribution: Array<{ country: string; percentage: number }>;
    };
    preferences: {
      topCategories: Array<{ category: string; percentage: number }>;
      priceRanges: Array<{ range: string; percentage: number }>;
      paymentMethods: Array<{ method: string; percentage: number }>;
    };
    behavior: {
      averageSessionDuration: number;
      pagesPerSession: number;
      bounceRate: number;
      timeToFirstPurchase: number;
      purchaseFrequency: number;
    };
  };
}

export interface SellerTierProgression {
  sellerId: string;
  currentTier: string;
  nextTier: string | null;
  progressPercentage: number;
  requirements: Array<{
    metric: string;
    current: number;
    required: number;
    met: boolean;
    description: string;
  }>;
  benefits: Array<{
    type: string;
    description: string;
    value: string;
  }>;
  estimatedTimeToNextTier: number; // in days
  recommendations: Array<{
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface SellerPerformanceInsights {
  sellerId: string;
  insights: Array<{
    type: 'opportunity' | 'warning' | 'achievement' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    suggestedActions: string[];
    metrics: any;
  }>;
  benchmarks: {
    industryAverage: {
      conversionRate: number;
      averageOrderValue: number;
      customerSatisfaction: number;
      responseTime: number;
    };
    topPerformers: {
      conversionRate: number;
      averageOrderValue: number;
      customerSatisfaction: number;
      responseTime: number;
    };
    sellerRanking: {
      overall: number;
      category: number;
      percentile: number;
    };
  };
}

export interface SellerBottleneckAnalysis {
  sellerId: string;
  bottlenecks: Array<{
    area: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    impact: string;
    rootCause: string;
    solutions: Array<{
      solution: string;
      effort: 'low' | 'medium' | 'high';
      expectedImpact: string;
      timeframe: string;
    }>;
    metrics: any;
  }>;
  performanceScore: number;
  improvementPotential: number;
}

export class SellerAnalyticsService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Get comprehensive seller performance metrics
   */
  async getSellerPerformanceMetrics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SellerPerformanceMetrics> {
    try {
      const cacheKey = `seller:analytics:${sellerId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const dateFilter = startDate && endDate 
        ? and(gte(orders.createdAt, startDate), lte(orders.createdAt, endDate))
        : undefined;

      // Get basic seller metrics
      const [
        salesMetrics,
        customerMetrics,
        productMetrics,
        customerInsights
      ] = await Promise.all([
        this.calculateSalesMetrics(sellerId, dateFilter),
        this.calculateCustomerMetrics(sellerId, dateFilter),
        this.getTopProducts(sellerId, dateFilter),
        this.getCustomerInsights(sellerId, dateFilter)
      ]);

      const metrics: SellerPerformanceMetrics = {
        sellerId,
        ...salesMetrics,
        ...customerMetrics,
        topProducts: productMetrics,
        customerInsights
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
      return metrics;
    } catch (error) {
      safeLogger.error('Error getting seller performance metrics:', error);
      throw new Error('Failed to retrieve seller performance metrics');
    }
  }

  /**
   * Get seller tier progression analysis
   */
  async getSellerTierProgression(sellerId: string): Promise<SellerTierProgression> {
    try {
      const cacheKey = `seller:tier:${sellerId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const metrics = await this.getSellerPerformanceMetrics(sellerId);
      const tierProgression = await this.analyzeTierProgression(sellerId, metrics);

      await this.redis.setex(cacheKey, this.CACHE_TTL * 2, JSON.stringify(tierProgression));
      return tierProgression;
    } catch (error) {
      safeLogger.error('Error getting seller tier progression:', error);
      throw new Error('Failed to retrieve seller tier progression');
    }
  }

  /**
   * Get seller performance insights and recommendations
   */
  async getSellerPerformanceInsights(sellerId: string): Promise<SellerPerformanceInsights> {
    try {
      const cacheKey = `seller:insights:${sellerId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const [
        metrics,
        benchmarks,
        insights
      ] = await Promise.all([
        this.getSellerPerformanceMetrics(sellerId),
        this.getIndustryBenchmarks(sellerId),
        this.generatePerformanceInsights(sellerId)
      ]);

      const performanceInsights: SellerPerformanceInsights = {
        sellerId,
        insights,
        benchmarks
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL * 2, JSON.stringify(performanceInsights));
      return performanceInsights;
    } catch (error) {
      safeLogger.error('Error getting seller performance insights:', error);
      throw new Error('Failed to retrieve seller performance insights');
    }
  }

  /**
   * Detect performance bottlenecks and provide solutions
   */
  async detectPerformanceBottlenecks(sellerId: string): Promise<SellerBottleneckAnalysis> {
    try {
      const cacheKey = `seller:bottlenecks:${sellerId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const metrics = await this.getSellerPerformanceMetrics(sellerId);
      const bottlenecks = await this.analyzeBottlenecks(sellerId, metrics);

      await this.redis.setex(cacheKey, this.CACHE_TTL * 2, JSON.stringify(bottlenecks));
      return bottlenecks;
    } catch (error) {
      safeLogger.error('Error detecting performance bottlenecks:', error);
      throw new Error('Failed to detect performance bottlenecks');
    }
  }

  /**
   * Track seller performance over time
   */
  async trackSellerPerformance(
    sellerId: string,
    metricType: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO seller_performance_tracking (
          seller_id, metric_type, metric_value, metadata, recorded_at
        ) VALUES (
          ${sellerId}, ${metricType}, ${value}, ${JSON.stringify(metadata || {})}, NOW()
        )
      `);

      // Update real-time metrics cache
      const metricKey = `seller:realtime:${sellerId}:${metricType}`;
      await this.redis.zadd(metricKey, Date.now(), value);
      await this.redis.expire(metricKey, 86400); // 24 hours
    } catch (error) {
      safeLogger.error('Error tracking seller performance:', error);
    }
  }

  /**
   * Get seller performance trends
   */
  async getSellerPerformanceTrends(
    sellerId: string,
    metricType: string,
    period: 'day' | 'week' | 'month' = 'day',
    limit: number = 30
  ): Promise<Array<{ date: string; value: number }>> {
    try {
      const groupBy = period === 'day' ? 'DATE(recorded_at)' :
                     period === 'week' ? 'DATE_TRUNC(\'week\', recorded_at)' :
                     'DATE_TRUNC(\'month\', recorded_at)';

      const result = await db.execute(sql`
        SELECT 
          ${sql.raw(groupBy)} as date,
          AVG(metric_value) as value
        FROM seller_performance_tracking
        WHERE seller_id = ${sellerId} 
          AND metric_type = ${metricType}
          AND recorded_at >= NOW() - INTERVAL '${sql.raw(limit.toString())} ${sql.raw(period)}s'
        GROUP BY ${sql.raw(groupBy)}
        ORDER BY date DESC
        LIMIT ${limit}
      `);

      return result.map(row => ({
        date: String(row.date),
        value: Number(row.value)
      }));
    } catch (error) {
      safeLogger.error('Error getting seller performance trends:', error);
      return [];
    }
  }

  /**
   * Generate automated performance reports
   */
  async generateSellerReport(
    sellerId: string,
    reportType: 'weekly' | 'monthly' | 'quarterly',
    includeRecommendations: boolean = true
  ): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (reportType) {
        case 'weekly':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarterly':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
      }

      const [
        metrics,
        insights,
        tierProgression,
        bottlenecks
      ] = await Promise.all([
        this.getSellerPerformanceMetrics(sellerId, startDate, endDate),
        includeRecommendations ? this.getSellerPerformanceInsights(sellerId) : null,
        this.getSellerTierProgression(sellerId),
        this.detectPerformanceBottlenecks(sellerId)
      ]);

      return {
        reportType,
        period: { startDate, endDate },
        sellerId,
        generatedAt: new Date().toISOString(),
        metrics,
        insights,
        tierProgression,
        bottlenecks,
        summary: this.generateReportSummary(metrics, insights, tierProgression, bottlenecks)
      };
    } catch (error) {
      safeLogger.error('Error generating seller report:', error);
      throw new Error('Failed to generate seller report');
    }
  }

  // Private helper methods

  private async calculateSalesMetrics(sellerId: string, dateFilter: any) {
    try {
      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(AVG(total_amount), 0) as average_order_value,
          COUNT(DISTINCT buyer_id) as unique_customers,
          COALESCE(AVG(EXTRACT(EPOCH FROM (shipped_at - created_at))), 0) as avg_shipping_time,
          COALESCE(AVG(EXTRACT(EPOCH FROM (responded_at - created_at))), 0) as avg_response_time
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE p.seller_id = ${sellerId}
        ${dateFilter ? sql`AND ${dateFilter}` : sql``}
      `);

      const row = result[0];
      const totalOrders = Number(row?.total_orders) || 0;
      const totalSales = Number(row?.total_sales) || 0;
      const uniqueCustomers = Number(row?.unique_customers) || 0;

      // Calculate additional metrics
      const [
        revenueGrowth,
        profitMargin,
        inventoryTurnover
      ] = await Promise.all([
        this.calculateRevenueGrowth(sellerId, dateFilter),
        this.calculateProfitMargin(sellerId, dateFilter),
        this.calculateInventoryTurnover(sellerId, dateFilter)
      ]);

      return {
        totalSales,
        totalOrders,
        averageOrderValue: Number(row?.average_order_value) || 0,
        shippingTime: Number(row?.avg_shipping_time) || 0,
        responseTime: Number(row?.avg_response_time) || 0,
        revenueGrowth,
        profitMargin,
        inventoryTurnover
      };
    } catch (error) {
      safeLogger.error('Error calculating sales metrics:', error);
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        shippingTime: 0,
        responseTime: 0,
        revenueGrowth: 0,
        profitMargin: 0,
        inventoryTurnover: 0
      };
    }
  }

  private async calculateCustomerMetrics(sellerId: string, dateFilter: any) {
    try {
      const result = await db.execute(sql`
        WITH seller_orders AS (
          SELECT o.*, p.seller_id
          FROM orders o
          JOIN products p ON o.product_id = p.id
          WHERE p.seller_id = ${sellerId}
          ${dateFilter ? sql`AND ${dateFilter}` : sql``}
        ),
        customer_stats AS (
          SELECT 
            buyer_id,
            COUNT(*) as order_count,
            SUM(total_amount) as total_spent,
            AVG(rating) as avg_rating
          FROM seller_orders
          WHERE status = 'completed'
          GROUP BY buyer_id
        )
        SELECT 
          COUNT(DISTINCT so.buyer_id) as total_customers,
          COUNT(CASE WHEN cs.order_count > 1 THEN 1 END)::float / COUNT(DISTINCT so.buyer_id)::float * 100 as repeat_customer_rate,
          COALESCE(AVG(cs.avg_rating), 0) as customer_satisfaction,
          COUNT(CASE WHEN so.status = 'disputed' THEN 1 END)::float / COUNT(*)::float * 100 as dispute_rate,
          COUNT(CASE WHEN so.status = 'returned' THEN 1 END)::float / COUNT(*)::float * 100 as return_rate,
          COALESCE(AVG(cs.total_spent), 0) as customer_lifetime_value
        FROM seller_orders so
        LEFT JOIN customer_stats cs ON so.buyer_id = cs.buyer_id
      `);

      const row = result[0];
      
      // Calculate conversion rate
      const conversionRate = await this.calculateConversionRate(sellerId, dateFilter);

      return {
        conversionRate,
        customerSatisfaction: Number(row?.customer_satisfaction) || 0,
        returnRate: Number(row?.return_rate) || 0,
        disputeRate: Number(row?.dispute_rate) || 0,
        repeatCustomerRate: Number(row?.repeat_customer_rate) || 0,
        customerLifetimeValue: Number(row?.customer_lifetime_value) || 0
      };
    } catch (error) {
      safeLogger.error('Error calculating customer metrics:', error);
      return {
        conversionRate: 0,
        customerSatisfaction: 0,
        returnRate: 0,
        disputeRate: 0,
        repeatCustomerRate: 0,
        customerLifetimeValue: 0
      };
    }
  }

  private async getTopProducts(sellerId: string, dateFilter: any) {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.title,
          COUNT(o.id) as units,
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COALESCE(SUM(o.total_amount), 0) as sales,
          COUNT(DISTINCT o.buyer_id)::float / COUNT(DISTINCT pv.user_id)::float * 100 as conversion_rate
        FROM products p
        LEFT JOIN orders o ON p.id = o.product_id
        LEFT JOIN product_views pv ON p.id = pv.product_id
        WHERE p.seller_id = ${sellerId}
        ${dateFilter ? sql`AND o.created_at IS NULL OR ${dateFilter}` : sql``}
        GROUP BY p.id, p.title
        ORDER BY revenue DESC
        LIMIT 10
      `);

      return result.map(row => ({
        productId: String(row.product_id),
        title: String(row.title),
        sales: Number(row.sales),
        revenue: Number(row.revenue),
        units: Number(row.units),
        conversionRate: Number(row.conversion_rate) || 0
      }));
    } catch (error) {
      safeLogger.error('Error getting top products:', error);
      return [];
    }
  }

  private async getCustomerInsights(sellerId: string, dateFilter: any) {
    try {
      // Get demographics, preferences, and behavior data
      const [demographics, preferences, behavior] = await Promise.all([
        this.getCustomerDemographics(sellerId, dateFilter),
        this.getCustomerPreferences(sellerId, dateFilter),
        this.getCustomerBehavior(sellerId, dateFilter)
      ]);

      return {
        demographics,
        preferences,
        behavior
      };
    } catch (error) {
      safeLogger.error('Error getting customer insights:', error);
      return {
        demographics: {
          ageGroups: [],
          genderDistribution: [],
          locationDistribution: []
        },
        preferences: {
          topCategories: [],
          priceRanges: [],
          paymentMethods: []
        },
        behavior: {
          averageSessionDuration: 0,
          pagesPerSession: 0,
          bounceRate: 0,
          timeToFirstPurchase: 0,
          purchaseFrequency: 0
        }
      };
    }
  }

  private async analyzeTierProgression(
    sellerId: string,
    metrics: SellerPerformanceMetrics
  ): Promise<SellerTierProgression> {
    // Mock implementation - would analyze tier requirements
    return {
      sellerId,
      currentTier: 'Bronze',
      nextTier: 'Silver',
      progressPercentage: 65,
      requirements: [
        {
          metric: 'Total Sales',
          current: metrics.totalSales,
          required: 10000,
          met: metrics.totalSales >= 10000,
          description: 'Achieve $10,000 in total sales'
        },
        {
          metric: 'Customer Satisfaction',
          current: metrics.customerSatisfaction,
          required: 4.5,
          met: metrics.customerSatisfaction >= 4.5,
          description: 'Maintain 4.5+ star rating'
        }
      ],
      benefits: [
        {
          type: 'commission_reduction',
          description: 'Reduced commission rate',
          value: '2.5%'
        }
      ],
      estimatedTimeToNextTier: 30,
      recommendations: [
        {
          action: 'Improve product descriptions',
          impact: 'Increase conversion rate by 15%',
          priority: 'high'
        }
      ]
    };
  }

  private async generatePerformanceInsights(sellerId: string) {
    // Mock implementation - would generate AI-powered insights
    return [
      {
        type: 'opportunity' as const,
        title: 'Conversion Rate Optimization',
        description: 'Your conversion rate is 15% below industry average',
        impact: 'high' as const,
        actionable: true,
        suggestedActions: [
          'Improve product images',
          'Add customer reviews',
          'Optimize pricing strategy'
        ],
        metrics: { currentRate: 2.1, industryAverage: 2.5 }
      }
    ];
  }

  private async getIndustryBenchmarks(sellerId: string) {
    // Mock implementation - would get real industry benchmarks
    return {
      industryAverage: {
        conversionRate: 2.5,
        averageOrderValue: 75,
        customerSatisfaction: 4.2,
        responseTime: 3600
      },
      topPerformers: {
        conversionRate: 4.2,
        averageOrderValue: 120,
        customerSatisfaction: 4.8,
        responseTime: 1800
      },
      sellerRanking: {
        overall: 156,
        category: 23,
        percentile: 75
      }
    };
  }

  private async analyzeBottlenecks(
    sellerId: string,
    metrics: SellerPerformanceMetrics
  ): Promise<SellerBottleneckAnalysis> {
    // Mock implementation - would analyze performance bottlenecks
    return {
      sellerId,
      bottlenecks: [
        {
          area: 'Product Discovery',
          severity: 'high' as const,
          description: 'Low product visibility in search results',
          impact: 'Reducing potential sales by 25%',
          rootCause: 'Poor SEO optimization and keyword usage',
          solutions: [
            {
              solution: 'Optimize product titles and descriptions',
              effort: 'medium' as const,
              expectedImpact: '15% increase in visibility',
              timeframe: '2-3 weeks'
            }
          ],
          metrics: { searchRanking: 45, clickThroughRate: 1.2 }
        }
      ],
      performanceScore: 72,
      improvementPotential: 28
    };
  }

  private async calculateRevenueGrowth(sellerId: string, dateFilter: any): Promise<number> {
    // Mock implementation - would calculate actual revenue growth
    return 15.5;
  }

  private async calculateProfitMargin(sellerId: string, dateFilter: any): Promise<number> {
    // Mock implementation - would calculate actual profit margin
    return 22.3;
  }

  private async calculateInventoryTurnover(sellerId: string, dateFilter: any): Promise<number> {
    // Mock implementation - would calculate actual inventory turnover
    return 4.2;
  }

  private async calculateConversionRate(sellerId: string, dateFilter: any): Promise<number> {
    // Mock implementation - would calculate actual conversion rate
    return 2.1;
  }

  private async getCustomerDemographics(sellerId: string, dateFilter: any) {
    // Mock implementation - would get actual customer demographics
    return {
      ageGroups: [
        { range: '18-24', percentage: 15 },
        { range: '25-34', percentage: 35 },
        { range: '35-44', percentage: 30 },
        { range: '45+', percentage: 20 }
      ],
      genderDistribution: [
        { gender: 'Female', percentage: 55 },
        { gender: 'Male', percentage: 42 },
        { gender: 'Other', percentage: 3 }
      ],
      locationDistribution: [
        { country: 'United States', percentage: 45 },
        { country: 'Canada', percentage: 20 },
        { country: 'United Kingdom', percentage: 15 },
        { country: 'Other', percentage: 20 }
      ]
    };
  }

  private async getCustomerPreferences(sellerId: string, dateFilter: any) {
    // Mock implementation - would get actual customer preferences
    return {
      topCategories: [
        { category: 'Electronics', percentage: 35 },
        { category: 'Fashion', percentage: 25 },
        { category: 'Home & Garden', percentage: 20 },
        { category: 'Other', percentage: 20 }
      ],
      priceRanges: [
        { range: '$0-$25', percentage: 30 },
        { range: '$25-$50', percentage: 35 },
        { range: '$50-$100', percentage: 25 },
        { range: '$100+', percentage: 10 }
      ],
      paymentMethods: [
        { method: 'Credit Card', percentage: 45 },
        { method: 'PayPal', percentage: 30 },
        { method: 'Crypto', percentage: 15 },
        { method: 'Other', percentage: 10 }
      ]
    };
  }

  private async getCustomerBehavior(sellerId: string, dateFilter: any) {
    // Mock implementation - would get actual customer behavior data
    return {
      averageSessionDuration: 420, // seconds
      pagesPerSession: 3.2,
      bounceRate: 35.5,
      timeToFirstPurchase: 2.5, // days
      purchaseFrequency: 1.8 // purchases per month
    };
  }

  private generateReportSummary(
    metrics: SellerPerformanceMetrics,
    insights: SellerPerformanceInsights | null,
    tierProgression: SellerTierProgression,
    bottlenecks: SellerBottleneckAnalysis
  ) {
    return {
      overallScore: bottlenecks.performanceScore,
      keyHighlights: [
        `Generated $${metrics.totalSales.toLocaleString()} in revenue`,
        `${metrics.totalOrders} orders completed`,
        `${metrics.customerSatisfaction}/5 customer satisfaction rating`
      ],
      topRecommendations: tierProgression.recommendations.slice(0, 3),
      criticalIssues: bottlenecks.bottlenecks.filter(b => b.severity === 'critical').length,
      improvementOpportunities: insights?.insights.filter(i => i.type === 'opportunity').length || 0
    };
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();