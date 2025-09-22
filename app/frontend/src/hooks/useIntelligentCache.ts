/**
 * React Hook for Intelligent Caching
 * Provides easy integration with the intelligent caching system
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { intelligentCacheIntegration } from '../services/intelligentCacheIntegration';

interface CacheHookOptions {
  enableBehaviorTracking?: boolean;
  enablePreloading?: boolean;
  enableImageOptimization?: boolean;
  trackUserActions?: boolean;
}

interface CacheMetrics {
  hitRate: number;
  memoryUsage: number;
  networkSavings: number;
  isOnline: boolean;
  offlineActionsCount: number;
}

/**
 * Hook for intelligent caching functionality
 */
export const useIntelligentCache = (options: CacheHookOptions = {}) => {
  const {
    enableBehaviorTracking = true,
    enablePreloading = true,
    enableImageOptimization = true,
    trackUserActions = true
  } = options;

  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>({
    hitRate: 0,
    memoryUsage: 0,
    networkSavings: 0,
    isOnline: navigator.onLine,
    offlineActionsCount: 0
  });

  const [isReady, setIsReady] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Initialize cache system
  useEffect(() => {
    const checkReady = () => {
      if (intelligentCacheIntegration.isReady()) {
        setIsReady(true);
      } else {
        setTimeout(checkReady, 100);
      }
    };
    
    checkReady();
  }, []);

  // Setup network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setCacheMetrics(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setCacheMetrics(prev => ({ ...prev, isOnline: false }));
    };

    const handleNetworkStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setCacheMetrics(prev => ({ 
        ...prev, 
        isOnline: customEvent.detail.online 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('network-status-changed', handleNetworkStatusChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('network-status-changed', handleNetworkStatusChange);
    };
  }, []);

  // Update cache metrics periodically
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const metrics = intelligentCacheIntegration.getPerformanceMetrics();
        setCacheMetrics(prev => ({
          ...prev,
          hitRate: metrics.totalCacheHits / (metrics.totalCacheHits + metrics.totalCacheMisses) || 0,
          memoryUsage: metrics.memoryUsage,
          networkSavings: metrics.networkSavings
        }));
      } catch (error) {
        console.warn('Failed to update cache metrics:', error);
      }
    };

    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [isReady]);

  /**
   * Track user behavior for predictive preloading
   */
  const trackUserBehavior = useCallback((action: string, target: string) => {
    if (!enableBehaviorTracking || !isReady || !userIdRef.current) {
      return;
    }

    intelligentCacheIntegration.analyzeUserBehavior(userIdRef.current, action, target);
  }, [enableBehaviorTracking, isReady]);

  /**
   * Optimize community icon
   */
  const optimizeCommunityIcon = useCallback(async (communityId: string, iconUrl: string) => {
    if (!enableImageOptimization || !isReady) {
      return iconUrl;
    }

    try {
      return await intelligentCacheIntegration.optimizeCommunityIcon(communityId, iconUrl);
    } catch (error) {
      console.warn('Failed to optimize community icon:', error);
      return iconUrl;
    }
  }, [enableImageOptimization, isReady]);

  /**
   * Setup lazy loading for an image
   */
  const setupImageLazyLoading = useCallback((
    img: HTMLImageElement, 
    communityId: string, 
    iconUrl: string
  ) => {
    if (!enableImageOptimization || !isReady) {
      img.src = iconUrl;
      return;
    }

    intelligentCacheIntegration.setupCommunityIconLazyLoading(img, communityId, iconUrl);
  }, [enableImageOptimization, isReady]);

  /**
   * Batch preload community icons
   */
  const batchPreloadIcons = useCallback(async (
    communities: Array<{ id: string; iconUrl: string }>
  ) => {
    if (!enablePreloading || !isReady) {
      return;
    }

    try {
      await intelligentCacheIntegration.batchPreloadCommunityIcons(communities);
    } catch (error) {
      console.warn('Failed to batch preload icons:', error);
    }
  }, [enablePreloading, isReady]);

  /**
   * Cache preview content
   */
  const cachePreviewContent = useCallback(async (
    url: string, 
    type: 'nft' | 'proposal' | 'defi' | 'link'
  ) => {
    if (!isReady) {
      return null;
    }

    try {
      return await intelligentCacheIntegration.cachePreviewContent(url, type);
    } catch (error) {
      console.warn('Failed to cache preview content:', error);
      return null;
    }
  }, [isReady]);

  /**
   * Queue offline action
   */
  const queueOfflineAction = useCallback(async (type: string, data: any) => {
    if (!isReady) {
      throw new Error('Cache system not ready');
    }

    try {
      await intelligentCacheIntegration.queueOfflineAction(type, data);
      
      // Update offline actions count
      setCacheMetrics(prev => ({
        ...prev,
        offlineActionsCount: prev.offlineActionsCount + 1
      }));
    } catch (error) {
      console.warn('Failed to queue offline action:', error);
      throw error;
    }
  }, [isReady]);

  /**
   * Clear all caches
   */
  const clearAllCaches = useCallback(async () => {
    if (!isReady) {
      return;
    }

    try {
      await intelligentCacheIntegration.clearAllCaches();
      setCacheMetrics(prev => ({
        ...prev,
        hitRate: 0,
        memoryUsage: 0,
        networkSavings: 0
      }));
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }, [isReady]);

  /**
   * Set current user ID for behavior tracking
   */
  const setUserId = useCallback((userId: string) => {
    userIdRef.current = userId;
  }, []);

  /**
   * Track specific user actions
   */
  const trackAction = useCallback((action: string, target: string) => {
    if (trackUserActions) {
      trackUserBehavior(action, target);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('user-action', {
        detail: { action, target }
      }));
    }
  }, [trackUserActions, trackUserBehavior]);

  return {
    // State
    isReady,
    cacheMetrics,
    
    // Actions
    trackUserBehavior,
    optimizeCommunityIcon,
    setupImageLazyLoading,
    batchPreloadIcons,
    cachePreviewContent,
    queueOfflineAction,
    clearAllCaches,
    setUserId,
    trackAction,
    
    // Utilities
    isOnline: cacheMetrics.isOnline,
    hasOfflineActions: cacheMetrics.offlineActionsCount > 0
  };
};

