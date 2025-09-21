import { FeatureFlags } from './featureFlags';

// Performance monitoring interface
export interface PerformanceMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte

  // Custom metrics
  componentLoadTime: number;
  apiResponseTime: number;
  bundleSize: number;
  memoryUsage: number;
  errorRate: number;
}

// Feature adoption tracking
export interface FeatureAdoptionMetrics {
  featureName: keyof FeatureFlags;
  userId: string;
  sessionId: string;
  timestamp: Date;
  action: 'viewed' | 'interacted' | 'completed' | 'abandoned';
  duration?: number;
  metadata?: Record<string, any>;
}

// Error tracking interface
export interface ErrorMetrics {
  errorId: string;
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

// User behavior tracking
export interface UserBehaviorMetrics {
  userId: string;
  sessionId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  page: string;
  referrer?: string;
}

class MonitoringService {
  private sessionId: string;
  private userId?: string;
  private performanceObserver?: PerformanceObserver;
  private errorBuffer: ErrorMetrics[] = [];
  private metricsBuffer: FeatureAdoptionMetrics[] = [];
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeMonitoring();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setUserId(userId: string) {
    this.userId = userId;
  }

  private initializeMonitoring() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    this.isInitialized = true;

    // Initialize Web Vitals monitoring
    this.initializeWebVitals();

    // Initialize error monitoring
    this.initializeErrorMonitoring();

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();

    // Initialize user behavior tracking
    this.initializeUserBehaviorTracking();

