import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { FeedService } from '@/services/feedService';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import { intelligentCacheService } from '@/services/intelligentCacheService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/serviceWorkerCacheService');
jest.mock('@/services/intelligentCacheService');

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;
const mockIntelligentCache = intelligentCacheService as jest.Mocked<typeof intelligentCacheService>;

const mockPosts = Array.from({ length: 20 }, (_, i) => 
  testUtils.createMockPost({
    id: `post-${i}`,
    engagementScore: Math.floor(Math.random() * 1000),
    createdAt: new Date(Date.now() - i * 60 * 60 * 1000) // Staggered timestamps
  })
);

describe('Feed Caching Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testUtils.mockIntersectionObserver();
    
    // Default successful responses
    mockFeedService.getEnhancedFeed.mockResolvedValue({
      posts: mockPosts,
      hasMore: true,
      totalPages: 3
    });
    
    mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);
    mockIntelligentCache.analyzeAndPreload.mockResolvedValue(undefined);
    mockIntelligentCache.invalidateByTags.mockResolvedValue(undefined);
  });

  describe('Cache Hit Scenarios', () => {
    it('should use cached data when available', async () => {
      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts.slice(0, 10),
        hasMore: true,
        totalPages: 3
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      const startTime = performance.now();
      
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Cache hits should be very fast
      expect(renderTime).toBeLessThan(100);
      
      // Should use cache instead of making API call
      expect(mockFeedService.getEnhancedFeed).not.toHaveBeenCalled();
      expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
        expect.stringContaining('/api/feed/enhanced'),
        'feed',
        ['feed', 'posts']
      );
    });

    it('should fall back to API when cache is stale', async () => {
      // Mock stale cache response
      const staleResponse = new Response(JSON.stringify({
        posts: mockPosts.slice(0, 5),
        hasMore: true,
        totalPages: 3,
        timestamp: Date.now() - 10 * 60 * 1000 // 10 minutes old
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(staleResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Should show cached data first
      expect(screen.getAllByTestId(/post-card/)).toHaveLength(5);

      // Should then fetch fresh data
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      });
    });

    it('should handle cache corruption gracefully', async () => {
      // Mock corrupted cache response
      const corruptedResponse = new Response('invalid json');
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(corruptedResponse);

      render(<FeedPage />);

      // Should fall back to API call
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Miss Scenarios', () => {
    it('should fetch from API when cache is empty', async () => {
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);

      render(<FeedPage />);

      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledWith(
          expect.any(Object),
          1,
          20
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });

    it('should cache API response for future use', async () => {
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);

      render(<FeedPage />);

      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      });

      // Should cache the response
      expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
        expect.stringContaining('/api/feed/enhanced'),
        'feed',
        ['feed', 'posts']
      );
    });

    it('should handle API failures with cache fallback', async () => {
      // API fails
      mockFeedService.getEnhancedFeed.mockRejectedValue(new Error('Network error'));
      
      // But cache has old data
      const oldCachedResponse = new Response(JSON.stringify({
        posts: mockPosts.slice(0, 3),
        hasMore: false,
        totalPages: 1
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(oldCachedResponse);

      render(<FeedPage />);

      // Should show cached data despite API failure
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      expect(screen.getAllByTestId(/post-card/)).toHaveLength(3);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache on manual refresh', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);

      expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });

    it('should invalidate cache when filters change', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('feed-sorting-header')).toBeInTheDocument();
      });

      const newButton = screen.getByRole('button', { name: /new/i });
      await userEvent.click(newButton);

      expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });

    it('should invalidate specific community cache when switching communities', async () => {
      const { rerender } = render(<FeedPage communityId="defi" />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Switch to different community
      rerender(<FeedPage communityId="nft" />);

      expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts', 'community:defi']);
    });

    it('should handle selective cache invalidation', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate new post creation
      const newPost = testUtils.createMockPost({ id: 'new-post' });
      
      // Should invalidate only relevant cache tags
      mockIntelligentCache.invalidateByTags.mockClear();
      
      // Trigger cache invalidation for new post
      fireEvent(window, new CustomEvent('newPost', { detail: newPost }));

      expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
    });
  });

  describe('Predictive Preloading', () => {
    it('should trigger predictive preloading based on user behavior', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate user scrolling behavior
      const virtualizedList = screen.getByTestId('virtualized-list');
      fireEvent.scroll(virtualizedList, { target: { scrollTop: 200 } });

      await waitFor(() => {
        expect(mockIntelligentCache.analyzeAndPreload).toHaveBeenCalledWith(
          'current-user',
          'viewing_feed',
          expect.objectContaining({
            scrollPosition: 200,
            currentSort: expect.any(String)
          })
        );
      });
    });

    it('should preload next page when user approaches bottom', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const virtualizedList = screen.getByTestId('virtualized-list');
      
      // Scroll near bottom (80% threshold)
      fireEvent.scroll(virtualizedList, {
        target: { 
          scrollTop: 400,
          scrollHeight: 500,
          clientHeight: 100
        }
      });

      await waitFor(() => {
        expect(mockIntelligentCache.analyzeAndPreload).toHaveBeenCalledWith(
          'current-user',
          'approaching_bottom',
          expect.objectContaining({
            nextPage: 2
          })
        );
      });
    });

    it('should preload related content based on engagement patterns', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate user engaging with DeFi content
      const defiPost = screen.getAllByTestId(/post-card/)[0];
      fireEvent.click(defiPost);

      await waitFor(() => {
        expect(mockIntelligentCache.analyzeAndPreload).toHaveBeenCalledWith(
          'current-user',
          'post_engagement',
          expect.objectContaining({
            postId: expect.any(String),
            tags: expect.any(Array)
          })
        );
      });
    });
  });

  describe('Cache Strategy Optimization', () => {
    it('should use NetworkFirst strategy for fresh content', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
          expect.stringContaining('/api/feed/enhanced'),
          'feed',
          ['feed', 'posts'],
          { strategy: 'NetworkFirst', maxAge: 5 * 60 * 1000 }
        );
      });
    });

    it('should use StaleWhileRevalidate for community data', async () => {
      render(<FeedPage communityId="defi" />);

      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
          expect.stringContaining('/api/feed/enhanced'),
          'communities',
          ['feed', 'posts', 'community:defi'],
          { strategy: 'StaleWhileRevalidate', maxAge: 10 * 60 * 1000 }
        );
      });
    });

    it('should adapt cache strategy based on network conditions', async () => {
      // Simulate slow network
      testUtils.simulateNetworkCondition('slow');

      render(<FeedPage />);

      await waitFor(() => {
        expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array),
          expect.objectContaining({
            strategy: 'CacheFirst' // Should prefer cache on slow network
          })
        );
      });
    });

    it('should handle offline scenarios gracefully', async () => {
      testUtils.simulateNetworkCondition('offline');

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts.slice(0, 5),
        hasMore: false,
        totalPages: 1
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Should show cached content
      expect(screen.getAllByTestId(/post-card/)).toHaveLength(5);
      
      // Should not attempt API call when offline
      expect(mockFeedService.getEnhancedFeed).not.toHaveBeenCalled();
    });
  });

  describe('Cache Performance', () => {
    it('should handle large cache efficiently', async () => {
      const largeCachedData = {
        posts: Array.from({ length: 1000 }, (_, i) => 
          testUtils.createMockPost({ id: `cached-post-${i}` })
        ),
        hasMore: false,
        totalPages: 1
      };

      const largeResponse = new Response(JSON.stringify(largeCachedData));
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(largeResponse);

      const startTime = performance.now();

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle large cached data efficiently
      expect(renderTime).toBeLessThan(300);
    });

    it('should implement cache compression for large datasets', async () => {
      const compressedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3,
        compressed: true
      }));

      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(compressedResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Should handle compressed cache data
      expect(screen.getAllByTestId(/post-card/)).toHaveLength(10); // Virtualized rendering
    });

    it('should manage cache storage limits', async () => {
      // Simulate cache storage quota exceeded
      mockServiceWorkerCache.cacheWithStrategy.mockRejectedValue(
        new Error('QuotaExceededError')
      );

      render(<FeedPage />);

      // Should fall back to API call
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Consistency', () => {
    it('should maintain cache consistency across multiple feed instances', async () => {
      const { rerender } = render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate cache update from another instance
      const updatedPosts = [...mockPosts, testUtils.createMockPost({ id: 'new-post' })];
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: updatedPosts,
        hasMore: true,
        totalPages: 3
      });

      // Rerender should show updated data
      rerender(<FeedPage />);

      await waitFor(() => {
        expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
      });
    });

    it('should handle concurrent cache operations', async () => {
      // Render multiple feed components simultaneously
      render(
        <div>
          <FeedPage />
          <FeedPage communityId="defi" />
          <FeedPage communityId="nft" />
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('virtualized-list')).toHaveLength(3);
      });

      // Should handle concurrent cache operations without conflicts
      expect(mockServiceWorkerCache.cacheWithStrategy).toHaveBeenCalledTimes(3);
    });

    it('should synchronize cache updates across tabs', async () => {
      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Simulate cache update from another tab
      fireEvent(window, new StorageEvent('storage', {
        key: 'feed-cache-update',
        newValue: JSON.stringify({ timestamp: Date.now() })
      }));

      // Should invalidate local cache
      await waitFor(() => {
        expect(mockIntelligentCache.invalidateByTags).toHaveBeenCalledWith(['feed', 'posts']);
      });
    });
  });

  describe('Cache Analytics', () => {
    it('should track cache hit rates', async () => {
      const mockTrackCacheHit = jest.fn();
      
      jest.doMock('@/services/analyticsService', () => ({
        trackCacheHit: mockTrackCacheHit
      }));

      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      expect(mockTrackCacheHit).toHaveBeenCalledWith('feed', 'hit');
    });

    it('should track cache performance metrics', async () => {
      const mockTrackPerformance = jest.fn();
      
      jest.doMock('@/services/analyticsService', () => ({
        trackPerformance: mockTrackPerformance
      }));

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      expect(mockTrackPerformance).toHaveBeenCalledWith('feed-load', expect.any(Number));
    });
  });

  describe('Error Recovery', () => {
    it('should recover from cache corruption', async () => {
      // First attempt - corrupted cache
      mockServiceWorkerCache.cacheWithStrategy.mockRejectedValueOnce(
        new Error('Cache corruption detected')
      );

      // Second attempt - successful API call
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });

      render(<FeedPage />);

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });

      // Should recover and show content
      expect(screen.getAllByTestId(/post-card/)).toHaveLength(10);
    });

    it('should handle cache service unavailability', async () => {
      mockServiceWorkerCache.cacheWithStrategy.mockRejectedValue(
        new Error('Service Worker not available')
      );

      render(<FeedPage />);

      // Should fall back to direct API calls
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
    });
  });
});