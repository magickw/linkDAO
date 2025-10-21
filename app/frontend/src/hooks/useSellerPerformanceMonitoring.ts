import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sellerPerformanceMonitoringService } from '../services/sellerPerformanceMonitoringService';
import type { 
  PerformanceDashboardData,
  PerformanceAlert,
  PerformanceTestResult
} from '../services/sellerPerformanceMonitoringService';

interface UseSellerPerformanceMonitoringOptions {
  sellerId: string;
  autoStart?: boolean;
  refreshInterval?: number;
  enableRealTimeAlerts?: boolean;
}

interface UseSellerPerformanceMonitoringReturn {
  // Data
  dashboardData: PerformanceDashboardData | null;
  alerts: PerformanceAlert[];
  testResults: PerformanceTestResult[];
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  runningTest: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  refreshData: () => Promise<void>;
  runRegressionTest: (testType?: 'load' | 'stress' | 'endurance' | 'spike' | 'volume') => Promise<PerformanceTestResult | null>;
  trackComponentPerformance: (componentName: string, loadTime: number, metadata?: any) => void;
  trackAPIPerformance: (endpoint: string, responseTime: number, success: boolean, errorType?: string) => void;
  trackCachePerformance: (operation: 'hit' | 'miss' | 'invalidation', retrievalTime?: number) => void;
  trackMobilePerformance: (metric: 'touch' | 'scroll' | 'gesture' | 'battery', value: number) => void;
  trackRealTimePerformance: (metric: 'connection' | 'message' | 'update' | 'stability', value: number) => void;
  
  // Alert management
  subscribeToAlerts: (callback: (alert: PerformanceAlert) => void) => void;
  unsubscribeFromAlerts: () => void;
  
  // Utilities
  isMonitoring: boolean;
  lastUpdated: Date | null;
}

