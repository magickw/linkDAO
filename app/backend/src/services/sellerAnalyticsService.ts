import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import {
  sellers,
  products,
  orders,
  users,
  sellerTierRequirements,
  sellerTierBenefits,
  sellerTierProgression,
  sellerTierHistory,
  reviews
} from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg, isNotNull } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { databaseService } from './databaseService';

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

  // Tier System Analytics Methods

  /**
   * Get comprehensive tier analytics for a seller
   */
  async getTierAnalytics(walletAddress: string): Promise<{
    currentTier: string;
    tierProgression: {
      currentTier: string;
      nextTier: string | null;
      progressPercentage: number;
      requirementsMet: number;
      totalRequirements: number;
      estimatedTimeToNextTier: string;
    };
    performanceMetrics: {
      totalSales: number;
      averageRating: number;
      responseTime: number;
      returnRate: number;
      disputeRate: number;
      repeatRate: number;
    };
    tierHistory: Array<{
      fromTier: string;
      toTier: string;
      date: Date;
      reason: string;
      autoUpgraded: boolean;
    }>;
    requirementsStatus: Array<{
      type: string;
      current: number;
      required: number;
      met: boolean;
      description: string;
      trend: 'improving' | 'declining' | 'stable';
    }>;
    tierComparison: {
      currentTierBenefits: Array<{
        type: string;
        description: string;
        value: string;
      }>;
      nextTierBenefits: Array<{
        type: string;
        description: string;
        value: string;
      }>;
    };
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get current seller info
      const [seller] = await db.select().from(sellers).where(eq(sellers.walletAddress, walletAddress));
      
      if (!seller) {
        throw new Error('Seller not found');
      }

      // Get tier progression data
            const [progression] = await db
              .select()
              .from(sellerTierProgression)
              .where(eq(sellerTierProgression.sellerWalletAddress, walletAddress));
      
            // Get tier history
            const history = await db
              .select()
              .from(sellerTierHistory)
              .where(eq(sellerTierHistory.sellerWalletAddress, walletAddress))
              .orderBy(desc(sellerTierHistory.createdAt))
              .limit(10);
      
            // Get requirements for current tier
            const requirements = await db
              .select()
              .from(sellerTierRequirements)
              .where(eq(sellerTierRequirements.tier, seller.tier));
      
            // Get benefits for current and next tier
            const [currentBenefits, nextBenefits] = await Promise.all([
              db.select().from(sellerTierBenefits).where(eq(sellerTierBenefits.tier, seller.tier)),
              progression?.nextEligibleTier
                ? db.select().from(sellerTierBenefits).where(eq(sellerTierBenefits.tier, progression.nextEligibleTier))
                : Promise.resolve([])
            ]);
      // Calculate performance metrics
      const performanceMetrics = await this.calculateTierMetrics(walletAddress);

      // Calculate estimated time to next tier
      const estimatedTimeToNextTier = this.calculateEstimatedTimeToNextTier(
        seller.tier,
        progression?.progress_percentage || 0,
        performanceMetrics
      );

      // Get requirements status with trends
      const requirementsStatus = await this.getRequirementsStatusWithTrends(walletAddress, seller.tier);

      return {
        currentTier: seller.tier,
        tierProgression: {
          currentTier: seller.tier,
          nextTier: progression?.nextEligibleTier || null,
          progressPercentage: progression?.progressPercentage || 0,
          requirementsMet: progression?.requirementsMet || 0,
          totalRequirements: progression?.totalRequirements || requirements.length,
          estimatedTimeToNextTier
        },
        performanceMetrics,
        tierHistory: history.map(h => ({
          fromTier: h.fromTier,
          toTier: h.toTier,
          date: h.createdAt,
          reason: h.upgradeReason,
          autoUpgraded: h.autoUpgraded
        })),
        requirementsStatus,
        tierComparison: {
          currentTierBenefits: currentBenefits.map(b => ({
            type: b.benefitType,
            description: b.description,
            value: b.benefitValue
          })),
          nextTierBenefits: nextBenefits.map(b => ({
            type: b.benefitType,
            description: b.description,
            value: b.benefitValue
          }))
        }
      };
    } catch (error) {
      safeLogger.error('Error getting tier analytics:', error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics for tier evaluation
   */
  private async calculateTierMetrics(walletAddress: string): Promise<{
    totalSales: number;
    averageRating: number;
    responseTime: number;
    returnRate: number;
    disputeRate: number;
    repeatRate: number;
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get metrics from orders and reviews
      const metrics = await db
        .select({
          totalSales: sql<number>`SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END)`.as('total_sales'),
          totalOrders: sql<number>`COUNT(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END)`.as('total_orders'),
          averageRating: sql<number>`COALESCE(AVG(r.rating), 0)`.as('average_rating'),
          responseTime: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (o.created_at))), 0)`.as('response_time'),
          disputeRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'disputed' THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id), 0)`.as('dispute_rate'),
          returnRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'completed' AND o.returned = true THEN 1 ELSE 0 END) * 100.0 / COUNT(o.id), 0)`.as('return_rate'),
          repeatRate: sql<number>`COALESCE(COUNT(DISTINCT o.buyer_id) * 100.0 / COUNT(o.id), 0)`.as('repeat_rate')
        })
        .from(orders)
        .leftJoin(reviews, eq(reviews.revieweeId, orders.sellerId))
        .where(eq(orders.sellerId, walletAddress))
        .groupBy(orders.sellerId);

      return metrics[0] || {
        totalSales: 0,
        totalOrders: 0,
        averageRating: 0,
        responseTime: 0,
        disputeRate: 0,
        returnRate: 0,
        repeatRate: 0
      };
    } catch (error) {
      safeLogger.error('Error calculating tier metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated time to reach next tier
   */
  private calculateEstimatedTimeToNextTier(
    currentTier: string,
    progressPercentage: number,
    metrics: any
  ): string {
    if (progressPercentage >= 100) {
      return 'Ready for upgrade';
    }

    // Simple estimation based on current progress and tier
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    if (currentIndex >= tierOrder.length - 1) {
      return 'Maximum tier reached';
    }

    // Estimate based on sales progress (simplified)
    const salesProgress = metrics.totalSales / this.getNextTierSalesRequirement(currentTier);
    const estimatedMonths = Math.ceil((1 - salesProgress) * 12 / Math.max(salesProgress, 0.1));

    if (estimatedMonths <= 1) {
      return 'Less than 1 month';
    } else if (estimatedMonths <= 3) {
      return `${estimatedMonths} months`;
    } else {
      return `${estimatedMonths}+ months`;
    }
  }

  /**
   * Get sales requirement for next tier
   */
  private getNextTierSalesRequirement(currentTier: string): number {
    const requirements: Record<string, number> = {
      'bronze': 5000,    // Need $5,000 for silver
      'silver': 25000,   // Need $25,000 for gold
      'gold': 100000,    // Need $100,000 for platinum
      'platinum': 500000, // Need $500,000 for diamond
      'diamond': 500000  // Maximum tier
    };
    return requirements[currentTier] || 5000;
  }

  /**
   * Get requirements status with trend analysis
   */
  private async getRequirementsStatusWithTrends(walletAddress: string, tier: string): Promise<Array<{
    type: string;
    current: number;
    required: number;
    met: boolean;
    description: string;
    trend: 'improving' | 'declining' | 'stable';
  }>> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get current requirements
      const requirements = await db
        .select()
        .from(sellerTierRequirements)
        .where(eq(sellerTierRequirements.tier, tier));

      // Get current metrics
      const currentMetrics = await this.calculateTierMetrics(walletAddress);

      // Get historical metrics for trend analysis (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [historicalMetrics] = await db
        .select({
          totalSales: sql<number>`SUM(CASE WHEN o.status = 'completed' AND o.created_at >= ${thirtyDaysAgo} THEN o.amount ELSE 0 END)`.as('total_sales'),
          averageRating: sql<number>`COALESCE(AVG(CASE WHEN r.created_at >= ${thirtyDaysAgo} THEN r.rating ELSE NULL END), 0)`.as('average_rating'),
          responseTime: sql<number>`COALESCE(AVG(CASE WHEN o.created_at >= ${thirtyDaysAgo} THEN EXTRACT(EPOCH FROM (o.created_at)) ELSE NULL END), 0)`.as('response_time'),
          returnRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'completed' AND o.returned = true AND o.created_at >= ${thirtyDaysAgo} THEN 1 ELSE 0 END) * 100.0 / COUNT(CASE WHEN o.created_at >= ${thirtyDaysAgo} THEN 1 ELSE NULL END), 0)`.as('return_rate'),
          disputeRate: sql<number>`COALESCE(COUNT(CASE WHEN o.status = 'disputed' AND o.created_at >= ${thirtyDaysAgo} THEN 1 ELSE 0 END) * 100.0 / COUNT(CASE WHEN o.created_at >= ${thirtyDaysAgo} THEN 1 ELSE NULL END), 0)`.as('dispute_rate'),
          repeatRate: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN o.created_at >= ${thirtyDaysAgo} THEN o.buyer_id ELSE NULL END) * 100.0 / COUNT(CASE WHEN o.created_at >= ${thirtyDaysAgo} THEN 1 ELSE NULL END), 0)`.as('repeat_rate')
        })
        .from(orders)
              .leftJoin(reviews, eq(reviews.revieweeId, orders.sellerId))
              .where(eq(orders.sellerId, walletAddress))
              .groupBy(orders.sellerId);
      return requirements.map(req => {
        const metricField = this.getMetricField(req.requirement_type);
        const currentValue = currentMetrics[metricField] || 0;
        const requiredValue = parseFloat(req.required_value.toString());
        const met = this.checkRequirementMet(req.requirement_type, currentMetrics);
        
        // Calculate trend (simplified)
        const trend = this.calculateTrend(
          currentValue,
          historicalMetrics[0]?.[metricField] || 0,
          req.requirement_type
        );

        return {
          type: req.requirement_type,
          current: currentValue,
          required: requiredValue,
          met,
          description: req.description,
          trend
        };
      });
    } catch (error) {
      safeLogger.error('Error getting requirements status with trends:', error);
      throw error;
    }
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(current: number, historical: number, requirementType: string): 'improving' | 'declining' | 'stable' {
    const threshold = 0.05; // 5% threshold for considering a change significant
    const ratio = historical > 0 ? (current - historical) / historical : 0;

    switch (requirementType) {
      case 'response_time':
      case 'return_rate':
      case 'dispute_rate':
        // Lower is better for these metrics
        if (ratio < -threshold) return 'improving';
        if (ratio > threshold) return 'declining';
        return 'stable';
      default:
        // Higher is better for these metrics
        if (ratio > threshold) return 'improving';
        if (ratio < -threshold) return 'declining';
        return 'stable';
    }
  }

  /**
   * Get tier distribution analytics
   */
  async getTierDistributionAnalytics(): Promise<{
    distribution: Array<{
      tier: string;
      count: number;
      percentage: number;
      averageSales: number;
      averageRating: number;
    }>;
    totalSellers: number;
    tierGrowth: Array<{
      tier: string;
      newSellersThisMonth: number;
      upgradesThisMonth: number;
    }>;
  }> {
    try {
      const db = databaseService.getDatabase();
      if (!db) throw new Error('Database unavailable');

      // Get tier distribution
      const distribution = await db
        .select({
          tier: sellers.tier,
          count: sql<number>`COUNT(*)`.as('count'),
          averageSales: sql<number>`COALESCE(AVG(sales.total_sales), 0)`.as('average_sales'),
          averageRating: sql<number>`COALESCE(AVG(sales.avg_rating), 0)`.as('average_rating')
        })
        .from(sellers)
        .leftJoin(
          db.select({
            seller_id: orders.sellerId,
            total_sales: sql<number>`SUM(CASE WHEN o.status = 'completed' THEN o.amount ELSE 0 END)`.as('total_sales'),
            avg_rating: sql<number>`COALESCE(AVG(r.rating), 0)`.as('avg_rating')
          })
            .from(orders)
            .leftJoin(reviews, eq(reviews.revieweeId, orders.sellerId))
            .groupBy(orders.sellerId)
            .as('sales'),
          eq(sellers.walletAddress, sql`sales.seller_id`)
        )
        .groupBy(sellers.tier)
        .orderBy(sellers.tier);

      // Calculate total sellers from distribution
      const totalSellers = distribution.reduce((sum, d) => sum + d.count, 0);

      // Get tier growth data
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const tierGrowth = await db
        .select({
          tier: sellers.tier,
          newSellersThisMonth: sql<number>`COUNT(CASE WHEN s.created_at >= ${oneMonthAgo} THEN 1 ELSE 0 END)`.as('new_sellers'),
          upgradesThisMonth: sql<number>`COUNT(CASE WHEN h.created_at >= ${oneMonthAgo} THEN 1 ELSE 0 END)`.as('upgrades')
        })
        .from(sellers)
        .leftJoin(sellerTierHistory, eq(sellerTierHistory.sellerWalletAddress, sellers.walletAddress))
        .groupBy(sellers.tier);

      return {
        distribution: distribution.map(d => ({
          tier: d.tier,
          count: d.count,
          percentage: totalSellers > 0 ? (d.count / totalSellers) * 100 : 0,
          averageSales: d.averageSales,
          averageRating: d.averageRating
        })),
        totalSellers,
        tierGrowth: tierGrowth.map(g => ({
          tier: g.tier,
          newSellersThisMonth: g.newSellersThisMonth,
          upgradesThisMonth: g.upgradesThisMonth
        }))
      };
    } catch (error) {
      safeLogger.error('Error getting tier distribution analytics:', error);
      throw error;
    }
  }

  /**
   * Helper function to map requirement type to metric field
   */
  private getMetricField(requirementType: string): keyof any {
    const mapping: Record<string, keyof any> = {
      'total_sales': 'totalSales',
      'rating': 'averageRating',
      'response_time': 'responseTime',
      'return_rate': 'returnRate',
      'dispute_rate': 'disputeRate',
      'repeat_rate': 'repeatRate'
    };
    return mapping[requirementType] || 'totalSales';
  }

  /**
   * Helper function to check if requirement is met
   */
  private checkRequirementMet(requirementType: string, metrics: any): boolean {
    const metricField = this.getMetricField(requirementType);
    const metricValue = metrics[metricField] || 0;
    const requiredValue = this.getRequiredValue(requirementType);
    
    switch (requirementType) {
      case 'response_time':
        return metricValue <= requiredValue;
      case 'return_rate':
      case 'dispute_rate':
        return metricValue <= requiredValue;
      case 'repeat_rate':
        return metricValue >= requiredValue;
      default:
        return metricValue >= requiredValue;
    }
  }

  /**
   * Helper function to get required value for requirement type
   */
  private getRequiredValue(requirementType: string): number {
    const mapping: Record<string, number> = {
      'total_sales': 0,
      'rating': 0,
      'response_time': 0,
      'return_rate': 100,
      'dispute_rate': 100,
      'repeat_rate': 0
    };
    return mapping[requirementType] || 0;
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();
