/**
 * Marketplace Performance Hook
 * Monitors and optimizes marketplace-specific performance metrics
 */

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/router';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { navigationPreloadService } from '../services/navigationPreloadService';
import { productCache, sellerCache, searchCache } from '../services/marketplaceDataCache';

interface MarketplacePerformanceMetrics {
  pageLoadTime: number;
  imageLoadTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  navigationTime: number;
  renderTime: number;
}

interface PerformanceOptimizations {
  preloadEnabled: boolean;
  cacheEnabled: boolean;
  imageOptimizationEnabled: boolean;
  lazyLoadingEnabled: boolean;
}

export const useMarketplacePerformance = () => {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MarketplacePerformanceMetrics>({
    pageLoadTime: 0,
    imageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    navigationTime: 0,
    renderTime: 0
  });

  const [optimizations, setOptimizations] = useState<PerformanceOptimizations>({
    preloadEnabled: true,
    cacheEnabled: true,
    imageOptimizationEnabled: true,
    lazyLoadingEnabled: true
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  // Track navigation performance
  const trackNavigation = useCallback((url: string) => {
    const startTime = performance.now();
    
    const handleRouteComplete = () => {
      const endTime = performance.now();
      const navigationTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        navigationTime
      }));

      // Remove listener after use
      router.events.off('routeChangeComplete', handleRouteComplete);
    };

    router.events.on('routeChangeComplete', handleRouteComplete);
  }, [router.events]);

  // Track API performance
  const trackApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const apiResponseTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: (prev.apiResponseTime + apiResponseTime) / 2 // Running average
      }));

      return result;
    } catch (error) {
      const endTime = performance.now();
      const apiResponseTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        apiResponseTime: (prev.apiResponseTime + apiResponseTime) / 2
      }));

      throw error;
    }
  }, []);

  // Track image loading performance
  const trackImageLoad = useCallback((imageUrl: string) => {
    const startTime = performance.now();
    
    const img = new Image();
    img.onload = () => {
      const endTime = performance.now();
      const imageLoadTime = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        imageLoadTime: (prev.imageLoadTime + imageLoadTime) / 2 // Running average
      }));
    };
    
    img.src = imageUrl;
  }, []);

  // Update cache hit rates
  const updateCacheMetrics = useCallback(() => {
    const productStats = productCache.getStats();
    const sellerStats = sellerCache.getStats();
    const searchStats = searchCache.getStats();
    
    const totalRequests = productStats.size + sellerStats.size + searchStats.size;
    const averageHitRate = totalRequests > 0 
      ? (productStats.hitRate + sellerStats.hitRate + searchStats.hitRate) / 3
      : 0;
    
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: averageHitRate
    }));
  }, []);

  // Optimize performance based on metrics
  const optimizePerformance = useCallback(async () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    
    try {
      const currentMetrics = performanceMonitoringService.getPerformanceSummary();
      
      // Optimize based on Core Web Vitals
      if (currentMetrics.coreWebVitals.LCP && currentMetrics.coreWebVitals.LCP > 2500) {
        // Poor LCP - enable aggressive preloading
        navigationPreloadService.updateConfig({
          enabled: true,
          hoverDelay: 50,
          maxConcurrentPreloads: 5,
          preloadImages: true
        });
        
        setOptimizations(prev => ({
          ...prev,
          preloadEnabled: true,
          imageOptimizationEnabled: true
        }));
      }
      
      if (currentMetrics.coreWebVitals.FID && currentMetrics.coreWebVitals.FID > 100) {
        // Poor FID - reduce JavaScript execution
        setOptimizations(prev => ({
          ...prev,
          lazyLoadingEnabled: true
        }));
      }
      
      if (currentMetrics.coreWebVitals.CLS && currentMetrics.coreWebVitals.CLS > 0.1) {
        // Poor CLS - optimize image loading
        setOptimizations(prev => ({
          ...prev,
          imageOptimizationEnabled: true
        }));
      }
      
      // Optimize cache based on hit rate
      if (metrics.cacheHitRate < 0.7) {
        // Low cache hit rate - increase cache size and TTL
        productCache.updateConfig({
          maxSize: 750,
          defaultTTL: 15 * 60 * 1000 // 15 minutes
        });
        
        sellerCache.updateConfig({
          maxSize: 300,
          defaultTTL: 20 * 60 * 1000 // 20 minutes
        });
      }
      
      // Optimize based on navigation time
      if (metrics.navigationTime > 1000) {
        // Slow navigation - enable aggressive preloading
        navigationPreloadService.updateConfig({
          hoverDelay: 100,
          maxConcurrentPreloads: 4
        });
      }
      
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, metrics]);

  // Preload critical marketplace resources
  const preloadCriticalResources = useCallback(async () => {
    if (!optimizations.preloadEnabled) return;
    
    const criticalRoutes = [
      '/marketplace',
      '/marketplace/cart',
      '/marketplace/checkout'
    ];
    
    for (const route of criticalRoutes) {
      await navigationPreloadService.manualPreload(route);
    }
  }, [optimizations.preloadEnabled]);

  // Clear performance data
  const clearPerformanceData = useCallback(() => {
    setMetrics({
      pageLoadTime: 0,
      imageLoadTime: 0,
      apiResponseTime: 0,
      cacheHitRate: 0,
      navigationTime: 0,
      renderTime: 0
    });
    
    productCache.clear();
    sellerCache.clear();
    searchCache.clear();
    navigationPreloadService.clearCache();
  }, []);

  // Get performance recommendations
  const getPerformanceRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.pageLoadTime > 3000) {
      recommendations.push('Enable resource preloading to improve page load times');
    }
    
    if (metrics.imageLoadTime > 2000) {
      recommendations.push('Optimize image sizes and enable lazy loading');
    }
    
    if (metrics.apiResponseTime > 1000) {
      recommendations.push('Implement request caching and deduplication');
    }
    
    if (metrics.cacheHitRate < 0.6) {
      recommendations.push('Increase cache size and TTL for better hit rates');
    }
    
    if (metrics.navigationTime > 800) {
      recommendations.push('Enable hover preloading for faster navigation');
    }
    
    return recommendations;
  }, [metrics]);

  // Initialize performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      updateCacheMetrics();
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, [updateCacheMetrics]);

  // Auto-optimize performance
  useEffect(() => {
    const optimizationInterval = setInterval(() => {
      optimizePerformance();
    }, 30000); // Optimize every 30 seconds
    
    return () => clearInterval(optimizationInterval);
  }, [optimizePerformance]);

  // Preload critical resources on mount
  useEffect(() => {
    preloadCriticalResources();
  }, [preloadCriticalResources]);

  return {
    metrics,
    optimizations,
    isOptimizing,
    trackNavigation,
    trackApiCall,
    trackImageLoad,
    optimizePerformance,
    clearPerformanceData,
    getPerformanceRecommendations,
    updateOptimizations: setOptimizations
  };
};

export default useMarketplacePerformance;