/**
 * Performance Optimizations Index
 * Exports all performance optimization components and services
 */

// Intelligent Caching and Preloading
export { 
  IntelligentCacheManager,
  intelligentCacheManager 
} from '../../../services/intelligentCacheService';

export { 
  ServiceWorkerCacheService,
  serviceWorkerCacheService 
} from '../../../services/serviceWorkerCacheService';

export { 
  ImageOptimizationService,
  imageOptimizationService 
} from '../../../services/imageOptimizationService';

// Virtual Scrolling and Rendering Performance
export {
  VirtualScrollManager,
  VirtualGridManager,
  useVirtualScrollPerformance
} from './VirtualScrollManager';

export {
  OptimizedCommunityIcon,
  OptimizedPostCard,
  OptimizedUserAvatar,
  OptimizedFilter,
  PerformanceMonitor,
  usePerformanceMonitor,
  useLazyComponent,
  useAnimationPerformance
} from './ReactOptimizations';

// Lazy Loading System
export {
  LazyComponentWrapper,
  LazyGovernanceWidgetWrapper,
  LazyWalletActivityFeedWrapper,
  LazySuggestedCommunitiesWidgetWrapper,
  LazyMiniProfileCardWrapper,
  ProgressiveLoadingManager,
  LazyRoute,
  useCodeSplitting,
  usePreloadComponents,
  useBundleMonitor,
  usePerformanceLazyLoading,
  LoadingSkeleton,
  CardSkeleton,
  WidgetSkeleton
} from './LazyLoadingSystem';

// Performance Monitoring and Analytics
export {
  PerformanceMonitoringService,
  PerformanceProvider,
  PerformanceDashboard,
  usePerformanceMonitoring,
  performanceMonitoringService
} from './PerformanceMonitoringService';

export { PerformanceAnalyticsDashboard } from './PerformanceAnalyticsDashboard';

// Performance optimization utilities
export const PerformanceUtils = {
  // Debounce function for performance-critical operations
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate?: boolean
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null;
    
    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  },

  // Throttle function for scroll and resize events
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // RAF-based throttle for animation-related operations
  rafThrottle: <T extends (...args: any[]) => any>(
    func: T
  ): ((...args: Parameters<T>) => void) => {
    let rafId: number | null = null;
    
    return function executedFunction(...args: Parameters<T>) {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          func(...args);
          rafId = null;
        });
      }
    };
  },

  // Memory usage checker
  getMemoryUsage: (): {
    used: number;
    total: number;
    percentage: number;
  } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  },

  // Performance timing helper
  measurePerformance: async <T>(
    name: string,
    operation: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 100) {
      console.warn(`Slow operation "${name}": ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  },

  // Bundle size analyzer
  analyzeBundleSize: (): {
    totalScripts: number;
    totalSize: number;
    largestScript: { url: string; size: number } | null;
  } => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    let totalSize = 0;
    let largestScript: { url: string; size: number } | null = null;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        // Estimate size based on URL (this is a rough estimate)
        const estimatedSize = src.length * 100; // Very rough estimate
        totalSize += estimatedSize;
        
        if (!largestScript || estimatedSize > largestScript.size) {
          largestScript = { url: src, size: estimatedSize };
        }
      }
    });
    
    return {
      totalScripts: scripts.length,
      totalSize,
      largestScript
    };
  },

  // Network condition detector
  getNetworkCondition: (): 'fast' | 'slow' | 'offline' => {
    if (!navigator.onLine) return 'offline';
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const downlink = connection.downlink || 0;
      
      if (downlink > 1.5) return 'fast';
      if (downlink > 0.5) return 'slow';
      return 'slow';
    }
    
    return 'fast'; // Default assumption
  },

  // Component render tracker
  trackComponentRender: (componentName: string, renderTime: number): void => {
    if (renderTime > 16) {
      console.warn(`Component "${componentName}" took ${renderTime.toFixed(2)}ms to render`);
    }
    
    // Store in performance marks for analysis
    performance.mark(`${componentName}-render-${Date.now()}`);
  },

  // Intersection observer helper for lazy loading
  createIntersectionObserver: (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver => {
    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    };
    
    return new IntersectionObserver(callback, defaultOptions);
  },

  // Image loading optimizer
  optimizeImageLoading: (img: HTMLImageElement, src: string): void => {
    // Set loading attribute for native lazy loading
    img.loading = 'lazy';
    
    // Add decode hint
    img.decoding = 'async';
    
    // Set src last to trigger loading
    img.src = src;
  },

  // CSS containment helper
  applyCSSContainment: (element: HTMLElement, containment: string = 'layout style paint'): void => {
    element.style.contain = containment;
  }
};

// Performance configuration
export const PerformanceConfig = {
  // Virtual scrolling thresholds
  VIRTUAL_SCROLL_THRESHOLD: 100,
  VIRTUAL_SCROLL_OVERSCAN: 5,
  
  // Lazy loading thresholds
  LAZY_LOAD_THRESHOLD: '50px',
  LAZY_LOAD_DELAY: 100,
  
  // Performance monitoring thresholds
  SLOW_RENDER_THRESHOLD: 16, // ms
  HIGH_MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB
  SLOW_NETWORK_THRESHOLD: 1000, // ms
  
  // Cache configuration
  CACHE_SIZE_LIMIT: 50 * 1024 * 1024, // 50MB
  CACHE_TTL: 15 * 60 * 1000, // 15 minutes
  
  // Animation performance
  TARGET_FPS: 60,
  MIN_ACCEPTABLE_FPS: 55,
  
  // Bundle optimization
  MAX_CHUNK_SIZE: 250 * 1024, // 250KB
  PRELOAD_DELAY: 2000 // ms
};