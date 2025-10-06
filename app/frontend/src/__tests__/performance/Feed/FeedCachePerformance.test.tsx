import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedPage } from '@/components/Feed/FeedPage';
import { PostComposer } from '@/components/Feed/PostComposer';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import { intelligentCacheService } from '@/services/intelligentCacheService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/serviceWorkerCacheService');
jest.mock('@/services/intelligentCacheService');

const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;
const mockIntelligentCache = intelligentCacheService as jest.Mocked<typeof intelligentCacheService>;

// Performance monitoring utilities
class CachePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startMeasurement(operation: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      this.metrics.get(operation)!.push(duration);
      
      return duration;
    };
  }
  
  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  getPercentile(operation: string, percentile: number): number {
    const times = this.metrics.get(operation) || [];
    if (times.length === 0) return 0;
    
    const sorted = times.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  clear() {
    this.metrics.clear();
  }
}

const performanceMonitor = new CachePerformanceMonitor();

describe('Feed Cache Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.clear();
    testUtils.mockIntersectionObserver();
    testUtils.mockResizeObserver();
  });

  describe('Cache Hit Performance', () => {
    it('should achieve sub-50ms cache hit times', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      const measurements: number[] = [];

      // Test multiple cache hits
      for (let i = 0; i < 10; i++) {
        const endMeasurement = performanceMonitor.startMeasurement('cache-hit');
        
        const { unmount } = render(<FeedPage />);

        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });

        const hitTime = endMeasurement();
        measurements.push(hitTime);

        unmount();
      }

      const averageHitTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const p95HitTime = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];

      expect(averageHitTime).toBeLessThan(50);
      expect(p95HitTime).toBeLessThan(100);
    });

    it('should handle large cached datasets efficiently', async () => {
      const largeCachedData = Array.from({ length: 1000 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          contentCid: 'x'.repeat(500), // Larger content
          reactions: Array.from({ length: 10 }, (_, j) => ({
            type: '🔥',
            users: Array.from({ length: 5 }, (_, k) => ({
              address: `0xuser${i}-${j}-${k}`,
              username: `user${i}-${j}-${k}`,
              avatar: `/avatar-${i}-${j}-${k}.png`,
              amount: 1,
              timestamp: new Date()
            })),
            totalAmount: 5,
            tokenType: 'LDAO'
          }))
        })
      );

      const largeResponse = new Response(JSON.stringify({
        posts: largeCachedData,
        hasMore: false,
        totalPages: 1
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(largeResponse);

      const endMeasurement = performanceMonitor.startMeasurement('large-cache-hit');

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const renderTime = endMeasurement();

      // Should handle large cached data within reasonable time
      expect(renderTime).toBeLessThan(200);
    });

    it('should optimize cache deserialization performance', async () => {
      const complexPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          previews: Array.from({ length: 5 }, (_, j) => ({
            type: 'link',
            url: `https://example${j}.com`,
            data: {
              title: `Preview ${j}`,
              description: 'x'.repeat(200),
              image: `https://example${j}.com/image.jpg`,
              metadata: {
                author: `Author ${j}`,
                publishedAt: new Date().toISOString(),
                tags: Array.from({ length: 10 }, (_, k) => `tag${k}`)
              }
            }
          })),
          socialProof: {
            followedUsersWhoEngaged: Array.from({ length: 20 }, (_, j) => ({
              id: `user-${j}`,
              address: `0xuser${j}`,
              username: `user${j}`,
              displayName: `User ${j}`,
              avatar: `/avatar-${j}.png`,
              verified: j % 3 === 0,
              reputation: Math.floor(Math.random() * 1000)
            })),
            totalEngagementFromFollowed: 20,
            communityLeadersWhoEngaged: [],
            verifiedUsersWhoEngaged: []
          }
        })
      );

      const complexResponse = new Response(JSON.stringify({
        posts: complexPosts,
        hasMore: true,
        totalPages: 5
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(complexResponse);

      const deserializationTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        const { unmount } = render(<FeedPage />);

        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });

        const endTime = performance.now();
        deserializationTimes.push(endTime - startTime);

        unmount();
      }

      const averageTime = deserializationTimes.reduce((a, b) => a + b, 0) / deserializationTimes.length;

      // Complex data deserialization should still be fast
      expect(averageTime).toBeLessThan(150);
    });
  });

  describe('Cache Miss Performance', () => {
    it('should handle cache misses efficiently', async () => {
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);

      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      // Mock API response time
      const mockFeedService = require('@/services/feedService').FeedService;
      mockFeedService.getEnhancedFeed.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          posts: mockPosts,
          hasMore: true,
          totalPages: 3
        }), 50)) // 50ms API response
      );

      const endMeasurement = performanceMonitor.startMeasurement('cache-miss');

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const totalTime = endMeasurement();

      // Cache miss should complete within reasonable time
      expect(totalTime).toBeLessThan(200);
    });

    it('should optimize concurrent cache miss handling', async () => {
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);

      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const mockFeedService = require('@/services/feedService').FeedService;
      let apiCallCount = 0;
      
      mockFeedService.getEnhancedFeed.mockImplementation(() => {
        apiCallCount++;
        return Promise.resolve({
          posts: mockPosts,
          hasMore: true,
          totalPages: 3
        });
      });

      const startTime = performance.now();

      // Render multiple feed components simultaneously
      render(
        <div>
          <FeedPage />
          <FeedPage />
          <FeedPage />
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('virtualized-list')).toHaveLength(3);
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(300);
      
      // Should deduplicate API calls
      expect(apiCallCount).toBeLessThan(3);
    });
  });

  describe('Cache Invalidation Performance', () => {
    it('should perform fast cache invalidation', async () => {
      const mockPosts = Array.from({ length: 50 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
      mockIntelligentCache.invalidateByTags.mockResolvedValue(undefined);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const invalidationTimes: number[] = [];

      // Test multiple invalidations
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);

        await waitFor(() => {
          expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalled();
        });

        const endTime = performance.now();
        invalidationTimes.push(endTime - startTime);

        mockIntelligentCache.invalidateByTags.mockClear();
      }

      const averageInvalidationTime = invalidationTimes.reduce((a, b) => a + b, 0) / invalidationTimes.length;

      // Cache invalidation should be very fast
      expect(averageInvalidationTime).toBeLessThan(10);
    });

    it('should handle selective invalidation efficiently', async () => {
      const mockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 5
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
      mockIntelligentCache.invalidateByTags.mockResolvedValue(undefined);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const selectiveInvalidationTimes: number[] = [];

      // Test selective invalidation with different tag combinations
      const tagCombinations = [
        ['feed'],
        ['posts'],
        ['feed', 'posts'],
        ['community:defi'],
        ['user:specific'],
        ['feed', 'posts', 'community:defi', 'user:specific']
      ];

      for (const tags of tagCombinations) {
        const startTime = performance.now();
        
        // Simulate selective invalidation
        await mockIntelligentCache.invalidateByTags(tags);

        const endTime = performance.now();
        selectiveInvalidationTimes.push(endTime - startTime);
      }

      const averageSelectiveTime = selectiveInvalidationTimes.reduce((a, b) => a + b, 0) / selectiveInvalidationTimes.length;

      // Selective invalidation should be efficient regardless of tag count
      expect(averageSelectiveTime).toBeLessThan(5);
    });
  });

  describe('Predictive Preloading Performance', () => {
    it('should perform predictive preloading without blocking UI', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
      
      // Mock slow predictive preloading
      mockIntelligentCache.analyzeAndPreload.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const renderStartTime = performance.now();

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const renderEndTime = performance.now();
      const renderTime = renderEndTime - renderStartTime;

      // UI rendering should not be blocked by predictive preloading
      expect(renderTime).toBeLessThan(100);

      // Predictive preloading should happen in background
      await waitFor(() => {
        expect(mockIntelligentCache.analyzeAndPreload).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should optimize preloading based on user behavior patterns', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
      mockIntelligentCache.analyzeAndPreload.mockResolvedValue(undefined);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      const preloadingTimes: number[] = [];

      // Simulate various user behaviors
      const behaviors = [
        () => fireEvent.scroll(virtualizedList, { target: { scrollTop: 100 } }),
        () => fireEvent.scroll(virtualizedList, { target: { scrollTop: 200 } }),
        () => fireEvent.scroll(virtualizedList, { target: { scrollTop: 300 } }),
        () => fireEvent.click(screen.getAllByTestId(/post-card/)[0]),
        () => fireEvent.scroll(virtualizedList, { target: { scrollTop: 400 } })
      ];

      for (const behavior of behaviors) {
        const startTime = performance.now();
        
        behavior();

        await waitFor(() => {
          expect(mockIntelligentCache.analyzeAndPreload).toHaveBeenCalled();
        });

        const endTime = performance.now();
        preloadingTimes.push(endTime - startTime);

        mockIntelligentCache.analyzeAndPreload.mockClear();
      }

      const averagePreloadTime = preloadingTimes.reduce((a, b) => a + b, 0) / preloadingTimes.length;

      // Predictive preloading should be fast and responsive
      expect(averagePreloadTime).toBeLessThan(50);
    });
  });

  describe('Memory Performance', () => {
    it('should manage cache memory efficiently', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Create large cached dataset
      const largePosts = Array.from({ length: 500 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          contentCid: 'x'.repeat(1000),
          reactions: Array.from({ length: 20 }, () => ({
            type: '🔥',
            users: Array.from({ length: 10 }, (_, j) => ({
              address: `0x${'1'.repeat(40)}`,
              username: `user${j}`,
              avatar: `/avatar${j}.png`,
              amount: 1,
              timestamp: new Date()
            })),
            totalAmount: 10,
            tokenType: 'LDAO'
          }))
        })
      );

      const largeResponse = new Response(JSON.stringify({
        posts: largePosts,
        hasMore: false,
        totalPages: 1
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(largeResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const peakMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = peakMemory - initialMemory;

      // Memory increase should be reasonable despite large dataset
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
    });

    it('should clean up cache memory on component unmount', async () => {
      const mockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 5
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      const { unmount } = render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const beforeUnmount = (performance as any).memory?.usedJSHeapSize || 0;

      unmount();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const afterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryFreed = beforeUnmount - afterUnmount;

      // Should free significant memory on unmount
      expect(memoryFreed).toBeGreaterThan(beforeUnmount * 0.1);
    });
  });

  describe('Network Performance', () => {
    it('should optimize cache performance under different network conditions', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const networkConditions = ['online', 'slow', 'offline'] as const;
      const performanceResults: Record<string, number> = {};

      for (const condition of networkConditions) {
        testUtils.simulateNetworkCondition(condition);

        if (condition === 'offline') {
          const cachedResponse = new Response(JSON.stringify({
            posts: mockPosts,
            hasMore: true,
            totalPages: 3
          }));
          mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
        } else {
          mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);
        }

        const startTime = performance.now();

        const { unmount } = render(<FeedPage />);

        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });

        const endTime = performance.now();
        performanceResults[condition] = endTime - startTime;

        unmount();
      }

      // Offline (cache-only) should be fastest
      expect(performanceResults.offline).toBeLessThan(performanceResults.online);
      expect(performanceResults.offline).toBeLessThan(performanceResults.slow);

      // All conditions should complete within reasonable time
      Object.values(performanceResults).forEach(time => {
        expect(time).toBeLessThan(500);
      });
    });

    it('should handle cache warming efficiently', async () => {
      const mockPosts = Array.from({ length: 50 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);
      
      const mockFeedService = require('@/services/feedService').FeedService;
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });

      const warmingTimes: number[] = [];

      // Test cache warming performance
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        const { unmount } = render(<FeedPage />);

        await waitFor(() => {
          expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        });

        const endTime = performance.now();
        warmingTimes.push(endTime - startTime);

        unmount();
      }

      const averageWarmingTime = warmingTimes.reduce((a, b) => a + b, 0) / warmingTimes.length;

      // Cache warming should be efficient
      expect(averageWarmingTime).toBeLessThan(200);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent cache operations efficiently', async () => {
      const mockPosts = Array.from({ length: 30 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      const startTime = performance.now();

      // Simulate concurrent operations
      const operations = [
        render(<FeedPage />),
        render(<FeedPage communityId="defi" />),
        render(<PostComposer />)
      ];

      await Promise.all([
        waitFor(() => expect(screen.getAllByTestId('virtualized-list')).toHaveLength(2)),
        waitFor(() => expect(screen.getByText('Create Post')).toBeInTheDocument())
      ]);

      const endTime = performance.now();
      const concurrentTime = endTime - startTime;

      // Concurrent operations should complete efficiently
      expect(concurrentTime).toBeLessThan(300);

      // Clean up
      operations.forEach(({ unmount }) => unmount());
    });

    it('should optimize cache access patterns', async () => {
      const mockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 5
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const accessTimes: number[] = [];

      // Simulate rapid cache access patterns
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();

        // Trigger cache access through scroll
        const virtualizedList = screen.getByTestId('virtualized-list');
        fireEvent.scroll(virtualizedList, { target: { scrollTop: i * 50 } });

        const endTime = performance.now();
        accessTimes.push(endTime - startTime);
      }

      const averageAccessTime = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;

      // Cache access should be very fast
      expect(averageAccessTime).toBeLessThan(5);
    });
  });
});