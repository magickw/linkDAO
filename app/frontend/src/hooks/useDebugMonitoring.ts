import { useState, useEffect, useCallback, useRef } from 'react';
import { requestInterceptor, connectivityDiagnostics } from '../utils/debugTools';

interface MonitoringState {
  isActive: boolean;
  connectivity: {
    status: 'online' | 'degraded' | 'offline' | 'unknown';
    lastCheck: number | null;
  };
  performance: {
    totalRequests: number;
    recentRequests: number;
    recentErrors: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
  };
  circuitBreakers: Record<string, any>;
  recentRequests: Array<{
    id: string;
    method: string;
    url: string;
    status?: number;
    duration?: number;
    timestamp: string;
  }>;
}

interface UseDebugMonitoringOptions {
  updateInterval?: number;
  autoStart?: boolean;
  enableDashboard?: boolean;
}

export const useDebugMonitoring = (options: UseDebugMonitoringOptions = {}) => {
  const {
    updateInterval = 2000,
    autoStart = true,
    enableDashboard = process.env.NODE_ENV === 'development'
  } = options;

  const [state, setState] = useState<MonitoringState>({
    isActive: false,
    connectivity: {
      status: 'unknown',
      lastCheck: null
    },
    performance: {
      totalRequests: 0,
      recentRequests: 0,
      recentErrors: 0,
      errorRate: 0,
      avgResponseTime: 0,
      uptime: 0
    },
    circuitBreakers: {},
    recentRequests: []
  });

  const [isDashboardVisible, setIsDashboardVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>(Date.now());

  // Update monitoring data
  const updateMonitoringData = useCallback(() => {
    try {
      // Get data from global debug system if available
      const debugSystem = (window as any).debugLinkDAO;
      if (debugSystem?.monitoring) {
        const dashboardData = debugSystem.monitoring.getDashboardData();
        if (dashboardData) {
          setState(prevState => ({
            ...prevState,
            connectivity: dashboardData.connectivity,
            performance: dashboardData.performance,
            circuitBreakers: dashboardData.circuitBreakers,
            recentRequests: dashboardData.recentRequests
          }));
        }
      }

      // Get data from request interceptor
      const requests = requestInterceptor.getRequests();
      const recentRequests = requests.filter(req => 
        Date.now() - req.timestamp < 300000 // Last 5 minutes
      );
      const recentErrors = recentRequests.filter(req => 
        req.error || (req.response?.status && req.response.status >= 400)
      );

      const avgResponseTime = recentRequests.length > 0
        ? recentRequests
            .filter(req => req.response?.duration)
            .reduce((sum, req) => sum + (req.response?.duration || 0), 0) / recentRequests.length
        : 0;

      setState(prevState => ({
        ...prevState,
        performance: {
          totalRequests: requests.length,
          recentRequests: recentRequests.length,
          recentErrors: recentErrors.length,
          errorRate: recentRequests.length > 0 
            ? Math.round((recentErrors.length / recentRequests.length) * 100 * 100) / 100
            : 0,
          avgResponseTime: Math.round(avgResponseTime),
          uptime: Date.now() - startTimeRef.current
        },
        recentRequests: requests.slice(-10).map(req => ({
          id: req.id,
          method: req.method,
          url: req.url,
          status: req.response?.status,
          duration: req.response?.duration,
          timestamp: new Date(req.timestamp).toISOString()
        }))
      }));
    } catch (error) {
      console.error('Failed to update monitoring data:', error);
    }
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (state.isActive) return;

    // Start request interceptor
    requestInterceptor.start();

    // Start connectivity monitoring if available
    const debugSystem = (window as any).debugLinkDAO;
    if (debugSystem?.monitoring?.startConnectivityMonitoring) {
      debugSystem.monitoring.startConnectivityMonitoring();
    }

    // Set up update interval
    intervalRef.current = setInterval(updateMonitoringData, updateInterval);

    setState(prevState => ({
      ...prevState,
      isActive: true
    }));

    console.log('🔍 Debug monitoring started');
  }, [state.isActive, updateMonitoringData, updateInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!state.isActive) return;

    // Stop request interceptor
    requestInterceptor.stop();

    // Stop connectivity monitoring if available
    const debugSystem = (window as any).debugLinkDAO;
    if (debugSystem?.monitoring?.stopConnectivityMonitoring) {
      debugSystem.monitoring.stopConnectivityMonitoring();
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    setState(prevState => ({
      ...prevState,
      isActive: false
    }));

    console.log('🔍 Debug monitoring stopped');
  }, [state.isActive]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (state.isActive) {
      stopMonitoring();
    } else {
      startMonitoring();
    }
  }, [state.isActive, startMonitoring, stopMonitoring]);

  // Run diagnostics
  const runDiagnostics = useCallback(async () => {
    try {
      const results = await connectivityDiagnostics.runDiagnostics();
      
      // Update state after diagnostics
      updateMonitoringData();
      
      return results;
    } catch (error) {
      console.error('Diagnostics failed:', error);
      throw error;
    }
  }, [updateMonitoringData]);

  // Clear request log
  const clearRequestLog = useCallback(() => {
    requestInterceptor.clearHistory();
    
    const debugSystem = (window as any).debugLinkDAO;
    if (debugSystem?.monitoring?.clearRequestLog) {
      debugSystem.monitoring.clearRequestLog();
    }
    
    updateMonitoringData();
  }, [updateMonitoringData]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const debugSystem = (window as any).debugLinkDAO;
    if (debugSystem?.monitoring?.getPerformanceSummary) {
      return debugSystem.monitoring.getPerformanceSummary();
    }
    return state.performance;
  }, [state.performance]);

  // Get connectivity diagnosis
  const diagnoseConnectivity = useCallback(() => {
    const debugSystem = (window as any).debugLinkDAO;
    if (debugSystem?.monitoring?.diagnoseConnectivityIssues) {
      return debugSystem.monitoring.diagnoseConnectivityIssues();
    }
    return null;
  }, []);

  // Dashboard controls
  const showDashboard = useCallback(() => {
    setIsDashboardVisible(true);
  }, []);

  const hideDashboard = useCallback(() => {
    setIsDashboardVisible(false);
  }, []);

  const toggleDashboard = useCallback(() => {
    setIsDashboardVisible(prev => !prev);
  }, []);

  // Auto-start monitoring in development mode
  useEffect(() => {
    if (autoStart && enableDashboard) {
      startMonitoring();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoStart, enableDashboard, startMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // State
    ...state,
    isDashboardVisible,
    
    // Controls
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    
    // Dashboard
    showDashboard,
    hideDashboard,
    toggleDashboard,
    
    // Actions
    runDiagnostics,
    clearRequestLog,
    updateMonitoringData,
    
    // Data getters
    getPerformanceSummary,
    diagnoseConnectivity,
    
    // Utilities
    isEnabled: enableDashboard
  };
};

export default useDebugMonitoring;