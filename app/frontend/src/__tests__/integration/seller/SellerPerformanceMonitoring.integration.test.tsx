import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryProvider } from '@tanstack/react-query';
import { SellerPerformanceDashboard } from '../../../components/Seller/Performance/SellerPerformanceDashboard';
import { PerformanceRegressionTester } from '../../../components/Seller/Performance/PerformanceRegressionTester';
import { useSellerPerformanceMonitoring } from '../../../hooks/useSellerPerformanceMonitoring';

// Mock the performance monitoring service
jest.mock('../../../services/sellerPerformanceMonitoringService', () => ({
  sellerPerformanceMonitoringService: {
    getPerformanceDashboard: jest.fn().mockResolvedValue({
      sellerId: 'test-seller',
      overallScore: 85,
      metrics: {
        sellerId: 'test-seller',
        timestamp: new Date().toISOString(),
        componentLoadTimes: {
          sellerOnboarding: 1200,
          sellerProfile: 800,
          sellerDashboard: 1500,
          sellerStore: 1000,
        },
        apiResponseTimes: {
          getProfile: 250,
          updateProfile: 400,
          getListings: 300,
          createListing: 500,
          getDashboard: 350,
        },
        cacheMetrics: {
          hitRate: 92,
          missRate: 8,
          invalidationTime: 50,
          averageRetrievalTime: 25,
        },
        errorMetrics: {
          totalErrors: 2,
          errorRate: 0.5,
          criticalErrors: 0,
          recoveredErrors: 1,
          errorsByType: { api: 1, component: 1 },
        },
        userExperienceMetrics: {
          timeToInteractive: 2000,
          firstContentfulPaint: 1500,
          largestContentfulPaint: 2500,
          cumulativeLayoutShift: 0.1,
          firstInputDelay: 100,
        },
        mobileMetrics: {
          touchResponseTime: 50,
          scrollPerformance: 60,
          gestureRecognitionTime: 30,
          batteryImpact: 5,
        },
        realTimeMetrics: {
          webSocketConnectionTime: 200,
          messageDeliveryTime: 100,
          liveUpdateLatency: 150,
          connectionStability: 95,
        },
      },
      alerts: [
        {
          id: 'alert-1',
          sellerId: 'test-seller',
          alertType: 'performance',
          severity: 'medium',
          title: 'Slow API Response',
          description: 'API response time is above threshold',
          metrics: { responseTime: 3000, threshold: 2000 },
          timestamp: new Date().toISOString(),
          resolved: false,
          actions: []
        }
      ],
      regressions: [],
      trends: [
        {
          metric: 'API Response Time',
          data: [
            { timestamp: new Date().toISOString(), value: 250 },
            { timestamp: new Date().toISOString(), value: 300 },
            { timestamp: new Date().toISOString(), value: 280 }
          ]
        }
      ],
      recommendations: [
        {
          priority: 'high',
          title: 'Optimize API Endpoints',
          description: 'Consider caching frequently accessed data',
          expectedImpact: 'Reduce response time by 30%',
          effort: 'medium'
        }
      ]
    }),
    runPerformanceRegressionTest: jest.fn().mockResolvedValue({
      testId: 'test-123',
      sellerId: 'test-seller',
      testType: 'load',
      status: 'completed',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 300000,
      results: {
        averageResponseTime: 250,
        maxResponseTime: 800,
        minResponseTime: 100,
        throughput: 100,
        errorRate: 0.5,
        successRate: 99.5,
        concurrentUsers: 50,
        totalRequests: 5000,
        failedRequests: 25
      },
      regressions: [],
      recommendations: ['Optimize database queries', 'Enable response caching']
    }),
    startMonitoring: jest.fn().mockResolvedValue(undefined),
    stopMonitoring: jest.fn().mockReturnValue(undefined),
    subscribeToAlerts: jest.fn().mockReturnValue(undefined),
    unsubscribeFromAlerts: jest.fn().mockReturnValue(undefined),
    trackComponentPerformance: jest.fn().mockReturnValue(undefined),
    trackAPIPerformance: jest.fn().mockReturnValue(undefined),
    trackCachePerformance: jest.fn().mockReturnValue(undefined),
    trackMobilePerformance: jest.fn().mockReturnValue(undefined),
    trackRealTimePerformance: jest.fn().mockReturnValue(undefined),
  }
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryProvider client={queryClient}>
      {children}
    </QueryProvider>
  );
};

describe('Seller Performance Monitoring Integration', () => {
  const testSellerId = 'test-seller-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Dashboard', () => {
    it('should render performance dashboard with metrics', async () => {
      render(
        <TestWrapper>
          <SellerPerformanceDashboard sellerId={testSellerId} />
        </TestWrapper>
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading performance data...')).not.toBeInTheDocument();
      });

      // Check if main elements are rendered
      expect(screen.getByText('Performance Monitoring')).toBeInTheDocument();
      expect(screen.getByText('Overall Performance Score')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument(); // Overall score

      // Check if key metrics are displayed
      expect(screen.getByText('Key Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('API Response Time')).toBeInTheDocument();
      expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument();
      expect(screen.getByText('Error Rate')).toBeInTheDocument();
      expect(screen.getByText('First Contentful Paint')).toBeInTheDocument();
    });

    it('should display performance alerts', async () => {
      render(
        <TestWrapper>
          <SellerPerformanceDashboard sellerId={testSellerId} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Alerts')).toBeInTheDocument();
      });

      // Check if alert is displayed
      expect(screen.getByText('Slow API Response')).toBeInTheDocument();
      expect(screen.getByText('API response time is above threshold')).toBeInTheDocument();
    });

    it('should display performance recommendations', async () => {
      render(
        <TestWrapper>
          <SellerPerformanceDashboard sellerId={testSellerId} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Performance Recommendations')).toBeInTheDocument();
      });

      // Check if recommendation is displayed
      expect(screen.getByText('Optimize API Endpoints')).toBeInTheDocument();
      expect(screen.getByText('Consider caching frequently accessed data')).toBeInTheDocument();
    });

    it('should handle refresh functionality', async () => {
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');

      render(
        <TestWrapper>
          <SellerPerformanceDashboard sellerId={testSellerId} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Verify service was called again
      await waitFor(() => {
        expect(sellerPerformanceMonitoringService.getPerformanceDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Regression Tester', () => {
    it('should render regression tester interface', async () => {
      render(
        <TestWrapper>
          <PerformanceRegressionTester sellerId={testSellerId} />
        </TestWrapper>
      );

      // Check if main elements are rendered
      expect(screen.getByText('Performance Regression Testing')).toBeInTheDocument();
      expect(screen.getByText('Test Configuration')).toBeInTheDocument();
      expect(screen.getByText('Test Type')).toBeInTheDocument();

      // Check if test types are available
      expect(screen.getByText('Load Test')).toBeInTheDocument();
      expect(screen.getByText('Stress Test')).toBeInTheDocument();
      expect(screen.getByText('Endurance Test')).toBeInTheDocument();
      expect(screen.getByText('Spike Test')).toBeInTheDocument();
      expect(screen.getByText('Volume Test')).toBeInTheDocument();
    });

    it('should run performance test when button is clicked', async () => {
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');

      render(
        <TestWrapper>
          <PerformanceRegressionTester sellerId={testSellerId} />
        </TestWrapper>
      );

      // Click run test button
      const runTestButton = screen.getByText('Run Test');
      fireEvent.click(runTestButton);

      // Verify service was called
      await waitFor(() => {
        expect(sellerPerformanceMonitoringService.runPerformanceRegressionTest).toHaveBeenCalledWith(
          testSellerId,
          'load'
        );
      });

      // Check if test results are displayed
      await waitFor(() => {
        expect(screen.getByText('Test Results')).toBeInTheDocument();
      });
    });

    it('should allow selecting different test types', async () => {
      render(
        <TestWrapper>
          <PerformanceRegressionTester sellerId={testSellerId} />
        </TestWrapper>
      );

      // Click on stress test
      const stressTestOption = screen.getByText('Stress Test');
      fireEvent.click(stressTestOption);

      // Verify selection
      expect(screen.getByText('Selected: Stress Test')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring Hook', () => {
    const TestComponent: React.FC<{ sellerId: string }> = ({ sellerId }) => {
      const {
        dashboardData,
        loading,
        error,
        isMonitoring,
        startMonitoring,
        stopMonitoring,
        trackComponentPerformance,
        trackAPIPerformance
      } = useSellerPerformanceMonitoring({
        sellerId,
        autoStart: false
      });

      return (
        <div>
          <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
          <div data-testid="monitoring">{isMonitoring ? 'Monitoring' : 'Not Monitoring'}</div>
          <div data-testid="error">{error || 'No Error'}</div>
          <div data-testid="score">{dashboardData?.overallScore || 'No Score'}</div>
          <button onClick={startMonitoring}>Start Monitoring</button>
          <button onClick={stopMonitoring}>Stop Monitoring</button>
          <button onClick={() => trackComponentPerformance('TestComponent', 1000)}>
            Track Component
          </button>
          <button onClick={() => trackAPIPerformance('/api/test', 500, true)}>
            Track API
          </button>
        </div>
      );
    };

    it('should provide monitoring functionality through hook', async () => {
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');

      render(
        <TestWrapper>
          <TestComponent sellerId={testSellerId} />
        </TestWrapper>
      );

      // Initially not monitoring
      expect(screen.getByTestId('monitoring')).toHaveTextContent('Not Monitoring');

      // Start monitoring
      const startButton = screen.getByText('Start Monitoring');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(sellerPerformanceMonitoringService.startMonitoring).toHaveBeenCalledWith(testSellerId);
      });

      // Track component performance
      const trackComponentButton = screen.getByText('Track Component');
      fireEvent.click(trackComponentButton);

      expect(sellerPerformanceMonitoringService.trackComponentPerformance).toHaveBeenCalledWith(
        testSellerId,
        'TestComponent',
        1000,
        undefined
      );

      // Track API performance
      const trackAPIButton = screen.getByText('Track API');
      fireEvent.click(trackAPIButton);

      expect(sellerPerformanceMonitoringService.trackAPIPerformance).toHaveBeenCalledWith(
        testSellerId,
        '/api/test',
        500,
        true,
        undefined
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');
      
      // Mock service to throw error
      sellerPerformanceMonitoringService.getPerformanceDashboard.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      render(
        <TestWrapper>
          <SellerPerformanceDashboard sellerId={testSellerId} />
        </TestWrapper>
      );

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Error Loading Performance Data')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load performance data. Please try again.')).toBeInTheDocument();
    });

    it('should handle test failures gracefully', async () => {
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');
      
      // Mock service to throw error
      sellerPerformanceMonitoringService.runPerformanceRegressionTest.mockRejectedValueOnce(
        new Error('Test failed')
      );

      render(
        <TestWrapper>
          <PerformanceRegressionTester sellerId={testSellerId} />
        </TestWrapper>
      );

      // Click run test button
      const runTestButton = screen.getByText('Run Test');
      fireEvent.click(runTestButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Test Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to run performance test. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time alert notifications', async () => {
      const TestAlertComponent: React.FC = () => {
        const { subscribeToAlerts } = useSellerPerformanceMonitoring({
          sellerId: testSellerId,
          autoStart: false
        });

        const [alertReceived, setAlertReceived] = React.useState(false);

        React.useEffect(() => {
          subscribeToAlerts((alert) => {
            setAlertReceived(true);
          });
        }, [subscribeToAlerts]);

        return (
          <div data-testid="alert-status">
            {alertReceived ? 'Alert Received' : 'No Alert'}
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestAlertComponent />
        </TestWrapper>
      );

      // Initially no alert
      expect(screen.getByTestId('alert-status')).toHaveTextContent('No Alert');

      // Simulate alert subscription
      const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');
      expect(sellerPerformanceMonitoringService.subscribeToAlerts).toHaveBeenCalled();
    });
  });
});

describe('Performance Monitoring Integration with Error Tracking', () => {
  const testSellerId = 'integration-test-seller';

  it('should integrate performance monitoring with error tracking', async () => {
    // This test would verify that performance issues trigger error tracking
    // and that error spikes are reflected in performance metrics
    
    const TestIntegrationComponent: React.FC = () => {
      const { trackAPIPerformance, dashboardData } = useSellerPerformanceMonitoring({
        sellerId: testSellerId,
        autoStart: true
      });

      React.useEffect(() => {
        // Simulate a slow API call that should trigger performance alert
        trackAPIPerformance('/api/slow-endpoint', 6000, false, 'TimeoutError');
      }, [trackAPIPerformance]);

      return (
        <div>
          <div data-testid="error-rate">
            {dashboardData?.metrics.errorMetrics.errorRate || 0}
          </div>
          <div data-testid="api-response-time">
            {dashboardData?.metrics.apiResponseTimes.getProfile || 0}
          </div>
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestIntegrationComponent />
      </TestWrapper>
    );

    // Verify that performance tracking was called
    const { sellerPerformanceMonitoringService } = require('../../../services/sellerPerformanceMonitoringService');
    
    await waitFor(() => {
      expect(sellerPerformanceMonitoringService.trackAPIPerformance).toHaveBeenCalledWith(
        testSellerId,
        '/api/slow-endpoint',
        6000,
        false,
        'TimeoutError'
      );
    });
  });
});