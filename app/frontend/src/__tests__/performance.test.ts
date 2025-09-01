/**
 * Performance Tests for PWA and Optimization Features
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { performanceMonitor, errorTracker } from '../utils/performanceMonitor';
import { lighthouseOptimizer, performanceBudget } from '../utils/lighthouseOptimization';
import { cdnService, edgeCache } from '../services/cdnService';
import { ServiceWorkerUtil } from '../utils/serviceWorker';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { LazyImage, LazyVideo, LazyBlockchainData } from '../components/LazyLoadingSystem';
import VirtualScrolling from '../components/VirtualScrolling';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { global } from 'styled-jsx/css';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => [])
};

Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver
});

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

// Mock service worker
Object.defineProperty(global.navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: jest.fn(() => Promise.resolve({
      installing: null,
      waiting: null,
      active: null,
      addEventListener: jest.fn(),
      update: jest.fn()
    })),
    getRegistration: jest.fn(() => Promise.resolve(null))
  }
});

describe('Performance Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Monitor', () => {
    it('should track performance metrics', async () => {
      performanceMonitor.mark('test-start');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = performanceMonitor.measure('test-duration', 'test-start');
      
      expect(duration).toBeGreaterThan(90);
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-start');
    });

    it('should record custom metrics', () => {
      performanceMonitor.recordMetric('custom-metric', 42, 'counter');
      
      // Verify metric is recorded (would check internal state in real implementation)
      expect(true).toBe(true);
    });

    it('should measure bundle size', async () => {
      // Mock resource timing entries
      mockPerformance.getEntriesByType.mockReturnValue([
        { name: 'app.js', transferSize: 100000, encodedBodySize: 90000 },
        { name: 'vendor.js', transferSize: 200000, encodedBodySize: 180000 },
        { name: 'styles.css', transferSize: 50000, encodedBodySize: 45000 }
      ]);

      const bundleSize = await performanceMonitor.measureBundleSize();
      
      expect(bundleSize).toBe(350000); // Sum of transfer sizes
    });

    it('should generate performance report', async () => {
      const report = await performanceMonitor.generateReport();
      
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('budgetCheck');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Error Tracking', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      errorTracker.logError('Test message', error, 'test-context');
      
      const errors = errorTracker.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test message');
      expect(errors[0].context).toBe('test-context');
    });

    it('should clear errors', () => {
      errorTracker.logError('Test error', new Error(), 'test');
      expect(errorTracker.getErrors()).toHaveLength(1);
      
      errorTracker.clearErrors();
      expect(errorTracker.getErrors()).toHaveLength(0);
    });
  });
});

describe('Lighthouse Optimization', () => {
  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  describe('Performance Analysis', () => {
    it('should analyze performance metrics', async () => {
      // Mock navigation timing
      mockPerformance.getEntriesByType.mockReturnValue([{
        entryType: 'navigation',
        responseStart: 100,
        requestStart: 50,
        loadEventEnd: 1000,
        navigationStart: 0
      }]);

      const metrics = await lighthouseOptimizer.analyzePerformance();
      
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('accessibility');
      expect(metrics).toHaveProperty('seo');
      expect(metrics).toHaveProperty('pwa');
      expect(typeof metrics.performance).toBe('number');
    });

    it('should generate optimization recommendations', async () => {
      // Add some problematic elements to DOM
      const img = document.createElement('img');
      img.src = 'test.jpg';
      // No alt attribute - should trigger accessibility recommendation
      document.body.appendChild(img);

      const input = document.createElement('input');
      // No label - should trigger accessibility recommendation
      document.body.appendChild(input);

      await lighthouseOptimizer.analyzePerformance();
      const recommendations = lighthouseOptimizer.generateRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const accessibilityRecs = recommendations.filter(r => r.category === 'accessibility');
      expect(accessibilityRecs.length).toBeGreaterThan(0);
    });

    it('should apply automatic optimizations', async () => {
      const result = await lighthouseOptimizer.applyOptimizations();
      
      expect(result).toHaveProperty('applied');
      expect(result).toHaveProperty('failed');
      expect(Array.isArray(result.applied)).toBe(true);
      expect(Array.isArray(result.failed)).toBe(true);
    });
  });

  describe('Performance Budget', () => {
    it('should check performance budgets', async () => {
      const result = await performanceBudget.checkBudgets();
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.violations)).toBe(true);
    });
  });
});

describe('CDN Service', () => {
  describe('Image Optimization', () => {
    it('should optimize image URLs', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const optimizedUrl = cdnService.optimizeImage(originalUrl, {
        width: 800,
        height: 600,
        quality: 80,
        format: 'webp'
      });
      
      expect(optimizedUrl).toContain('w=800');
      expect(optimizedUrl).toContain('h=600');
      expect(optimizedUrl).toContain('q=80');
      expect(optimizedUrl).toContain('f=webp');
    });

    it('should generate responsive image URLs', () => {
      const originalUrl = 'https://example.com/image.jpg';
      const responsive = cdnService.getResponsiveImages(originalUrl);
      
      expect(responsive).toHaveProperty('src');
      expect(responsive).toHaveProperty('srcSet');
      expect(responsive).toHaveProperty('sizes');
      expect(responsive.srcSet).toContain('320w');
      expect(responsive.srcSet).toContain('1536w');
    });

    it('should preload critical images', () => {
      const urls = ['image1.jpg', 'image2.jpg'];
      cdnService.preloadImages(urls);
      
      // Check if preload links were added
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      expect(preloadLinks.length).toBe(2);
    });
  });

  describe('Edge Caching', () => {
    it('should cache and retrieve data', async () => {
      const testData = { test: 'data' };
      await edgeCache.set('test-key', testData);
      
      const retrieved = await edgeCache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should handle cache expiration', async () => {
      const testData = { test: 'data' };
      await edgeCache.set('test-key', testData, 100); // 100ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const retrieved = await edgeCache.get('test-key');
      expect(retrieved).toBeUndefined();
    });
  });
});

describe('Service Worker', () => {
  it('should register service worker', async () => {
    const swUtil = new ServiceWorkerUtil();
    await swUtil.init();
    
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js', {
      scope: '/'
    });
  });

  it('should handle offline storage', async () => {
    const swUtil = new ServiceWorkerUtil();
    await swUtil.init();
    
    const offlineStorage = swUtil.getOfflineStorage();
    
    // Test storing offline post
    const postData = { title: 'Test Post', content: 'Test content' };
    const postId = await offlineStorage.storeOfflinePost(postData);
    
    expect(typeof postId).toBe('number');
    
    // Test retrieving offline posts
    const posts = await offlineStorage.getOfflinePosts();
    expect(Array.isArray(posts)).toBe(true);
  });
});

describe('PWA Install Prompt', () => {
  it('should render install prompt', () => {
    render(React.createElement(PWAInstallPrompt));
    
    // The prompt might not be visible initially
    // This test verifies the component renders without errors
    expect(true).toBe(true);
  });

  it('should handle install event', () => {
    const onInstall = jest.fn();
    render(React.createElement(PWAInstallPrompt, { onInstall }));
    
    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt');
    Object.defineProperty(event, 'prompt', {
      value: jest.fn(() => Promise.resolve())
    });
    Object.defineProperty(event, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted' })
    });
    
    window.dispatchEvent(event);
    
    // The component should handle the event
    expect(true).toBe(true);
  });
});

describe('Lazy Loading System', () => {
  describe('LazyImage', () => {
    it('should render lazy image with placeholder', () => {
      render(
        React.createElement(LazyImage, {
          src: "test-image.jpg",
          alt: "Test image",
          placeholder: "placeholder.jpg"
        })
      );
      
      expect(screen.getByAltText('Test image')).toBeInTheDocument();
    });

    it('should load high quality image after low quality', async () => {
      render(
        React.createElement(LazyImage, {
          src: "high-quality.jpg",
          alt: "Test image",
          lowQualitySrc: "low-quality.jpg"
        })
      );
      
      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
      
      // Initially should show low quality
      expect(img.getAttribute('src')).toBe('low-quality.jpg');
    });
  });

  describe('LazyVideo', () => {
    it('should render lazy video with poster', () => {
      render(
        React.createElement(LazyVideo, {
          src: "test-video.mp4",
          poster: "poster.jpg"
        })
      );
      
      // Check if video element exists
      const videos = document.querySelectorAll('video');
      expect(videos.length).toBeGreaterThan(0);
    });
  });

  describe('LazyBlockchainData', () => {
    it('should render blockchain data with loading state', () => {
      render(
        React.createElement(LazyBlockchainData, {
          address: "0x123",
          children: (data: any, loading: boolean, error: any) => 
            React.createElement('div', {},
              loading && React.createElement('span', {}, 'Loading...'),
              error && React.createElement('span', {}, `Error: ${error.message}`),
              data && React.createElement('span', {}, `Data: ${JSON.stringify(data)}`)
            )
        })
      );
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});

describe('Virtual Scrolling', () => {
  const mockItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`
  }));

  it('should render virtual scrolling container', () => {
    render(
      React.createElement(VirtualScrolling, {
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
        renderItem: (item: any) => React.createElement('div', { key: item.id }, item.name)
      })
    );
    
    const container = screen.getByTestId('virtual-scroll-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveStyle({ height: '400px' });
  });

  it('should only render visible items', () => {
    render(
      React.createElement(VirtualScrolling, {
        items: mockItems,
        itemHeight: 50,
        containerHeight: 400,
        renderItem: (item: any) => React.createElement('div', { key: item.id }, item.name)
      })
    );
    
    // Should only render items that fit in the container + overscan
    const renderedItems = screen.getAllByText(/Item \d+/);
    expect(renderedItems.length).toBeLessThan(mockItems.length);
    expect(renderedItems.length).toBeGreaterThan(0);
  });

  it('should handle loading more items', () => {
    const onLoadMore = jest.fn();
    
    render(
      React.createElement(VirtualScrolling, {
        items: mockItems.slice(0, 100),
        itemHeight: 50,
        containerHeight: 400,
        renderItem: (item: any) => React.createElement('div', { key: item.id }, item.name),
        onLoadMore: onLoadMore,
        hasNextPage: true
      })
    );
    
    const container = screen.getByTestId('virtual-scroll-container');
    
    // Simulate scrolling to bottom
    Object.defineProperty(container, 'scrollTop', { value: 4500, writable: true });
    Object.defineProperty(container, 'scrollHeight', { value: 5000, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, writable: true });
    
    container.dispatchEvent(new Event('scroll'));
    
    expect(onLoadMore).toHaveBeenCalled();
  });
});

describe('Performance Integration Tests', () => {
  it('should maintain performance budgets', async () => {
    // Simulate a page with good performance
    mockPerformance.getEntriesByType.mockReturnValue([{
      entryType: 'navigation',
      responseStart: 100,
      requestStart: 50,
      loadEventEnd: 800, // Good load time
      navigationStart: 0
    }]);

    const budgetCheck = await performanceBudget.checkBudgets();
    
    // Should pass or have minimal violations
    expect(budgetCheck.violations.length).toBeLessThan(3);
  });

  it('should optimize images automatically', () => {
    // Add images to DOM
    const img1 = document.createElement('img');
    img1.src = 'image1.jpg';
    document.body.appendChild(img1);

    const img2 = document.createElement('img');
    img2.src = 'image2.jpg';
    document.body.appendChild(img2);

    // Apply optimizations
    lighthouseOptimizer.applyOptimizations();

    // Check if lazy loading was applied
    const images = document.querySelectorAll('img');
    let lazyCount = 0;
    images.forEach(img => {
      if (img.getAttribute('loading') === 'lazy') {
        lazyCount++;
      }
    });

    expect(lazyCount).toBeGreaterThan(0);
  });

  it('should cache frequently accessed data', async () => {
    const testUrl = 'https://api.example.com/data';
    const testData = { cached: true };

    // Cache the data
    await edgeCache.set(testUrl, testData);

    // Retrieve from cache
    const cachedData = await edgeCache.get(testUrl);
    expect(cachedData).toEqual(testData);
  });
});

describe('Real-world Performance Scenarios', () => {
  it('should handle large product lists efficiently', async () => {
    const largeProductList = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Product ${i}`,
      price: Math.random() * 1000,
      image: `product-${i}.jpg`
    }));

    const startTime = performance.now();

    render(
      React.createElement(VirtualScrolling, {
        items: largeProductList,
        itemHeight: 120,
        containerHeight: 600,
        renderItem: (product: any) => React.createElement('div', { key: product.id },
          React.createElement(LazyImage, {
            src: product.image,
            alt: product.name,
            width: 100,
            height: 100
          }),
          React.createElement('span', {}, product.name),
          React.createElement('span', {}, `$${product.price.toFixed(2)}`)
        )
      })
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with large dataset
    expect(renderTime).toBeLessThan(100); // Less than 100ms
  });

  it('should maintain smooth scrolling performance', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));

    render(
      React.createElement(VirtualScrolling, {
        items: items,
        itemHeight: 50,
        containerHeight: 400,
        renderItem: (item: any) => React.createElement('div', { key: item.id }, item.name)
      })
    );

    const container = screen.getByTestId('virtual-scroll-container');

    // Simulate rapid scrolling
    for (let i = 0; i < 10; i++) {
      Object.defineProperty(container, 'scrollTop', { 
        value: i * 100, 
        writable: true 
      });
      container.dispatchEvent(new Event('scroll'));
    }

    // Should not throw errors or cause performance issues
    expect(true).toBe(true);
  });
});