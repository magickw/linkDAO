import { useState, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
  onError?: (error: string) => void;
}

interface RateLimitState {
  isRateLimited: boolean;
  remainingRequests: number;
  resetTime: number | null;
}

/**
 * Custom hook for implementing client-side rate limiting
 * @param config - Rate limiting configuration
 * @returns Object containing rate limit state and a wrapped function executor
 */
export function useRateLimit<T extends (...args: any[]) => Promise<any>>(
  config: RateLimitConfig
): {
  state: RateLimitState;
  execute: T;
  reset: () => void;
  setFunction: (fn: T) => void;
} {
  const { maxRequests, timeWindow, onError } = config;
  const [state, setState] = useState<RateLimitState>({
    isRateLimited: false,
    remainingRequests: maxRequests,
    resetTime: null,
  });

  const requestTimestamps = useRef<number[]>([]);
  const wrappedFunctionRef = useRef<T | null>(null);

  // Clean up old timestamps outside the time window
  const cleanupTimestamps = useCallback(() => {
    const now = Date.now();
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => now - timestamp < timeWindow
    );
  }, [timeWindow]);

  // Check if we're within rate limits
  const isWithinRateLimit = useCallback(() => {
    cleanupTimestamps();
    return requestTimestamps.current.length < maxRequests;
  }, [cleanupTimestamps, maxRequests]);

  // Update rate limit state
  const updateRateLimitState = useCallback(() => {
    cleanupTimestamps();
    const remaining = maxRequests - requestTimestamps.current.length;
    const now = Date.now();
    const resetTime = requestTimestamps.current[0] 
      ? requestTimestamps.current[0] + timeWindow 
      : null;

    setState({
      isRateLimited: remaining <= 0,
      remainingRequests: Math.max(0, remaining),
      resetTime,
    });
  }, [cleanupTimestamps, maxRequests, timeWindow]);

  // Execute function with rate limiting
  const execute = useCallback(async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    if (!wrappedFunctionRef.current) {
      const errorMessage = 'No function provided to rate limiter';
      onError?.(errorMessage);
      return null;
    }

    if (!isWithinRateLimit()) {
      const errorMessage = `Rate limit exceeded. Please try again later.`;
      onError?.(errorMessage);
      setState(prev => ({ ...prev, isRateLimited: true }));
      return null;
    }

    try {
      // Record this request BEFORE execution
      requestTimestamps.current.push(Date.now());
      updateRateLimitState();

      // Execute the wrapped function
      return await wrappedFunctionRef.current(...args);
    } catch (error) {
      // On error, we don't want to consume the request, so we remove it from timestamps
      requestTimestamps.current.pop();
      updateRateLimitState();
      
      onError?.(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }, [isWithinRateLimit, onError, updateRateLimitState]) as T;

  // Reset rate limit state
  const reset = useCallback(() => {
    requestTimestamps.current = [];
    setState({
      isRateLimited: false,
      remainingRequests: maxRequests,
      resetTime: null,
    });
  }, [maxRequests]);

  // Set the function to be rate limited
  const setFunction = useCallback((fn: T) => {
    wrappedFunctionRef.current = fn;
  }, []);

  return {
    state,
    execute,
    reset,
    // Expose setFunction for external use
    setFunction: setFunction as (fn: T) => void,
  };
}

// Specific rate limiters for common use cases
export function useAIPostRateLimit() {
  return useRateLimit({
    maxRequests: 5,
    timeWindow: 60000, // 1 minute
    onError: (error) => console.warn('AI Post Rate Limit:', error),
  });
}

export function useAIRecommendationRateLimit() {
  return useRateLimit({
    maxRequests: 10,
    timeWindow: 60000, // 1 minute
    onError: (error) => console.warn('AI Recommendation Rate Limit:', error),
  });
}

export function useCommunityJoinRateLimit() {
  return useRateLimit({
    maxRequests: 20,
    timeWindow: 60000, // 1 minute
    onError: (error) => console.warn('Community Join Rate Limit:', error),
  });
}

export default useRateLimit;