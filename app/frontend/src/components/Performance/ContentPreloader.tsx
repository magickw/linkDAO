import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/router';

interface PreloadConfig {
  enableRoutePreloading: boolean;
  enableImagePreloading: boolean;
  enableDataPreloading: boolean;
  preloadDistance: number;
  maxConcurrentPreloads: number;
  preloadPriority: 'low' | 'normal' | 'high';
  cacheStrategy: 'memory' | 'disk' | 'hybrid';
}

interface PreloadItem {
  type: 'route' | 'image' | 'data' | 'component';
  url: string;
  priority: number;
  timestamp: number;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  size?: number;
}

interface ContentPreloaderProps {
  config?: Partial<PreloadConfig>;
  routes?: string[];
  images?: string[];
  dataEndpoints?: string[];
  onPreloadComplete?: (item: PreloadItem) => void;
  onPreloadError?: (item: PreloadItem, error: Error) => void;
}

const DEFAULT_CONFIG: PreloadConfig = {
  enableRoutePreloading: true,
  enableImagePreloading: true,
  enableDataPreloading: true,
  preloadDistance: 1000,
  maxConcurrentPreloads: 3,
  preloadPriority: 'normal',
  cacheStrategy: 'hybrid'
};

export function ContentPreloader({
  config = {},
  routes = [],
  images = [],
  dataEndpoints = [],
  onPreloadComplete,
  onPreloadError
}: ContentPreloaderProps) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const router = useRouter();
  
  const [preloadQueue, setPreloadQueue] = useState<PreloadItem[]>([]);
  const [activePreloads, setActivePreloads] = useState<Set<string>>(new Set());
  const [preloadStats, setPreloadStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    cached: 0
  });

  const preloadCacheRef = useRef<Map<string, any>>(new Map());
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const preloadWorkersRef = useRef<Worker[]>([]);

  // Initialize preloading system
  useEffect(() => {
    initializePreloader();
    return cleanup;
  }, []);

  // Process preload queue
  useEffect(() => {
    processPreloadQueue();
  }, [preloadQueue, activePreloads]);

  const initializePreloader = () => {
    // Set up intersection observer for link preloading
    if (finalConfig.enableRoutePreloading) {
      setupLinkPreloading();
    }

    // Set up image preloading observer
    if (finalConfig.enableImagePreloading) {
      setupImagePreloading();
    }

    // Initialize web workers for heavy preloading tasks
    initializeWebWorkers();

    // Preload critical resources immediately
    preloadCriticalResources();
  };

  const setupLinkPreloading = () => {
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.href;
            
            if (href && !activePreloads.has(href)) {
              queuePreload({
                type: 'route',
                url: href,
                priority: calculatePriority(link),
                timestamp: Date.now(),
                status: 'pending'
              });
            }
          }
        });
      },
      {
        rootMargin: `${finalConfig.preloadDistance}px`,
        threshold: 0.1
      }
    );

    // Observe all links on the page
    const links = document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="../"]');
    links.forEach(link => {
      intersectionObserverRef.current?.observe(link);
    });
  };

  const setupImagePreloading = () => {
    // Observe images that are about to come into view
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src || img.src;
            
            if (src && !activePreloads.has(src)) {
              queuePreload({
                type: 'image',
                url: src,
                priority: calculateImagePriority(img),
                timestamp: Date.now(),
                status: 'pending'
              });
            }
          }
        });
      },
      {
        rootMargin: `${finalConfig.preloadDistance * 2}px`,
        threshold: 0.01
      }
    );

    // Observe all images with data-src or lazy loading
    const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    images.forEach(img => imageObserver.observe(img));
  };

  const initializeWebWorkers = () => {
    // Create web workers for CPU-intensive preloading tasks
    const workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
    
    for (let i = 0; i < workerCount; i++) {
      try {
        const worker = new Worker('/workers/preload-worker.js');
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        preloadWorkersRef.current.push(worker);
      } catch (error) {
        console.warn('Web Worker not available for preloading:', error);
      }
    }
  };

  const preloadCriticalResources = () => {
    // Preload critical routes
    const criticalRoutes = ['/dashboard', '/profile', '/communities'];
    criticalRoutes.forEach(route => {
      if (!activePreloads.has(route)) {
        queuePreload({
          type: 'route',
          url: route,
          priority: 10, // High priority
          timestamp: Date.now(),
          status: 'pending'
        });
      }
    });

    // Preload critical images
    const criticalImages = ['/logo.svg', '/hero-bg.jpg', '/default-avatar.png'];
    criticalImages.forEach(image => {
      if (!activePreloads.has(image)) {
        queuePreload({
          type: 'image',
          url: image,
          priority: 9,
          timestamp: Date.now(),
          status: 'pending'
        });
      }
    });

    // Preload user-specific data
    if (finalConfig.enableDataPreloading) {
      dataEndpoints.forEach(endpoint => {
        queuePreload({
          type: 'data',
          url: endpoint,
          priority: 7,
          timestamp: Date.now(),
          status: 'pending'
        });
      });
    }
  };

  const queuePreload = (item: PreloadItem) => {
    setPreloadQueue(prev => {
      // Avoid duplicates
      if (prev.some(existing => existing.url === item.url)) {
        return prev;
      }
      
      // Insert in priority order
      const newQueue = [...prev, item].sort((a, b) => b.priority - a.priority);
      return newQueue;
    });

    setPreloadStats(prev => ({ ...prev, total: prev.total + 1 }));
  };

  const processPreloadQueue = async () => {
    if (preloadQueue.length === 0 || activePreloads.size >= finalConfig.maxConcurrentPreloads) {
      return;
    }

    const nextItem = preloadQueue[0];
    if (!nextItem || activePreloads.has(nextItem.url)) {
      return;
    }

    // Remove from queue and add to active
    setPreloadQueue(prev => prev.slice(1));
    setActivePreloads(prev => new Set(prev).add(nextItem.url));

    try {
      await executePreload(nextItem);
      handlePreloadSuccess(nextItem);
    } catch (error) {
      handlePreloadError(nextItem, error as Error);
    } finally {
      setActivePreloads(prev => {
        const newSet = new Set(prev);
        newSet.delete(nextItem.url);
        return newSet;
      });
    }
  };

  const executePreload = async (item: PreloadItem): Promise<void> => {
    // Check cache first
    if (preloadCacheRef.current.has(item.url)) {
      return Promise.resolve();
    }

    switch (item.type) {
      case 'route':
        return preloadRoute(item.url);
      case 'image':
        return preloadImage(item.url);
      case 'data':
        return preloadData(item.url);
      case 'component':
        return preloadComponent(item.url);
      default:
        throw new Error(`Unknown preload type: ${item.type}`);
    }
  };

  const preloadRoute = async (url: string): Promise<void> => {
    try {
      // Use Next.js router prefetch
      await router.prefetch(url);
      
      // Also preload the page component
      const response = await fetch(url, {
        method: 'HEAD',
        priority: finalConfig.preloadPriority as RequestPriority
      });
      
      if (!response.ok) {
        throw new Error(`Failed to preload route: ${response.statusText}`);
      }
      
      preloadCacheRef.current.set(url, { type: 'route', timestamp: Date.now() });
    } catch (error) {
      throw new Error(`Route preload failed: ${error}`);
    }
  };

  const preloadImage = async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        preloadCacheRef.current.set(url, { 
          type: 'image', 
          data: img, 
          timestamp: Date.now(),
          size: img.naturalWidth * img.naturalHeight * 4 // Rough size estimate
        });
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${url}`));
      };
      
      // Set loading priority
      if ('loading' in img) {
        (img as any).loading = 'eager';
      }
      
      img.src = url;
    });
  };

  const preloadData = async (url: string): Promise<void> => {
    try {
      const response = await fetch(url, {
        priority: finalConfig.preloadPriority as RequestPriority,
        headers: {
          'X-Preload': 'true'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to preload data: ${response.statusText}`);
      }
      
      const data = await response.json();
      preloadCacheRef.current.set(url, { 
        type: 'data', 
        data, 
        timestamp: Date.now(),
        size: JSON.stringify(data).length
      });
    } catch (error) {
      throw new Error(`Data preload failed: ${error}`);
    }
  };

  const preloadComponent = async (url: string): Promise<void> => {
    try {
      // Dynamic import for component preloading
      // webpack: disable critical dependency warning for dynamic imports
      const module = await import(/* webpackIgnore: true */ url);
      preloadCacheRef.current.set(url, { 
        type: 'component', 
        data: module, 
        timestamp: Date.now() 
      });
    } catch (error) {
      throw new Error(`Component preload failed: ${error}`);
    }
  };

  const calculatePriority = (element: HTMLElement): number => {
    let priority = 5; // Base priority
    
    // Increase priority for visible elements
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (isVisible) priority += 3;
    
    // Increase priority for elements with high interaction probability
    if (element.classList.contains('primary-nav')) priority += 2;
    if (element.classList.contains('cta-button')) priority += 2;
    
    // Decrease priority for footer links
    if (element.closest('footer')) priority -= 2;
    
    return Math.max(1, Math.min(10, priority));
  };

  const calculateImagePriority = (img: HTMLImageElement): number => {
    let priority = 4; // Base priority for images
    
    // Higher priority for above-the-fold images
    const rect = img.getBoundingClientRect();
    if (rect.top < window.innerHeight) priority += 3;
    
    // Higher priority for larger images
    const area = img.width * img.height;
    if (area > 100000) priority += 2; // Large images
    else if (area > 50000) priority += 1; // Medium images
    
    // Higher priority for hero images
    if (img.classList.contains('hero-image')) priority += 3;
    
    return Math.max(1, Math.min(10, priority));
  };

  const handlePreloadSuccess = (item: PreloadItem) => {
    setPreloadStats(prev => ({ 
      ...prev, 
      completed: prev.completed + 1,
      cached: prev.cached + 1
    }));
    
    onPreloadComplete?.(item);
  };

  const handlePreloadError = (item: PreloadItem, error: Error) => {
    setPreloadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
    onPreloadError?.(item, error);
    console.warn(`Preload failed for ${item.url}:`, error);
  };

  const handleWorkerMessage = (event: MessageEvent) => {
    const { type, url, data, error } = event.data;
    
    if (type === 'preload-complete') {
      preloadCacheRef.current.set(url, data);
      setPreloadStats(prev => ({ ...prev, completed: prev.completed + 1 }));
    } else if (type === 'preload-error') {
      setPreloadStats(prev => ({ ...prev, failed: prev.failed + 1 }));
      console.warn(`Worker preload failed for ${url}:`, error);
    }
  };

  const handleWorkerError = (error: ErrorEvent) => {
    console.error('Preload worker error:', error);
  };

  const cleanup = () => {
    intersectionObserverRef.current?.disconnect();
    
    // Terminate web workers
    preloadWorkersRef.current.forEach(worker => {
      worker.terminate();
    });
    preloadWorkersRef.current = [];
    
    // Clear cache if needed
    if (finalConfig.cacheStrategy === 'memory') {
      preloadCacheRef.current.clear();
    }
  };

  // Public API for manual preloading
  const preloadManually = useCallback((urls: string[], type: PreloadItem['type'] = 'data') => {
    urls.forEach(url => {
      queuePreload({
        type,
        url,
        priority: 8, // High priority for manual preloads
        timestamp: Date.now(),
        status: 'pending'
      });
    });
  }, []);

  const getCachedData = useCallback((url: string) => {
    return preloadCacheRef.current.get(url);
  }, []);

  const clearCache = useCallback(() => {
    preloadCacheRef.current.clear();
    setPreloadStats({ total: 0, completed: 0, failed: 0, cached: 0 });
  }, []);

  // Development stats display
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        <div>Preload Stats:</div>
        <div>Queue: {preloadQueue.length}</div>
        <div>Active: {activePreloads.size}</div>
        <div>Completed: {preloadStats.completed}/{preloadStats.total}</div>
        <div>Failed: {preloadStats.failed}</div>
        <div>Cached: {preloadStats.cached}</div>
      </div>
    );
  }

  return null;
}

