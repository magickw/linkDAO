import { useRef, useCallback, useMemo, useState } from 'react';

/**
 * Debounce hook to prevent excessive function calls
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Throttle hook to limit function execution frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Stable array comparison for useEffect dependencies
 */
export function useStableArray<T>(array: T[]): T[] {
  const stableRef = useRef<T[]>(array);
  
  return useMemo(() => {
    if (array.length !== stableRef.current.length) {
      stableRef.current = array;
      return array;
    }
    
    const hasChanged = array.some((item, index) => item !== stableRef.current[index]);
    if (hasChanged) {
      stableRef.current = array;
      return array;
    }
    
    return stableRef.current;
  }, [array]);
}

/**
 * Stable object comparison for useEffect dependencies
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  const stableRef = useRef<T>(obj);
  
  return useMemo(() => {
    const keys = Object.keys(obj);
    const stableKeys = Object.keys(stableRef.current);
    
    if (keys.length !== stableKeys.length) {
      stableRef.current = obj;
      return obj;
    }
    
    const hasChanged = keys.some(key => obj[key] !== stableRef.current[key]);
    if (hasChanged) {
      stableRef.current = obj;
      return obj;
    }
    
    return stableRef.current;
  }, [obj]);
}

/**
 * Prevent rapid state updates
 */
export function useStableState<T>(
  initialValue: T,
  compareFunction?: (a: T, b: T) => boolean
): [T, (value: T) => void] {
  const [state, setState] = useState(initialValue);
  const lastValueRef = useRef<T>(initialValue);
  
  const setStableState = useCallback((newValue: T) => {
    const hasChanged = compareFunction 
      ? !compareFunction(lastValueRef.current, newValue)
      : lastValueRef.current !== newValue;
      
    if (hasChanged) {
      lastValueRef.current = newValue;
      setState(newValue);
    }
  }, [compareFunction]);
  
  return [state, setStableState];
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private lastCallTime = 0;
  private pendingTimeout: NodeJS.Timeout | null = null;
  
  constructor(private minInterval: number) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall >= this.minInterval) {
      this.lastCallTime = now;
      return fn();
    }
    
    // Wait for the remaining time
    const waitTime = this.minInterval - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.lastCallTime = Date.now();
    return fn();
  }
  
  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.pendingTimeout) {
        clearTimeout(this.pendingTimeout);
      }
      
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      const waitTime = Math.max(0, this.minInterval - timeSinceLastCall);
      
      this.pendingTimeout = setTimeout(async () => {
        try {
          this.lastCallTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, waitTime);
    });
  }
}

/**
 * Batch updates to prevent excessive re-renders
 */
export function useBatchedUpdates<T>() {
  const [updates, setUpdates] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const addUpdate = useCallback((update: T) => {
    setUpdates(prev => [...prev, update]);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setUpdates([]);
    }, 100); // Batch updates for 100ms
  }, []);
  
  const clearUpdates = useCallback(() => {
    setUpdates([]);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  return { updates, addUpdate, clearUpdates };
}

export default {
  useDebounce,
  useThrottle,
  useStableArray,
  useStableObject,
  useStableState,
  RateLimiter,
  useBatchedUpdates
};