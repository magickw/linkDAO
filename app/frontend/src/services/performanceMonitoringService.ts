/**
 * Advanced Performance Monitoring Service
 * Provides real-time performance monitoring with user experience metrics
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // Custom metrics
  documentLoadTime: number;
  searchResponseTime: number;
  translationLoadTime: number;
  cacheHitRate: number;
  offlineCapability: boolean;
  
  // User experience metrics
  userEngagement: number;
  bounceRate: number;
  sessionDuration: number;
  pageViews: number;
  
  // Network metrics
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  
  // Device metrics
  deviceMemory: number;
  hardwareConcurrency: number;
  
  // Timestamp
  timestamp: number;
}

export interface PerformanceBudget {
  lcp: number; // 2.5s
  fid: number; // 100ms
  cls: number; // 0.1
  fcp: number; // 1.8s
  ttfb: number; // 600ms
  documentLoadTime: number; // 3s
  searchResponseTime: number; // 500ms
  translationLoadTime: number; // 1s
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
}

export interface NetworkCondition {
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private performanceBudget: PerformanceBudget;
  private metricsListeners: ((metrics: PerformanceMetrics) => void)[] = [];
  private alertListeners: ((alert: PerformanceAlert) => void)[] = [];

  constructor() {
    this.performanceBudget = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 600,
      documentLoadTime: 3000,
      searchResponseTime: 500,
      translationLoadTime: 1000
    };
  }

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Set up performance observers
      this.setupPerformanceObservers();
      
      // Set up network monitoring
      this.setupNetworkMonitoring();
      
      // Set up user engagement tracking
      this.setupUserEngagementTracking();
      
      // Start collecting metrics
      this.startMetricsCollection();
      
      this.isMonitoring = true;
      console.log('Performance monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const networkInfo = this.getNetworkInformation();
    
    return {
      // Core Web Vitals (will be updated by observers)
      lcp: null,
      fid: null,
      cls: null,
      fcp: null,
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : null,
      
      // Custom metrics
      documentLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      searchResponseTime: this.getAverageSearchResponseTime(),
      translationLoadTime: this.getAverageTranslationLoadTime(),
      cacheHitRate: this.getCacheHitRate(),
      offlineCapability: this.checkOfflineCapability(),
      
      // User experience metrics
      userEngagement: this.getUserEngagementScore(),
      bounceRate: this.getBounceRate(),
      sessionDuration: this.getSessionDuration(),
      pageViews: this.getPageViews(),
      
      // Network metrics
      connectionType: networkInfo.type,
      effectiveType: networkInfo.effectiveType,
      downlink: networkInfo.downlink,
      rtt: networkInfo.rtt,
      
      // Device metrics
      deviceMemory: this.getDeviceMemory(),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      
      timestamp: Date.now()
    };
  }

  /**
   * Get Core Web Vitals metrics
   */
  getCoreWebVitals(): {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    fcp: number | null;
    ttfb: number | null;
  } {
    const metrics = this.getCurrentMetrics();
    return {
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
      fcp: metrics.fcp,
      ttfb: metrics.ttfb
    };
  }

  /**
   * Get network condition
   */
  getNetworkCondition(): NetworkCondition {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) {
      return {
        type: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
        saveData: false
      };
    }
    
    return {
      type: connection.type || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };
  }

  /**
   * Check if performance budget is exceeded
   */
  checkPerformanceBudget(metrics: PerformanceMetrics): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    
    Object.entries(this.performanceBudget).forEach(([key, threshold]) => {
      const value = metrics[key as keyof PerformanceMetrics] as number;
      
      if (value !== null && value > threshold) {
        const alert: PerformanceAlert = {
          id: `${key}-${Date.now()}`,
          type: value > threshold * 1.5 ? 'critical' : 'warning',
          metric: key as keyof PerformanceMetrics,
          value,
          threshold,
          message: `${key} exceeded budget: ${value}ms > ${threshold}ms`,
          timestamp: Date.now(),
          resolved: false
        };
        
        alerts.push(alert);
        this.alerts.push(alert);
        
        // Notify listeners
        this.alertListeners.forEach(listener => {
          try {
            listener(alert);
          } catch (error) {
            console.error('Error in alert listener:', error);
          }
        });
      }
    });
    
    return alerts;
  }

  /**
   * Get adaptive loading strategy based on network conditions
   */
  getAdaptiveLoadingStrategy(): {
    imageQuality: 'low' | 'medium' | 'high';
    prefetchEnabled: boolean;
    lazyLoadingThreshold: number;
    cacheStrategy: 'aggressive' | 'normal' | 'minimal';
  } {
    const networkCondition = this.getNetworkCondition();
    const deviceMemory = this.getDeviceMemory();
    
    // Slow connection or low memory device
    if (networkCondition.effectiveType === 'slow-2g' || 
        networkCondition.effectiveType === '2g' || 
        deviceMemory < 2) {
      return {
        imageQuality: 'low',
        prefetchEnabled: false,
        lazyLoadingThreshold: 100,
        cacheStrategy: 'minimal'
      };
    }
    
    // Medium connection
    if (networkCondition.effectiveType === '3g' || deviceMemory < 4) {
      return {
        imageQuality: 'medium',
        prefetchEnabled: true,
        lazyLoadingThreshold: 200,
        cacheStrategy: 'normal'
      };
    }
    
    // Fast connection
    return {
      imageQuality: 'high',
      prefetchEnabled: true,
      lazyLoadingThreshold: 500,
      cacheStrategy: 'aggressive'
    };
  }

  /**
   * Get intelligent preloading recommendations
   */
  getPreloadingRecommendations(): {
    documents: string[];
    translations: string[];
    images: string[];
    priority: 'high' | 'medium' | 'low';
  } {
    const userBehavior = this.analyzeUserBehavior();
    const networkCondition = this.getNetworkCondition();
    
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    if (networkCondition.effectiveType === '4g' || networkCondition.type === 'wifi') {
      priority = 'high';
    } else if (networkCondition.effectiveType === 'slow-2g' || networkCondition.effectiveType === '2g') {
      priority = 'low';
    }
    
    return {
      documents: userBehavior.likelyNextDocuments,
      translations: userBehavior.preferredLanguages,
      images: userBehavior.likelyImages,
      priority
    };
  }

  /**
   * Add metrics listener
   */
  addMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    this.metricsListeners.push(listener);
  }

  /**
   * Remove metrics listener
   */
  removeMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    const index = this.metricsListeners.indexOf(listener);
    if (index > -1) {
      this.metricsListeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: PerformanceAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(hours: number = 24): PerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageLCP: number;
    averageFID: number;
    averageCLS: number;
    score: number;
  } {
    const recentMetrics = this.getPerformanceHistory(1);
    if (recentMetrics.length === 0) {
      return { averageLCP: 0, averageFID: 0, averageCLS: 0, score: 0 };
    }

    const avgLCP = recentMetrics.reduce((sum, m) => sum + (m.lcp || 0), 0) / recentMetrics.length;
    const avgFID = recentMetrics.reduce((sum, m) => sum + (m.fid || 0), 0) / recentMetrics.length;
    const avgCLS = recentMetrics.reduce((sum, m) => sum + (m.cls || 0), 0) / recentMetrics.length;

    // Calculate performance score (0-100)
    const lcpScore = avgLCP <= 2500 ? 100 : avgLCP <= 4000 ? 50 : 0;
    const fidScore = avgFID <= 100 ? 100 : avgFID <= 300 ? 50 : 0;
    const clsScore = avgCLS <= 0.1 ? 100 : avgCLS <= 0.25 ? 50 : 0;
    const score = (lcpScore + fidScore + clsScore) / 3;

    return {
      averageLCP: avgLCP,
      averageFID: avgFID,
      averageCLS: avgCLS,
      score
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Set up performance observers
   */
  private setupPerformanceObservers(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.updateMetric('lcp', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (error) {
        console.warn('LCP observer not supported:', error);
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.updateMetric('fid', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (error) {
        console.warn('FID observer not supported:', error);
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.updateMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.warn('CLS observer not supported:', error);
      }

      // First Contentful Paint
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.updateMetric('fcp', entry.startTime);
            }
          });
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);
      } catch (error) {
        console.warn('FCP observer not supported:', error);
      }
    }
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => {
        console.log('Network condition changed:', this.getNetworkCondition());
        this.collectMetrics();
      });
    }
  }

  /**
   * Set up user engagement tracking
   */
  private setupUserEngagementTracking(): void {
    let startTime = Date.now();
    let pageViews = 0;
    let interactions = 0;
    
    // Track page views
    const trackPageView = () => {
      pageViews++;
      localStorage.setItem('support-docs-page-views', pageViews.toString());
    };
    
    // Track interactions
    const trackInteraction = () => {
      interactions++;
    };
    
    // Set up event listeners
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - startTime;
      localStorage.setItem('support-docs-session-duration', sessionDuration.toString());
    });
    
    document.addEventListener('click', trackInteraction);
    document.addEventListener('keydown', trackInteraction);
    document.addEventListener('scroll', trackInteraction);
    
    // Track page view on load
    trackPageView();
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);
    
    // Initial collection
    setTimeout(() => {
      this.collectMetrics();
    }, 1000);
  }

  /**
   * Collect and store metrics
   */
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Check performance budget
    this.checkPerformanceBudget(metrics);
    
    // Notify listeners
    this.metricsListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }

  /**
   * Update specific metric
   */
  private updateMetric(key: keyof PerformanceMetrics, value: number): void {
    if (this.metrics.length > 0) {
      const lastMetric = this.metrics[this.metrics.length - 1];
      (lastMetric as any)[key] = value;
    }
  }

  /**
   * Helper methods for metrics calculation
   */
  private getNetworkInformation(): any {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0
    };
  }

  private getDeviceMemory(): number {
    return (navigator as any).deviceMemory || 4; // Default to 4GB
  }

  private getAverageSearchResponseTime(): number {
    const searchTimes = JSON.parse(localStorage.getItem('search-response-times') || '[]');
    return searchTimes.length > 0 ? searchTimes.reduce((a: number, b: number) => a + b, 0) / searchTimes.length : 0;
  }

  private getAverageTranslationLoadTime(): number {
    const translationTimes = JSON.parse(localStorage.getItem('translation-load-times') || '[]');
    return translationTimes.length > 0 ? translationTimes.reduce((a: number, b: number) => a + b, 0) / translationTimes.length : 0;
  }

  private getCacheHitRate(): number {
    const hits = parseInt(localStorage.getItem('cache-hits') || '0');
    const misses = parseInt(localStorage.getItem('cache-misses') || '0');
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private checkOfflineCapability(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  private getUserEngagementScore(): number {
    const interactions = parseInt(localStorage.getItem('user-interactions') || '0');
    const sessionDuration = parseInt(localStorage.getItem('support-docs-session-duration') || '0');
    const pageViews = parseInt(localStorage.getItem('support-docs-page-views') || '0');
    
    // Simple engagement score calculation
    return Math.min(100, (interactions * 2) + (sessionDuration / 1000) + (pageViews * 5));
  }

  private getBounceRate(): number {
    const sessions = parseInt(localStorage.getItem('total-sessions') || '1');
    const bounces = parseInt(localStorage.getItem('bounce-sessions') || '0');
    return (bounces / sessions) * 100;
  }

  private getSessionDuration(): number {
    return parseInt(localStorage.getItem('support-docs-session-duration') || '0');
  }

  private getPageViews(): number {
    return parseInt(localStorage.getItem('support-docs-page-views') || '0');
  }

  private analyzeUserBehavior(): {
    likelyNextDocuments: string[];
    preferredLanguages: string[];
    likelyImages: string[];
  } {
    // This would typically analyze user behavior patterns
    // For now, return some defaults based on common patterns
    return {
      likelyNextDocuments: [
        '/docs/support/beginners-guide.md',
        '/docs/support/troubleshooting-guide.md'
      ],
      preferredLanguages: ['en', 'es'],
      likelyImages: []
    };
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();