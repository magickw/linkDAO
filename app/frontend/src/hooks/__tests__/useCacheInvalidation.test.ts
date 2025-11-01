/**
 * useCacheInvalidation Hook Tests
 * Tests the cache invalidation hook integration
 */

import { renderHook, act } from '@testing-library/react';
import { useCacheInvalidation } from '../useCacheInvalidation';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';

// Mock dependencies
jest.mock('../../services/serviceWorkerCacheService');

const mockServiceWorkerCacheService = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

describe('useCacheInvalidation Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service worker cache service methods
    mockServiceWorkerCacheService.invalidateByTag = jest.fn().mockResolvedValue(undefined);
    mockServiceWorkerCacheService.clearAllCaches = jest.fn().mockResolvedValue(undefined);
    mockServiceWorkerCacheService.flushOfflineQueue = jest.fn().mockResolvedValue(undefined);
    mockServiceWorkerCacheService.getCacheStats = jest.fn().mockResolvedValue({
      hitRates: {},
      storage: { used: 0, available: 0, percentage: 0 },
      sync: { queueSize: 0, successRate: 0, averageRetryCount: 0 },
      preload: { successRate: 0, averageLoadTime: 0, bandwidthSaved: 0 }
    });
    mockServiceWorkerCacheService.getPerformanceMetrics = jest.fn().mockReturnValue({
      summary: { hitRates: {}, preload: {}, storage: {} }
    });

    // Mock BroadcastChannel
    const mockBroadcastChannel = {
      postMessage: jest.fn(),
      close: jest.fn()
    };
    (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('invalidateByTags', () => {
    it('should invalidate cache by multiple tags', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateByTags(['feed', 'user', 'posts']);
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledTimes(3);
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('feed');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('user');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('posts');
    });

    it('should broadcast cache invalidation message', async () => {
      const mockBroadcastChannel = {
        postMessage: jest.fn(),
        close: jest.fn()
      };
      (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateByTags(['feed']);
      });

      expect(BroadcastChannel).toHaveBeenCalledWith('pwa-updates');
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_INVALIDATED',
        data: { tags: ['feed'], timestamp: expect.any(Number) }
      });
    });

    it('should handle invalidation errors gracefully', async () => {
      mockServiceWorkerCacheService.invalidateByTag.mockRejectedValue(new Error('Invalidation failed'));

      const { result } = renderHook(() => useCacheInvalidation());

      await expect(
        act(async () => {
          await result.current.invalidateByTags(['feed']);
        })
      ).rejects.toThrow('Invalidation failed');
    });
  });

  describe('invalidateUserCache', () => {
    it('should invalidate user cache with default tags', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateUserCache('user123');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('user');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('user123');
    });

    it('should invalidate user cache with specific data types', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateUserCache('user123', ['profile', 'settings']);
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('user');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('user123');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('profile');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('settings');
    });
  });

  describe('invalidateSellerCache', () => {
    it('should invalidate seller cache with wallet address', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateSellerCache('0x123...abc');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('seller');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('0x123...abc');
    });

    it('should invalidate seller cache with specific data types', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateSellerCache('0x123...abc', ['listings', 'orders']);
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('seller');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('0x123...abc');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('listings');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('orders');
    });
  });

  describe('invalidateCommunityCache', () => {
    it('should invalidate community cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateCommunityCache('community123');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('community');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('community123');
    });

    it('should invalidate community cache with specific data types', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateCommunityCache('community123', ['posts', 'members']);
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('community');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('community123');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('posts');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('members');
    });
  });

  describe('invalidateFeedCache', () => {
    it('should invalidate general feed cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateFeedCache();
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('feed');
    });

    it('should invalidate specific feed type cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateFeedCache('trending');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('feed');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('trending');
    });
  });

  describe('invalidateMarketplaceCache', () => {
    it('should invalidate general marketplace cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateMarketplaceCache();
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('marketplace');
    });

    it('should invalidate specific product cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateMarketplaceCache('product123');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('marketplace');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('product123');
    });
  });

  describe('invalidateMessagingCache', () => {
    it('should invalidate general messaging cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateMessagingCache();
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('messaging');
    });

    it('should invalidate specific conversation cache', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.invalidateMessagingCache('conversation123');
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('messaging');
      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('conversation123');
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.clearAllCaches();
      });

      expect(mockServiceWorkerCacheService.clearAllCaches).toHaveBeenCalledTimes(1);
    });

    it('should broadcast cache cleared message', async () => {
      const mockBroadcastChannel = {
        postMessage: jest.fn(),
        close: jest.fn()
      };
      (global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.clearAllCaches();
      });

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_CLEARED',
        data: { timestamp: expect.any(Number) }
      });
    });
  });

  describe('flushOfflineQueue', () => {
    it('should flush offline queue', async () => {
      const { result } = renderHook(() => useCacheInvalidation());

      await act(async () => {
        await result.current.flushOfflineQueue();
      });

      expect(mockServiceWorkerCacheService.flushOfflineQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        hitRates: { feed: { hits: 10, misses: 2, ratio: 0.83 } },
        storage: { used: 1024, available: 10240, percentage: 10 },
        sync: { queueSize: 3, successRate: 0.95, averageRetryCount: 1.2 },
        preload: { successRate: 0.88, averageLoadTime: 150, bandwidthSaved: 2048 }
      };

      mockServiceWorkerCacheService.getCacheStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useCacheInvalidation());

      let stats;
      await act(async () => {
        stats = await result.current.getCacheStats();
      });

      expect(stats).toEqual(mockStats);
      expect(mockServiceWorkerCacheService.getCacheStats).toHaveBeenCalledTimes(1);
    });

    it('should handle cache stats errors gracefully', async () => {
      mockServiceWorkerCacheService.getCacheStats.mockRejectedValue(new Error('Stats unavailable'));

      const { result } = renderHook(() => useCacheInvalidation());

      let stats;
      await act(async () => {
        stats = await result.current.getCacheStats();
      });

      expect(stats).toBeNull();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', async () => {
      const mockMetrics = {
        summary: {
          hitRates: { overall: { ratio: 0.85 } },
          preload: { successRate: 0.92 },
          storage: { used: 2048, percentage: 20 }
        }
      };

      mockServiceWorkerCacheService.getPerformanceMetrics.mockReturnValue(mockMetrics);

      const { result } = renderHook(() => useCacheInvalidation());

      let metrics;
      act(() => {
        metrics = result.current.getPerformanceMetrics();
      });

      expect(metrics).toEqual(mockMetrics);
      expect(mockServiceWorkerCacheService.getPerformanceMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle performance metrics errors gracefully', async () => {
      mockServiceWorkerCacheService.getPerformanceMetrics.mockImplementation(() => {
        throw new Error('Metrics unavailable');
      });

      const { result } = renderHook(() => useCacheInvalidation());

      let metrics;
      act(() => {
        metrics = result.current.getPerformanceMetrics();
      });

      expect(metrics).toBeNull();
    });
  });

  describe('BroadcastChannel unavailability', () => {
    it('should handle BroadcastChannel unavailability gracefully', async () => {
      (global as any).BroadcastChannel = undefined;

      const { result } = renderHook(() => useCacheInvalidation());

      // Should not throw error
      await act(async () => {
        await result.current.invalidateByTags(['feed']);
      });

      expect(mockServiceWorkerCacheService.invalidateByTag).toHaveBeenCalledWith('feed');
    });
  });
});