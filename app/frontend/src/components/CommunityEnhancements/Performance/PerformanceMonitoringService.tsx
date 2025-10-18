/**
 * Performance Monitoring and Analytics Service
 * Comprehensive performance metrics collection and monitoring for community enhancements
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Performance metrics interfaces
interface PerformanceMetrics {
  // Rendering performance
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  slowRenders: number;
  
  // Memory usage
  memoryUsage: number;
  memoryLeaks: number;
  
  // Network performance
  networkRequests: number;
  averageResponseTime: number;
  failedRequests: number;
  cacheHitRate: number;
  
  // User interaction
  interactionLatency: number;
  scrollPerformance: number;
  animationFrameRate: number;
  
  // Bundle performance
  bundleSize: number;
  loadTime: number;
  chunkLoadTime: number;
  
  // Custom metrics
  customMetrics: Record<string, number>;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

interface PerformanceThresholds {
  renderTime: number;
  memoryUsage: number;
  responseTime: number;
  frameRate: number;
  interactionLatency: number;
}

interface PerformanceConfig {
  enabled: boolean;
  collectInterval: number;
  alertThresholds: PerformanceThresholds;
  maxAlerts: number;
  enableRealTimeMonitoring: boolean;
  enableUserInteractionTracking: boolean;
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
}

// Default configuration
const defaultConfig: PerformanceConfig = {
  enabled: true,
  collectInterval: 5000, // 5 seconds
  alertThresholds: {
    renderTime: 16, // 60fps threshold
    memoryUsage: 100 * 1024 * 1024, // 100MB
    responseTime: 1000, // 1 second
    frameRate: 55, // Minimum acceptable FPS
    interactionLatency: 100 // 100ms
  },
  maxAlerts: 50,
  enableRealTimeMonitoring: true,
  enableUserInteractionTracking: true,
  enableMemoryMonitoring: true,
  enableNetworkMonitoring: true
};

/**
 * Performance Monitoring Service
 */
class PerformanceMonitoringService {
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private config: PerformanceConfig;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private alertObservers: Set<(alert: PerformanceAlert) => void> = new Set();
  private intervalId?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  private frameId?: number;
  private lastFrameTime = 0;
  private frameCount = 0;
  private renderTimes: number[] = [];
  private interactionTimes: number[] = [];
  private networkRequests: Map<string, number> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.metrics = this.initializeMetrics();
    
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      renderTime: 0,
      renderCount: 0,
      averageRenderTime: 0,
      slowRenders: 0,
      memoryUsage: 0,
      memoryLeaks: 0,
      networkRequests: 0,
      averageResponseTime: 0,
      failedRequests: 0,
      cacheHitRate: 0,
      interactionLatency: 0,
      scrollPerformance: 0,
      animationFrameRate: 60,
      bundleSize: 0,
      loadTime: 0,
      chunkLoadTime: 0,
      customMetrics: {}
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (!this.config.enabled) return;

