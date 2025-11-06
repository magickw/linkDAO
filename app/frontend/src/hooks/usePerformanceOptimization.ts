/**
 * Performance Optimization Hook
 * React hook for using performance optimization features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { performanceIntegrationService, integratedApiRequest } from '../services/performanceIntegrationService';

interface UsePerformanceOptimizationOptions {
  enableAutoOptimization?: boolean;
  monitoringInterval?: number;
  reportingEnabled?: boolean;
}

interface PerformanceState {
  isLoading: boolean;
  metrics: any;
  recommendations: string[];
  error: string | null;
}

interface OptimizedRequestOptions {
  enableCaching?: boolean;
  enableDeduplication?: boolean;
  enableCompression?: boolean;
  enableMonitoring?: boolean;
  cacheType?: 'feed' | 'communities' | 'profiles' | 'marketplace' | 'governance' | 'static';
}

export function usePerformanceOptimization(options: UsePerformanceOptimizationOptions = {}) {
  const {
    enableAutoOptimization = true,
    monitoringInterval = 30000, // 30 seconds
    reportingEnabled = true
  } = options;

  const [state, setState] = useState<PerformanceState>({
    isLoading: false,
    metrics: null,
    recommendations: [],
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Load performance metrics
  const loadMetrics = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const report = performanceIntegrationService.getPerformanceReport();
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          metrics: report.summary,
          recommendations: report.recommendations
        }));
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load metrics'
        }));
      }
    }
  }, []);

  // Setup monitoring interval
  useEffect(() => {
    if (reportingEnabled) {
      loadMetrics();
      
      if (monitoringInterval > 0) {
        intervalRef.current = setInterval(loadMetrics, monitoringInterval);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadMetrics, monitoringInterval, reportingEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Optimized API request function
  const optimizedRequest = useCallback(async <T>(
    url: string,
    options: RequestInit = {},
    requestOptions: OptimizedRequestOptions = {}
  ): Promise<T> => {
    const config = enableAutoOptimization 
      ? performanceIntegrationService.getOptimalConfiguration()
      : {
          enableCaching: true,
          enableDeduplication: true,
          enableCompression: true,
          enableMonitoring: true,
          ...requestOptions
        };

    return integratedApiRequest<T>(url, options, config);
  }, [enableAutoOptimization]);

  // Preload critical resources
  const preloadResources = useCallback(async (urls: string[]) => {
    try {
      await performanceIntegrationService.preloadCriticalResources(urls);
      if (reportingEnabled) {
        loadMetrics(); // Refresh metrics after preloading
      }
    } catch (error) {
      console.warn('Resource preloading failed:', error);
    }
  }, [loadMetrics, reportingEnabled]);

  // Clear performance data
  const clearData = useCallback(() => {
    performanceIntegrationService.clearAllData();
    if (reportingEnabled) {
      loadMetrics();
    }
  }, [loadMetrics, reportingEnabled]);

  // Get detailed performance report
  const getDetailedReport = useCallback(() => {
    return performanceIntegrationService.getPerformanceReport();
  }, []);

  // Export performance data
  const exportData = useCallback(() => {
    return performanceIntegrationService.exportPerformanceData();
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    optimizedRequest,
    preloadResources,
    clearData,
    loadMetrics,
    getDetailedReport,
    exportData,
    
    // Utilities
    isServiceInitialized: performanceIntegrationService.isServiceInitialized(),
    requestCount: performanceIntegrationService.getRequestCount()
  };
}

/**
 * Hook for caching specific data with performance optimization
 */
export function useOptimizedCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    cacheType?: 'feed' | 'communities' | 'profiles' | 'marketplace' | 'governance' | 'static';
    enableDeduplication?: boolean;
  } = {}
) {
  const {
    ttl = 60000, // 1 minute default
    cacheType = 'feed',
    enableDeduplication = true
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchData = useCallback(async (force = false) => {
    // Check if we need to fetch (TTL check)
    if (!force && data && Date.now() - lastFetch < ttl) {
      return data;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      setLastFetch(Date.now());
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fetch failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [data, fetchFn, lastFetch, ttl]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const invalidate = useCallback(() => {
    setData(null);
    setLastFetch(0);
  }, []);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    fetchData,
    invalidate,
    refresh,
    isStale: data && Date.now() - lastFetch > ttl,
    age: data ? Date.now() - lastFetch : 0
  };
}

/**
 * Hook for monitoring component performance
 */
export function useComponentPerformance(componentName: string) {
  const renderStartTime = useRef<number>(performance.now());
  const mountTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    renderCount.current++;

    // Record mount performance
    performanceIntegrationService.optimizedRequest('/api/performance/component', {
      method: 'POST',
      body: JSON.stringify({
        component: componentName,
        event: 'mount',
        duration: mountTime.current - renderStartTime.current,
        renderCount: renderCount.current
      })
    }, {
      enableCaching: false,
      enableDeduplication: false,
      enableCompression: true,
      enableMonitoring: false
    }).catch(() => {
      // Silently fail for performance tracking
    });

    return () => {
      // Record unmount
      const unmountTime = performance.now();
      performanceIntegrationService.optimizedRequest('/api/performance/component', {
        method: 'POST',
        body: JSON.stringify({
          component: componentName,
          event: 'unmount',
          duration: unmountTime - mountTime.current,
          renderCount: renderCount.current
        })
      }, {
        enableCaching: false,
        enableDeduplication: false,
        enableCompression: true,
        enableMonitoring: false
      }).catch(() => {
        // Silently fail for performance tracking
      });
    };
  }, [componentName]);

  // Update render count on each render
  useEffect(() => {
    renderCount.current++;
  });

  const recordCustomEvent = useCallback((eventName: string, duration?: number) => {
    performanceIntegrationService.optimizedRequest('/api/performance/component', {
      method: 'POST',
      body: JSON.stringify({
        component: componentName,
        event: eventName,
        duration: duration || 0,
        renderCount: renderCount.current
      })
    }, {
      enableCaching: false,
      enableDeduplication: false,
      enableCompression: true,
      enableMonitoring: false
    }).catch(() => {
      // Silently fail for performance tracking
    });
  }, [componentName]);

  return {
    renderCount: renderCount.current,
    recordCustomEvent
  };
}

export default usePerformanceOptimization;