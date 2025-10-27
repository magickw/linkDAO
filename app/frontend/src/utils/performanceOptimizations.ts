import { lazy, ComponentType } from 'react';

/**
 * Performance optimization utilities for the admin interface
 */

/**
 * Lazy load admin route components with loading fallback
 */
export const lazyLoadAdminComp = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  fallback?: ComponentType
) => {
  const LazyComponent = lazy(factory);
  
  return LazyComponent;
};

/**
 * Debounce function for search inputs and filters
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll events and real-time updates
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize expensive calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Intersection Observer hook for lazy loading images and components
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.01,
    ...options,
  });
}

/**
 * Virtual scroll calculator for large lists
 */
export interface VirtualScrollConfig {
  totalItems: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVirtualScroll(
  scrollTop: number,
  config: VirtualScrollConfig
) {
  const { totalItems, itemHeight, containerHeight, overscan = 3 } = config;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = endIndex - startIndex + 1;
  const offsetY = startIndex * itemHeight;
  const totalHeight = totalItems * itemHeight;
  
  return {
    startIndex,
    endIndex,
    visibleItems,
    offsetY,
    totalHeight,
  };
}

/**
 * Image lazy loading with placeholder
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (placeholder) {
      img.src = placeholder;
    }
    
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      resolve();
    };
    tempImg.onerror = reject;
    tempImg.src = src;
  });
}

/**
 * Request Animation Frame throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  let requestId: number | null = null;
  
  return function throttledFn(...args: Parameters<T>) {
    if (requestId === null) {
      requestId = requestAnimationFrame(() => {
        callback(...args);
        requestId = null;
      });
    }
  };
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: string = 'script'): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Batch DOM updates to avoid layout thrashing
 */
export class BatchedDOMUpdates {
  private updates: Array<() => void> = [];
  private frameId: number | null = null;

  add(update: () => void): void {
    this.updates.push(update);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.frameId === null) {
      this.frameId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  private flush(): void {
    const updates = this.updates.slice();
    this.updates = [];
    this.frameId = null;
    
    updates.forEach(update => update());
  }
}

/**
 * Memory-efficient data pagination
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
}

export function paginateData<T>(
  data: T[],
  config: PaginationConfig
): {
  items: T[];
  hasMore: boolean;
  totalPages: number;
} {
  const { page, pageSize, totalItems } = config;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = data.slice(start, end);
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasMore = page < totalPages;
  
  return { items, hasMore, totalPages };
}

/**
 * Optimize array operations for large datasets
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Web Worker wrapper for heavy computations
 */
export function createWorker(fn: Function): Worker {
  const blob = new Blob(
    [`self.onmessage = ${fn.toString()}`],
    { type: 'text/javascript' }
  );
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}

/**
 * Cache manager for API responses
 */
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxAge: number;

  constructor(maxAgeMinutes: number = 5) {
    this.maxAge = maxAgeMinutes * 60 * 1000;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const age = Date.now() - cached.timestamp;
    if (age > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }
}

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start || !end) {
      console.warn(`Performance marks not found: ${startMark}, ${endMark}`);
      return 0;
    }
    
    const duration = end - start;
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  clear(): void {
    this.marks.clear();
  }
}

// Export singleton instances
export const domBatcher = new BatchedDOMUpdates();
export const apiCache = new CacheManager(5);
export const perfMonitor = new PerformanceMonitor();
