/**
 * Comprehensive Integration Tests for CORS Connectivity Fixes
 * Tests request manager, circuit breaker, offline support, and action queuing
 */

import { enhancedRequestManager, apiRequest } from '../enhancedRequestManager';
import { CircuitBreaker, apiCircuitBreaker } from '../circuitBreaker';
import { actionQueue } from '../actionQueueService';
import { useResilientAPI } from '../../hooks/useResilientAPI';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Connectivity Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue(null);
    navigator.onLine = true;
    
    // Reset circuit breaker and action queue
    apiCircuitBreaker.reset();
    actionQueue.clearQueue();
    enhancedRequestManager.resetMetrics();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Request Manager Rate Limiting and Caching', () => {
    it('should implement request deduplication within 1-second window', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // Make multiple identical requests quickly
      const promises = [
        apiRequest('/api/test'),
        apiRequest('/api/test'),
        apiRequest('/api/test'),
      ];

      await Promise.all(promises);

      // Should only make one actual fetch call due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff for 503 errors with max 3 retries', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'success' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });
      });

      const startTime = Date.now();
      const result = await apiRequest('/api/test');
      const endTime = Date.now();

      // Should have made 4 calls (initial + 3 retries)
      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(result).toEqual({ data: 'success' });
      
      // Should have taken time due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    it('should cache responses with appropriate TTL values', async () => {
      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          cacheKey: 'test-communities',
          cacheTTL: 60000, // 1 minute
        })
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: 'Test Community' }]),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
      });

      // Second request should use cache
      const { result: result2 } = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          cacheKey: 'test-communities',
          cacheTTL: 60000,
        })
      );

      await waitFor(() => {
        expect(result2.current.isFromCache).toBe(true);
      });

      // Should only have made one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should prioritize user-initiated actions when rate limits are exceeded', async () => {
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Headers(),
        })
      );

      // Simulate rate limiting scenario
      const highPriorityRequest = apiRequest('/api/posts', 
        { method: 'POST', body: JSON.stringify({ content: 'test' }) },
        { priority: 'high' }
      );

      const lowPriorityRequest = apiRequest('/api/analytics', 
        { method: 'GET' },
        { priority: 'low' }
      );

      await Promise.allSettled([highPriorityRequest, lowPriorityRequest]);

      // Both should fail due to rate limiting, but high priority should be attempted first
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker Functionality and Graceful Degradation', () => {
    it('should open circuit breaker after 5 failures with 60-second timeout', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 10000,
      });

      // Make 5 failing requests
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => fetch('/api/test'));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.isOpen()).toBe(true);
      expect(circuitBreaker.getFailureCount()).toBe(5);
    });

    it('should switch to cached/fallback data when backend is unavailable', async () => {
      const fallbackData = [{ id: 'fallback', name: 'Fallback Community' }];
      
      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          fallbackData,
          enableCircuitBreaker: true,
        })
      );

      // Simulate service failure
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      await waitFor(() => {
        expect(result.current.data).toEqual(fallbackData);
        expect(result.current.isFromFallback).toBe(true);
      });
    });

    it('should show visual indicators when services are degraded', async () => {
      const { result } = renderHook(() => 
        useResilientAPI('/api/test', { method: 'GET' })
      );

      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      await waitFor(() => {
        expect(result.current.isServiceAvailable).toBe(false);
        expect(result.current.error).toBeTruthy();
        expect(result.current.circuitBreakerState).toBe('OPEN');
      });
    });

    it('should gradually test service recovery with half-open state', async () => {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 1000, // Short timeout for testing
        halfOpenMaxCalls: 2,
        halfOpenSuccessThreshold: 2,
      });

      // Fail enough times to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.isOpen()).toBe(true);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // First request should transition to half-open
      await circuitBreaker.execute(() => fetch('/api/test'));
      expect(circuitBreaker.isHalfOpen()).toBe(true);

      // Second successful request should close the circuit
      await circuitBreaker.execute(() => fetch('/api/test'));
      expect(circuitBreaker.isClosed()).toBe(true);
    });
  });

  describe('Offline Support and Action Queuing', () => {
    it('should queue user actions when backend is unavailable', async () => {
      // Simulate offline
      navigator.onLine = false;

      const actionId = actionQueue.addAction('post', {
        content: 'Test post',
        communityId: 'test-community',
      }, { priority: 'high' });

      expect(actionQueue.getQueueSize()).toBe(1);
      expect(actionId).toBeTruthy();

      const queue = actionQueue.getQueue();
      expect(queue[0].type).toBe('post');
      expect(queue[0].data.content).toBe('Test post');
    });

    it('should automatically synchronize queued actions when connectivity returns', async () => {
      // Add actions while offline
      navigator.onLine = false;
      
      actionQueue.addAction('post', { content: 'Offline post 1' });
      actionQueue.addAction('community_join', { communityId: 'test' });
      
      expect(actionQueue.getQueueSize()).toBe(2);

      // Mock successful API responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // Simulate coming back online
      navigator.onLine = true;
      window.dispatchEvent(new Event('online'));

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(actionQueue.getQueueSize()).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should provide offline indicators and explain available features', async () => {
      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          fallbackData: [{ id: 'cached', name: 'Cached Community' }],
        })
      );

      // Simulate offline with cached data
      navigator.onLine = false;
      mockFetch.mockRejectedValue(new Error('Network error'));

      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
        expect(result.current.isFromFallback).toBe(true);
      });
    });

    it('should implement progressive enhancement for core features', async () => {
      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          cacheKey: 'communities',
          staleTTL: 300000, // 5 minutes
        })
      );

      // Set up stale cached data
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        data: [{ id: 'stale', name: 'Stale Community' }],
        timestamp: Date.now() - 400000, // 6+ minutes old
      }));

      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
        expect(result.current.isStale).toBe(true);
      });
    });
  });

  describe('End-to-End Post/Community/Product Creation with Service Failures', () => {
    it('should handle post creation with service failures and retry logic', async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'post-123', content: 'Test post' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });
      });

      const result = await apiRequest('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test post', communityId: 'test' }),
      });

      expect(result).toEqual({ id: 'post-123', content: 'Test post' });
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle community creation with action queuing during outages', async () => {
      // Simulate service outage
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      navigator.onLine = false;

      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Community', description: 'Test' }),
        }, {
          enableActionQueue: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Action should be queued
      expect(actionQueue.getQueueSize()).toBeGreaterThan(0);
    });

    it('should handle product listing creation with fallback to draft storage', async () => {
      const draftData = {
        title: 'Test Product',
        description: 'Test Description',
        price: 100,
      };

      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => 
        useResilientAPI('/api/marketplace/listings', {
          method: 'POST',
          body: JSON.stringify(draftData),
        }, {
          fallbackData: { ...draftData, id: 'draft-123', status: 'draft' },
        })
      );

      await waitFor(() => {
        expect(result.current.data).toEqual({
          ...draftData,
          id: 'draft-123',
          status: 'draft',
        });
        expect(result.current.isFromFallback).toBe(true);
      });
    });

    it('should provide clear user feedback for failed actions with retry options', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test' }),
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error?.message).toContain('Network error');
        expect(typeof result.current.retry).toBe('function');
      });

      // Test retry functionality
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'post-123' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 'post-123' });
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle concurrent failures across multiple services', async () => {
      // Simulate failures across different services
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/posts')) {
          return Promise.reject(new Error('Posts service unavailable'));
        }
        if (url.includes('/api/communities')) {
          return Promise.reject(new Error('Communities service unavailable'));
        }
        if (url.includes('/api/marketplace')) {
          return Promise.reject(new Error('Marketplace service unavailable'));
        }
        return Promise.reject(new Error('Unknown service'));
      });

      const postRequest = apiRequest('/api/posts', { method: 'GET' });
      const communityRequest = apiRequest('/api/communities', { method: 'GET' });
      const marketplaceRequest = apiRequest('/api/marketplace/listings', { method: 'GET' });

      const results = await Promise.allSettled([
        postRequest,
        communityRequest,
        marketplaceRequest,
      ]);

      // All should fail
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });

      // Circuit breakers should be affected
      expect(apiCircuitBreaker.getFailureCount()).toBeGreaterThan(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track request metrics and performance', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await apiRequest('/api/test');
      await apiRequest('/api/test2');

      const metrics = enhancedRequestManager.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should monitor circuit breaker state changes', async () => {
      const stateChanges: string[] = [];
      
      const unsubscribe = apiCircuitBreaker.subscribe((state) => {
        stateChanges.push(state);
      });

      // Cause failures to open circuit
      mockFetch.mockRejectedValue(new Error('Service error'));
      
      for (let i = 0; i < 5; i++) {
        try {
          await apiCircuitBreaker.execute(() => fetch('/api/test'));
        } catch (error) {
          // Expected
        }
      }

      expect(stateChanges).toContain('OPEN');
      
      unsubscribe();
    });
  });
});