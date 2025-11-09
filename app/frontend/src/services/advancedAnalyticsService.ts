import { 
  MarketplaceAnalytics, 
  AnalyticsTimeRange, 
  AnalyticsInsight, 
  TimeSeriesPoint 
} from '../types/analytics';

interface RealTimeMetrics {
  activeUsers: number;
  liveTransactions: number;
  gasPrice: number;
  networkLoad: number;
  pendingDisputes: number;
  escrowVolume: number;
}

interface UserBehaviorAnalytics {
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number; }>;
  userJourney: Array<{ step: string; dropoffRate: number; }>;
}

interface SellerPerformanceAnalytics {
  topSellers: Array<{
    id: string;
    name: string;
    revenue: number;
    orders: number;
    rating: number;
    growth: number;
  }>;
  averageMetrics: {
    orderValue: number;
    responseTime: number;
    fulfillmentTime: number;
    customerSatisfaction: number;
  };
}

class AdvancedAnalyticsService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  /**
   * Get comprehensive marketplace analytics
   */
  async getMarketplaceAnalytics(timeRange: AnalyticsTimeRange): Promise<MarketplaceAnalytics> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/analytics/marketplace?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}&period=${timeRange.period}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch marketplace analytics: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching marketplace analytics:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch marketplace analytics');
    }
  }

  /**
   * Get time series data for a specific metric
   */
  async getTimeSeriesData(
    metric: string, 
    timeRange: AnalyticsTimeRange,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesPoint[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/analytics/timeseries?metric=${metric}&start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}&granularity=${granularity}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch time series data: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching time series data:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch time series data');
    }
  }

  /**
   * Generate AI-powered insights
   */
  async generateInsights(timeRange: AnalyticsTimeRange): Promise<AnalyticsInsight[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/analytics/insights?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to generate insights: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating insights:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate insights');
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/analytics/realtime`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch real-time metrics: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch real-time metrics');
    }
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics(timeRange: AnalyticsTimeRange): Promise<UserBehaviorAnalytics> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/analytics/user-behavior?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch user behavior analytics: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user behavior analytics:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch user behavior analytics');
    }
  }

  /**
   * Get seller performance analytics
   */
  async getSellerPerformanceAnalytics(sellerId?: string): Promise<SellerPerformanceAnalytics> {
    try {
      const url = sellerId 
        ? `${this.apiBaseUrl}/api/analytics/seller-performance/${sellerId}`
        : `${this.apiBaseUrl}/api/analytics/seller-performance`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller performance analytics: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching seller performance analytics:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch seller performance analytics');
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(
    timeRange: AnalyticsTimeRange,
    format: 'csv' | 'json' | 'xlsx'
  ): Promise<{ downloadUrl: string; filename: string; }> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/analytics/export?start=${timeRange.start.toISOString()}&end=${timeRange.end.toISOString()}&format=${format}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to export analytics data: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to export analytics data');
    }
  }

  /**
   * Configure analytics alerts
   */
  async configureAlerts(config: {
    revenueDropThreshold: number;
    disputeRateThreshold: number;
    userGrowthThreshold: number;
    gasFeeSavingsGoal: number;
  }): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/analytics/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to configure alerts: ${response.status} ${response.statusText}`);
      }

      await response.json();
    } catch (error) {
      console.error('Error configuring alerts:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to configure alerts');
    }
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();