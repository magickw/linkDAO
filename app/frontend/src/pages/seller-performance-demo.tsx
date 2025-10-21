import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { SellerPerformanceDashboard, PerformanceRegressionTester } from '../components/Marketplace/Seller';
import { useSellerPerformanceMonitoring } from '../hooks/useSellerPerformanceMonitoring';
import ErrorBoundary from '../components/ErrorBoundary';

// Demo seller ID for testing
const DEMO_SELLER_ID = 'demo-seller-performance-123';

// Demo component to show performance tracking in action
const PerformanceTrackingDemo: React.FC<{ sellerId: string }> = ({ sellerId }) => {
  const {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    trackComponentPerformance,
    trackAPIPerformance,
    trackCachePerformance,
    trackMobilePerformance,
    trackRealTimePerformance,
    subscribeToAlerts,
    alerts
  } = useSellerPerformanceMonitoring({
    sellerId,
    autoStart: false,
    enableRealTimeAlerts: true
  });

  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    subscribeToAlerts((alert) => {
      setAlertCount(prev => prev + 1);
      console.log('New performance alert:', alert);
    });
  }, [subscribeToAlerts]);

  const simulateComponentLoad = () => {
    const loadTime = Math.random() * 2000 + 500; // 500-2500ms
    trackComponentPerformance('DemoComponent', loadTime, {
      complexity: 'high',
      dataSize: '1MB'
    });
  };

  const simulateAPICall = () => {
    const responseTime = Math.random() * 3000 + 200; // 200-3200ms
    const success = Math.random() > 0.1; // 90% success rate
    trackAPIPerformance(
      '/api/demo/endpoint',
      responseTime,
      success,
      success ? undefined : 'NetworkError'
    );
  };

  const simulateCacheOperation = () => {
    const isHit = Math.random() > 0.2; // 80% hit rate
    const retrievalTime = Math.random() * 100 + 10; // 10-110ms
    trackCachePerformance(
      isHit ? 'hit' : 'miss',
      retrievalTime
    );
  };

  const simulateMobileInteraction = () => {
    const touchTime = Math.random() * 100 + 20; // 20-120ms
    trackMobilePerformance('touch', touchTime);
  };

  const simulateRealTimeUpdate = () => {
    const latency = Math.random() * 200 + 50; // 50-250ms
    trackRealTimePerformance('update', latency);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Tracking Demo</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Monitoring Status:</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              isMonitoring 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isMonitoring ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Alerts:</span>
            <span className="text-sm text-gray-600">{alerts.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Alert Notifications:</span>
            <span className="text-sm text-gray-600">{alertCount}</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`w-full px-3 py-2 text-sm font-medium rounded-md ${
              isMonitoring
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Simulate Performance Events</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button
            onClick={simulateComponentLoad}
            disabled={!isMonitoring}
            className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Component Load
          </button>
          <button
            onClick={simulateAPICall}
            disabled={!isMonitoring}
            className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            API Call
          </button>
          <button
            onClick={simulateCacheOperation}
            disabled={!isMonitoring}
            className="px-3 py-2 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cache Operation
          </button>
          <button
            onClick={simulateMobileInteraction}
            disabled={!isMonitoring}
            className="px-3 py-2 text-xs font-medium text-orange-700 bg-orange-100 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Mobile Touch
          </button>
          <button
            onClick={simulateRealTimeUpdate}
            disabled={!isMonitoring}
            className="px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Real-time Update
          </button>
        </div>
      </div>
    </div>
  );
};

// Main demo page component
const SellerPerformanceDemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'testing' | 'tracking'>('dashboard');

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>Seller Performance Monitoring Demo - LinkDAO</title>
          <meta name="description" content="Comprehensive seller performance monitoring and optimization demo" />
        </Head>

        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Seller Performance Monitoring Demo
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Comprehensive performance monitoring, error tracking, and automated regression testing
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    🚀 Task 18 Implementation
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Requirements 9.5, 9.6
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'dashboard', label: 'Performance Dashboard', icon: '📊' },
                { key: 'testing', label: 'Regression Testing', icon: '🧪' },
                { key: 'tracking', label: 'Live Tracking Demo', icon: '📈' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Performance Dashboard</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Real-time performance metrics, alerts, trends, and recommendations for seller components.
                      Includes API response times, cache performance, error rates, and user experience metrics.
                    </p>
                  </div>
                </div>
              </div>
              
              <SellerPerformanceDashboard sellerId={DEMO_SELLER_ID} />
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-purple-800">Automated Regression Testing</h3>
                    <p className="mt-1 text-sm text-purple-700">
                      Run automated performance regression tests including load, stress, endurance, spike, and volume testing.
                      Detect performance regressions and get actionable recommendations.
                    </p>
                  </div>
                </div>
              </div>
              
              <PerformanceRegressionTester sellerId={DEMO_SELLER_ID} />
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Live Performance Tracking</h3>
                    <p className="mt-1 text-sm text-green-700">
                      Interactive demo showing real-time performance tracking for components, APIs, cache operations,
                      mobile interactions, and real-time features. Start monitoring and simulate events to see tracking in action.
                    </p>
                  </div>
                </div>
              </div>
              
              <PerformanceTrackingDemo sellerId={DEMO_SELLER_ID} />
              
              {/* Additional demo dashboard for tracking */}
              <SellerPerformanceDashboard sellerId={DEMO_SELLER_ID} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <p>Seller Performance Monitoring System - Task 18 Implementation</p>
                <p className="mt-1">
                  Features: Performance dashboards, error tracking, automated regression testing, real-time alerts
                </p>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>✅ Performance Monitoring</span>
                <span>✅ Error Tracking</span>
                <span>✅ Regression Testing</span>
                <span>✅ Real-time Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default SellerPerformanceDemoPage;