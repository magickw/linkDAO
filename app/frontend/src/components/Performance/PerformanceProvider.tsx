import React, { ReactNode } from 'react';
import VirtualScrollManager from './VirtualScrollManager';
import ProgressiveLoader from './ProgressiveLoader';
import OfflineCacheManager from './OfflineCacheManager';
import IntelligentLazyLoader from './IntelligentLazyLoader';
import ContentPreloader from './ContentPreloader';
import PerformanceOptimizer from './PerformanceOptimizer';
import OfflineSyncManager from './OfflineSyncManager';
import { PerformanceConfig, DEFAULT_PERFORMANCE_CONFIG } from './index';

interface PerformanceProviderProps {
  children: ReactNode;
  config?: Partial<PerformanceConfig>;
  enableDevTools?: boolean;
}

export function PerformanceProvider({
  children,
  config = {},
  enableDevTools = process.env.NODE_ENV === 'development'
}: PerformanceProviderProps) {
  const finalConfig = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };

  return (
    <PerformanceOptimizer
      config={finalConfig.performanceOptimization}
      onMetricsUpdate={(metrics) => {
        if (enableDevTools) {
          console.log('Performance Metrics:', metrics);
        }
      }}
      onOptimizationApplied={(optimization) => {
        if (enableDevTools) {
          console.log('Optimization Applied:', optimization);
        }
      }}
    >
      <OfflineSyncManager
        syncInterval={finalConfig.offlineSync.syncInterval}
        maxRetries={finalConfig.offlineSync.maxRetries}
        batchSize={finalConfig.offlineSync.batchSize}
        enableBackgroundSync={finalConfig.offlineSync.enabled}
      >
        <OfflineCacheManager
          maxCacheSize={finalConfig.offlineCache.maxCacheSize}
          defaultTTL={finalConfig.offlineCache.defaultTTL}
          enableCompression={finalConfig.offlineCache.enableCompression}
        >
          <ContentPreloader
            config={{
              enableRoutePreloading: finalConfig.contentPreloading.enableRoutePreloading,
              enableImagePreloading: finalConfig.contentPreloading.enabled,
              enableDataPreloading: finalConfig.contentPreloading.enabled,
              preloadDistance: finalConfig.contentPreloading.preloadDistance,
              maxConcurrentPreloads: finalConfig.contentPreloading.maxConcurrentPreloads
            }}
            onPreloadComplete={(item) => {
              if (enableDevTools) {
                console.log('Preload Complete:', item);
              }
            }}
            onPreloadError={(item, error) => {
              if (enableDevTools) {
                console.warn('Preload Error:', item, error);
              }
            }}
          />
          {children}
        </OfflineCacheManager>
      </OfflineSyncManager>
    </PerformanceOptimizer>
  );
}

export default PerformanceProvider;