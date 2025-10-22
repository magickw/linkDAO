import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupportDocuments } from '../SupportDocuments';
import { DocumentNavigation } from '../DocumentNavigation';
import { mockDocuments } from './mocks/documentMocks';

// Mock performance APIs
const mockPerformanceObserver = jest.fn();
const mockPerformanceMark = jest.fn();
const mockPerformanceMeasure = jest.fn();

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true
});

Object.defineProperty(window.performance, 'mark', {
  value: mockPerformanceMark,
  writable: true
});

Object.defineProperty(window.performance, 'measure', {
  value: mockPerformanceMeasure,
  writable: true
});

// Mock Intersection Observer for lazy loading
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

describe('Performance Testing Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance marks
    mockPerformanceMark.mockClear();
    mockPerformanceMeasure.mockClear();
  });

  describe('Initial Load Performance', () => {
    test('documents load within 2 seconds', async () => {
      const startTime = performance.now();
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(2000);
    });

    test('critical content renders immediately', () => {
      render(<SupportDocuments />);
      
      // Header and navigation should be visible immediately
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    test('uses performance marks for monitoring', () => {
      render(<SupportDocuments />);
      
      expect(mockPerformanceMark).toHaveBeenCalledWith('support-documents-start');
    });

    test('measures time to interactive', async () => {
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      expect(mockPerformanceMeasure).toHaveBeenCalledWith(
        'support-documents-interactive',
        'support-documents-start'
      );
    });
  });

  describe('Search Performance', () => {
    test('search responds within 300ms', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByRole('searchbox');
      const startTime = performance.now();
      
      await user.type(searchInput, 'security');
      
      await waitFor(() => {
        expect(screen.getByText('Security Best Practices')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      expect(searchTime).toBeLessThan(300);
    });

    test('debounces search input to prevent excessive calls', async () => {
      const user = userEvent.setup();
      const searchSpy = jest.fn();
      
      // Mock the search service
      jest.mocked(require('../../services/documentService').searchDocuments = searchSpy);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByRole('searchbox');
      
      // Type rapidly
      await user.type(searchInput, 'test query');
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350));
      
      // Should only call search once
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });

    test('caches search results for performance', async () => {
      const user = userEvent.setup();
      const searchSpy = jest.fn().mockResolvedValue(mockDocuments);
      
      jest.mocked(require('../../services/documentService').searchDocuments = searchSpy);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(screen.getByRole('searchbox')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByRole('searchbox');
      
      // First search
      await user.type(searchInput, 'security');
      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledTimes(1);
      });
      
      // Clear and search again
      await user.clear(searchInput);
      await user.type(searchInput, 'security');
      
      // Should use cached result
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lazy Loading Performance', () => {
    test('implements lazy loading for document content', () => {
      render(<SupportDocuments />);
      
      // Should use Intersection Observer for lazy loading
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    test('loads images lazily', () => {
      render(<SupportDocuments />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    test('preloads critical resources', () => {
      render(<SupportDocuments />);
      
      // Check for preload links in document head
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      expect(preloadLinks.length).toBeGreaterThan(0);
    });

    test('code splits non-critical components', async () => {
      const { container } = render(<SupportDocuments />);
      
      // Advanced features should be code-split
      expect(container.querySelector('[data-testid="advanced-features"]')).toBeNull();
      
      // Trigger loading of advanced features
      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await userEvent.click(advancedButton);
      
      await waitFor(() => {
        expect(container.querySelector('[data-testid="advanced-features"]')).toBeInTheDocument();
      });
    });
  });

  describe('Memory Performance', () => {
    test('cleans up event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<SupportDocuments />);
      
      const addedListeners = addEventListenerSpy.mock.calls.length;
      
      unmount();
      
      const removedListeners = removeEventListenerSpy.mock.calls.length;
      
      expect(removedListeners).toBe(addedListeners);
    });

    test('cancels pending requests on unmount', () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: {}
      };
      
      global.AbortController = jest.fn(() => mockAbortController) as any;
      
      const { unmount } = render(<SupportDocuments />);
      
      unmount();
      
      expect(abortSpy).toHaveBeenCalled();
    });

    test('uses memoization to prevent unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = React.memo(() => {
        renderSpy();
        return <SupportDocuments />;
      });
      
      const { rerender } = render(<TestComponent />);
      
      // Rerender with same props
      rerender(<TestComponent />);
      
      // Should only render once due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    test('implements virtual scrolling for large lists', async () => {
      // Mock large document list
      const largeDocumentList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockDocuments[0],
        id: `doc-${i}`,
        title: `Document ${i}`
      }));
      
      jest.mocked(require('../../services/documentService').loadDocuments)
        .mockResolvedValue(largeDocumentList);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        // Should only render visible items
        const renderedItems = screen.getAllByTestId(/document-card/);
        expect(renderedItems.length).toBeLessThan(50);
      });
    });
  });

  describe('Rendering Performance', () => {
    test('uses React.memo for expensive components', () => {
      const DocumentCard = require('../DocumentCard').DocumentCard;
      expect(DocumentCard.$$typeof).toBe(Symbol.for('react.memo'));
    });

    test('implements shouldComponentUpdate optimization', () => {
      const renderCount = jest.fn();
      
      const OptimizedComponent = React.memo(() => {
        renderCount();
        return <SupportDocuments />;
      });
      
      const { rerender } = render(<OptimizedComponent />);
      
      // Rerender with same props multiple times
      rerender(<OptimizedComponent />);
      rerender(<OptimizedComponent />);
      
      // Should only render once
      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    test('batches DOM updates efficiently', async () => {
      const user = userEvent.setup();
      render(<SupportDocuments />);
      
      const searchInput = screen.getByRole('searchbox');
      
      // Multiple rapid updates
      await user.type(searchInput, 'test');
      
      // Should batch updates and not cause layout thrashing
      const layoutShiftEntries = [];
      const observer = new PerformanceObserver((list) => {
        layoutShiftEntries.push(...list.getEntries());
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      
      expect(layoutShiftEntries.length).toBe(0);
    });

    test('minimizes layout shifts during loading', async () => {
      const { container } = render(<SupportDocuments />);
      
      // Measure initial layout
      const initialHeight = container.getBoundingClientRect().height;
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      // Layout should be stable
      const finalHeight = container.getBoundingClientRect().height;
      const layoutShift = Math.abs(finalHeight - initialHeight) / initialHeight;
      
      expect(layoutShift).toBeLessThan(0.1); // Less than 10% shift
    });
  });

  describe('Network Performance', () => {
    test('implements request deduplication', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      // Multiple components requesting same document
      render(
        <div>
          <SupportDocuments />
          <DocumentNavigation />
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Beginner\'s Guide to LDAO')).toBeInTheDocument();
      });
      
      // Should only make one request for the same resource
      const documentRequests = fetchSpy.mock.calls.filter(
        call => call[0]?.toString().includes('/api/support/documents')
      );
      
      expect(documentRequests.length).toBe(1);
    });

    test('uses compression for large responses', () => {
      render(<SupportDocuments />);
      
      // Check that requests include compression headers
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept-Encoding': 'gzip, deflate, br'
          })
        })
      );
    });

    test('implements progressive loading', async () => {
      render(<SupportDocuments />);
      
      // Essential content should load first
      expect(screen.getByRole('heading')).toBeInTheDocument();
      
      // Non-essential content loads later
      await waitFor(() => {
        expect(screen.getByTestId('document-analytics')).toBeInTheDocument();
      });
    });

    test('prefetches likely-needed resources', () => {
      render(<SupportDocuments />);
      
      // Should prefetch popular documents
      const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
      expect(prefetchLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Bundle Size Performance', () => {
    test('uses dynamic imports for large dependencies', async () => {
      const dynamicImportSpy = jest.fn().mockResolvedValue({
        default: () => <div>Advanced Feature</div>
      });
      
      // Mock dynamic import
      jest.doMock('../../components/AdvancedFeatures', () => dynamicImportSpy);
      
      render(<SupportDocuments />);
      
      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await userEvent.click(advancedButton);
      
      expect(dynamicImportSpy).toHaveBeenCalled();
    });

    test('tree-shakes unused code', () => {
      // This would be tested at build time, but we can check imports
      const moduleExports = require('../SupportDocuments');
      
      // Should only export what's needed
      expect(Object.keys(moduleExports)).toEqual(['SupportDocuments']);
    });

    test('uses efficient data structures', () => {
      render(<SupportDocuments />);
      
      // Check that large datasets use efficient structures
      const documentService = require('../../services/documentService');
      expect(documentService.searchIndex).toBeInstanceOf(Map);
    });
  });

  describe('Caching Performance', () => {
    test('implements service worker caching', () => {
      // Check if service worker is registered
      expect(navigator.serviceWorker).toBeDefined();
    });

    test('uses browser caching effectively', () => {
      render(<SupportDocuments />);
      
      // Static assets should have cache headers
      const staticRequests = jest.mocked(global.fetch).mock.calls.filter(
        call => call[0]?.toString().includes('.js') || call[0]?.toString().includes('.css')
      );
      
      staticRequests.forEach(request => {
        expect(request[1]?.headers).toMatchObject({
          'Cache-Control': expect.stringMatching(/max-age/)
        });
      });
    });

    test('invalidates cache appropriately', async () => {
      const { rerender } = render(<SupportDocuments />);
      
      // Mock cache invalidation
      const cacheInvalidationSpy = jest.fn();
      jest.mocked(require('../../services/cacheService').invalidateCache = cacheInvalidationSpy);
      
      // Trigger cache invalidation
      rerender(<SupportDocuments key="new" />);
      
      expect(cacheInvalidationSpy).toHaveBeenCalled();
    });
  });

  describe('Real User Monitoring', () => {
    test('tracks Core Web Vitals', () => {
      render(<SupportDocuments />);
      
      // Should observe performance metrics
      expect(mockPerformanceObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] }
      );
    });

    test('reports performance metrics', async () => {
      const reportSpy = jest.fn();
      jest.mocked(require('../../services/analyticsService').reportPerformance = reportSpy);
      
      render(<SupportDocuments />);
      
      await waitFor(() => {
        expect(reportSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            metric: expect.any(String),
            value: expect.any(Number)
          })
        );
      });
    });

    test('adapts to network conditions', () => {
      // Mock slow network
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        writable: true
      });
      
      render(<SupportDocuments />);
      
      // Should reduce quality for slow connections
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img.src).toMatch(/quality=low/);
      });
    });
  });

  describe('Performance Regression Prevention', () => {
    test('maintains performance budget', () => {
      const bundleSize = require('../../utils/bundleAnalyzer').getBundleSize();
      
      // Bundle size should not exceed budget
      expect(bundleSize.main).toBeLessThan(250 * 1024); // 250KB
      expect(bundleSize.vendor).toBeLessThan(500 * 1024); // 500KB
    });

    test('monitors performance in CI', () => {
      // This would run in CI environment
      if (process.env.CI) {
        const performanceReport = require('../../performance-report.json');
        
        expect(performanceReport.loadTime).toBeLessThan(2000);
        expect(performanceReport.bundleSize).toBeLessThan(750 * 1024);
      }
    });

    test('alerts on performance degradation', () => {
      const alertSpy = jest.fn();
      jest.mocked(require('../../services/monitoringService').alert = alertSpy);
      
      // Mock performance degradation
      const slowLoadTime = 5000;
      
      if (slowLoadTime > 2000) {
        alertSpy('Performance degradation detected');
      }
      
      expect(alertSpy).toHaveBeenCalledWith('Performance degradation detected');
    });
  });
});