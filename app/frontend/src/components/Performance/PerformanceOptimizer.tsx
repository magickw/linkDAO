import React, { useEffect, useRef, useCallback, useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  bundleSize: number;
  loadTime: number;
  interactionDelay: number;
  renderTime: number;
  networkRequests: number;
  cacheHitRate: number;
}

interface OptimizationConfig {
  targetFPS: number;
  memoryThreshold: number; // in MB
  enableFrameRateOptimization: boolean;
  enableMemoryOptimization: boolean;
  enableRenderOptimization: boolean;
  enableNetworkOptimization: boolean;
  monitoringInterval: number; // in ms
  adaptiveOptimization: boolean;
}

interface PerformanceOptimizerProps {
  config?: Partial<OptimizationConfig>;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  onOptimizationApplied?: (optimization: string) => void;
  children: React.ReactNode;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  targetFPS: 60,
  memoryThreshold: 100, // 100MB
  enableFrameRateOptimization: true,
  enableMemoryOptimization: true,
  enableRenderOptimization: true,
  enableNetworkOptimization: true,
  monitoringInterval: 1000,
  adaptiveOptimization: true
};

export const PerformanceOptimizer = memo(function PerformanceOptimizer({
  config = {},
  onMetricsUpdate,
  onOptimizationApplied,
  children
}: PerformanceOptimizerProps) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    bundleSize: 0,
    loadTime: 0,
    interactionDelay: 0,
    renderTime: 0,
    networkRequests: 0,
    cacheHitRate: 0
  });

  const [optimizations, setOptimizations] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const renderTimesRef = useRef<number[]>([]);
  const networkRequestsRef = useRef(0);
  const cacheHitsRef = useRef(0);
  const cacheMissesRef = useRef(0);
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const optimizationTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize performance monitoring
  useEffect(() => {
    startPerformanceMonitoring();
    return stopPerformanceMonitoring;
  }, []);

  // Apply optimizations when metrics change
  useEffect(() => {
    if (finalConfig.adaptiveOptimization) {
      applyAdaptiveOptimizations();
    }
  }, [metrics, finalConfig.adaptiveOptimization]);

  const startPerformanceMonitoring = () => {
    // Monitor frame rate
    if (finalConfig.enableFrameRateOptimization) {
      monitorFrameRate();
    }

    // Monitor memory usage
    if (finalConfig.enableMemoryOptimization) {
      monitorMemoryUsage();
    }

    // Monitor render performance
    if (finalConfig.enableRenderOptimization) {
      monitorRenderPerformance();
    }

    // Monitor network performance
    if (finalConfig.enableNetworkOptimization) {
      monitorNetworkPerformance();
    }

    // Set up periodic metrics collection
    monitoringIntervalRef.current = setInterval(() => {
      collectMetrics();
    }, finalConfig.monitoringInterval);
  };

  const stopPerformanceMonitoring = () => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
    }
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }
  };

  const monitorFrameRate = () => {
    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        setMetrics(prev => ({ ...prev, fps }));
        
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }
      
      frameCountRef.current++;
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  };

  const monitorMemoryUsage = () => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
      
      setTimeout(checkMemory, finalConfig.monitoringInterval);
    };
    
    checkMemory();
  };

  const monitorRenderPerformance = () => {
    // Use Performance Observer to monitor render timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('render')) {
            renderTimesRef.current.push(entry.duration);
            
            // Keep only last 10 measurements
            if (renderTimesRef.current.length > 10) {
              renderTimesRef.current.shift();
            }
            
            const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
            setMetrics(prev => ({ ...prev, renderTime: avgRenderTime }));
          }
        });
      });
      
      observer.observe({ entryTypes: ['measure'] });
    }
  };

  const monitorNetworkPerformance = () => {
    // Monitor network requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      networkRequestsRef.current++;
      
      try {
        const response = await originalFetch(...args);
        
        // Check if response came from cache
        if (response.headers.get('X-Served-From') === 'cache') {
          cacheHitsRef.current++;
        } else {
          cacheMissesRef.current++;
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  };

  const collectMetrics = () => {
    const newMetrics: Partial<PerformanceMetrics> = {};
    
    // Calculate cache hit rate
    const totalRequests = cacheHitsRef.current + cacheMissesRef.current;
    if (totalRequests > 0) {
      newMetrics.cacheHitRate = (cacheHitsRef.current / totalRequests) * 100;
    }
    
    // Update network requests count
    newMetrics.networkRequests = networkRequestsRef.current;
    
    // Get navigation timing
    if ('getEntriesByType' in performance) {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const navEntry = navEntries[0];
        newMetrics.loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
      }
    }
    
    // Measure bundle size (approximate)
    if ('getEntriesByType' in performance) {
      const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resourceEntries.filter(entry => 
        entry.name.includes('.js') && !entry.name.includes('node_modules')
      );
      const totalSize = jsResources.reduce((sum, entry) => 
        sum + (entry.transferSize || entry.encodedBodySize || 0), 0
      );
      newMetrics.bundleSize = Math.round(totalSize / 1024); // KB
    }
    
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    onMetricsUpdate?.({ ...metrics, ...newMetrics } as PerformanceMetrics);
  };

  const applyAdaptiveOptimizations = () => {
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    
    // Clear previous timeout
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }
    
    optimizationTimeoutRef.current = setTimeout(() => {
      const newOptimizations: string[] = [];
      
      // FPS optimization
      if (metrics.fps < finalConfig.targetFPS) {
        newOptimizations.push(...optimizeFPS());
      }
      
      // Memory optimization
      if (metrics.memoryUsage > finalConfig.memoryThreshold) {
        newOptimizations.push(...optimizeMemory());
      }
      
      // Render optimization
      if (metrics.renderTime > 16.67) { // 60fps = 16.67ms per frame
        newOptimizations.push(...optimizeRendering());
      }
      
      // Network optimization
      if (metrics.cacheHitRate < 80) {
        newOptimizations.push(...optimizeNetwork());
      }
      
      if (newOptimizations.length > 0) {
        setOptimizations(prev => [...new Set([...prev, ...newOptimizations])]);
        newOptimizations.forEach(opt => onOptimizationApplied?.(opt));
      }
      
      setIsOptimizing(false);
    }, 100);
  };

  const optimizeFPS = (): string[] => {
    const optimizations: string[] = [];
    
    // Reduce animation complexity
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
    optimizations.push('Reduced animation duration');
    
    // Disable non-critical animations
    const animations = document.querySelectorAll('[data-animation]');
    animations.forEach(el => {
      (el as HTMLElement).style.animation = 'none';
    });
    if (animations.length > 0) {
      optimizations.push('Disabled non-critical animations');
    }
    
    // Enable hardware acceleration for critical elements
    const criticalElements = document.querySelectorAll('.post-card, .sidebar, .header');
    criticalElements.forEach(el => {
      (el as HTMLElement).style.transform = 'translateZ(0)';
      (el as HTMLElement).style.willChange = 'transform';
    });
    if (criticalElements.length > 0) {
      optimizations.push('Enabled hardware acceleration');
    }
    
    return optimizations;
  };

  const optimizeMemory = (): string[] => {
    const optimizations: string[] = [];
    
    // Clear unused caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        const oldCaches = cacheNames.filter(name => 
          name.includes('old') || name.includes('v1')
        );
        oldCaches.forEach(cacheName => {
          caches.delete(cacheName);
        });
        if (oldCaches.length > 0) {
          optimizations.push('Cleared old caches');
        }
      });
    }
    
    // Trigger garbage collection (if available)
    if ('gc' in window) {
      (window as any).gc();
      optimizations.push('Triggered garbage collection');
    }
    
    // Reduce image quality for non-critical images
    const images = document.querySelectorAll('img:not(.critical)');
    images.forEach(img => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = (img as HTMLImageElement).width * 0.8;
        canvas.height = (img as HTMLImageElement).height * 0.8;
        ctx.drawImage(img as HTMLImageElement, 0, 0, canvas.width, canvas.height);
        (img as HTMLImageElement).src = canvas.toDataURL('image/jpeg', 0.7);
      }
    });
    if (images.length > 0) {
      optimizations.push('Reduced image quality');
    }
    
    return optimizations;
  };

  const optimizeRendering = (): string[] => {
    const optimizations: string[] = [];
    
    // Enable CSS containment
    const containers = document.querySelectorAll('.post-card, .comment, .sidebar-item');
    containers.forEach(el => {
      (el as HTMLElement).style.contain = 'layout style paint';
    });
    if (containers.length > 0) {
      optimizations.push('Enabled CSS containment');
    }
    
    // Reduce DOM complexity by hiding off-screen elements
    const offScreenElements = document.querySelectorAll('[data-virtual-item]');
    offScreenElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight + 1000) {
        (el as HTMLElement).style.display = 'none';
      }
    });
    if (offScreenElements.length > 0) {
      optimizations.push('Hidden off-screen elements');
    }
    
    // Debounce scroll events
    let scrollTimeout: NodeJS.Timeout;
    const originalScrollHandler = window.onscroll;
    window.onscroll = (e: Event) => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (originalScrollHandler) {
          originalScrollHandler.call(window, e);
        }
      }, 16); // ~60fps
    };
    optimizations.push('Debounced scroll events');
    
    return optimizations;
  };

  const optimizeNetwork = (): string[] => {
    const optimizations: string[] = [];
    
    // Enable request deduplication
    const pendingRequests = new Map<string, Promise<Response>>();
    const originalFetch = window.fetch;
    
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      if (pendingRequests.has(url)) {
        return pendingRequests.get(url)!.then(response => response.clone());
      }
      
      const promise = originalFetch(input, init);
      pendingRequests.set(url, promise);
      
      promise.finally(() => {
        pendingRequests.delete(url);
      });
      
      return promise;
    };
    optimizations.push('Enabled request deduplication');
    
    // Preload critical resources
    const criticalResources = ['/api/user/profile', '/api/posts/feed'];
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
    optimizations.push('Preloaded critical resources');
    
    return optimizations;
  };

  const resetOptimizations = useCallback(() => {
    setOptimizations([]);
    
    // Reset styles
    document.documentElement.style.removeProperty('--animation-duration');
    
    // Re-enable animations
    const animations = document.querySelectorAll('[data-animation]');
    animations.forEach(el => {
      (el as HTMLElement).style.animation = '';
    });
    
    // Remove hardware acceleration
    const elements = document.querySelectorAll('[style*="translateZ"]');
    elements.forEach(el => {
      (el as HTMLElement).style.transform = '';
      (el as HTMLElement).style.willChange = '';
    });
    
    // Remove CSS containment
    const containers = document.querySelectorAll('[style*="contain"]');
    containers.forEach(el => {
      (el as HTMLElement).style.contain = '';
    });
    
    // Show hidden elements
    const hiddenElements = document.querySelectorAll('[style*="display: none"]');
    hiddenElements.forEach(el => {
      (el as HTMLElement).style.display = '';
    });
  }, []);

  const optimizationNotification = useMemo(() => {
    if (optimizations.length === 0) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50 bg-green-600 text-white p-3 rounded-lg shadow-lg max-w-sm"
      >
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Performance Optimized</span>
        </div>
        <div className="text-xs opacity-90">
          {optimizations.slice(-3).map((opt, index) => (
            <div key={index}>• {opt}</div>
          ))}
          {optimizations.length > 3 && (
            <div>• +{optimizations.length - 3} more optimizations</div>
          )}
        </div>
      </motion.div>
    );
  }, [optimizations]);

  return (
    <>
      {children}
      
      {/* Performance Monitor (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor 
          metrics={metrics}
          optimizations={optimizations}
          onReset={resetOptimizations}
        />
      )}
      
      {/* Optimization Notifications */}
      <AnimatePresence>
        {optimizationNotification}
      </AnimatePresence>
    </>
  );
});

