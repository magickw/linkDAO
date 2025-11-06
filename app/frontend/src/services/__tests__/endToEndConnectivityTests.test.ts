/**
 * End-to-End Connectivity Tests
 * Tests complete workflows for post/community/product creation with service failures
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useResilientAPI } from '../../hooks/useResilientAPI';
import { enhancedRequestManager } from '../enhancedRequestManager';
import { actionQueue } from '../actionQueueService';
import { apiCircuitBreaker } from '../circuitBreaker';

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

describe('End-to-End Connectivity Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockLocalStorage.getItem.mockReturnValue(null);
    navigator.onLine = true;
    
    // Reset services
    apiCircuitBreaker.reset();
    actionQueue.clearQueue();
    enhancedRequestManager.resetMetrics();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Post Creation Workflows', () => {
    it('should handle successful post creation', async () => {
      const mockPost = {
        id: 'post-123',
        content: 'Test post content',
        communityId: 'test-community',
        authorId: 'user-456',
        createdAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPost),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            content: 'Test post content',
            communityId: 'test-community',
          }),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPost);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          content: 'Test post content',
          communityId: 'test-community',
        }),
      }));
    });

    it('should retry post creation on 503 errors with exponential backoff', async () => {
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

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test post' }),
        }, {
          retryOnMount: false,
        })
      );

      const startTime = Date.now();
      
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
        expect(result.current.loading).toBe(false);
      }, { timeout: 10000 });

      const endTime = Date.now();
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.current.data.id).toBe('post-123');
      
      // Should have taken time due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000);
    });

    it('should queue post creation when service is unavailable', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      navigator.onLine = false;

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify({
            content: 'Offline post',
            communityId: 'test-community',
          }),
        }, {
          enableActionQueue: true,
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Action should be queued
      expect(actionQueue.getQueueSize()).toBeGreaterThan(0);
    });

    it('should use fallback data for post creation when circuit is open', async () => {
      const fallbackPost = {
        id: 'draft-123',
        content: 'Test post',
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      // Open circuit breaker by causing failures
      for (let i = 0; i < 5; i++) {
        try {
          await apiCircuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected
        }
      }

      expect(apiCircuitBreaker.isOpen()).toBe(true);

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify({ content: 'Test post' }),
        }, {
          fallbackData: fallbackPost,
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(fallbackPost);
        expect(result.current.isFromFallback).toBe(true);
      });
    });
  });

  describe('Community Creation Workflows', () => {
    it('should handle successful community creation', async () => {
      const mockCommunity = {
        id: 'community-123',
        name: 'Test Community',
        description: 'A test community',
        memberCount: 1,
        createdAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCommunity),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Community',
            description: 'A test community',
          }),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCommunity);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle community creation with validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: 'Community name already exists',
          field: 'name',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(() => 
        useResilientAPI('/api/communities', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Existing Community',
            description: 'Test',
          }),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.data).toBeNull();
      });

      // Should not retry on 400 errors
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should queue community creation during service outages', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const communityData = {
        name: 'Offline Community',
        description: 'Created while offline',
      };

      actionQueue.addAction('community_create', communityData, { priority: 'high' });

      expect(actionQueue.getQueueSize()).toBe(1);

      const queue = actionQueue.getQueue();
      expect(queue[0].type).toBe('community_create');
      expect(queue[0].data).toEqual(communityData);
      expect(queue[0].priority).toBe('high');
    });

    it('should sync queued community creation when service returns', async () => {
      // Add community creation to queue while offline
      navigator.onLine = false;
      actionQueue.addAction('community_create', {
        name: 'Queued Community',
        description: 'Created while offline',
      });

      expect(actionQueue.getQueueSize()).toBe(1);

      // Mock successful response when back online
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'community-456',
          name: 'Queued Community',
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      // Simulate coming back online
      navigator.onLine = true;
      await actionQueue.processQueue();

      expect(actionQueue.getQueueSize()).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith('/api/communities', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Queued Community',
          description: 'Created while offline',
        }),
      }));
    });
  });

  describe('Product Creation Workflows', () => {
    it('should handle successful product listing creation', async () => {
      const mockProduct = {
        id: 'product-123',
        title: 'Test Product',
        description: 'A test product',
        price: 99.99,
        sellerId: 'seller-456',
        createdAt: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProduct),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const { result } = renderHook(() => 
        useResilientAPI('/api/marketplace/listings', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Test Product',
            description: 'A test product',
            price: 99.99,
          }),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProduct);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should fallback to draft storage during product creation outages', async () => {
      const productData = {
        title: 'Draft Product',
        description: 'Saved as draft',
        price: 149.99,
      };

      const draftProduct = {
        ...productData,
        id: 'draft-789',
        status: 'draft',
        createdAt: new Date().toISOString(),
      };

      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => 
        useResilientAPI('/api/marketplace/listings', {
          method: 'POST',
          body: JSON.stringify(productData),
        }, {
          fallbackData: draftProduct,
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(draftProduct);
        expect(result.current.isFromFallback).toBe(true);
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle product creation with image upload failures', async () => {
      let callCount = 0;
      mockFetch.mockImplementation((url) => {
        callCount++;
        if (url.includes('/upload') && callCount === 1) {
          return Promise.reject(new Error('Image upload failed'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'product-123',
            title: 'Product without image',
          }),
          headers: new Headers({ 'content-type': 'application/json' }),
        });
      });

      // First try to upload image, then create product without image
      try {
        await enhancedRequestManager.request('/api/upload', {
          method: 'POST',
          body: new FormData(),
        });
      } catch (error) {
        // Expected to fail
      }

      const { result } = renderHook(() => 
        useResilientAPI('/api/marketplace/listings', {
          method: 'POST',
          body: JSON.stringify({
            title: 'Product without image',
            description: 'Created without image due to upload failure',
          }),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toBeTruthy();
        expect(result.current.data.title).toBe('Product without image');
      });
    });
  });

  describe('Complex Multi-Service Scenarios', () => {
    it('should handle cascading service failures gracefully', async () => {
      // Simulate failures across multiple services
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/posts')) {
          return Promise.reject(new Error('Posts service down'));
        }
        if (url.includes('/api/communities')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
          });
        }
        if (url.includes('/api/marketplace')) {
          return Promise.reject(new Error('Marketplace service down'));
        }
        return Promise.reject(new Error('Unknown service'));
      });

      const postHook = renderHook(() => 
        useResilientAPI('/api/posts', { method: 'GET' }, {
          fallbackData: [],
          retryOnMount: false,
        })
      );

      const communityHook = renderHook(() => 
        useResilientAPI('/api/communities', { method: 'GET' }, {
          fallbackData: [],
          retryOnMount: false,
        })
      );

      const marketplaceHook = renderHook(() => 
        useResilientAPI('/api/marketplace/listings', { method: 'GET' }, {
          fallbackData: [],
          retryOnMount: false,
        })
      );

      // Trigger all requests
      act(() => {
        postHook.result.current.retry();
        communityHook.result.current.retry();
        marketplaceHook.result.current.retry();
      });

      await waitFor(() => {
        expect(postHook.result.current.data).toEqual([]);
        expect(postHook.result.current.isFromFallback).toBe(true);
      });

      await waitFor(() => {
        expect(communityHook.result.current.data).toEqual([]);
        expect(communityHook.result.current.isFromFallback).toBe(true);
      });

      await waitFor(() => {
        expect(marketplaceHook.result.current.data).toEqual([]);
        expect(marketplaceHook.result.current.isFromFallback).toBe(true);
      });

      // All should show service unavailable but with fallback data
      expect(postHook.result.current.isServiceAvailable).toBe(false);
      expect(communityHook.result.current.isServiceAvailable).toBe(false);
      expect(marketplaceHook.result.current.isServiceAvailable).toBe(false);
    });

    it('should prioritize critical actions during partial service outages', async () => {
      // Mock partial service availability
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/posts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'post-123' }),
            headers: new Headers({ 'content-type': 'application/json' }),
          });
        }
        return Promise.reject(new Error('Service unavailable'));
      });

      // Add actions with different priorities
      actionQueue.addAction('post', { content: 'Critical post' }, { priority: 'high' });
      actionQueue.addAction('like', { postId: 'post-456' }, { priority: 'low' });
      actionQueue.addAction('comment', { content: 'Important comment' }, { priority: 'medium' });

      await actionQueue.processQueue();

      // High priority post should succeed
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', expect.any(Object));
      
      // Other actions should remain in queue due to service failures
      const remainingQueue = actionQueue.getQueue();
      expect(remainingQueue.length).toBeGreaterThan(0);
      expect(remainingQueue.some(action => action.type === 'like')).toBe(true);
      expect(remainingQueue.some(action => action.type === 'comment')).toBe(true);
    });

    it('should handle mixed success and failure scenarios', async () => {
      let postCallCount = 0;
      let communityCallCount = 0;

      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/posts')) {
          postCallCount++;
          if (postCallCount <= 1) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'post-123' }),
            headers: new Headers({ 'content-type': 'application/json' }),
          });
        }
        
        if (url.includes('/api/communities')) {
          communityCallCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'community-456' }),
            headers: new Headers({ 'content-type': 'application/json' }),
          });
        }
        
        return Promise.reject(new Error('Unknown endpoint'));
      });

      // Queue multiple actions
      actionQueue.addAction('post', { content: 'Test post' });
      actionQueue.addAction('community_create', { name: 'Test Community' });

      // First processing - post fails, community succeeds
      await actionQueue.processQueue();
      
      expect(actionQueue.getQueueSize()).toBe(1); // Post should remain for retry
      
      // Second processing - post should succeed
      await actionQueue.processQueue();
      
      expect(actionQueue.getQueueSize()).toBe(0); // All actions processed
      expect(postCallCount).toBe(2); // Post was retried
      expect(communityCallCount).toBe(1); // Community succeeded first time
    });
  });

  describe('User Experience and Feedback', () => {
    it('should provide clear error messages for different failure types', async () => {
      const scenarios = [
        {
          error: { status: 404 },
          expectedMessage: 'The requested resource was not found',
        },
        {
          error: { status: 429 },
          expectedMessage: 'Too many requests. Please try again later',
        },
        {
          error: { status: 500 },
          expectedMessage: 'Server error. Please try again',
        },
        {
          error: { status: 503 },
          expectedMessage: 'Service temporarily unavailable',
        },
        {
          error: new Error('Network error'),
          expectedMessage: 'Network error. Please check your connection',
        },
      ];

      for (const scenario of scenarios) {
        mockFetch.mockRejectedValueOnce(scenario.error);

        const { result } = renderHook(() => 
          useResilientAPI('/api/test', { method: 'GET' }, {
            retryOnMount: false,
          })
        );

        act(() => {
          result.current.retry();
        });

        await waitFor(() => {
          expect(result.current.error).toBeTruthy();
        });

        // Error message should be user-friendly
        expect(result.current.error.message).toContain(
          scenario.expectedMessage.split('.')[0] // Check first part of message
        );
      }
    });

    it('should provide retry functionality with success feedback', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', { method: 'GET' }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(typeof result.current.retry).toBe('function');
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'post-123' }]),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([{ id: 'post-123' }]);
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
      });
    });

    it('should show loading states during retry attempts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
            headers: new Headers({ 'content-type': 'application/json' }),
          }), 100)
        )
      );

      const { result } = renderHook(() => 
        useResilientAPI('/api/test', { method: 'GET' }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      // Should show loading state
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBeTruthy();
      });
    });

    it('should preserve user input during error recovery', async () => {
      const userInput = {
        title: 'User typed this',
        content: 'Important user content that should not be lost',
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => 
        useResilientAPI('/api/posts', {
          method: 'POST',
          body: JSON.stringify(userInput),
        }, {
          retryOnMount: false,
        })
      );

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // User input should be preserved in the request
      expect(mockFetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        body: JSON.stringify(userInput),
      }));

      // Retry should use the same input
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'post-123', ...userInput }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual({ id: 'post-123', ...userInput });
      });
    });
  });
});