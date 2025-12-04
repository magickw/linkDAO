/**
 * Performance Optimization Utilities
 *
 * This module provides utilities for React component optimization:
 * - Memoization helpers
 * - Comparison functions for React.memo
 * - useCallback and useMemo patterns
 * - Debounce and throttle utilities
 */

import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Deep comparison function for React.memo
 * Performs a shallow comparison of object properties
 */
export function shallowEqual<T extends object>(prev: T, next: T): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;

  const prevKeys = Object.keys(prev) as (keyof T)[];
  const nextKeys = Object.keys(next) as (keyof T)[];

  if (prevKeys.length !== nextKeys.length) return false;

  for (const key of prevKeys) {
    if (prev[key] !== next[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Creates a comparison function that only checks specific props
 * Useful when you want to memoize but ignore certain props like callbacks
 */
export function createPropsComparator<T extends object>(
  propsToCompare: (keyof T)[]
): (prev: T, next: T) => boolean {
  return (prev: T, next: T): boolean => {
    for (const prop of propsToCompare) {
      if (prev[prop] !== next[prop]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Creates a comparison function that ignores specific props
 * Useful when callbacks or refs should not trigger re-renders
 */
export function createPropsComparatorIgnoring<T extends object>(
  propsToIgnore: (keyof T)[]
): (prev: T, next: T) => boolean {
  return (prev: T, next: T): boolean => {
    const prevKeys = Object.keys(prev) as (keyof T)[];

    for (const key of prevKeys) {
      if (propsToIgnore.includes(key)) continue;
      if (prev[key] !== next[key]) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Deep equality check for complex objects
 * Use sparingly as it's more expensive than shallow comparison
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Debounce function - delays execution until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per wait period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastTime = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        lastTime = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  };
}

/**
 * Hook for debounced value - useful for search inputs
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay, ...deps]
  );
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), delay),
    [delay, ...deps]
  );
}

/**
 * Hook to track previous value - useful for comparison in effects
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for stable callback that doesn't trigger effect dependencies
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  );
}

/**
 * Creates a memoized component with standard comparison
 * Equivalent to React.memo but with explicit typing
 */
export function memoWithComparison<P extends object>(
  Component: React.FC<P>,
  comparator?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.MemoExoticComponent<React.FC<P>> {
  return memo(Component, comparator);
}

/**
 * List item optimization - compares only data-related props
 */
export interface ListItemProps {
  id: string | number;
  data: any;
  index: number;
  isSelected?: boolean;
  isHighlighted?: boolean;
}

export const listItemPropsComparator = createPropsComparator<ListItemProps>([
  'id',
  'data',
  'isSelected',
  'isHighlighted'
]);

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, options.threshold]);

  return [elementRef, isIntersecting];
}

/**
 * Request Animation Frame throttle for scroll handlers
 */
export function useRAFThrottle<T extends (...args: any[]) => any>(
  callback: T
): (...args: Parameters<T>) => void {
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      callbackRef.current(...args);
      rafRef.current = null;
    });
  }, []);
}

/**
 * Batch state updates for better performance
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const isScheduled = useRef(false);

  const scheduleUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);

    if (!isScheduled.current) {
      isScheduled.current = true;
      requestAnimationFrame(() => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        isScheduled.current = false;

        // Execute all updates in a batch
        updates.forEach(fn => fn());
      });
    }
  }, []);

  return scheduleUpdate;
}

export default {
  shallowEqual,
  deepEqual,
  createPropsComparator,
  createPropsComparatorIgnoring,
  debounce,
  throttle,
  useDebouncedValue,
  useDebouncedCallback,
  useThrottledCallback,
  usePrevious,
  useStableCallback,
  memoWithComparison,
  listItemPropsComparator,
  useIntersectionObserver,
  useRAFThrottle,
  useBatchedUpdates
};
