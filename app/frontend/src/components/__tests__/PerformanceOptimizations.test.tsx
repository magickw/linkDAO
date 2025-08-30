import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualScrolling, { useVirtualScrolling } from '../VirtualScrolling';
import OptimizedImage, { ProgressiveImage, useImagePreloader } from '../OptimizedImage';
import { cacheManager } from '../../services/cacheService';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { ServiceWorkerUtil } from '../../utils/serviceWorker';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock IndexedDB
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn().mockReturnValue({
      result: {},
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null
    })
  }
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => [{ duration: 100 }])
  }
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  
  constructor() {
    setTimeout(() => {
      if (this.src.includes('invalid')) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 0);
  }
};

describe('VirtualScrolling Component', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    content: `Item ${i}`
  }));

  const renderItem = (item: any, index: number) => (
    <div key={item.id} data-testid={`item-${index}`}>
      {item.content}
    </div>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders virtual scrolling container', () => {
    render(
      <VirtualScrolling
        items={mockItems}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
      />
    );

    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });

  it('renders only visible items', () => {
    render(
      <VirtualScrolling
        items={mockItems}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
        overscan={2}
      />
    );

    // Should render approximately 8 items (400/50) + overscan
    const renderedItems = screen.getAllByTestId(/item-/);
    expect(renderedItems.length).toBeLessThan(20);
    expect(renderedItems.length).toBeGreaterThan(5);
  });

  it('calls onLoadMore when scrolled near bottom', async () => {
    const mockLoadMore = jest.fn();
    
    render(
      <VirtualScrolling
        items={mockItems.slice(0, 20)}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
        onLoadMore={mockLoadMore}
        hasNextPage={true}
      />
    );

    const container = screen.getByTestId('virtual-scroll-container');
    
    // Mock scroll to near bottom
    Object.defineProperty(container, 'scrollTop', { value: 800, writable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 1000, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, writable: true });

    fireEvent.scroll(container);

    await waitFor(() => {
      expect(mockLoadMore).toHaveBeenCalled();
    });
  });

  it('shows loading indicator when loading', () => {
    render(
      <VirtualScrolling
        items={mockItems}
        itemHeight={50}
        containerHeight={400}
        renderItem={renderItem}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('virtual-scroll-container')).toBeInTheDocument();
  });
});

describe('useVirtualScrolling Hook', () => {
  const TestComponent = () => {
    const mockItems = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const { scrollTop, visibleRange, scrollToIndex, totalHeight } = useVirtualScrolling(
      mockItems,
      50,
      400
    );

    return (
      <div>
        <div data-testid="scroll-top">{scrollTop}</div>
        <div data-testid="visible-start">{visibleRange.start}</div>
        <div data-testid="visible-end">{visibleRange.end}</div>
        <div data-testid="total-height">{totalHeight}</div>
        <button onClick={() => scrollToIndex(10)}>Scroll to 10</button>
      </div>
    );
  };

  it('calculates visible range correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('visible-start')).toHaveTextContent('0');
    expect(screen.getByTestId('total-height')).toHaveTextContent('5000');
  });
});

