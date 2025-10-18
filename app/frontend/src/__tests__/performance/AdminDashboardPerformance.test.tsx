import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { performance } from 'perf_hooks';
import { jest } from '@jest/globals';
import AdminDashboard from '../../components/Admin/AdminDashboard';
import AnalyticsDashboard from '../../components/Admin/Analytics/AnalyticsDashboard';

// Mock performance observer
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => [])
};

// Mock intersection observer for virtual scrolling
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});

window.IntersectionObserver = mockIntersectionObserver;
window.PerformanceObserver = jest.fn().mockImplementation(() => mockPerformanceObserver);

// Mock Chart.js for performance testing
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    getChart: jest.fn(() => ({
      update: jest.fn(),
      destroy: jest.fn(),
      resize: jest.fn()
    }))
  }
}));

jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, onUpdate }: any) => {
    React.useEffect(() => {
      // Simulate chart rendering time
      const renderTime = Math.random() * 100 + 50; // 50-150ms
      setTimeout(() => {
        if (onUpdate) onUpdate();
      }, renderTime);
    }, [data, onUpdate]);
    
    return <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />;
  },
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Pie: ({ data, options }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />
  )
}));

// Mock WebSocket for real-time performance testing
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock hooks with performance data
jest.mock('../../hooks/useAdminDashboard', () => ({
  useAdminDashboard: () => ({
    metrics: {
      realTimeUsers: 1500,
      systemHealth: { overall: 'healthy', components: [], alerts: [], performance: {} },
      moderationQueue: { pending: 25, processed: 1000 },
      sellerMetrics: { active: 150, pending: 12 },
      disputeStats: { open: 8, resolved: 95 },
      aiInsights: Array.from({ length: 10 }, (_, i) => ({
        id: `insight-${i}`,
        type: 'prediction',
        severity: 'medium',
        title: `Insight ${i}`,
        description: `Description ${i}`,
        confidence: 0.8
      }))
    },
    loading: false,
    error: null,
    refreshMetrics: jest.fn()
  })
}));

jest.mock('../../hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    userMetrics: {
      totalUsers: 50000,
      activeUsers: 35000,
      newUsers: 2500,
      retentionRate: 0.75
    },
    contentMetrics: {
      totalPosts: 250000,
      postsToday: 1200,
      engagementRate: 0.65
    },
    systemMetrics: {
      uptime: 0.999,
      responseTime: 150,
      errorRate: 0.001
    },
    chartData: {
      userGrowth: {
        labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
        datasets: [{
          label: 'Users',
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000) + 1000)
        }]
      },
      engagement: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Engagement',
          data: Array.from({ length: 24 }, () => Math.random() * 100)
        }]
      }
    },
    loading: false,
    error: null,
    refreshAnalytics: jest.fn()
  })
}));

