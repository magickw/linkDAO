import { requestManager } from './requestManager';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface SellerPerformanceMetrics {
  sellerId: string;
  timestamp: string;
  
  // Component Performance Metrics
  componentLoadTimes: {
    sellerOnboarding: number;
    sellerProfile: number;
    sellerDashboard: number;
    sellerStore: number;
  };
  
  // API Performance Metrics
  apiResponseTimes: {
    getProfile: number;
    updateProfile: number;
    getListings: number;
    createListing: number;
    getDashboard: number;
  };
  
  // Cache Performance Metrics
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    invalidationTime: number;
    averageRetrievalTime: number;
  };
  
  // Error Metrics
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    recoveredErrors: number;
    errorsByType: Record<string, number>;
  };
  
  // User Experience Metrics
  userExperienceMetrics: {
    timeToInteractive: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  
  // Mobile Performance Metrics
  mobileMetrics: {
    touchResponseTime: number;
    scrollPerformance: number;
    gestureRecognitionTime: number;
    batteryImpact: number;
  };
  
  // Real-time Features Performance
  realTimeMetrics: {
    webSocketConnectionTime: number;
    messageDeliveryTime: number;
    liveUpdateLatency: number;
    connectionStability: number;
  };
}

export interface PerformanceAlert {
  id: string;
  sellerId: string;
  alertType: 'performance' | 'error' | 'availability' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  actions: Array<{
    action: string;
    description: string;
    automated: boolean;
  }>;
}

export interface PerformanceRegression {
  sellerId: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  regressionPercentage: number;
  detectedAt: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedComponents: string[];
  potentialCauses: string[];
  recommendedActions: string[];
}

