/**
 * Performance Monitoring Service
 * Real-time performance metrics collection with Core Web Vitals and user experience monitoring
 */

interface CoreWebVitals {
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte
}

interface PerformanceMetrics {
  timestamp: number;
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number | null;
  firstInputDelay: number | null;
  cumulativeLayoutShift: number | null;
  timeToInteractive: number | null;
  totalBlockingTime: number | null;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  networkInfo: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  } | null;
  deviceInfo: {
    deviceMemory: number | null;
    hardwareConcurrency: number;
    userAgent: string;
    viewport: { width: number; height: number };
  };
  userInteractions: {
    clicks: number;
    scrolls: number;
    keystrokes: number;
    touches: number;
  };
  errors: Array<{
    message: string;
    source: string;
    line: number;
    column: number;
    timestamp: number;
  }>;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface ABTestConfig {
  testId: string;
  name: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    config: Record<string, any>;
  }>;
  metrics: string[];
  startDate: number;
  endDate: number;
  active: boolean;
}

interface ABTestResult {
  testId: string;
  variantId: string;
  userId: string;
  metrics: Record<string, number>;
  timestamp: number;
}

/**
 * Performance Monitoring Service with real-time metrics and alerting
 */
export class PerformanceMonitoringService {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private abTests: Map<string, ABTestConfig> = new Map();
  private abTestResults: ABTestResult[] = [];
  private userVariants: Map<string, Map<string, string>> = new Map();
  
  private performanceObserver: PerformanceObserver | null = null;
  private layoutShiftObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  
  private coreWebVitals: CoreWebVitals = {
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null
  };
  
  private userInteractions = {
    clicks: 0,
    scrolls: 0,
    keystrokes: 0,
    touches: 0
  };
  
  private errors: Array<{
    message: string;
    source: string;
    line: number;
    column: number;
    timestamp: number;
  }> = [];

  private thresholds = {
    LCP: 2500, // 2.5 seconds
    FID: 100,  // 100ms
    CLS: 0.1,  // 0.1
    FCP: 1800, // 1.8 seconds
    TTFB: 800, // 800ms
    memoryUsage: 50 * 1024 * 1024, // 50MB
    errorRate: 0.05 // 5%
  };

  constructor() {
    this.initializePerformanceObservers();
    this.initializeUserInteractionTracking();
    this.initializeErrorTracking();
    this.startPeriodicCollection();
  }

