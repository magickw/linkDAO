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
  private baseUrl: string;
  private geoCache: {
    data: {
      ipAddress?: string;
      country?: string;
      city?: string;
      timezone?: string;
      latitude?: number;
      longitude?: number;
    } | null;
    timestamp: number;
  } | null = null;
  private readonly GEO_CACHE_TTL = 3600000; // 1 hour in milliseconds
  private geoRequestInProgress: Promise<any> | null = null;
  private lastGeoRequestTime = 0;
  private readonly MIN_GEO_REQUEST_INTERVAL = 60000; // 1 minute minimum between requests
  private geoRequestFailureCount = 0;
  private readonly MAX_GEO_FAILURES = 3; // Stop trying after 3 failures

  constructor() {
    // Use port 10000 based on the start-services.sh script
    this.baseUrl = `${BACKEND_API_BASE_URL}/api/analytics`;

    // Try to restore cached geolocation from sessionStorage (only in browser)
    if (typeof window !== 'undefined') {
      this.restoreGeoCache();
    }
  }

  /**
   * Get overview metrics including GMV, user acquisition, and transaction success rates
   */
  async getOverviewMetrics(startDate?: Date, endDate?: Date): Promise<AnalyticsMetrics> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());

      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: AnalyticsMetrics}>(`${this.baseUrl}/overview?${params}`, {
        headers
      });
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

      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: UserBehaviorData}>(`${this.baseUrl}/user-behavior?${params}`, {
        headers
      });
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

      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: SalesAnalytics}>(`${this.baseUrl}/sales?${params}`, {
        headers
      });
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

      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: SellerAnalytics}>(`${this.baseUrl}/seller/${sellerId}?${params}`, {
        headers
      });
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
    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: MarketTrends}>(`${this.baseUrl}/market-trends`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching market trends:', error);
      return {
        trending: [],
        seasonal: [],
        priceAnalysis: [],
        demandForecast: []
      };
    }
  }

  /**
   * Get anomaly detection alerts
   */
  async getAnomalies(): Promise<AnomalyAlert[]> {
    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: AnomalyAlert[]}>(`${this.baseUrl}/anomalies`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching anomaly alerts:', error);
      return [];
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeStats(): Promise<RealTimeStats> {
    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: RealTimeStats}>(`${this.baseUrl}/dashboard`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
      const fallbackTimestamp = new Date().toISOString();
      return {
        activeUsers: 0,
        currentTransactions: 0,
        systemLoad: 0,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
        lastUpdated: fallbackTimestamp
      };
    }
  }

  /**
   * Get platform health metrics
   */
  async getPlatformHealth(): Promise<any> {
    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: any}>(`${this.baseUrl}/health`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching platform health:', error);
      return {
        status: 'unavailable',
        message: 'Platform health metrics are currently unavailable.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Track user events for analytics with enhanced geolocation
   * Now non-blocking with cached geolocation data
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
      // Don't track events during server-side rendering
      if (typeof window === 'undefined') {
        return;
      }
      
      // Get user and session info from context/storage
      const userId = this.getCurrentUserId();
      const sessionId = this.getSessionId();

      // Use cached geolocation data if available, or fetch in background
      // Don't block event tracking on geolocation requests
      let geoData = this.geoCache?.data || {};

      // If cache is stale, trigger a background fetch but don't wait for it
      if (!this.geoCache || Date.now() - this.geoCache.timestamp >= this.GEO_CACHE_TTL) {
        // Fire and forget - update cache in background
        this.getAccurateGeolocation().catch(() => {
          // Silently fail - we already have fallback data
        });
      }

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
            pageUrl: typeof window !== 'undefined' ? window.location.href : 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
            deviceType: this.getDeviceType(),
            browser: this.getBrowserName(),
            ...geoData,
            ...metadata
          }
        })
      });
    } catch (error) {
      // Silently fail for tracking events to avoid disrupting user experience
      console.debug('Failed to track user event:', eventType);
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
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await requestManager.request(`${this.baseUrl}/track/transaction`, {
        method: 'POST',
        headers,
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
    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<{data: any}>(`${this.baseUrl}/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reportType,
          parameters
        })
      });
      return response.data;
    } catch (error) {
      console.error('Error generating analytics report:', error);
      return {
        status: 'unavailable',
        message: 'Unable to generate report at this time.',
        reportType,
        parameters
      };
    }
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

    try {
      // Get auth token
      const token = this.getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await requestManager.request<any>(`${this.baseUrl}/export?${params}`, {
        headers
      });
      return response;
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      return {
        status: 'unavailable',
        message: 'Analytics export is currently unavailable.',
        format,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };
    }
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string {
    // Check if we're in a browser environment before accessing localStorage
    if (typeof window === 'undefined' || !window.localStorage) {
      return '';
    }
    
    // Get from localStorage using the same pattern as other services
    try {
      return localStorage.getItem('token') || 
             localStorage.getItem('authToken') || 
             localStorage.getItem('auth_token') || 
             localStorage.getItem('linkdao_access_token') || '';
    } catch (error) {
      console.debug('Failed to get auth token from localStorage:', error);
      return '';
    }
  }

  // Utility methods for tracking
  private getCurrentUserId(): string {
    // Check if we're in a browser environment before accessing localStorage
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'anonymous';
    }
    
    // Get from auth context or localStorage
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || 'anonymous';
    } catch (error) {
      console.debug('Failed to get user from localStorage:', error);
      return 'anonymous';
    }
  }

  private getSessionId(): string {
    // Check if we're in a browser environment before accessing sessionStorage
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Get or create session ID
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private getDeviceType(): string {
    // Check if we're in a browser environment before accessing navigator
    if (typeof window === 'undefined' || !window.navigator) {
      return 'unknown';
    }
    
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
    // Check if we're in a browser environment before accessing navigator
    if (typeof window === 'undefined' || !window.navigator) {
      return 'unknown';
    }
    
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Get accurate geolocation data using multiple methods
   * Now with caching and rate limiting
   */
  private async getAccurateGeolocation(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }> {
    // Check if we've exceeded max failures - if so, return cached data or empty
    if (this.geoRequestFailureCount >= this.MAX_GEO_FAILURES) {
      console.warn('Geolocation requests disabled due to repeated failures');
      return this.geoCache?.data || { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    // Return cached data if still valid
    if (this.geoCache && Date.now() - this.geoCache.timestamp < this.GEO_CACHE_TTL) {
      return this.geoCache.data || {};
    }

    // Check if we're rate-limiting requests
    const timeSinceLastRequest = Date.now() - this.lastGeoRequestTime;
    if (timeSinceLastRequest < this.MIN_GEO_REQUEST_INTERVAL) {
      console.debug('Geolocation request throttled, using cached data');
      return this.geoCache?.data || { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }

    // If a request is already in progress, wait for it
    if (this.geoRequestInProgress) {
      try {
        return await this.geoRequestInProgress;
      } catch (error) {
        return this.geoCache?.data || {};
      }
    }

    // Create new request with proper error handling
    this.geoRequestInProgress = this.fetchGeolocationData();
    this.lastGeoRequestTime = Date.now();

    try {
      const geoData = await this.geoRequestInProgress;

      // Cache successful result
      this.geoCache = {
        data: geoData,
        timestamp: Date.now()
      };

      // Store in sessionStorage for persistence
      this.saveGeoCache();

      // Reset failure count on success
      this.geoRequestFailureCount = 0;

      return geoData;
    } catch (error) {
      console.warn('Failed to get accurate geolocation:', error);
      this.geoRequestFailureCount++;

      // Return cached data or fallback
      return this.geoCache?.data || { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    } finally {
      this.geoRequestInProgress = null;
    }
  }

  /**
   * Fetch geolocation data from external services
   */
  private async fetchGeolocationData(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }> {
    try {
      const geoData = await this.getClientIPAndLocation();
      return geoData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get client IP and location using multiple geolocation services
   * Now with better error handling and timeouts
   */
  private async getClientIPAndLocation(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }> {
    const geoServices = [
      { name: 'IP-API', fn: () => this.getLocationFromIPAPI() },
      { name: 'IPify', fn: () => this.getLocationFromIPify() },
      { name: 'Cloudflare', fn: () => this.getLocationFromCloudflare() }
    ];

    for (const service of geoServices) {
      try {
        // Add a timeout to each service request
        const result = await Promise.race([
          service.fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 5000)
          )
        ]);

        if (result.ipAddress) {
          console.debug(`Geolocation data obtained from ${service.name}`);
          return result;
        }
      } catch (error: any) {
        // Don't log 503 errors as errors - these are expected when rate limited
        if (error.message?.includes('503')) {
          console.debug(`${service.name} rate limited, trying next service`);
        } else {
          console.debug(`${service.name} failed, trying next:`, error.message);
        }
        continue;
      }
    }

    // Fallback: try to get timezone at least
    console.debug('All geolocation services failed, using timezone fallback');
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Restore geolocation cache from sessionStorage
   */
  private restoreGeoCache(): void {
    // Check if we're in a browser environment before accessing sessionStorage
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    
    try {
      const cached = sessionStorage.getItem('geoCache');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only restore if cache is still valid
        if (Date.now() - parsed.timestamp < this.GEO_CACHE_TTL) {
          this.geoCache = parsed;
        }
      }
    } catch (error) {
      console.debug('Failed to restore geo cache:', error);
    }
  }

  /**
   * Save geolocation cache to sessionStorage
   */
  private saveGeoCache(): void {
    // Check if we're in a browser environment before accessing sessionStorage
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }
    
    try {
      if (this.geoCache) {
        sessionStorage.setItem('geoCache', JSON.stringify(this.geoCache));
      }
    } catch (error) {
      console.debug('Failed to save geo cache:', error);
    }
  }

  /**
   * Get location from IP-API service
   */
  private async getLocationFromIPAPI(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }> {
    try {
      const response = await fetch('https://ip-api.com/json/', {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`IP-API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        return {
          ipAddress: data.query,
          country: data.country,
          city: data.city,
          timezone: data.timezone,
          latitude: data.lat,
          longitude: data.lon
        };
      }

      throw new Error('IP-API request failed');
    } catch (error: any) {
      // Re-throw with status for better error handling upstream
      if (error.name === 'AbortError') {
        throw new Error('IP-API request timeout');
      }
      throw error;
    }
  }

  /**
   * Get location from IPify service
   */
  private async getLocationFromIPify(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
  }> {
    try {
      // First get IP with timeout
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(5000)
      });

      if (!ipResponse.ok) {
        throw new Error(`IPify request failed with status ${ipResponse.status}`);
      }

      const ipData = await ipResponse.json();

      if (!ipData.ip) {
        throw new Error('Failed to get IP from Ipify');
      }

      // Then get location (requires API key for detailed info)
      const apiKey = process.env.NEXT_PUBLIC_IPINFO_API_KEY;
      if (apiKey) {
        const locationResponse = await fetch(`https://ipinfo.io/${ipData.ip}?token=${apiKey}`, {
          signal: AbortSignal.timeout(5000)
        });

        if (!locationResponse.ok) {
          throw new Error(`IPinfo request failed with status ${locationResponse.status}`);
        }

        const locationData = await locationResponse.json();

        const [lat, lon] = (locationData.loc || '').split(',');

        return {
          ipAddress: ipData.ip,
          country: locationData.country,
          city: locationData.city,
          timezone: locationData.timezone,
          latitude: lat ? parseFloat(lat) : undefined,
          longitude: lon ? parseFloat(lon) : undefined
        };
      }

      return { ipAddress: ipData.ip };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('IPify request timeout');
      }
      throw error;
    }
  }

  /**
   * Get location from Cloudflare (if available)
   */
  private async getLocationFromCloudflare(): Promise<{
    ipAddress?: string;
    country?: string;
    city?: string;
  }> {
    try {
      // Cloudflare provides geolocation headers when behind their service
      // This would need to be implemented on the server side
      const response = await fetch('/api/client-info', {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Cloudflare client-info failed with status ${response.status}`);
      }

      const data = await response.json();

      return {
        ipAddress: data.ip,
        country: data.country,
        city: data.city
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Cloudflare request timeout');
      }
      throw error;
    }
  }

  // Auto-tracking methods
  /**
   * Automatically track page views
   */
  trackPageView(pageName?: string): void {
    // Don't track events during server-side rendering
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      this.trackUserEvent('page_view', {
        page: pageName || (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
        title: typeof document !== 'undefined' ? document.title : 'unknown',
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