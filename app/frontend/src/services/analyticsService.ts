import { requestManager } from './requestManager';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface AnalyticsMetrics {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  gmv: number;
  userAcquisitionRate: number;
  transactionSuccessRate: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface UserBehaviorData {
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number; conversionRate: number }>;
  userJourney: Array<{ step: string; users: number; dropoffRate: number }>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  geographicDistribution: Array<{ country: string; users: number; revenue: number }>;
}

export interface SalesAnalytics {
  dailySales: Array<{ date: string; sales: number; orders: number; gmv: number }>;
  topProducts: Array<{ productId: string; title: string; sales: number; revenue: number; units: number }>;
  topCategories: Array<{ category: string; sales: number; revenue: number; growth: number }>;
  revenueByPaymentMethod: Array<{ method: string; revenue: number; percentage: number }>;
  customerSegments: Array<{ segment: string; revenue: number; count: number; ltv: number }>;
}

export interface SellerAnalytics {
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
  topProducts: Array<{ productId: string; title: string; sales: number }>;
  customerInsights: {
    demographics: any;
    preferences: any;
    behavior: any;
  };
}

export interface MarketTrends {
  trending: Array<{ category: string; growth: number; volume: number }>;
  seasonal: Array<{ period: string; categories: string[]; multiplier: number }>;
  priceAnalysis: Array<{ category: string; avgPrice: number; priceChange: number }>;
  demandForecast: Array<{ category: string; predictedDemand: number; confidence: number }>;
}

export interface AnomalyAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntity: string;
  detectionTime: Date;
  confidence: number;
  suggestedActions: string[];
}

export interface RealTimeStats {
  activeUsers: number;
  currentTransactions: number;
  systemLoad: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastUpdated: string;
}

class AnalyticsService {
  private baseUrl = `${BACKEND_API_BASE_URL}/api/analytics`;