// Hook for using preloaded content
export function usePreloadedContent(url: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if content is already preloaded
    const preloader = document.querySelector('[data-preloader]') as any;
    const cachedData = preloader?.getCachedData?.(url);
    
    if (cachedData) {
      setData(cachedData.data);
      setLoading(false);
    } else {
      // Fallback to normal loading
      fetch(url)
        .then(response => response.json())
        .then(data => {
          setData(data);
          setLoading(false);
        })
        .catch(error => {
          setError(error);
          setLoading(false);
        });
    }
  }, [url]);

  return { data, loading, error };
}

// Hook for preloading on hover
export function useHoverPreload() {
  const preloadOnHover = useCallback((url: string, type: PreloadItem['type'] = 'route') => {
    // Debounce to avoid excessive preloading
    const timeoutId = setTimeout(() => {
      const event = new CustomEvent('manual-preload', {
        detail: { url, type, priority: 6 }
      });
      document.dispatchEvent(event);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return { preloadOnHover };
}

// Component for preloading specific resources
export function PreloadResource({ 
  url, 
  type, 
  priority = 5 
}: { 
  url: string; 
  type: PreloadItem['type']; 
  priority?: number; 
}) {
  useEffect(() => {
    const event = new CustomEvent('manual-preload', {
      detail: { url, type, priority }
    });
    document.dispatchEvent(event);
  }, [url, type, priority]);

  return null;
}

export default ContentPreloader;