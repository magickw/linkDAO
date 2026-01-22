/**
 * Advanced Seller Analytics Service
 * 
 * Provides comprehensive analytics for sellers including:
 * - Sales performance metrics
 * - Customer insights
 * - Revenue tracking
 * - Product performance
 * - Trend analysis
 * - Predictive analytics
 */

import apiClient from './apiClient';

// Time period for analytics
export enum AnalyticsPeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_YEAR = 'this_year',
  CUSTOM = 'custom',
}

// Metric type
export enum MetricType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  PRODUCTS = 'products',
  CUSTOMERS = 'customers',
  CONVERSION = 'conversion',
  AVERAGE_ORDER_VALUE = 'average_order_value',
  RETURN_RATE = 'return_rate',
  CUSTOMER_SATISFACTION = 'customer_satisfaction',
}

// Analytics data point
export interface AnalyticsDataPoint {
  date: Date;
  value: number;
  label?: string;
}

// Sales performance
export interface SalesPerformance {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  returnRate: number;
  revenueGrowth: number; // Percentage change
  ordersGrowth: number; // Percentage change
  period: AnalyticsPeriod;
  previousPeriod: AnalyticsPeriod;
}

// Customer insights
export interface CustomerInsights {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averagePurchaseFrequency: number;
  customerRetentionRate: number;
  topCustomerSegments: CustomerSegment[];
  customerGeography: GeoData[];
}

// Customer segment
export interface CustomerSegment {
  id: string;
  name: string;
  customerCount: number;
  averageOrderValue: number;
  totalRevenue: number;
  characteristics: string[];
}

// Geographic data
export interface GeoData {
  country: string;
  region?: string;
  customerCount: number;
  revenue: number;
  percentage: number;
}

// Product performance
export interface ProductPerformance {
  productId: string;
  productName: string;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  reviewCount: number;
  returnCount: number;
  viewCount: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

// Trend analysis
export interface TrendAnalysis {
  metric: MetricType;
  period: AnalyticsPeriod;
  data: AnalyticsDataPoint[];
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  forecast?: AnalyticsDataPoint[];
  seasonality?: SeasonalityPattern;
}

// Seasonality pattern
export interface SeasonalityPattern {
  hasSeasonality: boolean;
  peakMonths: number[];
  lowMonths: number[];
  averageMultiplier: number;
}

// Predictive analytics
export interface PredictiveAnalytics {
  nextMonthRevenuePrediction: number;
  nextMonthOrdersPrediction: number;
  confidence: number; // 0-1
  factors: PredictionFactor[];
  recommendations: string[];
}

// Prediction factor
export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // 0-1
  description: string;
}

// Analytics dashboard
export interface AnalyticsDashboard {
  salesPerformance: SalesPerformance;
  customerInsights: CustomerInsights;
  topProducts: ProductPerformance[];
  revenueTrend: TrendAnalysis;
  ordersTrend: TrendAnalysis;
  predictiveAnalytics: PredictiveAnalytics;
  alerts: AnalyticsAlert[];
}

// Analytics alert
export interface AnalyticsAlert {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  actionUrl?: string;
}

