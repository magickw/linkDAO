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
      return this.getMockMetrics();
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
      return this.getMockSalesData(limit);
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
      return this.getMockTopProducts();
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
      return this.getMockCustomerInsights();
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
      return this.getMockSellerTier();
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
      return this.getMockOrderStats();
    }
  }

  // Mock data methods
  private getMockMetrics(): SellerMetrics {
    return {
      totalSales: 45678.50,
      totalOrders: 234,
      averageOrderValue: 195.25,
      conversionRate: 3.2,
      customerSatisfaction: 4.7,
      returnRate: 2.1,
      responseTime: 1.5,
      repeatCustomerRate: 35.2,
      revenueGrowth: 12.5,
      profitMargin: 28.3,
    };
  }

  private getMockSalesData(limit: number): SalesData[] {
    const data: SalesData[] = [];
    const now = new Date();
    for (let i = 0; i < limit; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        sales: Math.floor(Math.random() * 20) + 5,
        orders: Math.floor(Math.random() * 10) + 2,
        revenue: Math.floor(Math.random() * 2000) + 500,
      });
    }
    return data.reverse();
  }

  private getMockTopProducts(): TopProduct[] {
    return [
      {
        productId: '1',
        title: 'Premium Blockchain Course',
        sales: 45,
        revenue: 8955,
        units: 45,
        conversionRate: 4.2,
      },
      {
        productId: '2',
        title: 'Hardware Wallet Bundle',
        sales: 38,
        revenue: 5700,
        units: 38,
        conversionRate: 3.8,
      },
      {
        productId: '3',
        title: 'Crypto Trading Signals',
        sales: 62,
        revenue: 4340,
        units: 62,
        conversionRate: 5.1,
      },
      {
        productId: '4',
        title: 'DeFi Starter Kit',
        sales: 28,
        revenue: 3360,
        units: 28,
        conversionRate: 2.9,
      },
      {
        productId: '5',
        title: 'NFT Creation Guide',
        sales: 55,
        revenue: 2750,
        units: 55,
        conversionRate: 4.5,
      },
    ];
  }

  private getMockCustomerInsights(): CustomerInsight {
    return {
      demographics: {
        ageGroups: [
          { range: '18-24', percentage: 15 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 30 },
          { range: '45-54', percentage: 15 },
          { range: '55+', percentage: 5 },
        ],
        locationDistribution: [
          { country: 'United States', percentage: 40 },
          { country: 'United Kingdom', percentage: 15 },
          { country: 'Germany', percentage: 10 },
          { country: 'Canada', percentage: 8 },
          { country: 'Australia', percentage: 7 },
          { country: 'Other', percentage: 20 },
        ],
      },
      preferences: {
        topCategories: [
          { category: 'Education', percentage: 35 },
          { category: 'Security', percentage: 25 },
          { category: 'Trading', percentage: 20 },
          { category: 'NFTs', percentage: 12 },
          { category: 'DeFi', percentage: 8 },
        ],
        priceRanges: [
          { range: '$0-$50', percentage: 25 },
          { range: '$50-$100', percentage: 35 },
          { range: '$100-$200', percentage: 25 },
          { range: '$200+', percentage: 15 },
        ],
      },
      behavior: {
        averageSessionDuration: 8.5,
        purchaseFrequency: 2.3,
      },
    };
  }

  private getMockSellerTier(): SellerTier {
    return {
      currentTier: 'Gold',
      nextTier: 'Platinum',
      progressPercentage: 72,
      requirements: [
        {
          metric: 'Total Sales',
          current: 45678,
          required: 50000,
          met: false,
          description: 'Reach $50,000 in total sales',
        },
        {
          metric: 'Customer Satisfaction',
          current: 4.7,
          required: 4.5,
          met: true,
          description: 'Maintain 4.5+ star rating',
        },
        {
          metric: 'Response Time',
          current: 1.5,
          required: 2.0,
          met: true,
          description: 'Average response under 2 hours',
        },
        {
          metric: 'Repeat Customers',
          current: 35.2,
          required: 40,
          met: false,
          description: '40% repeat customer rate',
        },
      ],
      benefits: [
        { type: 'fees', description: 'Reduced platform fees', value: '1.5%' },
        { type: 'support', description: 'Priority support', value: '24/7' },
        { type: 'analytics', description: 'Advanced analytics', value: 'Full access' },
        { type: 'promotion', description: 'Featured listings', value: '2x/week' },
      ],
    };
  }

  private getMockOrderStats() {
    return {
      pending: 12,
      processing: 8,
      shipped: 15,
      delivered: 189,
      returns: 3,
    };
  }
}

export const sellerAnalyticsService = new SellerAnalyticsService();