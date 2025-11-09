/**
 * Order Analytics Types - Comprehensive type definitions for order analytics
 */

export interface CategoryAnalytics {
  category: string;
  orderCount: number;
  volume: string;
}

export interface MonthlyTrend {
  month?: string;
  date?: string;
  orderCount: number;
  volume: string;
  completionRate: number;
}

export interface OrderAnalytics {
  totalOrders: number;
  totalVolume: string;
  totalRevenue: string;
  averageOrderValue: string;
  completionRate: number;
  disputeRate: number;
  cancellationRate: number;
  avgShippingTime: number;
  avgResponseTime: number;
  repeatCustomerRate: number;
  processingOrders: number;
  completedOrders: number;
  disputedOrders: number;
  cancelledOrders: number;
  topCategories: CategoryAnalytics[];
  monthlyTrends: MonthlyTrend[];
  timeRange: {
    start: Date;
    end: Date;
    period: 'week' | 'month' | 'year';
  };
}