    // Start periodic metrics collection
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectInterval);

    // Setup performance observers
    this.setupPerformanceObserver();
    this.setupMutationObserver();
    this.setupFrameRateMonitoring();
    this.setupNetworkMonitoring();
    this.setupUserInteractionMonitoring();
    this.setupMemoryMonitoring();

    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = undefined;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * Setup Performance Observer for navigation and resource timing
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'navigation':
              this.handleNavigationEntry(entry as PerformanceNavigationTiming);
              break;
            case 'resource':
              this.handleResourceEntry(entry as PerformanceResourceTiming);
              break;
            case 'measure':
              this.handleMeasureEntry(entry);
              break;
            case 'paint':
              this.handlePaintEntry(entry);
              break;
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
      });
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver:', error);
    }
  }

  /**
   * Setup mutation observer for DOM changes
   */
  private setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      let domChanges = 0;
      
      mutations.forEach((mutation) => {
        domChanges += mutation.addedNodes.length + mutation.removedNodes.length;
      });

      if (domChanges > 100) {
        this.addAlert({
          type: 'warning',
          message: `High DOM mutation rate: ${domChanges} changes`,
          metric: 'domMutations',
          value: domChanges,
          threshold: 100
        });
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  /**
   * Setup frame rate monitoring
   */
  private setupFrameRateMonitoring(): void {
    const measureFrameRate = (timestamp: number) => {
      if (this.lastFrameTime) {
        const delta = timestamp - this.lastFrameTime;
        this.frameCount++;

        if (this.frameCount >= 60) {
          const fps = Math.round(1000 / (delta / this.frameCount));
          this.metrics.animationFrameRate = fps;
          
          if (fps < this.config.alertThresholds.frameRate) {
            this.addAlert({
              type: 'warning',
              message: `Low frame rate: ${fps} FPS`,
              metric: 'frameRate',
              value: fps,
              threshold: this.config.alertThresholds.frameRate
            });
          }

          this.frameCount = 0;
        }
      }

      this.lastFrameTime = timestamp;
      this.frameId = requestAnimationFrame(measureFrameRate);
    };

    this.frameId = requestAnimationFrame(measureFrameRate);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if (!this.config.enableNetworkMonitoring) return;

    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordNetworkRequest(url, responseTime, response.ok);
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordNetworkRequest(url, responseTime, false);
        throw error;
      }
    };
  }

  /**
   * Setup user interaction monitoring
   */
  private setupUserInteractionMonitoring(): void {
    if (!this.config.enableUserInteractionTracking) return;

    const interactionTypes = ['click', 'keydown', 'scroll', 'touchstart'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const startTime = performance.now();
        
        // Measure interaction response time
        requestAnimationFrame(() => {
          const responseTime = performance.now() - startTime;
          this.recordInteractionLatency(responseTime);
          
          if (responseTime > this.config.alertThresholds.interactionLatency) {
            this.addAlert({
              type: 'warning',
              message: `Slow interaction response: ${responseTime.toFixed(2)}ms`,
              metric: 'interactionLatency',
              value: responseTime,
              threshold: this.config.alertThresholds.interactionLatency
            });
          }
        });
      }, { passive: true });
    });
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (!this.config.enableMemoryMonitoring || !('memory' in performance)) return;

    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize;
        
        if (memory.usedJSHeapSize > this.config.alertThresholds.memoryUsage) {
          this.addAlert({
            type: 'error',
            message: `High memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
            metric: 'memoryUsage',
            value: memory.usedJSHeapSize,
            threshold: this.config.alertThresholds.memoryUsage
          });
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Handle navigation timing entry
   */
  private handleNavigationEntry(entry: PerformanceNavigationTiming): void {
    this.metrics.loadTime = entry.loadEventEnd - entry.navigationStart;
    
    if (this.metrics.loadTime > 3000) {
      this.addAlert({
        type: 'warning',
        message: `Slow page load: ${this.metrics.loadTime.toFixed(2)}ms`,
        metric: 'loadTime',
        value: this.metrics.loadTime,
        threshold: 3000
      });
    }
  }

  /**
   * Handle resource timing entry
   */
  private handleResourceEntry(entry: PerformanceResourceTiming): void {
    const responseTime = entry.responseEnd - entry.requestStart;
    this.recordNetworkRequest(entry.name, responseTime, true);
    
    // Track bundle size for JS files
    if (entry.name.includes('.js') && entry.transferSize) {
      this.metrics.bundleSize += entry.transferSize;
    }
  }

  /**
   * Handle measure entry
   */
  private handleMeasureEntry(entry: PerformanceEntry): void {
    if (entry.name.startsWith('React')) {
      this.recordRenderTime(entry.duration);
    }
  }

  /**
   * Handle paint entry
   */
  private handlePaintEntry(entry: PerformanceEntry): void {
    if (entry.name === 'first-contentful-paint') {
      this.metrics.customMetrics.firstContentfulPaint = entry.startTime;
    } else if (entry.name === 'largest-contentful-paint') {
      this.metrics.customMetrics.largestContentfulPaint = entry.startTime;
    }
  }

  /**
   * Record render time
   */
  recordRenderTime(renderTime: number): void {
    this.renderTimes.push(renderTime);
    this.metrics.renderCount++;
    this.metrics.renderTime = renderTime;
    
    // Keep only last 100 render times
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
    
    this.metrics.averageRenderTime = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
    
    if (renderTime > this.config.alertThresholds.renderTime) {
      this.metrics.slowRenders++;
      
      this.addAlert({
        type: 'warning',
        message: `Slow render: ${renderTime.toFixed(2)}ms`,
        metric: 'renderTime',
        value: renderTime,
        threshold: this.config.alertThresholds.renderTime
      });
    }
  }

  /**
   * Record network request
   */
  private recordNetworkRequest(url: string, responseTime: number, success: boolean): void {
    this.metrics.networkRequests++;
    
    if (!success) {
      this.metrics.failedRequests++;
    }
    
    // Update average response time
    const currentAvg = this.metrics.averageResponseTime;
    const count = this.metrics.networkRequests;
    this.metrics.averageResponseTime = (currentAvg * (count - 1) + responseTime) / count;
    
    if (responseTime > this.config.alertThresholds.responseTime) {
      this.addAlert({
        type: 'warning',
        message: `Slow network request: ${responseTime.toFixed(2)}ms for ${url}`,
        metric: 'responseTime',
        value: responseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }
  }

  /**
   * Record interaction latency
   */
  private recordInteractionLatency(latency: number): void {
    this.interactionTimes.push(latency);
    
    // Keep only last 50 interaction times
    if (this.interactionTimes.length > 50) {
      this.interactionTimes.shift();
    }
    
    this.metrics.interactionLatency = this.interactionTimes.reduce((sum, time) => sum + time, 0) / this.interactionTimes.length;
  }

  /**
   * Add performance alert
   */
  private addAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...alertData
    };

    this.alerts.unshift(alert);
    
    // Limit alerts array size
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.config.maxAlerts);
    }

    // Notify alert observers
    this.alertObservers.forEach(observer => observer(alert));
    
    console.warn(`Performance Alert: ${alert.message}`);
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    // Update cache hit rate
    const totalRequests = this.metrics.networkRequests;
    const cachedRequests = this.networkRequests.size;
    this.metrics.cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;

    // Notify observers
    this.observers.forEach(observer => observer({ ...this.metrics }));
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(observer: (alert: PerformanceAlert) => void): () => void {
    this.alertObservers.add(observer);
    return () => this.alertObservers.delete(observer);
  }

  /**
   * Add custom metric
   */
  addCustomMetric(name: string, value: number): void {
    this.metrics.customMetrics[name] = value;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.intervalId) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.intervalId) {
      this.stopMonitoring();
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<string, any>;
    recommendations: string[];
    alerts: PerformanceAlert[];
  } {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();
    
    const summary = {
      overallScore: this.calculatePerformanceScore(metrics),
      renderingHealth: metrics.averageRenderTime < 16 ? 'Good' : 'Poor',
      memoryHealth: metrics.memoryUsage < this.config.alertThresholds.memoryUsage ? 'Good' : 'Poor',
      networkHealth: metrics.averageResponseTime < 500 ? 'Good' : 'Poor',
      interactionHealth: metrics.interactionLatency < 100 ? 'Good' : 'Poor',
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.type === 'error').length
    };

    const recommendations = this.generateRecommendations(metrics);

    return { summary, recommendations, alerts };
  }

  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 100;
    
    // Rendering performance (30%)
    if (metrics.averageRenderTime > 16) score -= 30;
    else if (metrics.averageRenderTime > 10) score -= 15;
    
    // Memory usage (25%)
    const memoryMB = metrics.memoryUsage / 1024 / 1024;
    if (memoryMB > 100) score -= 25;
    else if (memoryMB > 50) score -= 12;
    
    // Network performance (25%)
    if (metrics.averageResponseTime > 1000) score -= 25;
    else if (metrics.averageResponseTime > 500) score -= 12;
    
    // Interaction latency (20%)
    if (metrics.interactionLatency > 100) score -= 20;
    else if (metrics.interactionLatency > 50) score -= 10;
    
    return Math.max(0, score);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    if (metrics.averageRenderTime > 16) {
      recommendations.push('Consider optimizing component renders with React.memo and useMemo');
    }
    
    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      recommendations.push('Monitor for memory leaks and optimize component cleanup');
    }
    
    if (metrics.averageResponseTime > 500) {
      recommendations.push('Implement request caching and optimize API responses');
    }
    
    if (metrics.interactionLatency > 100) {
      recommendations.push('Optimize event handlers and reduce main thread blocking');
    }
    
    if (metrics.slowRenders > 10) {
      recommendations.push('Implement virtual scrolling for large lists');
    }
    
    if (metrics.failedRequests > metrics.networkRequests * 0.1) {
      recommendations.push('Implement better error handling and retry logic');
    }
    
    return recommendations;
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.stopMonitoring();
    this.observers.clear();
    this.alertObservers.clear();
    this.alerts = [];
    this.renderTimes = [];
    this.interactionTimes = [];
    this.networkRequests.clear();
  }
}

// Performance Context
const PerformanceContext = createContext<{
  service: PerformanceMonitoringService;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
} | null>(null);

// Performance Provider Component
interface PerformanceProviderProps {
  children: React.ReactNode;
  config?: Partial<PerformanceConfig>;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  config = {}
}) => {
  const serviceRef = useRef<PerformanceMonitoringService>();
  const [metrics, setMetrics] = useState<PerformanceMetrics>(() => 
    new PerformanceMonitoringService().getMetrics()
  );
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    serviceRef.current = new PerformanceMonitoringService(config);
    
    const unsubscribeMetrics = serviceRef.current.subscribe(setMetrics);
    const unsubscribeAlerts = serviceRef.current.subscribeToAlerts((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeAlerts();
      serviceRef.current?.destroy();
    };
  }, []);

  const value = {
    service: serviceRef.current!,
    metrics,
    alerts
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};

// Hook to use performance monitoring
export const usePerformanceMonitoring = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformanceMonitoring must be used within a PerformanceProvider');
  }
  return context;
};

// Performance Dashboard Component
export const PerformanceDashboard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { metrics, alerts, service } = usePerformanceMonitoring();
  const [showAlerts, setShowAlerts] = useState(false);
  const [report, setReport] = useState<any>(null);

  const generateReport = useCallback(() => {
    const newReport = service.generateReport();
    setReport(newReport);
  }, [service]);

  const clearAlerts = useCallback(() => {
    service.clearAlerts();
  }, [service]);

  return (
    <div className={`performance-dashboard ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Monitor</h3>
          <div className="flex space-x-2">
            <button
              onClick={generateReport}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Generate Report
            </button>
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Alerts ({alerts.length})
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Render Time"
            value={`${metrics.averageRenderTime.toFixed(2)}ms`}
            status={metrics.averageRenderTime < 16 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Memory Usage"
            value={`${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`}
            status={metrics.memoryUsage < 50 * 1024 * 1024 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Network"
            value={`${metrics.averageResponseTime.toFixed(0)}ms`}
            status={metrics.averageResponseTime < 500 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Frame Rate"
            value={`${metrics.animationFrameRate} FPS`}
            status={metrics.animationFrameRate >= 55 ? 'good' : 'warning'}
          />
        </div>

        {/* Alerts Panel */}
        <AnimatePresence>
          {showAlerts && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Recent Alerts</h4>
                  <button
                    onClick={clearAlerts}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alerts.slice(0, 10).map(alert => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                  {alerts.length === 0 && (
                    <p className="text-sm text-gray-500">No alerts</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Panel */}
        {report && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 rounded-lg p-4"
          >
            <h4 className="font-medium text-blue-900 mb-3">Performance Report</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-blue-700">Overall Score</p>
                <p className="text-2xl font-bold text-blue-900">{report.summary.overallScore}/100</p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Critical Alerts</p>
                <p className="text-2xl font-bold text-blue-900">{report.summary.criticalAlerts}</p>
              </div>
            </div>
            {report.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-900 mb-2">Recommendations:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  {report.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  status: 'good' | 'warning' | 'error';
}> = ({ title, value, status }) => {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    error: 'text-red-600 bg-red-50 border-red-200'
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColors[status]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
};

// Alert Item Component
const AlertItem: React.FC<{ alert: PerformanceAlert }> = ({ alert }) => {
  const typeColors = {
    info: 'text-blue-600 bg-blue-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50'
  };

  return (
    <div className={`p-2 rounded text-sm ${typeColors[alert.type]}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{alert.message}</span>
        <span className="text-xs opacity-75">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

export default {
  PerformanceMonitoringService,
  PerformanceProvider,
  PerformanceDashboard,
  usePerformanceMonitoring,
  performanceMonitoringService
};