class AdvancedSellerAnalyticsService {
  private cache: Map<string, any> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get analytics dashboard
   */
  async getAnalyticsDashboard(
    sellerId: string,
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS
  ): Promise<AnalyticsDashboard> {
    try {
      const cacheKey = `dashboard_${sellerId}_${period}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await apiClient.get(`/sellers/${sellerId}/analytics/dashboard`, {
        params: { period },
      });

      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      throw new Error('Failed to fetch analytics dashboard');
    }
  }

  /**
   * Get sales performance
   */
  async getSalesPerformance(
    sellerId: string,
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS
  ): Promise<SalesPerformance> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/sales`, {
        params: { period },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching sales performance:', error);
      throw new Error('Failed to fetch sales performance');
    }
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(
    sellerId: string,
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS
  ): Promise<CustomerInsights> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/customers`, {
        params: { period },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      throw new Error('Failed to fetch customer insights');
    }
  }

  /**
   * Get product performance
   */
  async getProductPerformance(
    sellerId: string,
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
    limit: number = 10
  ): Promise<ProductPerformance[]> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/products`, {
        params: { period, limit },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching product performance:', error);
      throw new Error('Failed to fetch product performance');
    }
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis(
    sellerId: string,
    metric: MetricType,
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS
  ): Promise<TrendAnalysis> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/trends`, {
        params: { metric, period },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      throw new Error('Failed to fetch trend analysis');
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(
    sellerId: string
  ): Promise<PredictiveAnalytics> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/predictions`);

      return response.data;
    } catch (error) {
      console.error('Error fetching predictive analytics:', error);
      throw new Error('Failed to fetch predictive analytics');
    }
  }

  /**
   * Get analytics alerts
   */
  async getAnalyticsAlerts(sellerId: string): Promise<AnalyticsAlert[]> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/alerts`);

      return response.data;
    } catch (error) {
      console.error('Error fetching analytics alerts:', error);
      throw new Error('Failed to fetch analytics alerts');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    sellerId: string,
    format: 'csv' | 'json' | 'pdf',
    period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS
  ): Promise<Blob> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/export`, {
        params: { format, period },
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw new Error('Failed to export analytics');
    }
  }

  /**
   * Get custom analytics report
   */
  async getCustomReport(
    sellerId: string,
    metrics: MetricType[],
    period: AnalyticsPeriod,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const params: any = {
        metrics: metrics.join(','),
        period,
      };

      if (startDate) {
        params.startDate = startDate.toISOString();
      }

      if (endDate) {
        params.endDate = endDate.toISOString();
      }

      const response = await apiClient.get(`/sellers/${sellerId}/analytics/custom`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching custom report:', error);
      throw new Error('Failed to fetch custom report');
    }
  }

  /**
   * Get real-time sales data
   */
  async getRealTimeSales(sellerId: string): Promise<{
    currentOrders: number;
    currentRevenue: number;
    activeCustomers: number;
    recentOrders: any[];
  }> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/realtime`);

      return response.data;
    } catch (error) {
      console.error('Error fetching real-time sales:', error);
      throw new Error('Failed to fetch real-time sales');
    }
  }

  /**
   * Get competitor comparison
   */
  async getCompetitorComparison(
    sellerId: string
  ): Promise<{
    yourPerformance: SalesPerformance;
    averagePerformance: SalesPerformance;
    topPerformer: SalesPerformance;
    ranking: number;
    totalSellers: number;
  }> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/competitors`);

      return response.data;
    } catch (error) {
      console.error('Error fetching competitor comparison:', error);
      throw new Error('Failed to fetch competitor comparison');
    }
  }

  /**
   * Get customer journey analytics
   */
  async getCustomerJourney(sellerId: string): Promise<{
    averageTimeToFirstPurchase: number;
    averageTimeBetweenPurchases: number;
    conversionFunnel: {
      stage: string;
      count: number;
      conversionRate: number;
    }[];
    dropOffPoints: string[];
  }> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/customer-journey`);

      return response.data;
    } catch (error) {
      console.error('Error fetching customer journey:', error);
      throw new Error('Failed to fetch customer journey');
    }
  }

  /**
   * Get inventory analytics
   */
  async getInventoryAnalytics(sellerId: string): Promise<{
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    overstockProducts: number;
    inventoryTurnover: number;
    averageDaysInStock: number;
  }> {
    try {
      const response = await apiClient.get(`/sellers/${sellerId}/analytics/inventory`);

      return response.data;
    } catch (error) {
      console.error('Error fetching inventory analytics:', error);
      throw new Error('Failed to fetch inventory analytics');
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format number
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Get cached data
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }
}

// Export singleton instance
export const advancedSellerAnalyticsService = new AdvancedSellerAnalyticsService();

export default advancedSellerAnalyticsService;