  /**
   * Get overview metrics including GMV, user acquisition, and transaction success rates
   */
  async getOverviewMetrics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: AnalyticsMetrics}>(`${this.baseUrl}/overview?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching overview metrics:', error);
      // Return default metrics when backend is unavailable
      return {
        totalUsers: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        gmv: 0,
        userAcquisitionRate: 0,
        transactionSuccessRate: 0,
        activeUsers: { daily: 0, weekly: 0, monthly: 0 }
      };
    }
  }

  /**
   * Get user behavior analytics including page views, session data, and user journey
   */
  async getUserBehaviorAnalytics(startDate?: Date, endDate?: Date): Promise<UserBehaviorData> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: UserBehaviorData}>(`${this.baseUrl}/user-behavior?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user behavior analytics:', error);
      // Return default user behavior data when backend is unavailable
      return {
        pageViews: 0,
        sessionDuration: 0,
        bounceRate: 0,
        topPages: [],
        userJourney: [],
        deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
        geographicDistribution: []
      };
    }
  }

  /**
   * Get sales analytics including daily sales, top products, and revenue breakdown
   */
  async getSalesAnalytics(startDate?: Date, endDate?: Date): Promise<SalesAnalytics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: SalesAnalytics}>(`${this.baseUrl}/sales?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sales analytics:', error);
      // Return default sales analytics when backend is unavailable
      return {
        dailySales: [],
        topProducts: [],
        topCategories: [],
        revenueByPaymentMethod: [],
        customerSegments: []
      };
    }
  }

  /**
   * Get seller-specific analytics including performance metrics and customer insights
   */
  async getSellerAnalytics(
    sellerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SellerAnalytics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      const response = await requestManager.request<{data: SellerAnalytics}>(`${this.baseUrl}/seller/${sellerId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching seller analytics:', error);
      // Return default seller analytics when backend is unavailable
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
        topProducts: [],
        customerInsights: {
          demographics: {},
          preferences: {},
          behavior: {}
        }
      };
    }
  }

  /**
   * Get market trends and seasonal patterns
   */
  async getMarketTrends(): Promise<MarketTrends> {
    const response = await requestManager.request<{data: MarketTrends}>(`${this.baseUrl}/market-trends`);
    return response.data;
  }

  /**
   * Get anomaly detection alerts
   */
  async getAnomalies(): Promise<AnomalyAlert[]> {
    const response = await requestManager.request<{data: AnomalyAlert[]}>(`${this.baseUrl}/anomalies`);
    return response.data;
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    const response = await requestManager.request<{data: RealTimeStats}>(`${this.baseUrl}/dashboard`);
    return response.data;
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealth(): Promise<any> {
    const response = await requestManager.request<{data: any}>(`${this.baseUrl}/health`);
    return response.data;
  }

  /**
   * Track user events for analytics
   */
  async trackUserEvent(
    eventType: string,
    eventData: any,
    metadata?: {
      pageUrl?: string;
      userAgent?: string;
      ipAddress?: string;
      country?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      referrer?: string;
    }
  ): Promise<void> {
    try {
      // Get user and session info from context/storage
      const userId = this.getCurrentUserId();
      const sessionId = this.getSessionId();

      await requestManager.request(`${this.baseUrl}/track/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId,
          eventType,
          eventData,
          metadata: {
            pageUrl: window.location.href,
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            deviceType: this.getDeviceType(),
            browser: this.getBrowserName(),
            ...metadata
          }
        })
      });
    } catch (error) {
      // Silently fail for tracking events to avoid disrupting user experience
      console.warn('Failed to track user event:', eventType, error);
    }
  }

  /**
   * Track transaction events for analytics
   */
  async trackTransaction(transactionData: {
    transactionId: string;
    orderId: string;
    type: string;
    amount: number;
    currency: string;
    feeAmount?: number;
    gasUsed?: number;
    gasPrice?: number;
    blockNumber?: number;
    transactionHash?: string;
    status: string;
    processingTime?: number;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await requestManager.request(`${this.baseUrl}/track/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData)
      });
    } catch (error) {
      // Silently fail for tracking events to avoid disrupting user experience
      console.warn('Failed to track transaction:', transactionData.transactionId, error);
    }
  }

  /**
   * Generate custom analytics reports
   */
  async generateReport(reportType: string, parameters: any = {}): Promise<any> {
    const response = await requestManager.request<{data: any}>(`${this.baseUrl}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportType,
        parameters
      })
    });
    return response.data;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    startDate?: Date,
    endDate?: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    params.append('format', format);

    const response = await requestManager.request<any>(`${this.baseUrl}/export?${params}`);
    return response;
  }

  // Utility methods for tracking
  private getCurrentUserId(): string {
    // Get from auth context or localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || 'anonymous';
  }

  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowserName(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  // Auto-tracking methods
  /**
   * Automatically track page views
   */
  trackPageView(pageName?: string): void {
    try {
      this.trackUserEvent('page_view', {
        page: pageName || window.location.pathname,
        title: document.title,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  }

  /**
   * Track user interactions
   */
  trackInteraction(element: string, action: string, data?: any): void {
    this.trackUserEvent('user_interaction', {
      element,
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track search queries
   */
  trackSearch(query: string, filters?: any, resultsCount?: number): void {
    this.trackUserEvent('search', {
      query,
      filters,
      resultsCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track product views
   */
  trackProductView(productId: string, productData?: any): void {
    this.trackUserEvent('product_view', {
      productId,
      productData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track cart actions
   */
  trackCartAction(action: 'add' | 'remove' | 'update', productId: string, quantity?: number): void {
    this.trackUserEvent('cart_action', {
      action,
      productId,
      quantity,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track checkout steps
   */
  trackCheckoutStep(step: string, data?: any): void {
    this.trackUserEvent('checkout_step', {
      step,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track purchase completion
   */
  trackPurchase(orderId: string, orderData: any): void {
    this.trackUserEvent('purchase', {
      orderId,
      orderData,
      timestamp: new Date().toISOString()
    });
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;