    // Flush buffers periodically
    setInterval(() => this.flushBuffers(), 30000); // Every 30 seconds

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushBuffers());
  }

  private initializeWebVitals() {
    if ('web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(this.onWebVital.bind(this));
        getFID(this.onWebVital.bind(this));
        getFCP(this.onWebVital.bind(this));
        getLCP(this.onWebVital.bind(this));
        getTTFB(this.onWebVital.bind(this));
      });
    }
  }

  private onWebVital(metric: any) {
    this.trackPerformanceMetric({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  private initializeErrorMonitoring() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        errorId: this.generateErrorId(),
        message: event.message,
        stack: event.error?.stack,
        component: this.getComponentFromStack(event.error?.stack),
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date(),
        severity: 'medium',
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        errorId: this.generateErrorId(),
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date(),
        severity: 'high',
        context: {
          reason: event.reason,
        },
      });
    });
  }

  private initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor navigation timing
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackNavigationTiming(entry as PerformanceNavigationTiming);
          } else if (entry.entryType === 'resource') {
            this.trackResourceTiming(entry as PerformanceResourceTiming);
          } else if (entry.entryType === 'measure') {
            this.trackCustomMeasure(entry);
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.trackPerformanceMetric({
          name: 'memory_usage',
          value: memory.usedJSHeapSize,
          totalHeapSize: memory.totalJSHeapSize,
          heapSizeLimit: memory.jsHeapSizeLimit,
        });
      }, 60000); // Every minute
    }
  }

  private initializeUserBehaviorTracking() {
    // Track page views
    this.trackUserBehavior('page_view', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });

    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.dataset.track) {
        this.trackUserBehavior('click', {
          element: target.tagName.toLowerCase(),
          id: target.id,
          className: target.className,
          text: target.textContent?.substring(0, 100),
          trackingId: target.dataset.track,
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form.dataset.track) {
        this.trackUserBehavior('form_submit', {
          formId: form.id,
          action: form.action,
          method: form.method,
          trackingId: form.dataset.track,
        });
      }
    });
  }

  // Public methods for tracking

  public trackFeatureAdoption(metrics: Omit<FeatureAdoptionMetrics, 'sessionId' | 'timestamp'>) {
    const fullMetrics: FeatureAdoptionMetrics = {
      ...metrics,
      sessionId: this.sessionId,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(fullMetrics);

    // Also send to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'feature_adoption', {
        feature_name: metrics.featureName,
        action: metrics.action,
        user_id: metrics.userId,
        duration: metrics.duration,
        custom_parameters: metrics.metadata,
      });
    }
  }

  public trackError(error: ErrorMetrics) {
    this.errorBuffer.push(error);

    // Send critical errors immediately
    if (error.severity === 'critical') {
      this.sendErrorsToEndpoint([error]);
    }

    console.error('Tracked error:', error);
  }

  public trackPerformanceMetric(metric: Record<string, any>) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        session_id: this.sessionId,
        user_id: this.userId,
      });
    }
  }

  public trackUserBehavior(event: string, properties: Record<string, any>) {
    const metrics: UserBehaviorMetrics = {
      userId: this.userId || 'anonymous',
      sessionId: this.sessionId,
      event,
      properties,
      timestamp: new Date(),
      page: window.location.pathname,
      referrer: document.referrer,
    };

    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, {
        ...properties,
        session_id: this.sessionId,
        user_id: this.userId,
      });
    }

    // Store for batch sending
    this.sendUserBehaviorToEndpoint(metrics);
  }

  public startFeatureTimer(featureName: keyof FeatureFlags): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.trackFeatureAdoption({
        featureName,
        userId: this.userId || 'anonymous',
        action: 'completed',
        duration,
      });
    };
  }

  public markFeatureInteraction(featureName: keyof FeatureFlags, metadata?: Record<string, any>) {
    this.trackFeatureAdoption({
      featureName,
      userId: this.userId || 'anonymous',
      action: 'interacted',
      metadata,
    });
  }

  // Private helper methods

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getComponentFromStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    const match = stack.match(/at (\w+)/);
    return match ? match[1] : undefined;
  }

  private trackNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      dns_lookup: entry.domainLookupEnd - entry.domainLookupStart,
      tcp_connect: entry.connectEnd - entry.connectStart,
      request_response: entry.responseEnd - entry.requestStart,
      dom_processing: entry.domContentLoadedEventEnd - entry.responseEnd,
      load_complete: entry.loadEventEnd - entry.loadEventStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      this.trackPerformanceMetric({ name, value });
    });
  }

  private trackResourceTiming(entry: PerformanceResourceTiming) {
    // Track slow resources
    if (entry.duration > 1000) { // More than 1 second
      this.trackPerformanceMetric({
        name: 'slow_resource',
        url: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
        type: this.getResourceType(entry.name),
      });
    }
  }

  private trackCustomMeasure(entry: PerformanceEntry) {
    this.trackPerformanceMetric({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private async flushBuffers() {
    if (this.errorBuffer.length > 0) {
      await this.sendErrorsToEndpoint([...this.errorBuffer]);
      this.errorBuffer = [];
    }

    if (this.metricsBuffer.length > 0) {
      await this.sendMetricsToEndpoint([...this.metricsBuffer]);
      this.metricsBuffer = [];
    }
  }

  private async sendErrorsToEndpoint(errors: ErrorMetrics[]) {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors }),
      });
    } catch (error) {
      console.warn('Failed to send error metrics:', error);
    }
  }

  private async sendMetricsToEndpoint(metrics: FeatureAdoptionMetrics[]) {
    try {
      await fetch('/api/monitoring/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics }),
      });
    } catch (error) {
      console.warn('Failed to send feature metrics:', error);
    }
  }

  private async sendUserBehaviorToEndpoint(behavior: UserBehaviorMetrics) {
    try {
      await fetch('/api/monitoring/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behavior }),
      });
    } catch (error) {
      console.warn('Failed to send behavior metrics:', error);
    }
  }

  public destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.flushBuffers();
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// React hook for monitoring
export const useMonitoring = () => {
  return {
    trackFeatureAdoption: monitoring.trackFeatureAdoption.bind(monitoring),
    trackError: monitoring.trackError.bind(monitoring),
    trackUserBehavior: monitoring.trackUserBehavior.bind(monitoring),
    startFeatureTimer: monitoring.startFeatureTimer.bind(monitoring),
    markFeatureInteraction: monitoring.markFeatureInteraction.bind(monitoring),
  };
};

// Higher-order component for automatic feature tracking
export const withFeatureTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureName: keyof FeatureFlags
) => {
  const TrackedComponent = (props: P) => {
    const { markFeatureInteraction } = useMonitoring();

    React.useEffect(() => {
      markFeatureInteraction(featureName, { component: WrappedComponent.name });
    }, []);

    return <WrappedComponent {...props} />;
  };

  TrackedComponent.displayName = `withFeatureTracking(${WrappedComponent.displayName || WrappedComponent.name})`;
  return TrackedComponent;
};

export default monitoring;