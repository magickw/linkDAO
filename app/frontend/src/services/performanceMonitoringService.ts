/**
 * Performance Monitoring Service
 * Collects and analyzes performance metrics for continuous improvement
 */

interface PerformanceEntry {
  id: string;
  type: 'navigation' | 'resource' | 'api' | 'user-interaction';
  name: string;
  startTime: number;
  duration: number;
  size?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface PerformanceReport {
  timestamp: string;
  pageLoad: {
    domContentLoaded: number;
    loadComplete: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  apiPerformance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
    slowestEndpoints: Array<{ endpoint: string; averageTime: number }>;
  };
  resourcePerformance: {
    totalResources: number;
    totalSize: number;
    cacheHitRate: number;
    compressionRatio: number;
  };
  userExperience: {
    interactionLatency: number;
    renderingPerformance: number;
    memoryUsage: number;
  };
  recommendations: string[];
}

interface PerformanceThresholds {
  apiResponseTime: number;
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

class PerformanceMonitoringService {
  private entries: PerformanceEntry[] = [];
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  
  private thresholds: PerformanceThresholds = {
    apiResponseTime: 2000, // 2 seconds
    pageLoadTime: 3000, // 3 seconds
    firstContentfulPaint: 1800, // 1.8 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1, // 0.1 CLS score
    firstInputDelay: 100 // 100ms
  };

  private vitalsData = {
    fcp: 0,
    lcp: 0,
    cls: 0,
    fid: 0,
    ttfb: 0
  };

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.monitorPageLoad();
    this.monitorUserInteractions();
    this.monitorMemoryUsage();
  }

