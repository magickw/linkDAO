import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { PostComposer } from '@/components/Feed/PostComposer';
import { FeedService } from '@/services/feedService';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import testUtils from '../../setup/testSetup';

// Mock dependencies
jest.mock('@/services/feedService');
jest.mock('@/services/serviceWorkerCacheService');
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    switchNetwork: jest.fn()
  })
}));
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn(),
    removeToast: jest.fn(),
    toasts: []
  })
}));

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;
const mockServiceWorkerCache = serviceWorkerCacheService as jest.Mocked<typeof serviceWorkerCacheService>;

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  
  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return duration;
    };
  }
  
  getAverageTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  }
  
  getMaxTime(name: string): number {
    const times = this.measurements.get(name) || [];
    return times.length > 0 ? Math.max(...times) : 0;
  }
  
  clear() {
    this.measurements.clear();
  }
}

const performanceMonitor = new PerformanceMonitor();

describe('Feed Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.clear();
    
    // Mock IntersectionObserver
    testUtils.mockIntersectionObserver();
    
    // Mock ResizeObserver
    testUtils.mockResizeObserver();
  });

  describe('Initial Render Performance', () => {
    it('should render feed page within performance budget', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 5
      });
      
      const endMeasurement = performanceMonitor.startMeasurement('initial-render');
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const renderTime = endMeasurement();
      
      // Should render within 200ms
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle large feed data efficiently', async () => {
      const largeFeed = Array.from({ length: 1000 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          engagementScore: Math.floor(Math.random() * 2000),
          reactions: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
            type: '🔥',
            users: Array.from({ length: Math.floor(Math.random() * 20) }, (_, k) => ({
              address: `0xuser${i}-${j}-${k}`,
              username: `user${i}-${j}-${k}`,
              avatar: `/avatars/user${i}-${j}-${k}.png`,
              amount: Math.floor(Math.random() * 10) + 1,
              timestamp: new Date()
            })),
            totalAmount: Math.floor(Math.random() * 100),
            tokenType: 'LDAO'
          }))
        })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeFeed,
        hasMore: false,
        totalPages: 1
      });
      
      const endMeasurement = performanceMonitor.startMeasurement('large-feed-render');
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const renderTime = endMeasurement();
      
      // Should handle large dataset efficiently
      expect(renderTime).toBeLessThan(500);
    });

    it('should optimize memory usage with virtualization', async () => {
      const largeFeed = Array.from({ length: 500 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: largeFeed,
        hasMore: false,
        totalPages: 1
      });
      
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      // Should only render visible items
      const renderedPosts = screen.getAllByRole('article');
      expect(renderedPosts.length).toBeLessThan(50); // Much less than total 500
    });
  });

  describe('Scroll Performance', () => {
    it('should maintain smooth scrolling with large datasets', async () => {
      const mockPosts = Array.from({ length: 100 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 10
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      
      // Measure scroll performance
      const scrollTimes: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        
        fireEvent.scroll(virtualizedList, { 
          target: { scrollTop: i * 100 } 
        });
        
        const endTime = performance.now();
        scrollTimes.push(endTime - startTime);
      }
      
      const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      const maxScrollTime = Math.max(...scrollTimes);
      
      // Scroll operations should be fast
      expect(averageScrollTime).toBeLessThan(5);
      expect(maxScrollTime).toBeLessThan(16); // 60fps threshold
    });

    it('should handle rapid scroll events efficiently', async () => {
      const mockPosts = Array.from({ length: 200 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 20
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      
      const endMeasurement = performanceMonitor.startMeasurement('rapid-scroll');
      
      // Simulate rapid scrolling
      for (let i = 0; i < 100; i++) {
        fireEvent.scroll(virtualizedList, { 
          target: { scrollTop: Math.random() * 10000 } 
        });
      }
      
      const scrollTime = endMeasurement();
      
      // Should handle rapid scroll events efficiently
      expect(scrollTime).toBeLessThan(100);
    });

    it('should optimize infinite scroll loading', async () => {
      // First page
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: Array.from({ length: 20 }, (_, i) => 
          testUtils.createMockPost({ id: `post-page1-${i}` })
        ),
        hasMore: true,
        totalPages: 5
      });
      
      // Second page
      mockFeedService.getEnhancedFeed.mockResolvedValueOnce({
        posts: Array.from({ length: 20 }, (_, i) => 
          testUtils.createMockPost({ id: `post-page2-${i}` })
        ),
        hasMore: true,
        totalPages: 5
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const virtualizedList = screen.getByTestId('virtualized-list');
      
      const endMeasurement = performanceMonitor.startMeasurement('infinite-scroll-load');
      
      // Trigger infinite scroll
      fireEvent.scroll(virtualizedList, { target: { scrollTop: 5000 } });
      
      await waitFor(() => {
        expect(mockFeedService.getEnhancedFeed).toHaveBeenCalledTimes(2);
      });
      
      const loadTime = endMeasurement();
      
      // Infinite scroll should trigger quickly
      expect(loadTime).toBeLessThan(100);
    });
  });

  describe('Interaction Performance', () => {
    it('should handle rapid user interactions efficiently', async () => {
      const mockPosts = Array.from({ length: 10 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const endMeasurement = performanceMonitor.startMeasurement('rapid-interactions');
      
      // Simulate rapid interactions
      const buttons = screen.getAllByRole('button');
      for (let i = 0; i < 50; i++) {
        const randomButton = buttons[Math.floor(Math.random() * buttons.length)];
        if (randomButton && !randomButton.disabled) {
          fireEvent.click(randomButton);
        }
      }
      
      const interactionTime = endMeasurement();
      
      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(200);
    });

    it('should optimize reaction button performance', async () => {
      const mockOnReaction = jest.fn().mockResolvedValue(undefined);
      const mockPosts = Array.from({ length: 5 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });
      
      render(<FeedPage onReaction={mockOnReaction} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const reactionButtons = screen.getAllByRole('button', { name: /🔥/ });
      
      const reactionTimes: number[] = [];
      
      // Test multiple reaction clicks
      for (let i = 0; i < reactionButtons.length; i++) {
        const startTime = performance.now();
        
        await userEvent.click(reactionButtons[i]);
        
        const endTime = performance.now();
        reactionTimes.push(endTime - startTime);
      }
      
      const averageReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
      
      // Reaction clicks should be responsive
      expect(averageReactionTime).toBeLessThan(50);
    });
  });

  describe('Caching Performance', () => {
    it('should optimize cache hit performance', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      // Mock cache hit
      const cachedResponse = new Response(JSON.stringify({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      }));
      
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(cachedResponse);
      
      const endMeasurement = performanceMonitor.startMeasurement('cache-hit-render');
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const renderTime = endMeasurement();
      
      // Cache hits should be very fast
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle cache miss gracefully', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      // Mock cache miss
      mockServiceWorkerCache.cacheWithStrategy.mockResolvedValue(null);
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });
      
      const endMeasurement = performanceMonitor.startMeasurement('cache-miss-render');
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const renderTime = endMeasurement();
      
      // Cache misses should still be reasonably fast
      expect(renderTime).toBeLessThan(300);
    });

    it('should optimize predictive preloading performance', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: true,
        totalPages: 3
      });
      
      const mockPredictivePreload = jest.fn();
      
      jest.doMock('@/hooks/useIntelligentCache', () => ({
        useIntelligentCache: () => ({
          cacheWithStrategy: mockServiceWorkerCache.cacheWithStrategy,
          invalidateByTags: jest.fn(),
          predictivePreload: mockPredictivePreload
        })
      }));
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      // Predictive preloading should not block rendering
      await waitFor(() => {
        expect(mockPredictivePreload).toHaveBeenCalled();
      }, { timeout: 2000 });
      
      // Should not impact main thread performance
      const performanceEntries = performance.getEntriesByType('measure');
      const longTasks = performanceEntries.filter(entry => entry.duration > 50);
      
      expect(longTasks.length).toBe(0);
    });
  });

  describe('Post Composer Performance', () => {
    it('should handle text input efficiently', async () => {
      render(<PostComposer />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      
      const inputTimes: number[] = [];
      const longText = 'A'.repeat(1000);
      
      // Measure typing performance
      for (let i = 0; i < longText.length; i += 10) {
        const startTime = performance.now();
        
        fireEvent.change(textArea, { 
          target: { value: longText.substring(0, i + 10) } 
        });
        
        const endTime = performance.now();
        inputTimes.push(endTime - startTime);
      }
      
      const averageInputTime = inputTimes.reduce((a, b) => a + b, 0) / inputTimes.length;
      
      // Text input should be responsive
      expect(averageInputTime).toBeLessThan(5);
    });

    it('should optimize media upload performance', async () => {
      render(<PostComposer />);
      
      const files = Array.from({ length: 5 }, (_, i) => 
        new File([`content-${i}`], `test-${i}.jpg`, { type: 'image/jpeg' })
      );
      
      const mediaZone = screen.getByTestId('media-upload-zone');
      
      const endMeasurement = performanceMonitor.startMeasurement('media-upload');
      
      fireEvent.drop(mediaZone, {
        dataTransfer: { files }
      });
      
      await waitFor(() => {
        expect(screen.getByText('test-0.jpg')).toBeInTheDocument();
      });
      
      const uploadTime = endMeasurement();
      
      // Media upload processing should be efficient
      expect(uploadTime).toBeLessThan(200);
    });

    it('should debounce auto-save efficiently', async () => {
      const mockSaveDraft = jest.fn();
      
      jest.doMock('@/services/draftService', () => ({
        saveDraft: mockSaveDraft,
        getDraft: jest.fn().mockResolvedValue(null),
        clearDraft: jest.fn()
      }));
      
      render(<PostComposer enableDrafts={true} />);
      
      const textArea = screen.getByPlaceholderText("What's on your mind?");
      
      const endMeasurement = performanceMonitor.startMeasurement('auto-save-debounce');
      
      // Rapid typing
      for (let i = 0; i < 50; i++) {
        fireEvent.change(textArea, { 
          target: { value: `Content ${i}` } 
        });
      }
      
      const typingTime = endMeasurement();
      
      // Typing should not be blocked by auto-save
      expect(typingTime).toBeLessThan(100);
      
      // Auto-save should be debounced
      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources properly', async () => {
      const mockPosts = Array.from({ length: 50 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: mockPosts,
        hasMore: false,
        totalPages: 1
      });
      
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
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterUnmount = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDifference = beforeUnmount - afterUnmount;
      
      // Should clean up significant memory (at least 10% of what was used)
      expect(memoryDifference).toBeGreaterThan(beforeUnmount * 0.1);
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large dataset
      const hugeFeed = Array.from({ length: 2000 }, (_, i) => 
        testUtils.createMockPost({
          id: `post-${i}`,
          // Add large content to simulate memory pressure
          contentCid: 'x'.repeat(1000),
          reactions: Array.from({ length: 100 }, (_, j) => ({
            type: '🔥',
            users: Array.from({ length: 50 }, (_, k) => ({
              address: `0x${'1'.repeat(40)}`,
              username: `user-${i}-${j}-${k}`,
              avatar: `/avatar-${i}-${j}-${k}.png`,
              amount: 1,
              timestamp: new Date()
            })),
            totalAmount: 50,
            tokenType: 'LDAO'
          }))
        })
      );
      
      mockFeedService.getEnhancedFeed.mockResolvedValue({
        posts: hugeFeed,
        hasMore: false,
        totalPages: 1
      });
      
      const endMeasurement = performanceMonitor.startMeasurement('memory-pressure-render');
      
      render(<FeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      });
      
      const renderTime = endMeasurement();
      
      // Should still render within reasonable time even under memory pressure
      expect(renderTime).toBeLessThan(1000);
      
      // Should only render visible items to manage memory
      const renderedPosts = screen.getAllByRole('article');
      expect(renderedPosts.length).toBeLessThan(100);
    });
  });

  describe('Network Performance', () => {
    it('should handle slow network conditions', async () => {
      // Simulate slow network
      mockFeedService.getEnhancedFeed.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            posts: [testUtils.createMockPost()],
            hasMore: false,
            totalPages: 1
          }), 2000)
        )
      );
      
      const endMeasurement = performanceMonitor.startMeasurement('slow-network-render');
      
      render(<FeedPage />);
      
      // Should show loading state immediately
      expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      const totalTime = endMeasurement();
      
      // Should handle slow network gracefully
      expect(totalTime).toBeGreaterThan(2000);
      expect(totalTime).toBeLessThan(2500); // Some overhead is acceptable
    });

    it('should optimize concurrent requests', async () => {
      const mockPosts = Array.from({ length: 20 }, (_, i) => 
        testUtils.createMockPost({ id: `post-${i}` })
      );
      
      let requestCount = 0;
      mockFeedService.getEnhancedFeed.mockImplementation(() => {
        requestCount++;
        return Promise.resolve({
          posts: mockPosts,
          hasMore: true,
          totalPages: 5
        });
      });
      
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
      
      // Should optimize concurrent requests (deduplication)
      expect(requestCount).toBeLessThan(3);
    });
  });
});