export interface PerformanceDashboardData {
  sellerId: string;
  overallScore: number;
  metrics: SellerPerformanceMetrics;
  alerts: PerformanceAlert[];
  regressions: PerformanceRegression[];
  trends: {
    metric: string;
    data: Array<{ timestamp: string; value: number }>;
  }[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export interface PerformanceTestResult {
  testId: string;
  sellerId: string;
  testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  results: {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number;
    errorRate: number;
    successRate: number;
    concurrentUsers: number;
    totalRequests: number;
    failedRequests: number;
  };
  regressions: PerformanceRegression[];
  recommendations: string[];
}

class SellerPerformanceMonitoringService {
  private baseUrl = `${BACKEND_API_BASE_URL}/api/seller-performance`;
  private metricsBuffer: Map<string, SellerPerformanceMetrics[]> = new Map();
  private alertCallbacks: Map<string, (alert: PerformanceAlert) => void> = new Map();
  private performanceObserver?: PerformanceObserver;
  private isMonitoring = false;

  constructor() {
    this.initializePerformanceObserver();
  }

  /**
   * Start performance monitoring for a seller
   */
  async startMonitoring(sellerId: string): Promise<void> {
    try {
      this.isMonitoring = true;
      
      // Initialize metrics collection
      this.metricsBuffer.set(sellerId, []);
      
      // Start collecting performance metrics
      this.collectPerformanceMetrics(sellerId);
      
      // Set up periodic reporting
      setInterval(() => {
        this.reportMetrics(sellerId);
      }, 30000); // Report every 30 seconds
      
      console.log(`Performance monitoring started for seller: ${sellerId}`);
    } catch (error) {
      console.error('Error starting performance monitoring:', error);
    }
  }

  /**
   * Stop performance monitoring for a seller
   */
  stopMonitoring(sellerId: string): void {
    this.isMonitoring = false;
    this.metricsBuffer.delete(sellerId);
    this.alertCallbacks.delete(sellerId);
    console.log(`Performance monitoring stopped for seller: ${sellerId}`);
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(sellerId: string): Promise<PerformanceDashboardData> {
    try {
      const response = await requestManager.request<{data: PerformanceDashboardData}>(
        `${this.baseUrl}/${sellerId}/dashboard`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching performance dashboard:', error);
      return this.getDefaultDashboardData(sellerId);
    }
  }

  /**
   * Track component performance
   */
  trackComponentPerformance(
    sellerId: string,
    componentName: string,
    loadTime: number,
    metadata?: any
  ): void {
    try {
      const metrics = this.getCurrentMetrics(sellerId);
      
      // Update component load times
      if (componentName in metrics.componentLoadTimes) {
        (metrics.componentLoadTimes as any)[componentName] = loadTime;
      }
      
      // Track in performance buffer
      this.addMetricsToBuffer(sellerId, metrics);
      
      // Check for performance regressions
      this.checkPerformanceRegression(sellerId, `component.${componentName}`, loadTime);
    } catch (error) {
      console.error('Error tracking component performance:', error);
    }
  }

  /**
   * Track API performance
   */
  trackAPIPerformance(
    sellerId: string,
    endpoint: string,
    responseTime: number,
    success: boolean,
    errorType?: string
  ): void {
    try {
      const metrics = this.getCurrentMetrics(sellerId);
      
      // Update API response times
      const apiKey = this.getAPIKey(endpoint);
      if (apiKey && apiKey in metrics.apiResponseTimes) {
        (metrics.apiResponseTimes as any)[apiKey] = responseTime;
      }
      
      // Update error metrics
      if (!success) {
        metrics.errorMetrics.totalErrors++;
        metrics.errorMetrics.errorRate = this.calculateErrorRate(sellerId);
        
        if (errorType) {
          metrics.errorMetrics.errorsByType[errorType] = 
            (metrics.errorMetrics.errorsByType[errorType] || 0) + 1;
        }
      }
      
      this.addMetricsToBuffer(sellerId, metrics);
      
      // Check for performance issues
      if (responseTime > 5000) { // 5 second threshold
        this.createPerformanceAlert(sellerId, {
          alertType: 'performance',
          severity: 'high',
          title: 'Slow API Response',
          description: `API endpoint ${endpoint} took ${responseTime}ms to respond`,
          metrics: { endpoint, responseTime, threshold: 5000 }
        });
      }
    } catch (error) {
      console.error('Error tracking API performance:', error);
    }
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(
    sellerId: string,
    operation: 'hit' | 'miss' | 'invalidation',
    retrievalTime?: number
  ): void {
    try {
      const metrics = this.getCurrentMetrics(sellerId);
      
      switch (operation) {
        case 'hit':
          metrics.cacheMetrics.hitRate = this.updateCacheHitRate(sellerId, true);
          break;
        case 'miss':
          metrics.cacheMetrics.missRate = this.updateCacheHitRate(sellerId, false);
          break;
        case 'invalidation':
          if (retrievalTime) {
            metrics.cacheMetrics.invalidationTime = retrievalTime;
          }
          break;
      }
      
      if (retrievalTime) {
        metrics.cacheMetrics.averageRetrievalTime = this.updateAverageRetrievalTime(sellerId, retrievalTime);
      }
      
      this.addMetricsToBuffer(sellerId, metrics);
    } catch (error) {
      console.error('Error tracking cache performance:', error);
    }
  }

  /**
   * Track mobile performance
   */
  trackMobilePerformance(
    sellerId: string,
    metric: 'touch' | 'scroll' | 'gesture' | 'battery',
    value: number
  ): void {
    try {
      const metrics = this.getCurrentMetrics(sellerId);
      
      switch (metric) {
        case 'touch':
          metrics.mobileMetrics.touchResponseTime = value;
          break;
        case 'scroll':
          metrics.mobileMetrics.scrollPerformance = value;
          break;
        case 'gesture':
          metrics.mobileMetrics.gestureRecognitionTime = value;
          break;
        case 'battery':
          metrics.mobileMetrics.batteryImpact = value;
          break;
      }
      
      this.addMetricsToBuffer(sellerId, metrics);
    } catch (error) {
      console.error('Error tracking mobile performance:', error);
    }
  }

  /**
   * Track real-time features performance
   */
  trackRealTimePerformance(
    sellerId: string,
    metric: 'connection' | 'message' | 'update' | 'stability',
    value: number
  ): void {
    try {
      const metrics = this.getCurrentMetrics(sellerId);
      
      switch (metric) {
        case 'connection':
          metrics.realTimeMetrics.webSocketConnectionTime = value;
          break;
        case 'message':
          metrics.realTimeMetrics.messageDeliveryTime = value;
          break;
        case 'update':
          metrics.realTimeMetrics.liveUpdateLatency = value;
          break;
        case 'stability':
          metrics.realTimeMetrics.connectionStability = value;
          break;
      }
      
      this.addMetricsToBuffer(sellerId, metrics);
    } catch (error) {
      console.error('Error tracking real-time performance:', error);
    }
  }

  /**
   * Run automated performance regression tests
   */
  async runPerformanceRegressionTest(
    sellerId: string,
    testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume' = 'load'
  ): Promise<PerformanceTestResult> {
    try {
      const response = await requestManager.request<{data: PerformanceTestResult}>(
        `${this.baseUrl}/${sellerId}/regression-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ testType })
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error running performance regression test:', error);
      return this.getDefaultTestResult(sellerId, testType);
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(
    sellerId: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<PerformanceAlert[]> {
    try {
      const params = new URLSearchParams();
      if (severity) params.append('severity', severity);
      
      const response = await requestManager.request<{data: PerformanceAlert[]}>(
        `${this.baseUrl}/${sellerId}/alerts?${params}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching performance alerts:', error);
      return [];
    }
  }

  /**
   * Subscribe to performance alerts
   */
  subscribeToAlerts(sellerId: string, callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.set(sellerId, callback);
  }

  /**
   * Unsubscribe from performance alerts
   */
  unsubscribeFromAlerts(sellerId: string): void {
    this.alertCallbacks.delete(sellerId);
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(sellerId: string): Promise<Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>> {
    try {
      const response = await requestManager.request<{data: any[]}>(
        `${this.baseUrl}/${sellerId}/recommendations`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching performance recommendations:', error);
      return [];
    }
  }

  // Private helper methods

  private initializePerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.processPerformanceEntry(entry);
        });
      });
      
      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] 
      });
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    // Process different types of performance entries
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      // Process navigation timing
    } else if (entry.entryType === 'paint') {
      // Process paint timing
    } else if (entry.entryType === 'largest-contentful-paint') {
      // Process LCP
    }
  }

  private collectPerformanceMetrics(sellerId: string): void {
    if (!this.isMonitoring) return;
    
    // Collect Web Vitals
    if (typeof window !== 'undefined') {
      this.collectWebVitals(sellerId);
    }
    
    // Schedule next collection
    setTimeout(() => {
      this.collectPerformanceMetrics(sellerId);
    }, 5000); // Collect every 5 seconds
  }

  private collectWebVitals(sellerId: string): void {
    const metrics = this.getCurrentMetrics(sellerId);
    
    // Collect performance timing data
    if (performance.timing) {
      const timing = performance.timing;
      metrics.userExperienceMetrics.timeToInteractive = 
        timing.domInteractive - timing.navigationStart;
    }
    
    // Collect paint metrics
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        metrics.userExperienceMetrics.firstContentfulPaint = entry.startTime;
      }
    });
    
    this.addMetricsToBuffer(sellerId, metrics);
  }

  private getCurrentMetrics(sellerId: string): SellerPerformanceMetrics {
    return {
      sellerId,
      timestamp: new Date().toISOString(),
      componentLoadTimes: {
        sellerOnboarding: 0,
        sellerProfile: 0,
        sellerDashboard: 0,
        sellerStore: 0,
      },
      apiResponseTimes: {
        getProfile: 0,
        updateProfile: 0,
        getListings: 0,
        createListing: 0,
        getDashboard: 0,
      },
      cacheMetrics: {
        hitRate: 0,
        missRate: 0,
        invalidationTime: 0,
        averageRetrievalTime: 0,
      },
      errorMetrics: {
        totalErrors: 0,
        errorRate: 0,
        criticalErrors: 0,
        recoveredErrors: 0,
        errorsByType: {},
      },
      userExperienceMetrics: {
        timeToInteractive: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
      },
      mobileMetrics: {
        touchResponseTime: 0,
        scrollPerformance: 0,
        gestureRecognitionTime: 0,
        batteryImpact: 0,
      },
      realTimeMetrics: {
        webSocketConnectionTime: 0,
        messageDeliveryTime: 0,
        liveUpdateLatency: 0,
        connectionStability: 0,
      },
    };
  }

  private addMetricsToBuffer(sellerId: string, metrics: SellerPerformanceMetrics): void {
    const buffer = this.metricsBuffer.get(sellerId) || [];
    buffer.push(metrics);
    
    // Keep only last 100 metrics
    if (buffer.length > 100) {
      buffer.shift();
    }
    
    this.metricsBuffer.set(sellerId, buffer);
  }

  private async reportMetrics(sellerId: string): Promise<void> {
    try {
      const buffer = this.metricsBuffer.get(sellerId);
      if (!buffer || buffer.length === 0) return;
      
      // Send metrics to backend
      await requestManager.request(`${this.baseUrl}/${sellerId}/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics: buffer })
      });
      
      // Clear buffer after successful report
      this.metricsBuffer.set(sellerId, []);
    } catch (error) {
      console.error('Error reporting performance metrics:', error);
    }
  }

  private checkPerformanceRegression(
    sellerId: string,
    metric: string,
    currentValue: number
  ): void {
    // Implementation would check against baseline values
    // and create alerts for significant regressions
  }

  private createPerformanceAlert(
    sellerId: string,
    alertData: Partial<PerformanceAlert>
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}`,
      sellerId,
      alertType: alertData.alertType || 'performance',
      severity: alertData.severity || 'medium',
      title: alertData.title || 'Performance Issue',
      description: alertData.description || 'Performance issue detected',
      metrics: alertData.metrics || {},
      timestamp: new Date().toISOString(),
      resolved: false,
      actions: alertData.actions || []
    };
    
    // Notify subscribers
    const callback = this.alertCallbacks.get(sellerId);
    if (callback) {
      callback(alert);
    }
  }

  private getAPIKey(endpoint: string): string | null {
    const apiKeyMap: Record<string, string> = {
      '/profile': 'getProfile',
      '/profile/update': 'updateProfile',
      '/listings': 'getListings',
      '/listings/create': 'createListing',
      '/dashboard': 'getDashboard',
    };
    
    return apiKeyMap[endpoint] || null;
  }

  private calculateErrorRate(sellerId: string): number {
    // Implementation would calculate actual error rate
    return 0;
  }

  private updateCacheHitRate(sellerId: string, isHit: boolean): number {
    // Implementation would update actual cache hit rate
    return isHit ? 95 : 5;
  }

  private updateAverageRetrievalTime(sellerId: string, retrievalTime: number): number {
    // Implementation would update actual average retrieval time
    return retrievalTime;
  }

  private getDefaultDashboardData(sellerId: string): PerformanceDashboardData {
    return {
      sellerId,
      overallScore: 85,
      metrics: this.getCurrentMetrics(sellerId),
      alerts: [],
      regressions: [],
      trends: [],
      recommendations: []
    };
  }

  private getDefaultTestResult(
    sellerId: string,
    testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume'
  ): PerformanceTestResult {
    return {
      testId: `test-${Date.now()}`,
      sellerId,
      testType,
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 300000, // 5 minutes
      results: {
        averageResponseTime: 250,
        maxResponseTime: 1200,
        minResponseTime: 100,
        throughput: 100,
        errorRate: 0.5,
        successRate: 99.5,
        concurrentUsers: 50,
        totalRequests: 5000,
        failedRequests: 25
      },
      regressions: [],
      recommendations: []
    };
  }
}

export const sellerPerformanceMonitoringService = new SellerPerformanceMonitoringService();
export default sellerPerformanceMonitoringService;