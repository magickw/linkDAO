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
  private baseUrl = `${ENV.BACKEND_URL}/api/marketplace/seller`;

  /**
   * Get seller performance metrics
   */
  async getMetrics(walletAddress: string, timeframe: 'day' | 'week' | 'month' = 'week'): Promise<SellerMetrics | null> {
    try {
      // Backend: GET /api/marketplace/seller/dashboard/:walletAddress
      const response = await apiClient.get(`${this.baseUrl}/dashboard/${walletAddress.toLowerCase()}`);
      const data = response.data;
      if (!data) return null;

      return {
        totalSales: data.sales?.total || 0,
        totalOrders: data.orders?.total || 0,
        averageOrderValue: data.analytics?.overview?.averageOrderValue || 0,
        conversionRate: data.analytics?.overview?.conversionRate || 0,
        customerSatisfaction: data.performance?.kpis?.customerSatisfaction?.value || 0,
        returnRate: 0,
        responseTime: data.performance?.kpis?.responseTime?.value || 0,
        repeatCustomerRate: data.analytics?.buyers?.behavior?.repeatCustomers || 0,
        revenueGrowth: data.analytics?.overview?.growthRate || 0,
        profitMargin: 0,
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
    walletAddress: string,
    timeframe: '7d' | '30d' | '90d' | '1y' = '30d',
    limit: number = 30
  ): Promise<SalesData[]> {
    try {
      // Backend: GET /api/marketplace/seller/dashboard/analytics/:walletAddress?period=30d
      const response = await apiClient.get(`${this.baseUrl}/dashboard/analytics/${walletAddress.toLowerCase()}?period=${timeframe}`);
      const data = response.data;
      
      if (data && data.revenue && Array.isArray(data.revenue.byDay)) {
        return data.revenue.byDay.map((item: any) => ({
          date: item.date,
          sales: Number(item.amount),
          orders: 0, // Need to merge from orders.byDay if needed
          revenue: Number(item.amount)
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching sales data:', error);
      return [];
    }
  }

  /**
   * Get top performing products
   */
  async getTopProducts(walletAddress: string, limit: number = 5): Promise<TopProduct[]> {
    try {
      // Use general analytics endpoint or dashboard data
      const response = await apiClient.get(`${this.baseUrl}/dashboard/${walletAddress.toLowerCase()}`);
      const data = response.data;
      
      if (data && data.analytics && data.analytics.sales && Array.isArray(data.analytics.sales.topPerforming)) {
        return data.analytics.sales.topPerforming.map((p: any) => ({
          productId: p.id,
          title: p.title,
          sales: 0,
          revenue: p.price,
          units: 0,
          conversionRate: 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(walletAddress: string): Promise<CustomerInsight | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard/analytics/${walletAddress.toLowerCase()}`);
      const data = response.data;
      
      if (data && data.buyers) {
        return {
          demographics: {
            ageGroups: [],
            locationDistribution: data.buyers.demographics?.countries?.map((c: any) => ({
              country: c.country,
              percentage: c.count
            })) || []
          },
          preferences: {
            topCategories: [],
            priceRanges: []
          },
          behavior: {
            averageSessionDuration: data.buyers.behavior?.averageSessionDuration || 0,
            purchaseFrequency: data.buyers.behavior?.averageOrdersPerCustomer || 0
          }
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching customer insights:', error);
      return null;
    }
  }

  /**
   * Get seller tier information
   */
  async getSellerTier(walletAddress: string): Promise<SellerTier | null> {
    try {
      // Backend: GET /api/marketplace/seller/:walletAddress/tier
      const response = await apiClient.get(`${this.baseUrl}/${walletAddress.toLowerCase()}/tier`);
      const data = response.data;
      
      // Get progress
      const progressResponse = await apiClient.get(`${this.baseUrl}/${walletAddress.toLowerCase()}/tier/progress`);
      const progressData = progressResponse.data;

      if (data) {
        return {
          currentTier: data.tier || 'basic',
          nextTier: progressData?.nextTier || null,
          progressPercentage: progressData?.progressPercentage || 0,
          requirements: [], // Map from progressData if available
          benefits: data.benefits?.map((b: string) => ({
            type: 'benefit',
            description: b,
            value: 'enabled'
          })) || []
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching seller tier:', error);
      return null;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStats(walletAddress: string): Promise<{
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    returns: number;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/dashboard/${walletAddress.toLowerCase()}`);
      const data = response.data;
      
      if (data && data.orders && data.orders.summary) {
        const s = data.orders.summary;
        return {
          pending: s.pending || 0,
          processing: s.processing || 0,
          shipped: s.shipped || 0,
          delivered: s.delivered || 0,
          returns: 0,
        };
      }
      
      return {
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        returns: 0,
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