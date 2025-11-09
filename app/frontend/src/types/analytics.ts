export interface AnalyticsTimeRange {
  start: Date;
  end: Date;
  period: '24h' | '7d' | '30d' | '90d' | '1y';
}

export interface MetricData {
  id: string;
  name: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  metadata?: Record<string, any>;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsInsight {
  id: string;
  type: 'trend' | 'alert' | 'opportunity' | 'anomaly';
  title: string;
  description: string;
  severity: 'positive' | 'negative' | 'warning' | 'info';
  confidence: number; // 0-1
  actionable: boolean;
  recommendations?: string[];
  data?: any;
  createdAt: Date;
}

export interface MarketplaceAnalytics {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
    activeUsers: number;
    averageOrderValue: number;
    customerSatisfaction: number;
    disputeRate: number;
  };
  growth: {
    revenueGrowth: number;
    userGrowth: number;
    transactionGrowth: number;
  };
  geographic: Record<string, {
    revenue: number;
    users: number;
    transactions: number;
  }>;
  categories: Record<string, {
    revenue: number;
    transactions: number;
    growth: number;
  }>;
  timeRange: AnalyticsTimeRange;
}