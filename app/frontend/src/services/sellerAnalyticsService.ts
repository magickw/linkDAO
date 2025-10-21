import { requestManager } from './requestManager';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

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
  estimatedTimeToNextTier: number;
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

export interface SellerAnalyticsDashboard {
  sellerId: string;
  dateRange: { startDate?: Date; endDate?: Date };
  metrics: SellerPerformanceMetrics;
  insights: Array<any>;
  tierProgression: SellerTierProgression;
  bottlenecks: Array<any>;
  performanceScore: number;
  lastUpdated: string;
}

export interface SellerPerformanceComparison {
  sellerId: string;
  sellerMetrics: {
    conversionRate: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    responseTime: number;
  };
  benchmarks: any;
  performance: {
    conversionRateVsIndustry: string;
    aovVsIndustry: string;
    satisfactionVsIndustry: string;
    responseTimeVsIndustry: string;
  };
  ranking: {
    overall: number;
    category: number;
    percentile: number;
  };
}

class SellerAnalyticsService {
  private baseUrl = `${BACKEND_API_BASE_URL}/api/seller-analytics`;

  /**
   * Get comprehensive seller performance metrics
   */
  async getSellerPerformanceMetrics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SellerPerformanceMetrics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: SellerPerformanceMetrics}>(
        `${this.baseUrl}/${sellerId}/metrics?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching seller performance metrics:', error);
      // Return default metrics when backend is unavailable
      return this.getDefaultMetrics(sellerId);
    }
  }

  /**
   * Get seller tier progression analysis
   */
  async getSellerTierProgression(sellerId: string): Promise<SellerTierProgression> {
    try {
      const response = await requestManager.request<{data: SellerTierProgression}>(
        `${this.baseUrl}/${sellerId}/tier-progression`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching seller tier progression:', error);
      return this.getDefaultTierProgression(sellerId);
    }
  }

  /**
   * Get seller performance insights and recommendations
   */
  async getSellerPerformanceInsights(sellerId: string): Promise<SellerPerformanceInsights> {
    try {
      const response = await requestManager.request<{data: SellerPerformanceInsights}>(
        `${this.baseUrl}/${sellerId}/insights`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching seller performance insights:', error);
      return this.getDefaultInsights(sellerId);
    }
  }

  /**
   * Detect performance bottlenecks and get solutions
   */
  async detectPerformanceBottlenecks(sellerId: string): Promise<SellerBottleneckAnalysis> {
    try {
      const response = await requestManager.request<{data: SellerBottleneckAnalysis}>(
        `${this.baseUrl}/${sellerId}/bottlenecks`
      );
      return response.data;
    } catch (error) {
      console.error('Error detecting performance bottlenecks:', error);
      return this.getDefaultBottlenecks(sellerId);
    }
  }

  /**
   * Track seller performance metrics
   */
  async trackSellerPerformance(
    sellerId: string,
    metricType: string,
    value: number,
    metadata?: any
  ): Promise<void> {
    try {
      await requestManager.request(`${this.baseUrl}/${sellerId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metricType,
          value,
          metadata
        })
      });
    } catch (error) {
      // Silently fail for tracking to avoid disrupting user experience
      console.warn('Failed to track seller performance:', error);
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
      const params = new URLSearchParams();
      params.append('metricType', metricType);
      params.append('period', period);
      params.append('limit', limit.toString());

      const response = await requestManager.request<{data: { trends: Array<{ date: string; value: number }> }}>(
        `${this.baseUrl}/${sellerId}/trends?${params}`
      );
      return response.data.trends;
    } catch (error) {
      console.error('Error fetching seller performance trends:', error);
      return [];
    }
  }

  /**
   * Generate automated seller performance report
   */
  async generateSellerReport(
    sellerId: string,
    reportType: 'weekly' | 'monthly' | 'quarterly',
    includeRecommendations: boolean = true
  ): Promise<any> {
    try {
      const response = await requestManager.request<{data: any}>(
        `${this.baseUrl}/${sellerId}/report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType,
            includeRecommendations
          })
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error generating seller report:', error);
      return {
        status: 'unavailable',
        message: 'Unable to generate report at this time.',
        reportType,
        sellerId
      };
    }
  }

  /**
   * Get seller analytics dashboard data
   */
  async getSellerAnalyticsDashboard(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SellerAnalyticsDashboard> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: SellerAnalyticsDashboard}>(
        `${this.baseUrl}/${sellerId}/dashboard?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching seller analytics dashboard:', error);
      return this.getDefaultDashboard(sellerId, startDate, endDate);
    }
  }

  /**
   * Get seller performance comparison with benchmarks
   */
  async getSellerPerformanceComparison(sellerId: string): Promise<SellerPerformanceComparison> {
    try {
      const response = await requestManager.request<{data: SellerPerformanceComparison}>(
        `${this.baseUrl}/${sellerId}/comparison`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching seller performance comparison:', error);
      return this.getDefaultComparison(sellerId);
    }
  }

  /**
   * Export seller analytics data
   */
  async exportSellerAnalytics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('format', format);

      const response = await requestManager.request<any>(
        `${this.baseUrl}/${sellerId}/export?${params}`
      );
      return response;
    } catch (error) {
      console.error('Error exporting seller analytics:', error);
      return {
        status: 'unavailable',
        message: 'Analytics export is currently unavailable.',
        format,
        sellerId
      };
    }
  }

  // Auto-tracking methods for seller activities

  /**
   * Track product view
   */
  trackProductView(sellerId: string, productId: string, viewerData?: any): void {
    this.trackSellerPerformance(sellerId, 'product_view', 1, {
      productId,
      viewerData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track product sale
   */
  trackProductSale(sellerId: string, saleData: {
    productId: string;
    amount: number;
    buyerId: string;
    paymentMethod: string;
  }): void {
    this.trackSellerPerformance(sellerId, 'product_sale', saleData.amount, {
      ...saleData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track customer interaction
   */
  trackCustomerInteraction(sellerId: string, interactionType: string, data?: any): void {
    this.trackSellerPerformance(sellerId, `customer_${interactionType}`, 1, {
      interactionType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track response time
   */
  trackResponseTime(sellerId: string, responseTimeSeconds: number, context?: string): void {
    this.trackSellerPerformance(sellerId, 'response_time', responseTimeSeconds, {
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track shipping time
   */
  trackShippingTime(sellerId: string, shippingTimeHours: number, orderId: string): void {
    this.trackSellerPerformance(sellerId, 'shipping_time', shippingTimeHours, {
      orderId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track customer satisfaction rating
   */
  trackCustomerSatisfaction(sellerId: string, rating: number, orderId: string, feedback?: string): void {
    this.trackSellerPerformance(sellerId, 'customer_satisfaction', rating, {
      orderId,
      feedback,
      timestamp: new Date().toISOString()
    });
  }

  // Default fallback data methods

  private getDefaultMetrics(sellerId: string): SellerPerformanceMetrics {
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
      profitMargin: 0,
      inventoryTurnover: 0,
      customerLifetimeValue: 0,
      topProducts: [],
      customerInsights: {
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
      }
    };
  }

  private getDefaultTierProgression(sellerId: string): SellerTierProgression {
    return {
      sellerId,
      currentTier: 'Bronze',
      nextTier: 'Silver',
      progressPercentage: 0,
      requirements: [],
      benefits: [],
      estimatedTimeToNextTier: 0,
      recommendations: []
    };
  }

  private getDefaultInsights(sellerId: string): SellerPerformanceInsights {
    return {
      sellerId,
      insights: [],
      benchmarks: {
        industryAverage: {
          conversionRate: 0,
          averageOrderValue: 0,
          customerSatisfaction: 0,
          responseTime: 0
        },
        topPerformers: {
          conversionRate: 0,
          averageOrderValue: 0,
          customerSatisfaction: 0,
          responseTime: 0
        },
        sellerRanking: {
          overall: 0,
          category: 0,
          percentile: 0
        }
      }
    };
  }

  private getDefaultBottlenecks(sellerId: string): SellerBottleneckAnalysis {
    return {
      sellerId,
      bottlenecks: [],
      performanceScore: 0,
      improvementPotential: 0
    };
  }

  private getDefaultDashboard(sellerId: string, startDate?: Date, endDate?: Date): SellerAnalyticsDashboard {
    return {
      sellerId,
      dateRange: { startDate, endDate },
      metrics: this.getDefaultMetrics(sellerId),
      insights: [],
      tierProgression: this.getDefaultTierProgression(sellerId),
      bottlenecks: [],
      performanceScore: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private getDefaultComparison(sellerId: string): SellerPerformanceComparison {
    return {
      sellerId,
      sellerMetrics: {
        conversionRate: 0,
        averageOrderValue: 0,
        customerSatisfaction: 0,
        responseTime: 0
      },
      benchmarks: {},
      performance: {
        conversionRateVsIndustry: '0.0',
        aovVsIndustry: '0.0',
        satisfactionVsIndustry: '0.0',
        responseTimeVsIndustry: '0.0'
      },
      ranking: {
        overall: 0,
        category: 0,
        percentile: 0
      }
    };
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();
export default sellerAnalyticsService;