/**
 * Hook for community icon optimization
 */
export const useCommunityIconOptimization = (communityId: string, iconUrl: string) => {
  const [optimizedUrl, setOptimizedUrl] = useState<string>(iconUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { optimizeCommunityIcon, isReady } = useIntelligentCache({
    enableImageOptimization: true
  });

  useEffect(() => {
    if (!isReady || !iconUrl) {
      return;
    }

    const optimizeIcon = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const optimized = await optimizeCommunityIcon(communityId, iconUrl);
        setOptimizedUrl(optimized);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Optimization failed');
        setOptimizedUrl(iconUrl); // Fallback to original
      } finally {
        setIsLoading(false);
      }
    };

    optimizeIcon();
  }, [communityId, iconUrl, isReady, optimizeCommunityIcon]);

  return {
    optimizedUrl,
    isLoading,
    error,
    originalUrl: iconUrl
  };
};

/**
 * Hook for lazy loading images
 */
export const useLazyImage = (src: string, options: { 
  communityId?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
} = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const { setupImageLazyLoading, isReady } = useIntelligentCache({
    enableImageOptimization: true
  });

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !isReady || !src) {
      return;
    }

    const handleLoad = () => {
      setIsLoaded(true);
      setHasError(false);
      options.onLoad?.();
    };

    const handleError = () => {
      setHasError(true);
      setIsLoaded(false);
      options.onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    // Setup lazy loading
    if (options.communityId) {
      setupImageLazyLoading(img, options.communityId, src);
    } else {
      img.src = src;
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, isReady, options.communityId, setupImageLazyLoading, options.onLoad, options.onError]);

  return {
    imgRef,
    isLoaded,
    hasError,
    src: hasError && options.placeholder ? options.placeholder : src
  };
};

/**
 * Hook for offline action management
 */
export const useOfflineActions = () => {
  const [offlineActions, setOfflineActions] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { queueOfflineAction, isOnline, hasOfflineActions } = useIntelligentCache();

  // Listen for offline action events
  useEffect(() => {
    const handleOfflineActionQueued = (event: Event) => {
      const customEvent = event as CustomEvent;
      setOfflineActions(prev => [...prev, customEvent.detail]);
    };

    const handleOfflineActionSynced = (event: Event) => {
      const customEvent = event as CustomEvent;
      setOfflineActions(prev => 
        prev.filter(action => action.id !== customEvent.detail.id)
      );
    };

    window.addEventListener('offline-action-queued', handleOfflineActionQueued);
    window.addEventListener('offline-action-synced', handleOfflineActionSynced);

    return () => {
      window.removeEventListener('offline-action-queued', handleOfflineActionQueued);
      window.removeEventListener('offline-action-synced', handleOfflineActionSynced);
    };
  }, []);

  const addOfflineAction = useCallback(async (type: string, data: any) => {
    try {
      await queueOfflineAction(type, data);
    } catch (error) {
      console.warn('Failed to queue offline action:', error);
      throw error;
    }
  }, [queueOfflineAction]);

  return {
    offlineActions,
    isSyncing,
    isOnline,
    hasOfflineActions,
    addOfflineAction
  };
};

export default useIntelligentCache;