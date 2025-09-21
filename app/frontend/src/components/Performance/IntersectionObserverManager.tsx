import { useEffect, useRef, useCallback, useState } from 'react';

interface IntersectionObserverConfig {
  rootMargin?: string;
  threshold?: number | number[];
  root?: Element | null;
  triggerOnce?: boolean;
  skip?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<Element>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

// Enhanced intersection observer hook with performance optimizations
export function useIntersectionObserver(
  config: IntersectionObserverConfig = {}
): UseIntersectionObserverReturn {
  const {
    rootMargin = '0px',
    threshold = 0,
    root = null,
    triggerOnce = false,
    skip = false
  } = config;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    setEntry(entry);
    
    const isCurrentlyIntersecting = entry.isIntersecting;
    setIsIntersecting(isCurrentlyIntersecting);

    if (triggerOnce && isCurrentlyIntersecting && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Disconnect observer after first trigger for performance
      observerRef.current?.disconnect();
    }
  }, [triggerOnce]);

  useEffect(() => {
    if (skip || !elementRef.current) return;

    // Create observer with optimized settings
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
      root
    });

    observerRef.current.observe(elementRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleIntersection, rootMargin, threshold, root, skip]);

  return {
    ref: elementRef,
    isIntersecting,
    entry
  };
}

// Batch intersection observer for multiple elements
export class BatchIntersectionObserver {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, (entry: IntersectionObserverEntry) => void>();
  private config: IntersectionObserverInit;

  constructor(config: IntersectionObserverInit = {}) {
    this.config = {
      rootMargin: '50px',
      threshold: 0.1,
      ...config
    };
    this.init();
  }

  private init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const callback = this.callbacks.get(entry.target);
        if (callback) {
          callback(entry);
        }
      });
    }, this.config);
  }

  observe(element: Element, callback: (entry: IntersectionObserverEntry) => void) {
    if (!this.observer) return;

    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element: Element) {
    if (!this.observer) return;

    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  disconnect() {
    if (!this.observer) return;

    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Infinite scroll hook with performance optimizations
export function useInfiniteScroll(
  hasNextPage: boolean,
  isLoading: boolean,
  onLoadMore: () => void,
  options: {
    rootMargin?: string;
    threshold?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    rootMargin = '100px',
    threshold = 0.1,
    enabled = true
  } = options;

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    skip: !enabled || !hasNextPage || isLoading
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isLoading && enabled) {
      onLoadMore();
    }
  }, [isIntersecting, hasNextPage, isLoading, onLoadMore, enabled]);

  return { ref };
}

// Preload content when elements are near viewport
export function usePreloadOnApproach(
  onPreload: () => void,
  options: {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
  } = {}
) {
  const {
    rootMargin = '200px',
    threshold = 0,
    triggerOnce = true
  } = options;

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce
  });

  useEffect(() => {
    if (isIntersecting) {
      onPreload();
    }
  }, [isIntersecting, onPreload]);

  return { ref };
}

// Visibility tracking for analytics and performance
export function useVisibilityTracking(
  onVisible: (duration: number) => void,
  options: {
    threshold?: number;
    minVisibleTime?: number;
  } = {}
) {
  const {
    threshold = 0.5,
    minVisibleTime = 1000 // 1 second
  } = options;

  const visibilityStartRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { ref, isIntersecting } = useIntersectionObserver({
    threshold
  });

  useEffect(() => {
    if (isIntersecting) {
      visibilityStartRef.current = Date.now();
      
      // Set timeout to track minimum visibility time
      timeoutRef.current = setTimeout(() => {
        if (visibilityStartRef.current) {
          const duration = Date.now() - visibilityStartRef.current;
          onVisible(duration);
        }
      }, minVisibleTime);
    } else {
      // Clear timeout if element becomes invisible
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      visibilityStartRef.current = null;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isIntersecting, onVisible, minVisibleTime]);

  return { ref };
}

export default useIntersectionObserver;