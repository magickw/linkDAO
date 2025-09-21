// Performance Optimization Components
export { default as VirtualScrollManager, useVirtualScroll } from './VirtualScrollManager';
export { default as ProgressiveLoader, ProgressiveImage, useProgressiveLoading } from './ProgressiveLoader';
export { default as OfflineCacheManager, useOfflineCache, useCachedAPI } from './OfflineCacheManager';
export { default as IntelligentLazyLoader, IntelligentLazyImage, useLazyLoading } from './IntelligentLazyLoader';
export { default as ContentPreloader, usePreloadedContent, useHoverPreload, PreloadResource } from './ContentPreloader';
export { default as PerformanceOptimizer, usePerformanceOptimization } from './PerformanceOptimizer';
export { default as OfflineSyncManager, useOfflineSync, useOfflineAction } from './OfflineSyncManager';
export { default as PerformanceProvider } from './PerformanceProvider';

// Performance optimization configuration
export interface PerformanceConfig {
  virtualScrolling: {
    enabled: boolean;
    itemHeight: number;
    bufferSize: number;
    targetFPS: number;
  };
  progressiveLoading: {
    enabled: boolean;
    enableBlurTransition: boolean;
    timeout: number;
    retryAttempts: number;
  };
  offlineCache: {
    enabled: boolean;
    maxCacheSize: number;
    defaultTTL: number;
    enableCompression: boolean;
  };
  lazyLoading: {
    enabled: boolean;
    rootMargin: string;
    threshold: number;
    enablePreloading: boolean;
  };
  contentPreloading: {
    enabled: boolean;
    preloadDistance: number;
    maxConcurrentPreloads: number;
    enableRoutePreloading: boolean;
  };
  performanceOptimization: {
    enabled: boolean;
    targetFPS: number;
    memoryThreshold: number;
    adaptiveOptimization: boolean;
  };
  offlineSync: {
    enabled: boolean;
    syncInterval: number;
    maxRetries: number;
    batchSize: number;
  };
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  virtualScrolling: {
    enabled: true,
    itemHeight: 100,
    bufferSize: 5,
    targetFPS: 60
  },
  progressiveLoading: {
    enabled: true,
    enableBlurTransition: true,
    timeout: 10000,
    retryAttempts: 3
  },
  offlineCache: {
    enabled: true,
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    enableCompression: true
  },
  lazyLoading: {
    enabled: true,
    rootMargin: '50px',
    threshold: 0.1,
    enablePreloading: true
  },
  contentPreloading: {
    enabled: true,
    preloadDistance: 1000,
    maxConcurrentPreloads: 3,
    enableRoutePreloading: true
  },
  performanceOptimization: {
    enabled: true,
    targetFPS: 60,
    memoryThreshold: 100, // 100MB
    adaptiveOptimization: true
  },
  offlineSync: {
    enabled: true,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
    batchSize: 5
  }
};