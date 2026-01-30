/**
 * Performance Monitoring Service
 * Tracks and reports mobile performance metrics
 */

import { Platform } from 'react-native';
import { apiClient } from './apiClient';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'fps' | 'mb';
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 100;
  private readonly REPORT_INTERVAL = 60000; // 1 minute

  constructor() {
    if (__DEV__) {
      console.log('🚀 Performance Monitoring Service initialized');
    }
    
    // Periodically report metrics
    setInterval(() => this.reportMetrics(), this.REPORT_INTERVAL);
  }

  /**
   * Start measuring an operation
   * @returns a function to stop measuring and record the metric
   */
  startMeasure(name: string, metadata?: Record<string, any>) {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric({
        name,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        metadata,
      });
      return duration;
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    if (__DEV__) {
      console.log(`📊 [Perf] ${metric.name}: ${metric.value}${metric.unit}`);
    }

    // Keep metrics list manageable
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Report metrics to backend
   */
  private async reportMetrics() {
    if (this.metrics.length === 0) return;

    const metricsToReport = [...this.metrics];
    this.metrics = [];

    try {
      await apiClient.post('/api/analytics/performance', {
        platform: Platform.OS,
        version: Platform.Version,
        metrics: metricsToReport,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Silently fail, add back to metrics if retryable
      this.metrics = [...metricsToReport.slice(-50), ...this.metrics];
    }
  }

  /**
   * Record app startup time
   */
  recordAppStartup(duration: number) {
    this.recordMetric({
      name: 'app_startup',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
    });
  }

  /**
   * Record API request duration
   */
  recordApiRequest(endpoint: string, duration: number, status: number) {
    this.recordMetric({
      name: 'api_request',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: { endpoint, status },
    });
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();
export default performanceMonitoringService;