// Performance Monitor Component (Development)
const PerformanceMonitor = memo(function PerformanceMonitor({ 
  metrics, 
  optimizations, 
  onReset 
}: { 
  metrics: PerformanceMetrics; 
  optimizations: string[]; 
  onReset: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const fpsIndicatorColor = useMemo(() => {
    return metrics.fps >= 55 ? 'bg-green-500' : 
           metrics.fps >= 30 ? 'bg-yellow-500' : 'bg-red-500';
  }, [metrics.fps]);

  const metricsGrid = useMemo(() => (
    <div className="grid grid-cols-2 gap-2">
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {metrics.memoryUsage}MB</div>
      <div>Bundle: {metrics.bundleSize}KB</div>
      <div>Load: {metrics.loadTime}ms</div>
      <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
      <div>Cache: {metrics.cacheHitRate.toFixed(1)}%</div>
    </div>
  ), [metrics]);

  const optimizationsList = useMemo(() => {
    if (optimizations.length === 0) return null;
    
    return (
      <div className="border-t border-gray-700 pt-2">
        <div className="text-green-400 mb-1">
          Optimizations ({optimizations.length}):
        </div>
        <div className="max-h-20 overflow-y-auto space-y-1">
          {optimizations.slice(-5).map((opt, index) => (
            <div key={index} className="text-gray-300">• {opt}</div>
          ))}
        </div>
        <button
          onClick={onReset}
          className="mt-2 px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
        >
          Reset
        </button>
      </div>
    );
  }, [optimizations, onReset]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed top-4 right-4 z-50 bg-black/90 text-white rounded-lg overflow-hidden"
    >
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm font-medium">Performance</span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${fpsIndicatorColor}`}></div>
          <span className="text-xs">{metrics.fps} FPS</span>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-gray-700"
          >
            <div className="p-3 space-y-2 text-xs">
              {metricsGrid}
              {optimizationsList}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// Hook for manual performance optimization
export function usePerformanceOptimization() {
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const optimizeNow = useCallback(async () => {
    setIsOptimizing(true);
    
    // Trigger immediate optimization
    const event = new CustomEvent('optimize-performance', {
      detail: { immediate: true }
    });
    document.dispatchEvent(event);
    
    // Wait for optimizations to apply
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsOptimizing(false);
  }, []);
  
  return { optimizeNow, isOptimizing };
}

export default PerformanceOptimizer;