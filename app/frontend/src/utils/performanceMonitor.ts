/**
 * Performance Monitoring Utilities
 * 
 * This module provides comprehensive performance monitoring for the social dashboard,
 * including bundle size analysis, load time tracking, and user interaction metrics.
 */

// Performance metrics interface
interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  interactivity: number;
  memoryUsage: number;
  networkRequests: number;
  renderTime: number;
  webVitals: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
  };
}

// Performance budget thresholds
const PERFORMANCE_BUDGETS = {
  bundleSize: 512 * 1024, // 512KB
  loadTime: 3000, // 3 seconds
  interactivity: 100, // 100ms
  memoryUsage: 50 * 1024 * 1024, // 50MB
  fcp: 2000, // 2 seconds
  lcp: 4000, // 4 seconds
  fid: 100, // 100ms
  cls: 0.1, // 0.1
  ttfb: 800 // 800ms
};

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
    this.initializeObservers();
  }

  // Mark a performance timing point
  mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
    this.marks.set(name, performance.now());
  }

  // Measure performance between two marks
  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    const duration = endTime - startTime;

    if (typeof performance !== 'undefined' && performance.measure && startMark) {
      try {
        performance.measure(name, startMark);
      } catch (error) {
        // Fallback if performance.measure fails
        console.warn('Performance measure failed:', error);
      }
    }

    return duration;
  }

  // Initialize performance observers
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    try {
      // Navigation timing observer
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as any; // Use any to avoid TypeScript issues
              this.metrics.loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
              this.metrics.webVitals = {
                ...this.metrics.webVitals,
                ttfb: navEntry.responseStart - navEntry.navigationStart
              };
            }
          });
        });

        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);

        // Paint timing observer
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.webVitals = {
                ...this.metrics.webVitals,
                fcp: entry.startTime
              };
            }
          });
        });

        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);

        // Layout shift observer
        const layoutObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          this.metrics.webVitals = {
            ...this.metrics.webVitals,
            cls: clsValue
          };
        });

        layoutObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutObserver);
      }

      // Web Vitals integration
      this.initializeWebVitals();
    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // Initialize Web Vitals monitoring
  private async initializeWebVitals(): Promise<void> {
    // Placeholder for Web Vitals - will be implemented when library is available
    console.log('Web Vitals monitoring initialized (placeholder)');
    
    // Initialize with default values
    this.metrics.webVitals = {
      fcp: 0,
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0
    };
  }

  // Measure bundle size
  async measureBundleSize(): Promise<number> {
    try {
      if (typeof window === 'undefined') return 0;

      // Estimate bundle size from loaded resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;

      resources.forEach((resource) => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          // Estimate size from transfer size or encoded body size
          totalSize += resource.transferSize || resource.encodedBodySize || 0;
        }
      });

      this.metrics.bundleSize = totalSize;
      return totalSize;
    } catch (error) {
      console.warn('Bundle size measurement failed:', error);
      return 0;
    }
  }

  // Measure memory usage
  measureMemoryUsage(): number {
    try {
      if (typeof window === 'undefined') return 0;

      // Use performance.memory if available (Chrome)
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        return memory.usedJSHeapSize;
      }

      return 0;
    } catch (error) {
      console.warn('Memory measurement not available:', error);
      return 0;
    }
  }

  // Measure render time for a component
  measureRenderTime(componentName: string, renderFn: () => void): number {
    const startTime = performance.now();
    renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
    return renderTime;
  }

  // Record a custom metric
  recordMetric(name: string, value: number, type: 'counter' | 'gauge' | 'histogram' = 'counter'): void {
    // Store metric for later analysis
    const metricsWithCustom = this.metrics as any;
    if (!metricsWithCustom.customMetrics) {
      metricsWithCustom.customMetrics = {};
    }
    
    metricsWithCustom.customMetrics[name] = {
      value,
      type,
      timestamp: Date.now()
    };

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value} (${type})`);
    }
  }

  // Track network requests
  trackNetworkRequests(): void {
    if (typeof window === 'undefined') return;

    const resources = performance.getEntriesByType('resource');
    this.metrics.networkRequests = resources.length;

    // Monitor ongoing requests
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      this.metrics.networkRequests = (this.metrics.networkRequests || 0) + entries.length;
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  // Get current metrics
  async getMetrics(): Promise<PerformanceMetrics> {
    await this.measureBundleSize();
    this.measureMemoryUsage();
    this.trackNetworkRequests();

    return {
      bundleSize: this.metrics.bundleSize || 0,
      loadTime: this.metrics.loadTime || 0,
      interactivity: this.metrics.interactivity || 0,
      memoryUsage: this.metrics.memoryUsage || 0,
      networkRequests: this.metrics.networkRequests || 0,
      renderTime: this.metrics.renderTime || 0,
      webVitals: {
        fcp: this.metrics.webVitals?.fcp,
        lcp: this.metrics.webVitals?.lcp,
        fid: this.metrics.webVitals?.fid,
        cls: this.metrics.webVitals?.cls,
        ttfb: this.metrics.webVitals?.ttfb
      }
    };
  }

  // Check if metrics meet performance budgets
  async checkPerformanceBudgets(): Promise<{
    passed: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const metrics = await this.getMetrics();
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check bundle size
    if (metrics.bundleSize > PERFORMANCE_BUDGETS.bundleSize) {
      violations.push(`Bundle size (${(metrics.bundleSize / 1024).toFixed(1)}KB) exceeds budget (${PERFORMANCE_BUDGETS.bundleSize / 1024}KB)`);
    } else if (metrics.bundleSize > PERFORMANCE_BUDGETS.bundleSize * 0.8) {
      warnings.push(`Bundle size approaching budget limit`);
    }

    // Check load time
    if (metrics.loadTime > PERFORMANCE_BUDGETS.loadTime) {
      violations.push(`Load time (${metrics.loadTime.toFixed(0)}ms) exceeds budget (${PERFORMANCE_BUDGETS.loadTime}ms)`);
    }

    // Check interactivity
    if (metrics.interactivity > PERFORMANCE_BUDGETS.interactivity) {
      violations.push(`First Input Delay (${metrics.interactivity.toFixed(0)}ms) exceeds budget (${PERFORMANCE_BUDGETS.interactivity}ms)`);
    }

    // Check Web Vitals
    if (metrics.webVitals.fcp && metrics.webVitals.fcp > PERFORMANCE_BUDGETS.fcp) {
      violations.push(`First Contentful Paint (${metrics.webVitals.fcp.toFixed(0)}ms) exceeds budget (${PERFORMANCE_BUDGETS.fcp}ms)`);
    }

    if (metrics.webVitals.lcp && metrics.webVitals.lcp > PERFORMANCE_BUDGETS.lcp) {
      violations.push(`Largest Contentful Paint (${metrics.webVitals.lcp.toFixed(0)}ms) exceeds budget (${PERFORMANCE_BUDGETS.lcp}ms)`);
    }

    if (metrics.webVitals.cls && metrics.webVitals.cls > PERFORMANCE_BUDGETS.cls) {
      violations.push(`Cumulative Layout Shift (${metrics.webVitals.cls.toFixed(3)}) exceeds budget (${PERFORMANCE_BUDGETS.cls})`);
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings
    };
  }

  // Generate performance report
  async generateReport(): Promise<{
    metrics: PerformanceMetrics;
    budgetCheck: {
      passed: boolean;
      violations: string[];
      warnings: string[];
    };
    recommendations: string[];
  }> {
    const metrics = await this.getMetrics();
    const budgetCheck = await this.checkPerformanceBudgets();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (metrics.bundleSize > PERFORMANCE_BUDGETS.bundleSize * 0.7) {
      recommendations.push('Consider code splitting to reduce bundle size');
      recommendations.push('Enable tree shaking to remove unused code');
      recommendations.push('Use dynamic imports for large dependencies');
    }

    if (metrics.webVitals.lcp && metrics.webVitals.lcp > PERFORMANCE_BUDGETS.lcp * 0.7) {
      recommendations.push('Optimize images and use next-gen formats (WebP, AVIF)');
      recommendations.push('Implement lazy loading for below-the-fold content');
      recommendations.push('Use CDN for static assets');
    }

    if (metrics.webVitals.fid && metrics.webVitals.fid > PERFORMANCE_BUDGETS.fid * 0.7) {
      recommendations.push('Reduce JavaScript execution time');
      recommendations.push('Use web workers for heavy computations');
      recommendations.push('Implement virtual scrolling for large lists');
    }

    if (metrics.webVitals.cls && metrics.webVitals.cls > PERFORMANCE_BUDGETS.cls * 0.7) {
      recommendations.push('Set explicit dimensions for images and videos');
      recommendations.push('Reserve space for dynamic content');
      recommendations.push('Use CSS containment for layout stability');
    }

    return {
      metrics,
      budgetCheck,
      recommendations
    };
  }

  // Clean up observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Error tracking utility
export class ErrorTracker {
  private errors: Array<{
    message: string;
    error: any;
    timestamp: Date;
    context?: string;
  }> = [];

  logError(message: string, error: any, context?: string): void {
    this.errors.push({
      message,
      error,
      timestamp: new Date(),
      context
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'Error'}] ${message}:`, error);
    }

    // In production, you would send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(message, error, context);
    }
  }

  private sendToErrorService(message: string, error: any, context?: string): void {
    // Placeholder for error tracking service integration
    // e.g., Sentry, LogRocket, etc.
    console.log('Error logged to service:', { message, error, context });
  }

  getErrors(): Array<{
    message: string;
    error: any;
    timestamp: Date;
    context?: string;
  }> {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// Memory monitor class
class MemoryMonitor {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning || typeof window === 'undefined') return;

    this.isRunning = true;
    this.interval = setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        performanceMonitor.recordMetric('memory_used', memory.usedJSHeapSize, 'gauge');
        performanceMonitor.recordMetric('memory_total', memory.totalJSHeapSize, 'gauge');
      }
    }, 30000); // Check every 30 seconds
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }
}

// Create singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const errorTracker = new ErrorTracker();
export const memoryMonitor = new MemoryMonitor();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup();
    memoryMonitor.stop();
  });
}