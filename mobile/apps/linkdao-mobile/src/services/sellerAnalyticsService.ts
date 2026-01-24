/**
 * Seller Analytics Service
 * Provides analytics data for sellers
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface SellerMetrics {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  customerSatisfaction: number;
  returnRate: number;
  responseTime: number;
  repeatCustomerRate: number;
  revenueGrowth: number;
  profitMargin: number;
}

export interface SalesData {
  date: string;
  sales: number;
  orders: number;
  revenue: number;
}

export interface TopProduct {
  productId: string;
  title: string;
  sales: number;
  revenue: number;
  units: number;
  conversionRate: number;
}

export interface CustomerInsight {
  demographics: {
    ageGroups: Array<{ range: string; percentage: number }>;
    locationDistribution: Array<{ country: string; percentage: number }>;
  };
  preferences: {
    topCategories: Array<{ category: string; percentage: number }>;
    priceRanges: Array<{ range: string; percentage: number }>;
  };
  behavior: {
    averageSessionDuration: number;
    purchaseFrequency: number;
  };
}

export interface SellerTier {
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
}

class SellerAnalyticsService {
  private baseUrl = `${ENV.BACKEND_URL}/api/seller/analytics`;

  /**
   * Get seller performance metrics
   */
  async getMetrics(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<SellerMetrics | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/metrics`, { params: { timeframe } });
      const data = response.data.data || response.data;
      return {
        totalSales: data.totalSales || 0,
        totalOrders: data.totalOrders || 0,
        averageOrderValue: data.averageOrderValue || 0,
        conversionRate: data.conversionRate || 0,
        customerSatisfaction: data.customerSatisfaction || 0,
        returnRate: data.returnRate || 0,
        responseTime: data.responseTime || 0,
        repeatCustomerRate: data.repeatCustomerRate || 0,
        revenueGrowth: data.revenueGrowth || 0,
        profitMargin: data.profitMargin || 0,
      };
    } catch (error) {
      console.error('Error fetching seller metrics:', error);
      return null;
    }
  }

  /**
   * Get sales data over time
   */
  async getSalesData(
    timeframe: 'day' | 'week' | 'month' = 'week',
    limit: number = 30
  ): Promise<SalesData[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sales`, {
        params: { timeframe, limit }
      });
      const data = response.data.data || response.data;
      return data.sales || data || [];
    } catch (error) {
      console.error('Error fetching sales data:', error);
      return [];
    }
  }

  /**
   * Get top performing products
   */
  async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/top-products`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.products || data || [];
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(): Promise<CustomerInsight | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/customer-insights`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      return null;
    }
  }

  /**
   * Get seller tier information
   */
  async getSellerTier(): Promise<SellerTier | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/tier`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching seller tier:', error);
      return null;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(): Promise<{
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    returns: number;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/order-stats`);
      const data = response.data.data || response.data;
      return {
        pending: data.pending || 0,
        processing: data.processing || 0,
        shipped: data.shipped || 0,
        delivered: data.delivered || 0,
        returns: data.returns || 0,
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        returns: 0,
      };
    }
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();