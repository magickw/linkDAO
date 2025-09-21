import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtualScrollManager } from '@/components/Performance/VirtualScrollManager';
import { InfiniteScrollFeed } from '@/components/Feed/InfiniteScrollFeed';
import { PerformanceProvider } from '@/contexts/PerformanceContext';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    observer: jest.fn(),
  },
});

// Mock IntersectionObserver for virtual scrolling
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
window.cancelAnimationFrame = jest.fn();

// Generate large dataset for testing
const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    id: `item-${index}`,
    content: `Content for item ${index}`,
    height: 100 + Math.floor(Math.random() * 50), // Variable heights
    data: {
      author: `user-${index % 100}`,
      timestamp: new Date(Date.now() - index * 60000),
      reactions: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
    },
  }));
};

describe('Performance Optimization Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performance.now = jest.fn(() => Date.now());
  });

  describe('Virtual Scrolling Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = generateLargeDataset(10000);
      const startTime = performance.now();
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={largeDataset}
            itemHeight={100}
            containerHeight={600}
            bufferSize={5}
            renderItem={({ item }) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {item.content}
              </div>
            )}
          />
        </PerformanceProvider>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even with large dataset
      expect(renderTime).toBeLessThan(100); // Less than 100ms
      
      // Should only render visible items initially
      expect(screen.getByTestId('item-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-item-1')).toBeInTheDocument();
      expect(screen.queryByTestId('item-item-50')).not.toBeInTheDocument();
    });

    it('should maintain 60fps during scrolling', async () => {
      const largeDataset = generateLargeDataset(5000);
      const frameTimings: number[] = [];
      
      // Mock performance monitoring
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = jest.fn((callback) => {
        const start = performance.now();
        const result = originalRAF(() => {
          callback(performance.now());
          const end = performance.now();
          frameTimings.push(end - start);
        });
        return result;
      });
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={largeDataset}
            itemHeight={100}
            containerHeight={600}
            bufferSize={3}
            renderItem={({ item }) => (
              <div key={item.id}>{item.content}</div>
            )}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(scrollContainer, {
          target: { scrollTop: i * 500 },
        });
        await new Promise(resolve => setTimeout(resolve, 16)); // 60fps = 16ms per frame
      }
      
      await waitFor(() => {
        expect(frameTimings.length).toBeGreaterThan(0);
      });
      
      // Check that most frames are under 16ms (60fps)
      const slowFrames = frameTimings.filter(time => time > 16);
      const slowFramePercentage = (slowFrames.length / frameTimings.length) * 100;
      
      expect(slowFramePercentage).toBeLessThan(10); // Less than 10% slow frames
    });

    it('should efficiently update visible items during scroll', async () => {
      const largeDataset = generateLargeDataset(1000);
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={largeDataset}
            itemHeight={100}
            containerHeight={600}
            bufferSize={2}
            renderItem={({ item, index }) => (
              <div key={item.id} data-testid={`item-${index}`}>
                {item.content}
              </div>
            )}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Initial state
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-10')).not.toBeInTheDocument();
      
      // Scroll down
      fireEvent.scroll(scrollContainer, {
        target: { scrollTop: 1000 }, // Scroll to show items around index 10
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('item-10')).toBeInTheDocument();
      });
      
      // Previous items should be unmounted
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    });

    it('should handle variable item heights efficiently', async () => {
      const variableHeightItems = Array.from({ length: 1000 }, (_, index) => ({
        id: `item-${index}`,
        content: `Item ${index}`,
        height: 50 + (index % 5) * 30, // Heights: 50, 80, 110, 140, 170
      }));
      
      const startTime = performance.now();
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={variableHeightItems}
            itemHeight={(index) => variableHeightItems[index].height}
            containerHeight={600}
            bufferSize={3}
            renderItem={({ item, index }) => (
              <div
                key={item.id}
                style={{ height: item.height }}
                data-testid={`item-${index}`}
              >
                {item.content}
              </div>
            )}
          />
        </PerformanceProvider>
      );
      
      const endTime = performance.now();
      
      // Should handle variable heights without significant performance impact
      expect(endTime - startTime).toBeLessThan(150);
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Test scrolling with variable heights
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } });
      
      await waitFor(() => {
        const visibleItems = screen.getAllByTestId(/^item-\d+$/);
        expect(visibleItems.length).toBeGreaterThan(0);
        expect(visibleItems.length).toBeLessThan(20); // Should not render too many
      });
    });
  });

  describe('Infinite Scroll Performance', () => {
    it('should load new items efficiently', async () => {
      const mockLoadMore = jest.fn().mockImplementation((page) => {
        return Promise.resolve({
          items: generateLargeDataset(50).map(item => ({
            ...item,
            id: `${item.id}-page-${page}`,
          })),
          hasMore: page < 10,
        });
      });
      
      render(
        <PerformanceProvider>
          <InfiniteScrollFeed
            loadMore={mockLoadMore}
            threshold={200}
            renderItem={({ item }) => (
              <div key={item.id} data-testid={item.id}>
                {item.content}
              </div>
            )}
          />
        </PerformanceProvider>
      );
      
      // Initial load
      await waitFor(() => {
        expect(screen.getByTestId('item-0-page-0')).toBeInTheDocument();
      });
      
      const scrollContainer = screen.getByTestId('infinite-scroll-container');
      
      // Scroll to trigger load more
      fireEvent.scroll(scrollContainer, {
        target: {
          scrollTop: scrollContainer.scrollHeight - 300,
        },
      });
      
      // Should load next page
      await waitFor(() => {
        expect(mockLoadMore).toHaveBeenCalledWith(1);
        expect(screen.getByTestId('item-0-page-1')).toBeInTheDocument();
      });
      
      // Should not trigger multiple loads
      expect(mockLoadMore).toHaveBeenCalledTimes(2); // Initial + one more
    });

    it('should debounce scroll events for performance', async () => {
      const mockLoadMore = jest.fn().mockResolvedValue({
        items: [],
        hasMore: false,
      });
      
      render(
        <PerformanceProvider>
          <InfiniteScrollFeed
            loadMore={mockLoadMore}
            threshold={200}
            debounceMs={100}
            renderItem={({ item }) => <div key={item.id}>{item.content}</div>}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('infinite-scroll-container');
      
      // Rapid scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(scrollContainer, {
          target: { scrollTop: 100 + i * 10 },
        });
      }
      
      // Should debounce and not call loadMore multiple times
      await waitFor(() => {
        expect(mockLoadMore).toHaveBeenCalledTimes(1); // Only initial load
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up unused components', async () => {
      const largeDataset = generateLargeDataset(1000);
      let mountedComponents = 0;
      let unmountedComponents = 0;
      
      const TestComponent = ({ item }: { item: any }) => {
        React.useEffect(() => {
          mountedComponents++;
          return () => {
            unmountedComponents++;
          };
        }, []);
        
        return <div data-testid={item.id}>{item.content}</div>;
      };
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={largeDataset}
            itemHeight={100}
            containerHeight={600}
            bufferSize={2}
            renderItem={({ item }) => <TestComponent key={item.id} item={item} />}
          />
        </PerformanceProvider>
      );
      
      const initialMounted = mountedComponents;
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Scroll to cause components to unmount/mount
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 2000 } });
      
      await waitFor(() => {
        expect(unmountedComponents).toBeGreaterThan(0);
      });
      
      // Should not mount excessive components
      expect(mountedComponents - initialMounted).toBeLessThan(20);
      
      // Should clean up properly
      expect(unmountedComponents).toBeGreaterThan(0);
    });

    it('should prevent memory leaks in event listeners', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={generateLargeDataset(100)}
            itemHeight={100}
            containerHeight={600}
            renderItem={({ item }) => <div key={item.id}>{item.content}</div>}
          />
        </PerformanceProvider>
      );
      
      const addedListeners = addEventListenerSpy.mock.calls.length;
      
      unmount();
      
      const removedListeners = removeEventListenerSpy.mock.calls.length;
      
      // Should remove all added event listeners
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners);
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render performance metrics', async () => {
      const performanceMetrics: any[] = [];
      
      // Mock performance monitor
      jest.spyOn(performanceMonitor, 'trackMetric').mockImplementation((metric) => {
        performanceMetrics.push(metric);
      });
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={generateLargeDataset(500)}
            itemHeight={100}
            containerHeight={600}
            renderItem={({ item }) => <div key={item.id}>{item.content}</div>}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Trigger some scrolling
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });
      
      await waitFor(() => {
        expect(performanceMetrics.length).toBeGreaterThan(0);
      });
      
      // Should track relevant metrics
      const renderMetrics = performanceMetrics.filter(m => m.name === 'virtual-scroll-render');
      expect(renderMetrics.length).toBeGreaterThan(0);
      
      const scrollMetrics = performanceMetrics.filter(m => m.name === 'scroll-performance');
      expect(scrollMetrics.length).toBeGreaterThan(0);
    });

    it('should detect performance bottlenecks', async () => {
      const warnings: string[] = [];
      
      // Mock console.warn to capture performance warnings
      const originalWarn = console.warn;
      console.warn = jest.fn((message) => {
        warnings.push(message);
      });
      
      // Create a slow rendering component
      const SlowComponent = ({ item }: { item: any }) => {
        // Simulate slow rendering
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait
        }
        return <div>{item.content}</div>;
      };
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={generateLargeDataset(100)}
            itemHeight={100}
            containerHeight={600}
            renderItem={({ item }) => <SlowComponent key={item.id} item={item} />}
          />
        </PerformanceProvider>
      );
      
      await waitFor(() => {
        expect(warnings.some(w => w.includes('slow render'))).toBe(true);
      });
      
      console.warn = originalWarn;
    });
  });

  describe('Caching Performance', () => {
    it('should cache rendered items efficiently', async () => {
      const renderCount = new Map<string, number>();
      
      const CachedComponent = ({ item }: { item: any }) => {
        const count = renderCount.get(item.id) || 0;
        renderCount.set(item.id, count + 1);
        return <div data-testid={item.id}>{item.content}</div>;
      };
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={generateLargeDataset(200)}
            itemHeight={100}
            containerHeight={600}
            bufferSize={3}
            enableCaching={true}
            renderItem={({ item }) => <CachedComponent key={item.id} item={item} />}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Scroll down and back up
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });
      await waitFor(() => {
        expect(screen.getByTestId('item-10')).toBeInTheDocument();
      });
      
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toBeInTheDocument();
      });
      
      // Items should be cached and not re-rendered excessively
      const item0RenderCount = renderCount.get('item-0') || 0;
      expect(item0RenderCount).toBeLessThanOrEqual(2); // Initial + cache hit
    });

    it('should manage cache size to prevent memory issues', async () => {
      const cacheSize = jest.fn();
      
      render(
        <PerformanceProvider>
          <VirtualScrollManager
            items={generateLargeDataset(1000)}
            itemHeight={100}
            containerHeight={600}
            enableCaching={true}
            maxCacheSize={50}
            onCacheSizeChange={cacheSize}
            renderItem={({ item }) => <div key={item.id}>{item.content}</div>}
          />
        </PerformanceProvider>
      );
      
      const scrollContainer = screen.getByTestId('virtual-scroll-container');
      
      // Scroll through many items to fill cache
      for (let i = 0; i < 20; i++) {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: i * 500 } });
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      await waitFor(() => {
        expect(cacheSize).toHaveBeenCalled();
      });
      
      // Cache size should be limited
      const lastCacheSize = cacheSize.mock.calls[cacheSize.mock.calls.length - 1][0];
      expect(lastCacheSize).toBeLessThanOrEqual(50);
    });
  });

  describe('Bundle Size and Loading Performance', () => {
    it('should lazy load components efficiently', async () => {
      const loadTimes: number[] = [];
      
      // Mock dynamic import
      const originalImport = jest.requireActual('react');
      jest.doMock('react', () => ({
        ...originalImport,
        lazy: jest.fn((factory) => {
          return originalImport.lazy(() => {
            const start = performance.now();
            return factory().then((module: any) => {
              loadTimes.push(performance.now() - start);
              return module;
            });
          });
        }),
      }));
      
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: ({ item }: { item: any }) => <div>{item.content}</div>
        })
      );
      
      render(
        <PerformanceProvider>
          <React.Suspense fallback={<div>Loading...</div>}>
            <VirtualScrollManager
              items={generateLargeDataset(10)}
              itemHeight={100}
              containerHeight={600}
              renderItem={({ item }) => <LazyComponent key={item.id} item={item} />}
            />
          </React.Suspense>
        </PerformanceProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toBeInTheDocument();
      });
      
      // Lazy loading should be fast
      expect(loadTimes[0]).toBeLessThan(50);
    });
  });
});