describe('OptimizedImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders image with loading state', () => {
    render(
      <OptimizedImage
        src="test-image.jpg"
        alt="Test image"
        width={200}
        height={150}
      />
    );

    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('shows placeholder when loading', () => {
    render(
      <OptimizedImage
        src="test-image.jpg"
        alt="Test image"
        placeholder="placeholder.jpg"
      />
    );

    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('src', 'placeholder.jpg');
  });

  it('calls onLoad when image loads', async () => {
    const mockOnLoad = jest.fn();
    
    render(
      <OptimizedImage
        src="test-image.jpg"
        alt="Test image"
        onLoad={mockOnLoad}
      />
    );

    const img = screen.getByAltText('Test image');
    fireEvent.load(img);

    await waitFor(() => {
      expect(mockOnLoad).toHaveBeenCalled();
    });
  });

  it('calls onError when image fails to load', async () => {
    const mockOnError = jest.fn();
    
    render(
      <OptimizedImage
        src="invalid-image.jpg"
        alt="Test image"
        onError={mockOnError}
      />
    );

    const img = screen.getByAltText('Test image');
    fireEvent.error(img);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  it('shows error state when image fails', async () => {
    render(
      <OptimizedImage
        src="invalid-image.jpg"
        alt="Test image"
      />
    );

    const img = screen.getByAltText('Test image');
    fireEvent.error(img);

    await waitFor(() => {
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
    });
  });
});

describe('ProgressiveImage Component', () => {
  it('renders low quality image first', () => {
    render(
      <ProgressiveImage
        src="high-quality.jpg"
        lowQualitySrc="low-quality.jpg"
        alt="Progressive image"
      />
    );

    const img = screen.getByAltText('Progressive image');
    expect(img).toHaveAttribute('src', 'low-quality.jpg');
  });
});

describe('useImagePreloader Hook', () => {
  const TestComponent = () => {
    const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
    const { loadedImages, failedImages, isLoaded, hasFailed } = useImagePreloader(urls);

    return (
      <div>
        <div data-testid="loaded-count">{loadedImages.size}</div>
        <div data-testid="failed-count">{failedImages.size}</div>
        <div data-testid="image1-loaded">{isLoaded('image1.jpg').toString()}</div>
        <div data-testid="image1-failed">{hasFailed('image1.jpg').toString()}</div>
      </div>
    );
  };

  it('tracks image loading state', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('loaded-count')).toHaveTextContent('0');
    expect(screen.getByTestId('failed-count')).toHaveTextContent('0');
    expect(screen.getByTestId('image1-loaded')).toHaveTextContent('false');
    expect(screen.getByTestId('image1-failed')).toHaveTextContent('false');
  });
});

describe('Cache Service', () => {
  beforeEach(() => {
    cacheManager.clearAll();
  });

  it('caches and retrieves user data', () => {
    const userData = { id: '1', name: 'Test User' };
    
    cacheManager.userCache.setUser('1', userData);
    const retrieved = cacheManager.userCache.getUser('1');
    
    expect(retrieved).toEqual(userData);
  });

  it('caches and retrieves community data', () => {
    const communityData = { id: '1', name: 'Test Community' };
    
    cacheManager.communityCache.setCommunity('1', communityData);
    const retrieved = cacheManager.communityCache.getCommunity('1');
    
    expect(retrieved).toEqual(communityData);
  });

  it('caches and retrieves post data', () => {
    const postData = { id: '1', content: 'Test Post' };
    
    cacheManager.postCache.setPost('1', postData);
    const retrieved = cacheManager.postCache.getPost('1');
    
    expect(retrieved).toEqual(postData);
  });

  it('invalidates related caches', () => {
    const userData = { id: '1', name: 'Test User' };
    
    cacheManager.userCache.setUser('1', userData);
    expect(cacheManager.userCache.getUser('1')).toEqual(userData);
    
    cacheManager.invalidateUserData('1');
    expect(cacheManager.userCache.getUser('1')).toBeNull();
  });

  it('provides cache statistics', () => {
    cacheManager.userCache.setUser('1', { id: '1' });
    cacheManager.communityCache.setCommunity('1', { id: '1' });
    
    const stats = cacheManager.getOverallStats();
    
    expect(stats).toHaveProperty('user');
    expect(stats).toHaveProperty('community');
    expect(stats).toHaveProperty('post');
  });
});

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
  });

  it('records custom metrics', () => {
    performanceMonitor.recordMetric('test_metric', 100);
    
    const metrics = performanceMonitor.getMetricsByName('test_metric');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(100);
  });

  it('measures function execution time', () => {
    const testFunction = () => {
      // Simulate some work
      return 'result';
    };

    const result = performanceMonitor.measureFunction('test_function', testFunction);
    
    expect(result).toBe('result');
    
    const metrics = performanceMonitor.getMetricsByName('test_function');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBeGreaterThanOrEqual(0);
  });

  it('measures async function execution time', async () => {
    const testAsyncFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async result';
    };

    const result = await performanceMonitor.measureAsyncFunction('test_async_function', testAsyncFunction);
    
    expect(result).toBe('async result');
    
    const metrics = performanceMonitor.getMetricsByName('test_async_function');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBeGreaterThanOrEqual(10);
  });

  it('calculates average metrics', () => {
    performanceMonitor.recordMetric('test_average', 100);
    performanceMonitor.recordMetric('test_average', 200);
    performanceMonitor.recordMetric('test_average', 300);
    
    const average = performanceMonitor.getAverageMetric('test_average');
    expect(average).toBe(200);
  });

  it('provides performance summary', () => {
    performanceMonitor.recordMetric('metric1', 100);
    performanceMonitor.recordMetric('metric1', 200);
    performanceMonitor.recordMetric('metric2', 50);
    
    const summary = performanceMonitor.getSummary();
    
    expect(summary.metric1).toEqual({
      count: 2,
      average: 150,
      min: 100,
      max: 200,
      latest: 200
    });
    
    expect(summary.metric2).toEqual({
      count: 1,
      average: 50,
      min: 50,
      max: 50,
      latest: 50
    });
  });

  it('marks and measures performance', () => {
    performanceMonitor.mark('test_operation');
    
    // Simulate some work
    const duration = performanceMonitor.measure('test_operation');
    
    expect(duration).toBeGreaterThanOrEqual(0);
    
    const metrics = performanceMonitor.getMetricsByName('test_operation');
    expect(metrics).toHaveLength(1);
  });
});

