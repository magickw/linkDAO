/**
 * Performance Integration Service
 * Integrates all performance optimization services into a unified API
 */

import { performanceOptimizationService, optimizedApiRequest } from './performanceOptimizationService';
import { performanceMonitoringService } from './performanceMonitoringService';
import { requestDeduplicationService, deduplicatedApiRequest } from './requestDeduplicationService';
import { compressionOptimizationService, compressedRequest } from './compressionOptimizationService';

interface IntegratedRequestConfig {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enableCompression?: boolean;
  enableMonitoring?: boolean;
  cacheType?: 'feed' | 'communities' | 'profiles' | 'marketplace' | 'governance' | 'static';
  deduplicationMaxAge?: number;
  timeout?: number;
  retries?: number;
}

interface PerformanceReport {
  timestamp: string;
  summary: {
    totalRequests: number;
    cacheHitRate: number;
    deduplicationSavings: number;
    compressionRatio: number;
    averageResponseTime: number;
    errorRate: number;
  };
  detailed: {
    optimization: any;
    monitoring: any;
    deduplication: any;
    compression: any;
  };
  recommendations: string[];
}

class PerformanceIntegrationService {
  private isInitialized = false;
  private requestCount = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the performance integration service
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // Setup global error handling for performance monitoring
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        performanceMonitoringService.recordCustomMetric(
          'javascript-error',
          performance.now(),
          0,
          false,
          {
            message: event.error?.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        );
      });

      window.addEventListener('unhandledrejection', (event) => {
        performanceMonitoringService.recordCustomMetric(
          'unhandled-promise-rejection',
          performance.now(),
          0,
          false,
          {
            reason: event.reason?.toString()
          }
        );
      });
    }

    this.isInitialized = true;
  }

  /**
   * Make an optimized API request with all performance features
   */
  async optimizedRequest<T>(
    url: string,
    options: RequestInit = {},
    config: IntegratedRequestConfig = {}
  ): Promise<T> {
    const {
      enableCaching = true,
      enableDeduplication = true,
      enableCompression = true,
      enableMonitoring = true,
      cacheType = 'feed',
      deduplicationMaxAge = 30000,
      timeout = 20000,
      retries = 2
    } = config;

    const startTime = performance.now();
    this.requestCount++;
    let result: T;
    let success = true;
    let error: string | undefined;
    let fromCache = false;

    try {
      // Generate request key for deduplication
      const requestKey = enableDeduplication 
        ? requestDeduplicationService.generateRequestKey(url, options.method, options.body)
        : '';

      // Apply optimizations based on configuration
      if (enableDeduplication && enableCaching && enableCompression) {
        // Full optimization stack
        result = await this.fullOptimizedRequest<T>(url, options, {
          cacheType,
          deduplicationMaxAge,
          timeout,
          retries
        });
      } else if (enableCaching && enableCompression) {
        // Caching + Compression
        const optimizedOptions = await compressionOptimizationService.optimizeRequest(url, options);
        result = await performanceOptimizationService.optimizedRequest<T>(url, optimizedOptions, cacheType);
      } else if (enableDeduplication && enableCompression) {
        // Deduplication + Compression
        result = await requestDeduplicationService.deduplicatedRequest(
          requestKey,
          async () => {
            const optimizedOptions = await compressionOptimizationService.optimizeRequest(url, options);
            const response = await fetch(url, optimizedOptions);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return compressionOptimizationService.processResponse<T>(response);
          },
          deduplicationMaxAge
        );
      } else if (enableCaching) {
        // Caching only
        result = await performanceOptimizationService.optimizedRequest<T>(url, options, cacheType);
      } else if (enableDeduplication) {
        // Deduplication only
        result = await deduplicatedApiRequest<T>(url, options, deduplicationMaxAge);
      } else if (enableCompression) {
        // Compression only
        result = await compressedRequest<T>(url, options);
      } else {
        // Basic request
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        result = await response.json();
      }

    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      const endTime = performance.now();

      // Record performance metrics if monitoring is enabled
      if (enableMonitoring) {
        performanceMonitoringService.recordApiPerformance(
          url,
          options.method || 'GET',
          startTime,
          endTime,
          success,
          error,
          this.estimateResponseSize(result)
        );
      }
    }

    return result;
  }

  /**
   * Full optimization with all features enabled
   */
  private async fullOptimizedRequest<T>(
    url: string,
    options: RequestInit,
    config: {
      cacheType: string;
      deduplicationMaxAge: number;
      timeout: number;
      retries: number;
    }
  ): Promise<T> {
    const requestKey = requestDeduplicationService.generateRequestKey(
      url,
      options.method,
      options.body
    );

    return requestDeduplicationService.deduplicatedRequest(
      requestKey,
      async () => {
        const optimizedOptions = await compressionOptimizationService.optimizeRequest(url, options);
        return performanceOptimizationService.optimizedRequest<T>(
          url,
          optimizedOptions,
          config.cacheType as any
        );
      },
      config.deduplicationMaxAge
    );
  }

  /**
   * Preload critical resources
   */
  async preloadCriticalResources(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(url =>
      this.optimizedRequest(url, { method: 'GET' }, {
        enableCaching: true,
        enableDeduplication: false,
        enableCompression: true,
        enableMonitoring: false,
        cacheType: 'static'
      }).catch(error => {
        console.warn(`Preload failed for ${url}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): PerformanceReport {
    const optimizationMetrics = performanceOptimizationService.getPerformanceMetrics();
    const monitoringReport = performanceMonitoringService.generateReport();
    const deduplicationMetrics = requestDeduplicationService.getMetrics();
    const compressionMetrics = compressionOptimizationService.getCompressionMetrics();

    const summary = {
      totalRequests: this.requestCount,
      cacheHitRate: optimizationMetrics.cacheHitRate,
      deduplicationSavings: deduplicationMetrics.savingsPercentage,
      compressionRatio: compressionMetrics.compressionRatio,
      averageResponseTime: optimizationMetrics.averageResponseTime,
      errorRate: optimizationMetrics.errorRate
    };

    const recommendations = this.generateIntegratedRecommendations({
      optimization: optimizationMetrics,
      monitoring: monitoringReport,
      deduplication: deduplicationMetrics,
      compression: compressionMetrics
    });

    return {
      timestamp: new Date().toISOString(),
      summary,
      detailed: {
        optimization: optimizationMetrics,
        monitoring: monitoringReport,
        deduplication: deduplicationMetrics,
        compression: compressionMetrics
      },
      recommendations
    };
  }

  /**
   * Generate integrated performance recommendations
   */
  private generateIntegratedRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    // Cache performance
    if (metrics.optimization.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - consider increasing TTL values or improving cache key generation');
    }

    // Response time
    if (metrics.optimization.averageResponseTime > 2000) {
      recommendations.push('High response times - enable compression and request deduplication');
    }

    // Deduplication
    if (metrics.deduplication.savingsPercentage < 10) {
      recommendations.push('Low deduplication savings - review request patterns for optimization opportunities');
    }

    // Compression
    if (metrics.compression.compressionRatio < 20) {
      recommendations.push('Low compression ratio - ensure server supports compression and optimize payload sizes');
    }

    // Error rate
    if (metrics.optimization.errorRate > 5) {
      recommendations.push('High error rate - implement better retry logic and fallback mechanisms');
    }

    // Web Vitals
    if (metrics.monitoring.pageLoad.firstContentfulPaint > 1800) {
      recommendations.push('Slow First Contentful Paint - optimize critical resource loading');
    }

    if (metrics.monitoring.pageLoad.largestContentfulPaint > 2500) {
      recommendations.push('Slow Largest Contentful Paint - optimize main content delivery');
    }

    // Memory usage
    if (metrics.monitoring.userExperience.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage - review cache sizes and cleanup strategies');
    }

    return recommendations;
  }

  /**
   * Optimize configuration based on current metrics
   */
  getOptimalConfiguration(): IntegratedRequestConfig {
    const report = this.getPerformanceReport();
    const config: IntegratedRequestConfig = {
      enableCaching: true,
      enableDeduplication: true,
      enableCompression: true,
      enableMonitoring: true
    };

    // Adjust based on performance metrics
    if (report.summary.cacheHitRate > 80) {
      // High cache hit rate, can be more aggressive
      config.cacheType = 'static';
    } else if (report.summary.cacheHitRate < 30) {
      // Low cache hit rate, use shorter TTL
      config.cacheType = 'feed';
    }

    if (report.summary.deduplicationSavings < 5) {
      // Low deduplication benefit, consider disabling
      config.enableDeduplication = false;
    }

    if (report.summary.compressionRatio < 10) {
      // Low compression benefit, consider disabling
      config.enableCompression = false;
    }

    return config;
  }

  /**
   * Clear all performance data
   */
  clearAllData(): void {
    performanceOptimizationService.clearCache();
    performanceMonitoringService.clearData();
    requestDeduplicationService.resetMetrics();
    compressionOptimizationService.resetMetrics();
    this.requestCount = 0;
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): any {
    return {
      report: this.getPerformanceReport(),
      cacheStats: performanceOptimizationService.getCacheStatistics(),
      webVitals: performanceMonitoringService.getWebVitals(),
      deduplicationInfo: requestDeduplicationService.getPendingRequestsInfo(),
      compressionSupport: compressionOptimizationService.getCompressionSupport()
    };
  }

  /**
   * Estimate response size for monitoring
   */
  private estimateResponseSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Get current request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const performanceIntegrationService = new PerformanceIntegrationService();

// Convenience function for optimized API requests
export const integratedApiRequest = <T>(
  url: string,
  options?: RequestInit,
  config?: IntegratedRequestConfig
): Promise<T> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  return performanceIntegrationService.optimizedRequest<T>(fullUrl, options, config);
};

export default performanceIntegrationService;