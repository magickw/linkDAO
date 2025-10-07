/**
 * Performance Dashboard
 * Real-time performance monitoring with Core Web Vitals and alerting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';

interface CoreWebVitals {
  LCP: number | null;
  FID: number | null;
  CLS: number | null;
  FCP: number | null;
  TTFB: number | null;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface ABTestResult {
  testId: string;
  variants: Array<{
    variantId: string;
    sampleSize: number;
    metrics: Record<string, { mean: number; stdDev: number }>;
  }>;
}

const PerformanceDashboard: React.FC = () => {
  const [coreWebVitals, setCoreWebVitals] = useState<CoreWebVitals>({
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Update performance data
  const updatePerformanceData = useCallback(() => {
    try {
      const vitals = performanceMonitoringService.getCoreWebVitals();
      setCoreWebVitals(vitals);

      const activeAlerts = performanceMonitoringService.getActiveAlerts();
      setAlerts(activeAlerts);

      const summary = performanceMonitoringService.getPerformanceSummary();
      setPerformanceSummary(summary);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to update performance data:', error);
    }
  }, []);

  // Handle performance alerts
  const handlePerformanceAlert = useCallback((event: CustomEvent) => {
    const alert = event.detail as PerformanceAlert;
    setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
  }, []);

  useEffect(() => {
    updatePerformanceData();

    // Listen for performance alerts
    window.addEventListener('performance-alert', handlePerformanceAlert as EventListener);

    // Set up periodic updates
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(updatePerformanceData, 10000); // Update every 10 seconds
    }

    return () => {
      window.removeEventListener('performance-alert', handlePerformanceAlert as EventListener);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [updatePerformanceData, handlePerformanceAlert, autoRefresh]);

  // Get Core Web Vitals status
  const getVitalStatus = (metric: string, value: number | null): 'good' | 'needs-improvement' | 'poor' => {
    if (value === null) return 'good';

    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Format metric value
  const formatMetricValue = (metric: string, value: number | null): string => {
    if (value === null) return 'N/A';

    switch (metric) {
      case 'LCP':
      case 'FID':
      case 'FCP':
      case 'TTFB':
        return `${value.toFixed(0)}ms`;
      case 'CLS':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Resolve alert
  const resolveAlert = (alertId: string) => {
    performanceMonitoringService.resolveAlert(alertId);
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  // Create sample A/B test
  const createSampleABTest = () => {
    performanceMonitoringService.createABTest({
      testId: 'cache-strategy-test',
      name: 'Cache Strategy Optimization',
      variants: [
        { id: 'control', name: 'Current Strategy', weight: 0.5, config: { strategy: 'current' } },
        { id: 'aggressive', name: 'Aggressive Caching', weight: 0.5, config: { strategy: 'aggressive' } }
      ],
      metrics: ['pageLoadTime', 'cacheHitRate', 'userSatisfaction'],
      startDate: Date.now(),
      endDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      active: true
    });

    // Simulate some test results
    const userId = 'user-123';
    const variant = performanceMonitoringService.getUserVariant('cache-strategy-test', userId);
    if (variant) {
      performanceMonitoringService.recordABTestResult('cache-strategy-test', variant, userId, {
        pageLoadTime: Math.random() * 2000 + 1000,
        cacheHitRate: Math.random() * 0.3 + 0.7,
        userSatisfaction: Math.random() * 0.2 + 0.8
      });
    }

    // Get results
    const results = performanceMonitoringService.getABTestResults('cache-strategy-test');
    setAbTestResults([{ testId: 'cache-strategy-test', ...results }]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Performance Monitoring</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              autoRefresh 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={updatePerformanceData}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Core Web Vitals</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(coreWebVitals).map(([metric, value]) => {
              const status = getVitalStatus(metric, value);
              return (
                <div key={metric} className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {status.replace('-', ' ').toUpperCase()}
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatMetricValue(metric, value)}
                    </div>
                    <div className="text-sm text-gray-500">{metric}</div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {metric === 'LCP' && 'Largest Contentful Paint'}
                    {metric === 'FID' && 'First Input Delay'}
                    {metric === 'CLS' && 'Cumulative Layout Shift'}
                    {metric === 'FCP' && 'First Contentful Paint'}
                    {metric === 'TTFB' && 'Time to First Byte'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {performanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-medium text-gray-900 mb-4">Page Performance</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average Load Time</span>
                <span className="text-sm font-medium">
                  {performanceSummary.averageMetrics.pageLoadTime.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className="text-sm font-medium">
                  {formatBytes(performanceSummary.averageMetrics.memoryUsage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-medium">
                  {(performanceSummary.averageMetrics.errorRate * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-medium text-gray-900 mb-4">User Interactions</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Clicks</span>
                <span className="text-sm font-medium">
                  {performanceSummary.userInteractions.clicks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scrolls</span>
                <span className="text-sm font-medium">
                  {performanceSummary.userInteractions.scrolls}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Keystrokes</span>
                <span className="text-sm font-medium">
                  {performanceSummary.userInteractions.keystrokes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Touches</span>
                <span className="text-sm font-medium">
                  {performanceSummary.userInteractions.touches}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h4 className="font-medium text-gray-900 mb-4">Alerts</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Active</span>
                <span className="text-sm font-medium">
                  {performanceSummary.alerts.total}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Critical</span>
                <span className="text-sm font-medium text-red-600">
                  {performanceSummary.alerts.critical}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">Warnings</span>
                <span className="text-sm font-medium text-yellow-600">
                  {performanceSummary.alerts.warnings}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Performance Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {alerts.filter(alert => !alert.resolved).slice(0, 10).map((alert) => (
                <div key={alert.id} className={`border-l-4 pl-4 ${
                  alert.type === 'critical' ? 'border-red-400 bg-red-50' : 'border-yellow-400 bg-yellow-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.type === 'critical' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.type.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900">{alert.metric}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* A/B Testing */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">A/B Testing</h3>
          <button
            onClick={createSampleABTest}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Create Sample Test
          </button>
        </div>
        <div className="p-6">
          {abTestResults.length > 0 ? (
            <div className="space-y-6">
              {abTestResults.map((test) => (
                <div key={test.testId}>
                  <h4 className="font-medium text-gray-900 mb-4">Test: {test.testId}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {test.variants.map((variant) => (
                      <div key={variant.variantId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">{variant.variantId}</h5>
                          <span className="text-sm text-gray-500">
                            {variant.sampleSize} samples
                          </span>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(variant.metrics).map(([metric, stats]) => (
                            <div key={metric} className="flex justify-between text-sm">
                              <span className="text-gray-600">{metric}</span>
                              <span className="font-medium">
                                {stats.mean.toFixed(2)} ± {stats.stdDev.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No A/B tests running</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a test to start performance optimization experiments
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;