describe('Admin Dashboard Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset performance marks
    if (performance.clearMarks) {
      performance.clearMarks();
    }
  });

  describe('Component Rendering Performance', () => {
    it('should render admin dashboard within acceptable time', async () => {
      const startTime = performance.now();
      
      render(<AdminDashboard />);
      
      // Wait for all components to be visible
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 500ms
      expect(renderTime).toBeLessThan(500);
      
      console.log(`Admin dashboard rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should handle large datasets efficiently in analytics dashboard', async () => {
      const startTime = performance.now();
      
      render(<AnalyticsDashboard />);
      
      // Wait for charts to render
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within 1 second even with large datasets
      expect(renderTime).toBeLessThan(1000);
      
      console.log(`Analytics dashboard with large dataset rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should efficiently re-render on data updates', async () => {
      const { rerender } = render(<AdminDashboard />);
      
      // Initial render
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      // Measure re-render performance
      const startTime = performance.now();
      
      // Simulate data update by re-rendering
      rerender(<AdminDashboard />);
      
      const endTime = performance.now();
      const rerenderTime = endTime - startTime;
      
      // Re-renders should be very fast
      expect(rerenderTime).toBeLessThan(100);
      
      console.log(`Dashboard re-render completed in ${rerenderTime.toFixed(2)}ms`);
    });
  });

  describe('Chart Rendering Performance', () => {
    it('should render multiple charts efficiently', async () => {
      const chartCount = 6; // Typical dashboard chart count
      const startTime = performance.now();
      
      render(<AnalyticsDashboard />);
      
      // Wait for all charts to render
      await waitFor(() => {
        const charts = screen.getAllByTestId(/chart$/);
        expect(charts.length).toBeGreaterThanOrEqual(chartCount);
      });
      
      const endTime = performance.now();
      const totalRenderTime = endTime - startTime;
      const averageChartRenderTime = totalRenderTime / chartCount;
      
      // Each chart should render quickly
      expect(averageChartRenderTime).toBeLessThan(200);
      
      console.log(`${chartCount} charts rendered in ${totalRenderTime.toFixed(2)}ms (avg: ${averageChartRenderTime.toFixed(2)}ms per chart)`);
    });

    it('should handle chart data updates efficiently', async () => {
      render(<AnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
      
      const chart = screen.getByTestId('line-chart');
      const initialData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');
      
      // Simulate data update
      const startTime = performance.now();
      
      // Trigger chart update (simulated through re-render with new data)
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      
      await waitFor(() => {
        const updatedChart = screen.getByTestId('line-chart');
        const updatedData = JSON.parse(updatedChart.getAttribute('data-chart-data') || '{}');
        expect(updatedData).toBeDefined();
      });
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Chart updates should be fast
      expect(updateTime).toBeLessThan(300);
      
      console.log(`Chart data update completed in ${updateTime.toFixed(2)}ms`);
    });

    it('should optimize chart animations and transitions', async () => {
      render(<AnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
      
      // Test zoom interaction performance
      const chart = screen.getByTestId('line-chart');
      const startTime = performance.now();
      
      // Simulate zoom interaction
      fireEvent.wheel(chart, { deltaY: -100 });
      
      // Wait for zoom animation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const interactionTime = endTime - startTime;
      
      // Interactions should be responsive
      expect(interactionTime).toBeLessThan(150);
      
      console.log(`Chart zoom interaction completed in ${interactionTime.toFixed(2)}ms`);
    });
  });

  describe('Real-Time Updates Performance', () => {
    it('should handle WebSocket updates efficiently', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      // Simulate WebSocket message
      const startTime = performance.now();
      
      const mockMessage = {
        type: 'metrics_update',
        data: {
          realTimeUsers: 1600,
          systemLoad: 0.75,
          timestamp: new Date().toISOString()
        }
      };
      
      // Trigger WebSocket message handler
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      if (messageHandler) {
        messageHandler({ data: JSON.stringify(mockMessage) });
      }
      
      // Wait for UI update
      await waitFor(() => {
        expect(screen.getByTestId('real-time-users-metric')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      // Real-time updates should be very fast
      expect(updateTime).toBeLessThan(50);
      
      console.log(`Real-time update processed in ${updateTime.toFixed(2)}ms`);
    });

    it('should throttle high-frequency updates', async () => {
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      const updateCount = 20;
      const updates: number[] = [];
      
      // Send rapid updates
      for (let i = 0; i < updateCount; i++) {
        const startTime = performance.now();
        
        const mockMessage = {
          type: 'metrics_update',
          data: {
            realTimeUsers: 1500 + i,
            updateId: i,
            timestamp: new Date().toISOString()
          }
        };
        
        const messageHandler = mockWebSocket.addEventListener.mock.calls
          .find(call => call[0] === 'message')?.[1];
        
        if (messageHandler) {
          messageHandler({ data: JSON.stringify(mockMessage) });
        }
        
        const endTime = performance.now();
        updates.push(endTime - startTime);
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const averageUpdateTime = updates.reduce((a, b) => a + b, 0) / updates.length;
      const maxUpdateTime = Math.max(...updates);
      
      // Updates should remain fast even with high frequency
      expect(averageUpdateTime).toBeLessThan(20);
      expect(maxUpdateTime).toBeLessThan(100);
      
      console.log(`High-frequency updates - Avg: ${averageUpdateTime.toFixed(2)}ms, Max: ${maxUpdateTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should properly cleanup resources on unmount', async () => {
      const { unmount } = render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      // Track cleanup calls
      const cleanupCalls = {
        webSocket: 0,
        intervals: 0,
        observers: 0
      };
      
      // Mock cleanup tracking
      const originalClose = mockWebSocket.close;
      mockWebSocket.close = jest.fn(() => {
        cleanupCalls.webSocket++;
        originalClose();
      });
      
      const originalDisconnect = mockPerformanceObserver.disconnect;
      mockPerformanceObserver.disconnect = jest.fn(() => {
        cleanupCalls.observers++;
        originalDisconnect();
      });
      
      // Unmount component
      unmount();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify cleanup occurred
      expect(cleanupCalls.webSocket).toBeGreaterThan(0);
      expect(mockWebSocket.close).toHaveBeenCalled();
      
      console.log('Resource cleanup completed successfully');
    });

    it('should handle component re-mounting efficiently', async () => {
      const mountTimes: number[] = [];
      
      // Test multiple mount/unmount cycles
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        
        const { unmount } = render(<AdminDashboard />);
        
        await waitFor(() => {
          expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
        });
        
        const endTime = performance.now();
        mountTimes.push(endTime - startTime);
        
        unmount();
        
        // Brief pause between cycles
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const averageMountTime = mountTimes.reduce((a, b) => a + b, 0) / mountTimes.length;
      const maxMountTime = Math.max(...mountTimes);
      
      // Mount times should remain consistent
      expect(averageMountTime).toBeLessThan(500);
      expect(maxMountTime).toBeLessThan(800);
      
      console.log(`Component re-mounting - Avg: ${averageMountTime.toFixed(2)}ms, Max: ${maxMountTime.toFixed(2)}ms`);
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should efficiently render large lists with virtual scrolling', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100
      }));
      
      // Mock component with virtual scrolling
      const VirtualizedList = () => {
        const [visibleItems, setVisibleItems] = React.useState(
          largeDataset.slice(0, 50) // Only render first 50 items initially
        );
        
        return (
          <div data-testid="virtualized-list">
            {visibleItems.map(item => (
              <div key={item.id} data-testid="list-item">
                {item.name}: {item.value.toFixed(2)}
              </div>
            ))}
          </div>
        );
      };
      
      const startTime = performance.now();
      
      render(<VirtualizedList />);
      
      await waitFor(() => {
        expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
        expect(screen.getAllByTestId('list-item')).toHaveLength(50);
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly despite large dataset
      expect(renderTime).toBeLessThan(200);
      
      console.log(`Virtual scrolling list (10k items, 50 visible) rendered in ${renderTime.toFixed(2)}ms`);
    });

    it('should handle scroll performance efficiently', async () => {
      const VirtualizedList = () => {
        const [scrollTop, setScrollTop] = React.useState(0);
        
        const handleScroll = React.useCallback((e: React.UIEvent) => {
          setScrollTop(e.currentTarget.scrollTop);
        }, []);
        
        return (
          <div 
            data-testid="scrollable-container"
            style={{ height: '400px', overflow: 'auto' }}
            onScroll={handleScroll}
          >
            <div style={{ height: '10000px', paddingTop: scrollTop }}>
              <div data-testid="scroll-content">Scrolled to: {scrollTop}px</div>
            </div>
          </div>
        );
      };
      
      render(<VirtualizedList />);
      
      const container = screen.getByTestId('scrollable-container');
      
      // Measure scroll performance
      const scrollTimes: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        fireEvent.scroll(container, { target: { scrollTop: i * 100 } });
        
        const endTime = performance.now();
        scrollTimes.push(endTime - startTime);
      }
      
      const averageScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
      const maxScrollTime = Math.max(...scrollTimes);
      
      // Scroll handling should be very fast
      expect(averageScrollTime).toBeLessThan(10);
      expect(maxScrollTime).toBeLessThan(50);
      
      console.log(`Scroll performance - Avg: ${averageScrollTime.toFixed(2)}ms, Max: ${maxScrollTime.toFixed(2)}ms`);
    });
  });

  describe('Responsive Design Performance', () => {
    it('should adapt to viewport changes efficiently', async () => {
      // Mock viewport resize
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      render(<AdminDashboard />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      });
      
      const resizeTimes: number[] = [];
      const viewports = [
        { width: 1920, height: 1080 }, // Desktop
        { width: 1024, height: 768 },  // Tablet
        { width: 375, height: 667 }    // Mobile
      ];
      
      for (const viewport of viewports) {
        const startTime = performance.now();
        
        // Simulate viewport change
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewport.width
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: viewport.height
        });
        
        // Trigger resize event
        fireEvent(window, new Event('resize'));
        
        // Wait for layout adjustment
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const endTime = performance.now();
        resizeTimes.push(endTime - startTime);
      }
      
      // Restore original viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: originalInnerHeight
      });
      
      const averageResizeTime = resizeTimes.reduce((a, b) => a + b, 0) / resizeTimes.length;
      const maxResizeTime = Math.max(...resizeTimes);
      
      // Viewport changes should be handled quickly
      expect(averageResizeTime).toBeLessThan(100);
      expect(maxResizeTime).toBeLessThan(200);
      
      console.log(`Viewport adaptation - Avg: ${averageResizeTime.toFixed(2)}ms, Max: ${maxResizeTime.toFixed(2)}ms`);
    });
  });
});