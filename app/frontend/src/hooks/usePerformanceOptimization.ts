/**
 * React hook for performance optimization with graceful degradation
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  performanceOptimizer, 
  LoadingState, 
  FallbackMechanism, 
  PerformanceMetrics 
} from '../services/performanceOptimizer';
import { NetworkCondition } from '../services/networkConditionDetector';

interface UsePerformanceOptimizationOptions {
  componentKey: string;
  enableAutoOptimization?: boolean;
  enableLoadingStates?: boolean;
  enableFallbacks?: boolean;
}

interface PerformanceOptimizationHook {
  // Network condition
  networkCondition: NetworkCondition | null;
  
  // Loading states
  loadingState: LoadingState | null;
  setLoadingState: (state: Partial<LoadingState>) => void;
  clearLoadingState: () => void;
  
  // Optimized request
  optimizeRequest: <T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      cacheTTL?: number;
      fallbackData?: T;
      enableBatching?: boolean;
    }
  ) => Promise<T>;
  
  // Performance metrics
  performanceMetrics: PerformanceMetrics;
  recordPerformanceMetric: (type: 'render' | 'request' | 'memory', value: number) => void;
  
  // Optimization settings
  optimizedSettings: {
    imageQuality: number;
    enableAnimations: boolean;
    updateInterval: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
    enableOfflineCache: boolean;
  };
  
  // Feature flags
  shouldEnableFeature: (feature: 'animations' | 'realtime_updates' | 'image_preload' | 'auto_refresh') => boolean;
  getOptimizedUpdateInterval: (baseInterval: number) => number;
  
  // Fallback mechanisms
  fallbackMechanism: FallbackMechanism | null;
  
  // Cache management
  clearCache: (pattern?: string) => void;
  getCacheStats: () => {
    size: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  };
}

export const usePerformanceOptimization = (
  options: UsePerformanceOptimizationOptions
): PerformanceOptimizationHook => {
  const {
    componentKey,
    enableAutoOptimization = true,
    enableLoadingStates = true,
    enableFallbacks = true
  } = options;

  // State management
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition | null>(null);
  const [loadingState, setLoadingStateInternal] = useState<LoadingState | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>(
    performanceOptimizer.getPerformanceMetrics()
  );
  const [optimizedSettings, setOptimizedSettings] = useState(
    performanceOptimizer.getOptimizedSettings()
  );
  const [fallbackMechanism, setFallbackMechanism] = useState<FallbackMechanism | null>(null);

  // Refs for cleanup
  const listenersRef = useRef<Map<string, Function>>(new Map());
  const isInitializedRef = useRef(false);

  // Handle network condition changes
  const handleNetworkConditionChange = useCallback((condition: NetworkCondition) => {
    setNetworkCondition(condition);
    setOptimizedSettings(performanceOptimizer.getOptimizedSettings());
  }, []);

  // Handle loading state changes
  const handleLoadingStateChange = useCallback((data: { key: string; state: LoadingState }) => {
    if (data.key === componentKey) {
      setLoadingStateInternal(data.state);
    }
  }, [componentKey]);

  // Handle loading state cleared
  const handleLoadingStateCleared = useCallback((data: { key: string }) => {
    if (data.key === componentKey) {
      setLoadingStateInternal(null);
    }
  }, [componentKey]);

  // Handle fallback activation
  const handleFallbackActivated = useCallback((data: { key: string; mechanism: FallbackMechanism }) => {
    if (data.key === componentKey) {
      setFallbackMechanism(data.mechanism);
    }
  }, [componentKey]);

  // Loading state management
  const setLoadingState = useCallback((state: Partial<LoadingState>) => {
    if (!enableLoadingStates) return;
    performanceOptimizer.setLoadingState(componentKey, state);
  }, [componentKey, enableLoadingStates]);

  const clearLoadingState = useCallback(() => {
    if (!enableLoadingStates) return;
    performanceOptimizer.clearLoadingState(componentKey);
  }, [componentKey, enableLoadingStates]);

  // Optimized request
  const optimizeRequest = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>,
    requestOptions: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      cacheTTL?: number;
      fallbackData?: T;
      enableBatching?: boolean;
    } = {}
  ): Promise<T> => {
    const fullKey = `${componentKey}_${key}`;
    
    try {
      const result = await performanceOptimizer.optimizeRequest(
        fullKey,
        requestFn,
        requestOptions
      );
      
      // Clear any existing fallback
      setFallbackMechanism(null);
      
      return result;
    } catch (error) {
      // Fallback will be handled by the optimizer if enabled
      throw error;
    }
  }, [componentKey]);

  // Performance metrics
  const recordPerformanceMetric = useCallback((
    type: 'render' | 'request' | 'memory',
    value: number
  ) => {
    performanceOptimizer.recordPerformanceMetric(type, value);
    setPerformanceMetrics(performanceOptimizer.getPerformanceMetrics());
  }, []);

  // Feature flags
  const shouldEnableFeature = useCallback((
    feature: 'animations' | 'realtime_updates' | 'image_preload' | 'auto_refresh'
  ): boolean => {
    return performanceOptimizer.shouldEnableFeature(feature);
  }, []);

  const getOptimizedUpdateInterval = useCallback((baseInterval: number): number => {
    return performanceOptimizer.getOptimizedUpdateInterval(baseInterval);
  }, []);

  // Cache management
  const clearCache = useCallback((pattern?: string) => {
    performanceOptimizer.clearCache(pattern);
  }, []);

  const getCacheStats = useCallback(() => {
    return performanceOptimizer.getCacheStats();
  }, []);

  // Initialize and set up event listeners
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Start performance optimizer if auto-optimization is enabled
    if (enableAutoOptimization) {
      performanceOptimizer.start();
    }

    // Set up event listeners
    const listeners = new Map<string, Function>();
    
    listeners.set('network_condition_changed', handleNetworkConditionChange);
    listeners.set('loading_state_changed', handleLoadingStateChange);
    listeners.set('loading_state_cleared', handleLoadingStateCleared);
    
    if (enableFallbacks) {
      listeners.set('fallback_activated', handleFallbackActivated);
    }

    // Register listeners
    listeners.forEach((callback, event) => {
      performanceOptimizer.on(event, callback);
    });

    listenersRef.current = listeners;

    // Get initial states
    setNetworkCondition(performanceOptimizer.getPerformanceMetrics().timestamp ? 
      { type: 'fast', effectiveType: '4g', downlink: 10, rtt: 100, saveData: false, timestamp: new Date() } : 
      null
    );
    setOptimizedSettings(performanceOptimizer.getOptimizedSettings());
    setPerformanceMetrics(performanceOptimizer.getPerformanceMetrics());
    
    if (enableLoadingStates) {
      const existingLoadingState = performanceOptimizer.getLoadingState(componentKey);
      if (existingLoadingState) {
        setLoadingStateInternal(existingLoadingState);
      }
    }

    // Cleanup on unmount
    return () => {
      listeners.forEach((callback, event) => {
        performanceOptimizer.off(event, callback);
      });
      
      // Clear loading state on unmount
      if (enableLoadingStates) {
        performanceOptimizer.clearLoadingState(componentKey);
      }
    };
  }, [
    componentKey,
    enableAutoOptimization,
    enableLoadingStates,
    enableFallbacks,
    handleNetworkConditionChange,
    handleLoadingStateChange,
    handleLoadingStateCleared,
    handleFallbackActivated
  ]);

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceMetrics(performanceOptimizer.getPerformanceMetrics());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    networkCondition,
    loadingState,
    setLoadingState,
    clearLoadingState,
    optimizeRequest,
    performanceMetrics,
    recordPerformanceMetric,
    optimizedSettings,
    shouldEnableFeature,
    getOptimizedUpdateInterval,
    fallbackMechanism,
    clearCache,
    getCacheStats
  };
};

// Specialized hooks for common use cases
export const useOptimizedDataFetching = (componentKey: string) => {
  const optimization = usePerformanceOptimization({
    componentKey,
    enableAutoOptimization: true,
    enableLoadingStates: true,
    enableFallbacks: true
  });

  const fetchData = useCallback(async <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      fallbackData?: T;
      showLoading?: boolean;
    } = {}
  ): Promise<T> => {
    const { priority = 'medium', fallbackData, showLoading = true } = options;

    if (showLoading) {
      optimization.setLoadingState({
        isLoading: true,
        progress: 0,
        message: 'Loading data...'
      });
    }

    try {
      const result = await optimization.optimizeRequest(key, fetchFn, {
        priority,
        fallbackData,
        cacheTTL: 30000 // 30 seconds default cache
      });

      if (showLoading) {
        optimization.clearLoadingState();
      }

      return result;
    } catch (error) {
      if (showLoading) {
        optimization.clearLoadingState();
      }
      throw error;
    }
  }, [optimization]);

  return {
    ...optimization,
    fetchData
  };
};

export const useOptimizedRealTimeUpdates = (componentKey: string, baseInterval: number = 10000) => {
  const optimization = usePerformanceOptimization({
    componentKey,
    enableAutoOptimization: true,
    enableLoadingStates: false,
    enableFallbacks: true
  });

  const [updateInterval, setUpdateInterval] = useState(baseInterval);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Update interval based on network conditions
  useEffect(() => {
    const optimizedInterval = optimization.getOptimizedUpdateInterval(baseInterval);
    setUpdateInterval(optimizedInterval);
    
    const shouldEnable = optimization.shouldEnableFeature('realtime_updates');
    setIsRealTimeEnabled(shouldEnable);
  }, [optimization, baseInterval]);

  return {
    ...optimization,
    updateInterval,
    isRealTimeEnabled,
    shouldUpdate: isRealTimeEnabled && optimization.networkCondition?.type !== 'offline'
  };
};

export const useOptimizedAnimations = (componentKey: string) => {
  const optimization = usePerformanceOptimization({
    componentKey,
    enableAutoOptimization: true,
    enableLoadingStates: false,
    enableFallbacks: false
  });

  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Update animation settings based on network conditions and user preferences
  useEffect(() => {
    const shouldEnable = optimization.shouldEnableFeature('animations');
    setAnimationsEnabled(shouldEnable);
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [optimization]);

  return {
    ...optimization,
    animationsEnabled: animationsEnabled && !reducedMotion,
    reducedMotion,
    shouldAnimate: (priority: 'low' | 'medium' | 'high' = 'medium') => {
      if (reducedMotion) return false;
      if (!animationsEnabled) return priority === 'high';
      return true;
    }
  };
};

export default usePerformanceOptimization;