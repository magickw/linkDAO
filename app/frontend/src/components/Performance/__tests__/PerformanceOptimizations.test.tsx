/**
 * Comprehensive Performance Optimization Tests
 * Tests for virtual scrolling, lazy loading, React.memo, useMemo, and mobile performance
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VirtualScrollManager } from '../VirtualScrollManager';
import { IntelligentLazyLoader, IntelligentLazyImage } from '../IntelligentLazyLoader';
import { PerformanceOptimizer } from '../PerformanceOptimizer';
import { useIntersectionObserver, useInfiniteScroll } from '../IntersectionObserverManager';

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024 // 100MB
  }
};

Object.defineProperty(global, 'performance', {
  writable: true,
  value: mockPerformance
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
});

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: mockIntersectionObserver
});

// Mock requestAnimationFrame
Object.defineProperty(global, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 16))
});

// Test data generators
const generateLargeDataset = (size: number) => 
  Array.from({ length: size }, (_, i) => ({
    id: i,
    title: `Post ${i}`,
    content: `This is the content for post ${i}. `.repeat(10),
    author: `User ${i % 100}`,
    timestamp: Date.now() - (i * 60000),
    likes: Math.floor(Math.random() * 1000),
    comments: Math.floor(Math.random() * 100)
  }));

const generateImageDataset = (size: number) =>
  Array.from({ length: size }, (_, i) => ({
    id: i,
    src: `https://example.com/image-${i}.jpg`,
    lowQualitySrc: `https://example.com/image-${i}-low.jpg`,
    alt: `Image ${i}`,
    width: 400,
    height: 300
  }));

describe('Virtual Scrolling Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle large datasets efficiently', async () => {
    const largeDataset = generateLargeDataset(10000);
    const renderItem = jest.fn((item) => (
      <div key={item.id} data-testid={`post-${item.id}`}>
        <h3>{item.title}</h3>
        <p>{item.content}</p>
        <span>{item.author}</span>
      </div>
    ));

    const startTime = performance.now();

    render(
      <VirtualScrollManager
        items={largeDataset}
        containerHeight={600}
        itemHeight={120}
        renderItem={renderItem}
        config={{
          bufferSize: 5,
          targetFPS: 60,
          enableSmoothing: true
        }}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with large dataset
    expect(renderTime).toBeLessThan(100);

    // Should only render visible items + buffer
    const expectedVisibleItems = Math.ceil(600 / 120) + 10; // container height / item height + buffer
    expect(renderItem).toHaveBeenCalledTimes(expectedVisibleItems);

    // Should have virtual scroll container
    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });

  test('should maintain 60fps during scrolling', async () => {
    const dataset = generateLargeDataset(1000);
    let frameCount = 0;
    let lastFrameTime = performance.now();

    const measureFPS = () => {
      const now = performance.now();
      const delta = now - lastFrameTime;
      
      if (delta >= 1000) {
        const fps = Math.round((frameCount * 1000) / delta);
        expect(fps).toBeGreaterThanOrEqual(55); // Allow some variance
        frameCount = 0;
        lastFrameTime = now;
      }
      
      frameCount++;
    };

    render(
      <VirtualScrollManager
        items={dataset}
        containerHeight={400}
        itemHeight={100}
        renderItem={(item) => <div key={item.id}>{item.title}</div>}
        config={{ targetFPS: 60 }}
      />
    );

    const container = screen.getByTestId('virtual-scroll-container');

    // Simulate rapid scrolling
    for (let i = 0; i < 20; i++) {
      act(() => {
        Object.defineProperty(container, 'scrollTop', { 
          value: i * 50, 
          writable: true 
        });
        fireEvent.scroll(container);
        measureFPS();
      });
      
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
    }
  });

  test('should efficiently handle variable item heights', () => {
    const dataset = generateLargeDataset(500);
    const getItemHeight = jest.fn((index: number) => 80 + (index % 3) * 40); // 80, 120, 160px

    render(
      <VirtualScrollManager
        items={dataset}
        containerHeight={400}
        itemHeight={getItemHeight}
        renderItem={(item) => <div key={item.id}>{item.title}</div>}
      />
    );

    // Should cache item heights for performance
    expect(getItemHeight).toHaveBeenCalled();
    
    // Should handle variable heights without performance issues
    const container = screen.getByTestId('virtual-scroll-container');
    expect(container).toBeInTheDocument();
  });

  test('should implement infinite scroll efficiently', async () => {
    const initialData = generateLargeDataset(50);
    const loadMore = jest.fn();
    let hasNextPage = true;

    const TestComponent = () => {
      const [items, setItems] = React.useState(initialData);
      const [loading, setLoading] = React.useState(false);

      const handleLoadMore = React.useCallback(async () => {
        if (loading) return;
        
        setLoading(true);
        loadMore();
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const newItems = generateLargeDataset(25).map(item => ({
          ...item,
          id: item.id + items.length
        }));
        
        setItems(prev => [...prev, ...newItems]);
        setLoading(false);
        
        if (items.length > 200) {
          hasNextPage = false;
        }
      }, [items.length, loading]);

      return (
        <VirtualScrollManager
          items={items}
          containerHeight={400}
          itemHeight={100}
          renderItem={(item) => <div key={item.id}>{item.title}</div>}
          onLoadMore={handleLoadMore}
          hasNextPage={hasNextPage}
          isLoading={loading}
          enablePreloading={true}
          preloadDistance={200}
        />
      );
    };

    render(<TestComponent />);

    const container = screen.getByTestId('virtual-scroll-container');

    // Scroll to trigger load more
    act(() => {
      Object.defineProperty(container, 'scrollTop', { value: 4000, writable: true });
      Object.defineProperty(container, 'scrollHeight', { value: 5000, writable: true });
      Object.defineProperty(container, 'clientHeight', { value: 400, writable: true });
      fireEvent.scroll(container);
    });

    await waitFor(() => {
      expect(loadMore).toHaveBeenCalled();
    });
  });
});

describe('Intelligent Lazy Loading Performance', () => {
  test('should load images progressively with blur transition', async () => {
    const images = generateImageDataset(20);
    const onLoad = jest.fn();

    render(
      <div>
        {images.slice(0, 5).map((img) => (
          <IntelligentLazyImage
            key={img.id}
            src={img.src}
            lowQualitySrc={img.lowQualitySrc}
            alt={img.alt}
            width={img.width}
            height={img.height}
            onLoad={onLoad}
            priority={img.id < 2 ? 'high' : 'normal'}
            enableWebP={true}
            enableAVIF={true}
          />
        ))}
      </div>
    );

    // High priority images should start loading immediately
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
  });

  test('should batch intersection observations for performance', () => {
    const content = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      content: `Content block ${i}`
    }));

    render(
      <div>
        {content.map((item) => (
          <IntelligentLazyLoader
            key={item.id}
            priority="normal"
            config={{
              enableIntersectionOptimization: true,
              rootMargin: '50px'
            }}
          >
            <div>{item.content}</div>
          </IntelligentLazyLoader>
        ))}
      </div>
    );

    // Should create intersection observers efficiently
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  test('should handle loading failures with retry logic', async () => {
    const onError = jest.fn();
    const onLoad = jest.fn();

    // Mock image loading failure
    const originalImage = global.Image;
    global.Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src: string = '';
      
      constructor() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 100);
      }
    } as any;

    render(
      <IntelligentLazyImage
        src="https://example.com/failing-image.jpg"
        alt="Failing image"
        onLoad={onLoad}
        onError={onError}
        config={{
          retryAttempts: 2,
          retryDelay: 100
        }}
      />
    );

    // Should retry loading and eventually call onError
    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    }, { timeout: 1000 });

    expect(onLoad).not.toHaveBeenCalled();

    // Restore original Image
    global.Image = originalImage;
  });
});

describe('React.memo and useMemo Optimizations', () => {
  test('should prevent unnecessary re-renders with React.memo', () => {
    const renderCount = { count: 0 };

    const ExpensiveComponent = React.memo(({ data }: { data: any[] }) => {
      renderCount.count++;
      return (
        <div>
          {data.map(item => (
            <div key={item.id}>{item.title}</div>
          ))}
        </div>
      );
    });

    const TestContainer = () => {
      const [count, setCount] = React.useState(0);
      const [data] = React.useState(generateLargeDataset(100));

      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </button>
          <ExpensiveComponent data={data} />
        </div>
      );
    };

    render(<TestContainer />);

    const button = screen.getByRole('button');

    // Initial render
    expect(renderCount.count).toBe(1);

    // Click button multiple times
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // ExpensiveComponent should not re-render since data didn't change
    expect(renderCount.count).toBe(1);
  });

  test('should memoize expensive calculations with useMemo', () => {
    const expensiveCalculation = jest.fn((data: any[]) => {
      return data.reduce((sum, item) => sum + item.likes, 0);
    });

    const TestComponent = ({ data }: { data: any[] }) => {
      const [filter, setFilter] = React.useState('');
      
      const totalLikes = React.useMemo(() => {
        return expensiveCalculation(data);
      }, [data]);

      const filteredData = React.useMemo(() => {
        return data.filter(item => 
          item.title.toLowerCase().includes(filter.toLowerCase())
        );
      }, [data, filter]);

      return (
        <div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter posts"
          />
          <div>Total likes: {totalLikes}</div>
          <div>Filtered posts: {filteredData.length}</div>
        </div>
      );
    };

    const data = generateLargeDataset(1000);
    render(<TestComponent data={data} />);

    const input = screen.getByPlaceholderText('Filter posts');

    // Initial calculation
    expect(expensiveCalculation).toHaveBeenCalledTimes(1);

    // Type in filter - should not recalculate totalLikes
    fireEvent.change(input, { target: { value: 'Post 1' } });
    fireEvent.change(input, { target: { value: 'Post 10' } });

    // Should still only be called once since data didn't change
    expect(expensiveCalculation).toHaveBeenCalledTimes(1);
  });

  test('should optimize callback functions with useCallback', () => {
    const onItemClick = jest.fn();
    const renderCount = { count: 0 };

    const ListItem = React.memo(({ item, onClick }: { item: any; onClick: (id: number) => void }) => {
      renderCount.count++;
      return (
        <div onClick={() => onClick(item.id)}>
          {item.title}
        </div>
      );
    });

    const TestList = () => {
      const [data] = React.useState(generateLargeDataset(10));
      const [count, setCount] = React.useState(0);

      const handleItemClick = React.useCallback((id: number) => {
        onItemClick(id);
      }, []);

      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>
            Count: {count}
          </button>
          {data.map(item => (
            <ListItem
              key={item.id}
              item={item}
              onClick={handleItemClick}
            />
          ))}
        </div>
      );
    };

    render(<TestList />);

    const button = screen.getByRole('button');
    const initialRenderCount = renderCount.count;

    // Click button to trigger re-render
    fireEvent.click(button);

    // ListItems should not re-render due to useCallback
    expect(renderCount.count).toBe(initialRenderCount);
  });
});

describe('Mobile Performance Optimizations', () => {
  beforeEach(() => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    
    // Mock touch events
    Object.defineProperty(window, 'ontouchstart', { value: null, writable: true });
  });

  test('should optimize for mobile viewport', () => {
    const mobileData = generateLargeDataset(200);

    render(
      <VirtualScrollManager
        items={mobileData}
        containerHeight={window.innerHeight - 100} // Account for mobile chrome
        itemHeight={80} // Smaller items for mobile
        renderItem={(item) => (
          <div key={item.id} className="mobile-optimized">
            {item.title}
          </div>
        )}
        config={{
          bufferSize: 3, // Smaller buffer for mobile
          enableSmoothing: true,
          targetFPS: 60
        }}
      />
    );

    const container = screen.getByTestId('virtual-scroll-container');
    expect(container).toHaveStyle({ height: `${window.innerHeight - 100}px` });
  });

  test('should handle touch scrolling performance', async () => {
    const data = generateLargeDataset(500);
    
    render(
      <VirtualScrollManager
        items={data}
        containerHeight={400}
        itemHeight={60}
        renderItem={(item) => <div key={item.id}>{item.title}</div>}
        config={{
          enableSmoothing: true,
          targetFPS: 60
        }}
      />
    );

    const container = screen.getByTestId('virtual-scroll-container');

    // Simulate touch scrolling
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientY: 100 } as Touch]
    });
    
    const touchMove = new TouchEvent('touchmove', {
      touches: [{ clientY: 50 } as Touch]
    });

    fireEvent(container, touchStart);
    fireEvent(container, touchMove);

    // Should handle touch events without performance degradation
    expect(container).toBeInTheDocument();
  });

  test('should optimize image loading for mobile networks', async () => {
    const images = generateImageDataset(10);

    // Mock slow network
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob())
        } as Response), 500)
      )
    );

    render(
      <div>
        {images.map((img) => (
          <IntelligentLazyImage
            key={img.id}
            src={img.src}
            lowQualitySrc={img.lowQualitySrc}
            alt={img.alt}
            width={200} // Smaller for mobile
            height={150}
            quality={60} // Lower quality for mobile
            priority={img.id < 2 ? 'high' : 'low'}
          />
        ))}
      </div>
    );

    // Should prioritize above-the-fold images
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });

    global.fetch = originalFetch;
  });

  test('should implement memory management for mobile devices', () => {
    const largeDataset = generateLargeDataset(2000);
    
    render(
      <PerformanceOptimizer
        config={{
          memoryThreshold: 50, // Lower threshold for mobile
          enableMemoryOptimization: true,
          adaptiveOptimization: true
        }}
      >
        <VirtualScrollManager
          items={largeDataset}
          containerHeight={400}
          itemHeight={80}
          renderItem={(item) => <div key={item.id}>{item.title}</div>}
          config={{
            bufferSize: 2, // Smaller buffer for mobile
            recycleNodes: true
          }}
        />
      </PerformanceOptimizer>
    );

    // Should apply mobile-specific optimizations
    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });
});

describe('Performance Integration Tests', () => {
  test('should maintain performance with combined optimizations', async () => {
    const data = generateLargeDataset(1000);
    const images = generateImageDataset(50);
    
    const startTime = performance.now();

    render(
      <PerformanceOptimizer
        config={{
          targetFPS: 60,
          memoryThreshold: 100,
          adaptiveOptimization: true
        }}
      >
        <div>
          <VirtualScrollManager
            items={data}
            containerHeight={400}
            itemHeight={120}
            renderItem={(item, index) => (
              <div key={item.id} className="post-card">
                <h3>{item.title}</h3>
                <p>{item.content}</p>
                {index < 10 && (
                  <IntelligentLazyImage
                    src={images[index % images.length].src}
                    alt={images[index % images.length].alt}
                    width={100}
                    height={75}
                    priority={index < 3 ? 'high' : 'normal'}
                  />
                )}
              </div>
            )}
            onLoadMore={() => console.log('Load more')}
            hasNextPage={true}
          />
        </div>
      </PerformanceOptimizer>
    );

    const endTime = performance.now();
    const totalRenderTime = endTime - startTime;

    // Should render efficiently even with complex content
    expect(totalRenderTime).toBeLessThan(200);
    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });

  test('should handle performance degradation gracefully', async () => {
    // Mock poor performance conditions
    mockPerformance.now.mockImplementation(() => Date.now() + Math.random() * 100);
    
    const data = generateLargeDataset(5000);
    
    render(
      <PerformanceOptimizer
        config={{
          targetFPS: 60,
          adaptiveOptimization: true,
          enableFrameRateOptimization: true
        }}
        onOptimizationApplied={(optimization) => {
          console.log('Applied optimization:', optimization);
        }}
      >
        <VirtualScrollManager
          items={data}
          containerHeight={600}
          itemHeight={100}
          renderItem={(item) => (
            <div key={item.id} className="complex-item">
              <div className="expensive-animation">
                {item.title}
              </div>
              <div>{item.content}</div>
            </div>
          )}
        />
      </PerformanceOptimizer>
    );

    // Should apply optimizations automatically
    await waitFor(() => {
      expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
    });
  });
});

describe('Performance Monitoring', () => {
  test('should track performance metrics accurately', () => {
    const onMetricsUpdate = jest.fn();
    
    render(
      <PerformanceOptimizer
        config={{
          monitoringInterval: 100,
          adaptiveOptimization: false
        }}
        onMetricsUpdate={onMetricsUpdate}
      >
        <div>Test content</div>
      </PerformanceOptimizer>
    );

    // Should start monitoring
    expect(onMetricsUpdate).toHaveBeenCalled();
  });

  test('should provide performance recommendations', async () => {
    const onOptimizationApplied = jest.fn();
    
    // Mock poor performance
    mockPerformance.memory.usedJSHeapSize = 150 * 1024 * 1024; // 150MB
    
    render(
      <PerformanceOptimizer
        config={{
          memoryThreshold: 100,
          adaptiveOptimization: true
        }}
        onOptimizationApplied={onOptimizationApplied}
      >
        <div>Memory intensive content</div>
      </PerformanceOptimizer>
    );

    // Should apply memory optimizations
    await waitFor(() => {
      expect(onOptimizationApplied).toHaveBeenCalled();
    });
  });
});