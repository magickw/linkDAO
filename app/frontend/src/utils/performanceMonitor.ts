// Performance monitoring and optimization utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
}

interface PerformanceConfig {
  enableLogging?: boolean;
  sampleRate?: number;
  maxMetrics?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;
  private observers: PerformanceObserver[] = [];

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      sampleRate: config.sampleRate ?? 1.0,
      maxMetrics: config.maxMetrics ?? 1000
    };

    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    // Observe navigation timing
    this.observeNavigationTiming();
    
    // Observe resource timing
    this.observeResourceTiming();
    
    // Observe paint timing
    this.observePaintTiming();
    
    // Observe layout shift
    this.observeLayoutShift();
    
    // Observe first input delay
    this.observeFirstInputDelay();
  }

  private observeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart);
            this.recordMetric('load_complete', navEntry.loadEventEnd - navEntry.loadEventStart);
            this.recordMetric('first_byte', navEntry.responseStart - navEntry.requestStart);
            this.recordMetric('dns_lookup', navEntry.domainLookupEnd - navEntry.domainLookupStart);
            this.recordMetric('tcp_connect', navEntry.connectEnd - navEntry.connectStart);
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation timing observation failed:', error);
    }
  }

  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            
            // Track slow resources
            if (resourceEntry.duration > 1000) {
              this.recordMetric(`slow_resource_${this.getResourceType(resourceEntry.name)}`, resourceEntry.duration);
            }
            
            // Track resource sizes
            if (resourceEntry.transferSize) {
              this.recordMetric(`resource_size_${this.getResourceType(resourceEntry.name)}`, resourceEntry.transferSize);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource timing observation failed:', error);
    }
  }

  private observePaintTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            this.recordMetric(entry.name.replace('-', '_'), entry.startTime);
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Paint timing observation failed:', error);
    }
  }

  private observeLayoutShift(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.recordMetric('cumulative_layout_shift', clsValue);
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Layout shift observation failed:', error);
    }
  }

  private observeFirstInputDelay(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as any;
            this.recordMetric('first_input_delay', fidEntry.processingStart - fidEntry.startTime);
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('First input delay observation failed:', error);
    }
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.css$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  // Record a custom metric
  recordMetric(name: string, value: number, type: 'timing' | 'counter' | 'gauge' = 'timing'): void {
    if (Math.random() > this.config.sampleRate!) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type
    };

    this.metrics.push(metric);

    // Limit metrics array size
    if (this.metrics.length > this.config.maxMetrics!) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics!);
    }

    if (this.config.enableLogging) {
      console.log(`Performance metric: ${name} = ${value}ms`);
    }
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Measure async function execution time
  async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    
    this.recordMetric(name, end - start);
    return result;
  }

  // Mark the start of a measurement
  mark(name: string): void {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}_start`);
    }
  }

  // Measure from a mark to now
  measure(name: string): number {
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      try {
        performance.mark(`${name}_end`);
        performance.measure(name, `${name}_start`, `${name}_end`);
        
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
          const duration = entries[entries.length - 1].duration;
          this.recordMetric(name, duration);
          return duration;
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
    return 0;
  }

  // Get all metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get metrics by name
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  // Get average value for a metric
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  // Get performance summary
  getSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by name
    const groupedMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics for each metric
    for (const [name, values] of Object.entries(groupedMetrics)) {
      summary[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1]
      };
    }

    return summary;
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Destroy the monitor
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.clearMetrics();
  }
}

// Memory usage monitor
class MemoryMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private performanceMonitor: PerformanceMonitor;

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
  }

  start(interval: number = 30000): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.recordMemoryUsage();
    }, interval);

    // Record initial memory usage
    this.recordMemoryUsage();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      this.performanceMonitor.recordMetric('memory_used', memory.usedJSHeapSize, 'gauge');
      this.performanceMonitor.recordMetric('memory_total', memory.totalJSHeapSize, 'gauge');
      this.performanceMonitor.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'gauge');
    }
  }
}

// Bundle size analyzer
class BundleAnalyzer {
  private performanceMonitor: PerformanceMonitor;

  constructor(performanceMonitor: PerformanceMonitor) {
    this.performanceMonitor = performanceMonitor;
  }

  analyzeBundleSize(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      let totalJSSize = 0;
      let totalCSSSize = 0;
      let totalImageSize = 0;

      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          if (resourceEntry.name.match(/\.js$/)) {
            totalJSSize += resourceEntry.transferSize || 0;
          } else if (resourceEntry.name.match(/\.css$/)) {
            totalCSSSize += resourceEntry.transferSize || 0;
          } else if (resourceEntry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) {
            totalImageSize += resourceEntry.transferSize || 0;
          }
        }
      }

      this.performanceMonitor.recordMetric('bundle_js_size', totalJSSize, 'gauge');
      this.performanceMonitor.recordMetric('bundle_css_size', totalCSSSize, 'gauge');
      this.performanceMonitor.recordMetric('bundle_image_size', totalImageSize, 'gauge');
    });

    observer.observe({ entryTypes: ['resource'] });
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor({
  enableLogging: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
});

export const memoryMonitor = new MemoryMonitor(performanceMonitor);
export const bundleAnalyzer = new BundleAnalyzer(performanceMonitor);

// Start monitoring in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  memoryMonitor.start();
  bundleAnalyzer.analyzeBundleSize();
}

export { PerformanceMonitor, MemoryMonitor, BundleAnalyzer };
export default performanceMonitor;