  /**
   * Setup performance observers for Web Vitals
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.vitalsData.fcp = fcpEntry.startTime;
          this.recordEntry({
            id: this.generateId(),
            type: 'navigation',
            name: 'first-contentful-paint',
            startTime: fcpEntry.startTime,
            duration: 0,
            success: fcpEntry.startTime < this.thresholds.firstContentfulPaint
          });
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (error) {
      console.warn('FCP observer setup failed:', error);
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.vitalsData.lcp = lastEntry.startTime;
          this.recordEntry({
            id: this.generateId(),
            type: 'navigation',
            name: 'largest-contentful-paint',
            startTime: lastEntry.startTime,
            duration: 0,
            success: lastEntry.startTime < this.thresholds.largestContentfulPaint
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer setup failed:', error);
    }

    // Cumulative Layout Shift
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.vitalsData.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer setup failed:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0];
        if (firstInput) {
          this.vitalsData.fid = (firstInput as any).processingStart - firstInput.startTime;
          this.recordEntry({
            id: this.generateId(),
            type: 'user-interaction',
            name: 'first-input-delay',
            startTime: firstInput.startTime,
            duration: this.vitalsData.fid,
            success: this.vitalsData.fid < this.thresholds.firstInputDelay
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer setup failed:', error);
    }

    // Resource loading
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          this.recordEntry({
            id: this.generateId(),
            type: 'resource',
            name: resourceEntry.name,
            startTime: resourceEntry.startTime,
            duration: resourceEntry.duration,
            size: resourceEntry.transferSize || resourceEntry.encodedBodySize,
            success: resourceEntry.duration < 1000, // 1 second threshold
            metadata: {
              initiatorType: resourceEntry.initiatorType,
              transferSize: resourceEntry.transferSize,
              encodedBodySize: resourceEntry.encodedBodySize,
              decodedBodySize: resourceEntry.decodedBodySize
            }
          });
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer setup failed:', error);
    }
  }

  /**
   * Monitor page load performance
   */
  private monitorPageLoad(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.vitalsData.ttfb = navigation.responseStart - navigation.requestStart;
          
          this.recordEntry({
            id: this.generateId(),
            type: 'navigation',
            name: 'page-load',
            startTime: navigation.loadEventStart,
            duration: navigation.loadEventEnd - navigation.loadEventStart,
            success: (navigation.loadEventEnd - navigation.fetchStart) < this.thresholds.pageLoadTime,
            metadata: {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              domInteractive: navigation.domInteractive - navigation.fetchStart,
              ttfb: this.vitalsData.ttfb
            }
          });
        }
      }, 0);
    });
  }

  /**
   * Monitor user interactions
   */
  private monitorUserInteractions(): void {
    if (typeof window === 'undefined') return;

    const interactionTypes = ['click', 'keydown', 'scroll'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const startTime = performance.now();
        
        // Use requestIdleCallback to measure interaction latency
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const duration = performance.now() - startTime;
            this.recordEntry({
              id: this.generateId(),
              type: 'user-interaction',
              name: `${type}-interaction`,
              startTime,
              duration,
              success: duration < 16, // 60fps threshold
              metadata: {
                target: (event.target as Element)?.tagName,
                eventType: type
              }
            });
          });
        }
      }, { passive: true });
    });
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.recordEntry({
          id: this.generateId(),
          type: 'resource',
          name: 'memory-usage',
          startTime: performance.now(),
          duration: 0,
          success: memory.usedJSHeapSize < memory.jsHeapSizeLimit * 0.8, // 80% threshold
          metadata: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Record API performance
   */
  recordApiPerformance(
    url: string,
    method: string,
    startTime: number,
    endTime: number,
    success: boolean,
    error?: string,
    size?: number
  ): void {
    this.recordEntry({
      id: this.generateId(),
      type: 'api',
      name: `${method} ${url}`,
      startTime,
      duration: endTime - startTime,
      size,
      success,
      error,
      metadata: {
        method,
        url,
        endpoint: new URL(url).pathname
      }
    });
  }

  /**
   * Record custom performance entry
   */
  recordCustomMetric(
    name: string,
    startTime: number,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    this.recordEntry({
      id: this.generateId(),
      type: 'user-interaction',
      name,
      startTime,
      duration,
      success,
      metadata
    });
  }

  /**
   * Record performance entry
   */
  private recordEntry(entry: PerformanceEntry): void {
    this.entries.push(entry);
    
    // Keep only last 1000 entries
    if (this.entries.length > 1000) {
      this.entries = this.entries.slice(-1000);
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const now = new Date().toISOString();
    const recentEntries = this.entries.slice(-500); // Last 500 entries
    
    return {
      timestamp: now,
      pageLoad: this.getPageLoadMetrics(),
      apiPerformance: this.getApiPerformanceMetrics(recentEntries),
      resourcePerformance: this.getResourcePerformanceMetrics(recentEntries),
      userExperience: this.getUserExperienceMetrics(recentEntries),
      recommendations: this.generateRecommendations(recentEntries)
    };
  }

  /**
   * Get page load metrics
   */
  private getPageLoadMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      firstContentfulPaint: this.vitalsData.fcp,
      largestContentfulPaint: this.vitalsData.lcp,
      cumulativeLayoutShift: this.vitalsData.cls,
      firstInputDelay: this.vitalsData.fid
    };
  }

  /**
   * Get API performance metrics
   */
  private getApiPerformanceMetrics(entries: PerformanceEntry[]) {
    const apiEntries = entries.filter(e => e.type === 'api');
    
    if (apiEntries.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        slowestEndpoints: []
      };
    }

    const totalResponseTime = apiEntries.reduce((sum, e) => sum + e.duration, 0);
    const successfulRequests = apiEntries.filter(e => e.success).length;
    
    // Group by endpoint for slowest analysis
    const endpointGroups = new Map<string, number[]>();
    apiEntries.forEach(entry => {
      const endpoint = entry.metadata?.endpoint || entry.name;
      if (!endpointGroups.has(endpoint)) {
        endpointGroups.set(endpoint, []);
      }
      endpointGroups.get(endpoint)!.push(entry.duration);
    });

    const slowestEndpoints = Array.from(endpointGroups.entries())
      .map(([endpoint, times]) => ({
        endpoint,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);

    return {
      averageResponseTime: totalResponseTime / apiEntries.length,
      successRate: (successfulRequests / apiEntries.length) * 100,
      errorRate: ((apiEntries.length - successfulRequests) / apiEntries.length) * 100,
      slowestEndpoints
    };
  }

  /**
   * Get resource performance metrics
   */
  private getResourcePerformanceMetrics(entries: PerformanceEntry[]) {
    const resourceEntries = entries.filter(e => e.type === 'resource');
    
    if (resourceEntries.length === 0) {
      return {
        totalResources: 0,
        totalSize: 0,
        cacheHitRate: 0,
        compressionRatio: 0
      };
    }

    const totalSize = resourceEntries.reduce((sum, e) => sum + (e.size || 0), 0);
    const cachedResources = resourceEntries.filter(e => 
      e.metadata?.transferSize === 0 || e.duration < 10
    ).length;

    // Estimate compression ratio from transfer vs decoded size
    const compressibleEntries = resourceEntries.filter(e => 
      e.metadata?.transferSize && e.metadata?.decodedBodySize
    );
    
    let compressionRatio = 0;
    if (compressibleEntries.length > 0) {
      const totalTransfer = compressibleEntries.reduce((sum, e) => sum + e.metadata!.transferSize, 0);
      const totalDecoded = compressibleEntries.reduce((sum, e) => sum + e.metadata!.decodedBodySize, 0);
      compressionRatio = totalDecoded > 0 ? ((totalDecoded - totalTransfer) / totalDecoded) * 100 : 0;
    }

    return {
      totalResources: resourceEntries.length,
      totalSize,
      cacheHitRate: (cachedResources / resourceEntries.length) * 100,
      compressionRatio
    };
  }

  /**
   * Get user experience metrics
   */
  private getUserExperienceMetrics(entries: PerformanceEntry[]) {
    const interactionEntries = entries.filter(e => e.type === 'user-interaction');
    const memoryEntries = entries.filter(e => e.name === 'memory-usage');
    
    const averageInteractionLatency = interactionEntries.length > 0
      ? interactionEntries.reduce((sum, e) => sum + e.duration, 0) / interactionEntries.length
      : 0;

    const renderingPerformance = this.calculateRenderingPerformance();
    
    const latestMemory = memoryEntries[memoryEntries.length - 1];
    const memoryUsage = latestMemory?.metadata?.usedJSHeapSize || 0;

    return {
      interactionLatency: averageInteractionLatency,
      renderingPerformance,
      memoryUsage
    };
  }

  /**
   * Calculate rendering performance score
   */
  private calculateRenderingPerformance(): number {
    const fcpScore = this.vitalsData.fcp < this.thresholds.firstContentfulPaint ? 100 : 
      Math.max(0, 100 - ((this.vitalsData.fcp - this.thresholds.firstContentfulPaint) / 1000) * 10);
    
    const lcpScore = this.vitalsData.lcp < this.thresholds.largestContentfulPaint ? 100 :
      Math.max(0, 100 - ((this.vitalsData.lcp - this.thresholds.largestContentfulPaint) / 1000) * 10);
    
    const clsScore = this.vitalsData.cls < this.thresholds.cumulativeLayoutShift ? 100 :
      Math.max(0, 100 - (this.vitalsData.cls * 1000));

    return (fcpScore + lcpScore + clsScore) / 3;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(entries: PerformanceEntry[]): string[] {
    const recommendations: string[] = [];
    const metrics = this.getApiPerformanceMetrics(entries);
    const pageLoad = this.getPageLoadMetrics();
    
    // Clear existing alerts
    this.alerts = [];
    
    if (metrics.averageResponseTime > this.thresholds.apiResponseTime) {
      this.alerts.push({
        id: this.generateId(),
        type: 'warning',
        metric: 'api-response-time',
        message: 'API response times are high - consider caching or optimization',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('API response times are high - consider caching or optimization');
    }
    
    if (metrics.errorRate > 5) {
      this.alerts.push({
        id: this.generateId(),
        type: 'critical',
        metric: 'api-error-rate',
        message: 'High API error rate detected - check network connectivity',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('High API error rate detected - check network connectivity');
    }
    
    if (pageLoad.firstContentfulPaint > this.thresholds.firstContentfulPaint) {
      this.alerts.push({
        id: this.generateId(),
        type: 'warning',
        metric: 'fcp',
        message: 'First Contentful Paint is slow - optimize critical rendering path',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('First Contentful Paint is slow - optimize critical rendering path');
    }
    
    if (pageLoad.largestContentfulPaint > this.thresholds.largestContentfulPaint) {
      this.alerts.push({
        id: this.generateId(),
        type: 'critical',
        metric: 'lcp',
        message: 'Largest Contentful Paint is slow - optimize main content loading',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('Largest Contentful Paint is slow - optimize main content loading');
    }
    
    if (pageLoad.cumulativeLayoutShift > this.thresholds.cumulativeLayoutShift) {
      this.alerts.push({
        id: this.generateId(),
        type: 'warning',
        metric: 'cls',
        message: 'High layout shift detected - ensure proper image and content sizing',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('High layout shift detected - ensure proper image and content sizing');
    }
    
    if (pageLoad.firstInputDelay > this.thresholds.firstInputDelay) {
      this.alerts.push({
        id: this.generateId(),
        type: 'critical',
        metric: 'fid',
        message: 'First Input Delay is high - reduce JavaScript execution time',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('First Input Delay is high - reduce JavaScript execution time');
    }

    const resourceMetrics = this.getResourcePerformanceMetrics(entries);
    if (resourceMetrics.cacheHitRate < 50) {
      this.alerts.push({
        id: this.generateId(),
        type: 'warning',
        metric: 'cache-hit-rate',
        message: 'Low cache hit rate - review caching strategy',
        timestamp: Date.now(),
        resolved: false
      });
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    return recommendations;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current Web Vitals
   */
  getWebVitals() {
    return { ...this.vitalsData };
  }

  /**
   * Get adaptive loading strategy based on current network conditions
   */
  getAdaptiveLoadingStrategy(): {
    imageQuality: 'low' | 'medium' | 'high';
    prefetchEnabled: boolean;
    lazyLoadingThreshold: number;
    cacheStrategy: 'aggressive' | 'normal' | 'conservative';
  } {
    // For now, return default strategy
    // In a real implementation, this would adapt based on network conditions
    return {
      imageQuality: 'high',
      prefetchEnabled: true,
      lazyLoadingThreshold: 1000,
      cacheStrategy: 'normal'
    };
  }

  /**
   * Get current performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Resolve a performance alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * Clear performance data
   */
  clearData(): void {
    this.entries = [];
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  /**
   * Export performance data
   */
  exportData(): {
    entries: PerformanceEntry[];
    vitals: { fcp: number; lcp: number; cls: number; fid: number; ttfb: number; };
    report: PerformanceReport;
  } {
    return {
      entries: [...this.entries],
      vitals: { ...this.vitalsData },
      report: this.generateReport()
    };
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

export default performanceMonitoringService;