describe('Service Worker Utilities', () => {
  // Mock service worker APIs
  beforeEach(() => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn().mockResolvedValue({
          addEventListener: jest.fn(),
          sync: {
            register: jest.fn().mockResolvedValue(undefined)
          }
        }),
        addEventListener: jest.fn()
      },
      writable: true
    });

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    // Mock IndexedDB for service worker tests
    const mockDB = {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          add: jest.fn().mockReturnValue({ result: 1 }),
          get: jest.fn().mockReturnValue({ result: null }),
          getAll: jest.fn().mockReturnValue({ result: [] }),
          put: jest.fn().mockReturnValue({ result: undefined }),
          delete: jest.fn().mockReturnValue({ result: undefined })
        })
      }),
      createObjectStore: jest.fn(),
      objectStoreNames: { contains: jest.fn().mockReturnValue(false) }
    };

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: jest.fn().mockReturnValue({
          result: mockDB,
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null,
          addEventListener: jest.fn((event, callback) => {
            if (event === 'success') {
              setTimeout(() => callback({ target: { result: mockDB } }), 0);
            }
          })
        })
      },
      writable: true
    });
  });

  it('initializes service worker utilities', async () => {
    const swUtil = new ServiceWorkerUtil();
    
    await expect(swUtil.init()).resolves.not.toThrow();
  });

  it('provides access to managers', async () => {
    const swUtil = new ServiceWorkerUtil();
    await swUtil.init();
    
    expect(swUtil.getServiceWorkerManager()).toBeDefined();
    expect(swUtil.getOfflineStorage()).toBeDefined();
    expect(swUtil.getNetworkStatus()).toBeDefined();
  });
});

describe('Integration Tests', () => {
  it('virtual scrolling with optimized images', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      imageUrl: `image-${i}.jpg`,
      title: `Item ${i}`
    }));

    const renderItem = (item: any) => (
      <div key={item.id}>
        <OptimizedImage
          src={item.imageUrl}
          alt={item.title}
          width={200}
          height={150}
          lazy={true}
        />
        <h3>{item.title}</h3>
      </div>
    );

    render(
      <VirtualScrolling
        items={items}
        itemHeight={200}
        containerHeight={600}
        renderItem={renderItem}
      />
    );

    // Should render virtual scrolling with optimized images
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('performance monitoring with caching', () => {
    // Record some metrics
    performanceMonitor.recordMetric('cache_hit', 50);
    performanceMonitor.recordMetric('cache_miss', 200);
    
    // Cache some data
    cacheManager.userCache.setUser('1', { id: '1', name: 'Test' });
    
    // Verify both systems work together
    const metrics = performanceMonitor.getSummary();
    const cachedUser = cacheManager.userCache.getUser('1');
    
    expect(metrics).toHaveProperty('cache_hit');
    expect(metrics).toHaveProperty('cache_miss');
    expect(cachedUser).toEqual({ id: '1', name: 'Test' });
  });
});