export const useSellerPerformanceMonitoring = ({
  sellerId,
  autoStart = true,
  refreshInterval = 30000, // 30 seconds
  enableRealTimeAlerts = true
}: UseSellerPerformanceMonitoringOptions): UseSellerPerformanceMonitoringReturn => {
  // State
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertCallbackRef = useRef<((alert: PerformanceAlert) => void) | null>(null);

  // Start monitoring
  const startMonitoring = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Start the monitoring service
      await sellerPerformanceMonitoringService.startMonitoring(sellerId);
      setIsMonitoring(true);

      // Load initial data
      await loadDashboardData();

      // Set up refresh interval
      if (refreshInterval > 0) {
        refreshIntervalRef.current = setInterval(loadDashboardData, refreshInterval);
      }

      // Subscribe to real-time alerts if enabled
      if (enableRealTimeAlerts) {
        sellerPerformanceMonitoringService.subscribeToAlerts(sellerId, handleAlertReceived);
      }

    } catch (err) {
      console.error('Error starting performance monitoring:', err);
      setError('Failed to start performance monitoring');
    } finally {
      setLoading(false);
    }
  }, [sellerId, refreshInterval, enableRealTimeAlerts]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    // Stop the monitoring service
    sellerPerformanceMonitoringService.stopMonitoring(sellerId);
    setIsMonitoring(false);

    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    // Unsubscribe from alerts
    sellerPerformanceMonitoringService.unsubscribeFromAlerts(sellerId);
  }, [sellerId]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const data = await sellerPerformanceMonitoringService.getPerformanceDashboard(sellerId);
      setDashboardData(data);
      setAlerts(data.alerts);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load performance data');
    }
  }, [sellerId]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  // Run regression test
  const runRegressionTest = useCallback(async (
    testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume' = 'load'
  ): Promise<PerformanceTestResult | null> => {
    try {
      setRunningTest(true);
      setError(null);

      const result = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        sellerId,
        testType
      );

      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      return result;

    } catch (err) {
      console.error('Error running regression test:', err);
      setError('Failed to run performance test');
      return null;
    } finally {
      setRunningTest(false);
    }
  }, [sellerId]);

  // Performance tracking methods
  const trackComponentPerformance = useCallback((
    componentName: string,
    loadTime: number,
    metadata?: any
  ) => {
    if (isMonitoring) {
      sellerPerformanceMonitoringService.trackComponentPerformance(
        sellerId,
        componentName,
        loadTime,
        metadata
      );
    }
  }, [sellerId, isMonitoring]);

  const trackAPIPerformance = useCallback((
    endpoint: string,
    responseTime: number,
    success: boolean,
    errorType?: string
  ) => {
    if (isMonitoring) {
      sellerPerformanceMonitoringService.trackAPIPerformance(
        sellerId,
        endpoint,
        responseTime,
        success,
        errorType
      );
    }
  }, [sellerId, isMonitoring]);

  const trackCachePerformance = useCallback((
    operation: 'hit' | 'miss' | 'invalidation',
    retrievalTime?: number
  ) => {
    if (isMonitoring) {
      sellerPerformanceMonitoringService.trackCachePerformance(
        sellerId,
        operation,
        retrievalTime
      );
    }
  }, [sellerId, isMonitoring]);

  const trackMobilePerformance = useCallback((
    metric: 'touch' | 'scroll' | 'gesture' | 'battery',
    value: number
  ) => {
    if (isMonitoring) {
      sellerPerformanceMonitoringService.trackMobilePerformance(
        sellerId,
        metric,
        value
      );
    }
  }, [sellerId, isMonitoring]);

  const trackRealTimePerformance = useCallback((
    metric: 'connection' | 'message' | 'update' | 'stability',
    value: number
  ) => {
    if (isMonitoring) {
      sellerPerformanceMonitoringService.trackRealTimePerformance(
        sellerId,
        metric,
        value
      );
    }
  }, [sellerId, isMonitoring]);

  // Alert management
  const subscribeToAlerts = useCallback((callback: (alert: PerformanceAlert) => void) => {
    alertCallbackRef.current = callback;
  }, []);

  const unsubscribeFromAlerts = useCallback(() => {
    alertCallbackRef.current = null;
  }, []);

  const handleAlertReceived = useCallback((alert: PerformanceAlert) => {
    // Update alerts state
    setAlerts(prev => [alert, ...prev]);

    // Call user callback if provided
    if (alertCallbackRef.current) {
      alertCallbackRef.current(alert);
    }
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && sellerId) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [sellerId, autoStart, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Data
    dashboardData,
    alerts,
    testResults,
    
    // Loading states
    loading,
    refreshing,
    runningTest,
    
    // Error states
    error,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    refreshData,
    runRegressionTest,
    trackComponentPerformance,
    trackAPIPerformance,
    trackCachePerformance,
    trackMobilePerformance,
    trackRealTimePerformance,
    
    // Alert management
    subscribeToAlerts,
    unsubscribeFromAlerts,
    
    // Utilities
    isMonitoring,
    lastUpdated
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceMonitoring = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  const Component = React.forwardRef<any, P & { sellerId?: string }>((props, ref) => {
    const { sellerId, ...otherProps } = props;
    const { trackComponentPerformance } = useSellerPerformanceMonitoring({
      sellerId: sellerId || '',
      autoStart: !!sellerId
    });

    useEffect(() => {
      const startTime = performance.now();

      return () => {
        const loadTime = performance.now() - startTime;
        if (sellerId) {
          trackComponentPerformance(componentName, loadTime);
        }
      };
    }, [sellerId, trackComponentPerformance]);

    return React.createElement(WrappedComponent, { ...(otherProps as P), ref } as any);
  });

  return Component;
};

// Hook for tracking API calls
export const useAPIPerformanceTracking = (sellerId: string) => {
  const { trackAPIPerformance } = useSellerPerformanceMonitoring({
    sellerId,
    autoStart: true
  });

  const trackAPI = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let success = false;
    let errorType: string | undefined;

    try {
      const result = await apiCall();
      success = true;
      return result;
    } catch (error) {
      success = false;
      errorType = error instanceof Error ? error.name : 'UnknownError';
      throw error;
    } finally {
      const responseTime = performance.now() - startTime;
      trackAPIPerformance(endpoint, responseTime, success, errorType);
    }
  }, [trackAPIPerformance]);

  return { trackAPI };
};

export default useSellerPerformanceMonitoring;