  /**
   * Initialize performance observers for Core Web Vitals
   */
  private initializePerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // Observe paint metrics (FCP, LCP)
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.coreWebVitals.FCP = entry.startTime;
              }
              break;
              
            case 'largest-contentful-paint':
              this.coreWebVitals.LCP = entry.startTime;
              break;
              
            case 'first-input':
              // Cast to PerformanceEventTiming to access processingStart
              const eventEntry = entry as any;
              this.coreWebVitals.FID = eventEntry.processingStart - eventEntry.startTime;
              break;

            case 'navigation':
              const navEntry = entry as PerformanceNavigationTiming;
              this.coreWebVitals.TTFB = navEntry.responseStart - navEntry.requestStart;
              break;
          }
        });
        
        this.checkThresholds();
      });

      // Observe different entry types
      const entryTypes = ['paint', 'largest-contentful-paint', 'first-input', 'navigation'];
      entryTypes.forEach(type => {
        try {
          this.performanceObserver!.observe({ entryTypes: [type] });
        } catch (error) {
          console.warn(`Failed to observe ${type}:`, error);
        }
      });

      // Observe layout shifts for CLS
      this.layoutShiftObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        
        list.getEntries().forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        
        this.coreWebVitals.CLS = (this.coreWebVitals.CLS || 0) + clsValue;
        this.checkThresholds();
      });

      try {
        this.layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Failed to observe layout-shift:', error);
      }

      // Observe long tasks for TTI calculation
      this.longTaskObserver = new PerformanceObserver((list) => {
        // Process long tasks for TTI calculation
        // This is a simplified implementation
      });

      try {
        this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Failed to observe longtask:', error);
      }

    } catch (error) {
      console.error('Failed to initialize performance observers:', error);
    }
  }

  /**
   * Initialize user interaction tracking
   */
  private initializeUserInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', () => {
      this.userInteractions.clicks++;
    }, { passive: true });

    // Track scrolls
    let scrollTimeout: NodeJS.Timeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.userInteractions.scrolls++;
      }, 100);
    }, { passive: true });

    // Track keystrokes
    document.addEventListener('keydown', () => {
      this.userInteractions.keystrokes++;
    }, { passive: true });

    // Track touches
    document.addEventListener('touchstart', () => {
      this.userInteractions.touches++;
    }, { passive: true });
  }

  /**
   * Initialize error tracking
   */
  private initializeErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.errors.push({
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now()
      });
      
      this.checkErrorRate();
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errors.push({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        source: 'Promise',
        line: 0,
        column: 0,
        timestamp: Date.now()
      });
      
      this.checkErrorRate();
    });
  }

  /**
   * Start periodic metrics collection
   */
  private startPeriodicCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Collect initial metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(() => this.collectMetrics(), 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.collectMetrics(), 1000);
      });
    }
  }

  /**
   * Collect comprehensive performance metrics
   */
  private collectMetrics(): void {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;

      // Calculate navigation start time
      const navigationStart = navigation ? navigation.startTime : 0;

      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        pageLoadTime: navigation ? navigation.loadEventEnd - navigationStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigationStart : 0,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.coreWebVitals.FCP || 0,
        largestContentfulPaint: this.coreWebVitals.LCP,
        firstInputDelay: this.coreWebVitals.FID,
        cumulativeLayoutShift: this.coreWebVitals.CLS,
        timeToInteractive: this.calculateTTI(),
        totalBlockingTime: this.calculateTBT(),
        memoryUsage: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        } : null,
        networkInfo: connection ? {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt
        } : null,
        deviceInfo: {
          deviceMemory: (navigator as any).deviceMemory || null,
          hardwareConcurrency: navigator.hardwareConcurrency,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        userInteractions: { ...this.userInteractions },
        errors: [...this.errors]
      };

      this.metrics.push(metrics);
      
      // Keep only last 1000 metrics
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Send metrics to analytics service
      this.sendMetricsToAnalytics(metrics);
      
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Get first paint timing
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  /**
   * Calculate Time to Interactive (simplified)
   */
  private calculateTTI(): number | null {
    // This is a simplified TTI calculation
    // In a real implementation, you'd use the official TTI polyfill
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navigation) return null;

    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.startTime;
    const longTasks = performance.getEntriesByType('longtask');
    
    // Simple heuristic: DOMContentLoaded + time for long tasks to settle
    const longTaskTime = longTasks.reduce((total, task) => total + task.duration, 0);
    
    return domContentLoaded + (longTaskTime * 0.1); // Simplified calculation
  }

  /**
   * Calculate Total Blocking Time
   */
  private calculateTBT(): number | null {
    const longTasks = performance.getEntriesByType('longtask');
    
    return longTasks.reduce((total, task) => {
      // Tasks longer than 50ms contribute to TBT
      const blockingTime = Math.max(0, task.duration - 50);
      return total + blockingTime;
    }, 0);
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkThresholds(): void {
    const alerts: PerformanceAlert[] = [];

    // Check LCP threshold
    if (this.coreWebVitals.LCP && this.coreWebVitals.LCP > this.thresholds.LCP) {
      alerts.push({
        id: `lcp-${Date.now()}`,
        type: this.coreWebVitals.LCP > this.thresholds.LCP * 1.5 ? 'critical' : 'warning',
        metric: 'LCP',
        value: this.coreWebVitals.LCP,
        threshold: this.thresholds.LCP,
        message: `Largest Contentful Paint is ${this.coreWebVitals.LCP.toFixed(0)}ms (threshold: ${this.thresholds.LCP}ms)`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Check FID threshold
    if (this.coreWebVitals.FID && this.coreWebVitals.FID > this.thresholds.FID) {
      alerts.push({
        id: `fid-${Date.now()}`,
        type: this.coreWebVitals.FID > this.thresholds.FID * 2 ? 'critical' : 'warning',
        metric: 'FID',
        value: this.coreWebVitals.FID,
        threshold: this.thresholds.FID,
        message: `First Input Delay is ${this.coreWebVitals.FID.toFixed(0)}ms (threshold: ${this.thresholds.FID}ms)`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Check CLS threshold
    if (this.coreWebVitals.CLS && this.coreWebVitals.CLS > this.thresholds.CLS) {
      alerts.push({
        id: `cls-${Date.now()}`,
        type: this.coreWebVitals.CLS > this.thresholds.CLS * 2 ? 'critical' : 'warning',
        metric: 'CLS',
        value: this.coreWebVitals.CLS,
        threshold: this.thresholds.CLS,
        message: `Cumulative Layout Shift is ${this.coreWebVitals.CLS.toFixed(3)} (threshold: ${this.thresholds.CLS})`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Add new alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.triggerAlert(alert);
    });

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Check error rate threshold
   */
  private checkErrorRate(): void {
    const recentErrors = this.errors.filter(error => 
      Date.now() - error.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );

    const errorRate = recentErrors.length / Math.max(1, this.userInteractions.clicks + this.userInteractions.touches);

    if (errorRate > this.thresholds.errorRate) {
      const alert: PerformanceAlert = {
        id: `error-rate-${Date.now()}`,
        type: errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'warning',
        metric: 'Error Rate',
        value: errorRate,
        threshold: this.thresholds.errorRate,
        message: `Error rate is ${(errorRate * 100).toFixed(1)}% (threshold: ${(this.thresholds.errorRate * 100).toFixed(1)}%)`,
        timestamp: Date.now(),
        resolved: false
      };

      this.alerts.push(alert);
      this.triggerAlert(alert);
    }
  }

  /**
   * Trigger alert notification
   */
  private triggerAlert(alert: PerformanceAlert): void {
    console.warn(`Performance Alert [${alert.type.toUpperCase()}]:`, alert.message);
    
    // In a real implementation, you might:
    // - Send to monitoring service
    // - Show user notification
    // - Log to analytics
    // - Send to Slack/email
    
    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('performance-alert', {
      detail: alert
    }));
  }

  /**
   * Send metrics to analytics service
   */
  private sendMetricsToAnalytics(metrics: PerformanceMetrics): void {
    // In a real implementation, send to your analytics service
    // For now, we'll just log key metrics
    console.log('Performance Metrics:', {
      LCP: this.coreWebVitals.LCP,
      FID: this.coreWebVitals.FID,
      CLS: this.coreWebVitals.CLS,
      FCP: this.coreWebVitals.FCP,
      memoryUsage: metrics.memoryUsage?.usedJSHeapSize,
      networkType: metrics.networkInfo?.effectiveType
    });
  }

  /**
   * A/B Testing Framework
   */
  
  /**
   * Create A/B test
   */
  createABTest(config: ABTestConfig): void {
    this.abTests.set(config.testId, config);
  }

  /**
   * Get user variant for A/B test
   */
  getUserVariant(testId: string, userId: string): string | null {
    const test = this.abTests.get(testId);
    if (!test || !test.active || Date.now() < test.startDate || Date.now() > test.endDate) {
      return null;
    }

    // Check if user already has a variant assigned
    if (!this.userVariants.has(userId)) {
      this.userVariants.set(userId, new Map());
    }

    const userTests = this.userVariants.get(userId)!;
    if (userTests.has(testId)) {
      return userTests.get(testId)!;
    }

    // Assign variant based on weights
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        userTests.set(testId, variant.id);
        return variant.id;
      }
    }

    // Fallback to first variant
    const firstVariant = test.variants[0];
    userTests.set(testId, firstVariant.id);
    return firstVariant.id;
  }

  /**
   * Record A/B test result
   */
  recordABTestResult(testId: string, variantId: string, userId: string, metrics: Record<string, number>): void {
    this.abTestResults.push({
      testId,
      variantId,
      userId,
      metrics,
      timestamp: Date.now()
    });

    // Keep only recent results (last 10000)
    if (this.abTestResults.length > 10000) {
      this.abTestResults = this.abTestResults.slice(-10000);
    }
  }

  /**
   * Get A/B test results
   */
  getABTestResults(testId: string): {
    variants: Array<{
      variantId: string;
      sampleSize: number;
      metrics: Record<string, { mean: number; stdDev: number }>;
    }>;
    significance: Record<string, number>;
  } {
    const testResults = this.abTestResults.filter(result => result.testId === testId);
    const variantGroups = new Map<string, ABTestResult[]>();

    // Group results by variant
    testResults.forEach(result => {
      if (!variantGroups.has(result.variantId)) {
        variantGroups.set(result.variantId, []);
      }
      variantGroups.get(result.variantId)!.push(result);
    });

    const variants = Array.from(variantGroups.entries()).map(([variantId, results]) => {
      const metrics: Record<string, { mean: number; stdDev: number }> = {};
      
      // Calculate metrics for this variant
      const metricNames = new Set<string>();
      results.forEach(result => {
        Object.keys(result.metrics).forEach(metric => metricNames.add(metric));
      });

      metricNames.forEach(metricName => {
        const values = results
          .map(result => result.metrics[metricName])
          .filter(value => value !== undefined);

        if (values.length > 0) {
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
          const stdDev = Math.sqrt(variance);

          metrics[metricName] = { mean, stdDev };
        }
      });

      return {
        variantId,
        sampleSize: results.length,
        metrics
      };
    });

    // Calculate statistical significance (simplified)
    const significance: Record<string, number> = {};
    // This would implement proper statistical tests (t-test, chi-square, etc.)
    // For now, we'll return placeholder values
    
    return { variants, significance };
  }

  /**
   * Public API methods
   */

  /**
   * Get current Core Web Vitals
   */
  getCoreWebVitals(): CoreWebVitals {
    return { ...this.coreWebVitals };
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
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
   * Get performance summary
   */
  getPerformanceSummary(): {
    coreWebVitals: CoreWebVitals;
    averageMetrics: {
      pageLoadTime: number;
      memoryUsage: number;
      errorRate: number;
    };
    alerts: {
      total: number;
      critical: number;
      warnings: number;
    };
    userInteractions: { clicks: number; scrolls: number; keystrokes: number; touches: number; };
  } {
    const recentMetrics = this.getRecentMetrics(50);
    
    const averageMetrics = {
      pageLoadTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.pageLoadTime, 0) / recentMetrics.length 
        : 0,
      memoryUsage: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + (m.memoryUsage?.usedJSHeapSize || 0), 0) / recentMetrics.length 
        : 0,
      errorRate: this.errors.length / Math.max(1, this.userInteractions.clicks + this.userInteractions.touches)
    };

    const activeAlerts = this.getActiveAlerts();
    const alerts = {
      total: activeAlerts.length,
      critical: activeAlerts.filter(a => a.type === 'critical').length,
      warnings: activeAlerts.filter(a => a.type === 'warning').length
    };

    return {
      coreWebVitals: this.getCoreWebVitals(),
      averageMetrics,
      alerts,
      userInteractions: { ...this.userInteractions }
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.metrics.length = 0;
    this.alerts.length = 0;
    this.errors.length = 0;
    this.userInteractions = { clicks: 0, scrolls: 0, keystrokes: 0, touches: 0 };
    this.coreWebVitals = { LCP: null, FID: null, CLS: null, FCP: null, TTFB: null };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.layoutShiftObserver) {
      this.layoutShiftObserver.disconnect();
    }
    
    if (this.longTaskObserver) {
      this.longTaskObserver.disconnect();
    }
    
    this.clearData();
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();
export default PerformanceMonitoringService;