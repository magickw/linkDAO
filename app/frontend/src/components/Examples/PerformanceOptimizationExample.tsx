/**
 * Performance Optimization Example Component
 * Demonstrates how to use performance optimization features
 */

import React, { useState, useEffect } from 'react';
import usePerformanceOptimization, { useOptimizedCache, useComponentPerformance } from '../../hooks/usePerformanceOptimization';
import PerformanceOptimizationDashboard from '../Performance/PerformanceOptimizationDashboard';

interface ExampleData {
  id: number;
  title: string;
  content: string;
  timestamp: string;
}

const PerformanceOptimizationExample: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'basic' | 'caching' | 'dashboard'>('basic');
  const [requestResults, setRequestResults] = useState<string[]>([]);
  
  // Use performance optimization hook
  const {
    optimizedRequest,
    preloadResources,
    metrics,
    recommendations,
    isLoading,
    clearData,
    requestCount
  } = usePerformanceOptimization({
    enableAutoOptimization: true,
    monitoringInterval: 10000, // 10 seconds
    reportingEnabled: true
  });

  // Use component performance monitoring
  const { recordCustomEvent } = useComponentPerformance('PerformanceOptimizationExample');

  // Use optimized cache for demo data
  const {
    data: cachedData,
    isLoading: cacheLoading,
    error: cacheError,
    refresh: refreshCache,
    isStale,
    age
  } = useOptimizedCache<ExampleData[]>(
    'demo-data',
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return [
        { id: 1, title: 'Demo Item 1', content: 'This is cached data', timestamp: new Date().toISOString() },
        { id: 2, title: 'Demo Item 2', content: 'This data is optimized', timestamp: new Date().toISOString() }
      ];
    },
    {
      ttl: 30000, // 30 seconds
      cacheType: 'feed',
      enableDeduplication: true
    }
  );

  // Preload critical resources on mount
  useEffect(() => {
    const criticalUrls = [
      '/api/feed',
      '/api/communities',
      '/api/user/profile'
    ];
    preloadResources(criticalUrls);
  }, [preloadResources]);

  // Demo: Basic optimized request
  const handleBasicRequest = async () => {
    recordCustomEvent('basic-request-start');
    const startTime = Date.now();
    
    try {
      const result = await optimizedRequest<{ message: string }>(
        '/api/demo/basic',
        { method: 'GET' },
        {
          enableCaching: true,
          enableDeduplication: true,
          enableCompression: true,
          cacheType: 'feed'
        }
      );
      
      const duration = Date.now() - startTime;
      setRequestResults(prev => [
        ...prev,
        `Basic request completed in ${duration}ms: ${result.message || 'Success'}`
      ]);
      
      recordCustomEvent('basic-request-complete', duration);
    } catch (error) {
      setRequestResults(prev => [
        ...prev,
        `Basic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    }
  };

  // Demo: Multiple identical requests (deduplication)
  const handleDeduplicationDemo = async () => {
    recordCustomEvent('deduplication-demo-start');
    const startTime = Date.now();
    
    try {
      // Make 5 identical requests simultaneously
      const promises = Array(5).fill(null).map(() =>
        optimizedRequest<{ message: string }>('/api/demo/deduplication', {
          method: 'GET'
        })
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      setRequestResults(prev => [
        ...prev,
        `Deduplication demo: 5 requests completed in ${duration}ms (should be deduplicated)`
      ]);
      
      recordCustomEvent('deduplication-demo-complete', duration);
    } catch (error) {
      setRequestResults(prev => [
        ...prev,
        `Deduplication demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    }
  };

  // Demo: Large payload compression
  const handleCompressionDemo = async () => {
    recordCustomEvent('compression-demo-start');
    const startTime = Date.now();
    
    try {
      // Create large payload
      const largePayload = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: i,
          content: `This is item ${i} with some content that should be compressed`,
          metadata: { timestamp: Date.now(), index: i }
        }))
      };
      
      const result = await optimizedRequest<{ compressed: boolean; size: number }>(
        '/api/demo/compression',
        {
          method: 'POST',
          body: JSON.stringify(largePayload)
        },
        {
          enableCompression: true,
          enableCaching: false
        }
      );
      
      const duration = Date.now() - startTime;
      setRequestResults(prev => [
        ...prev,
        `Compression demo completed in ${duration}ms. Compressed: ${result.compressed}, Size: ${result.size} bytes`
      ]);
      
      recordCustomEvent('compression-demo-complete', duration);
    } catch (error) {
      setRequestResults(prev => [
        ...prev,
        `Compression demo failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    }
  };

  const clearResults = () => {
    setRequestResults([]);
    clearData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Performance Optimization Demo</h1>
      
      {/* Performance Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Performance Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Total Requests:</span> {requestCount}
          </div>
          <div>
            <span className="font-medium">Cache Hit Rate:</span> {metrics?.cacheHitRate?.toFixed(1) || 0}%
          </div>
          <div>
            <span className="font-medium">Avg Response Time:</span> {metrics?.averageResponseTime?.toFixed(0) || 0}ms
          </div>
          <div>
            <span className="font-medium">Error Rate:</span> {metrics?.errorRate?.toFixed(1) || 0}%
          </div>
        </div>
        
        {recommendations.length > 0 && (
          <div className="mt-3">
            <h3 className="font-medium text-sm mb-1">Recommendations:</h3>
            <ul className="text-xs space-y-1">
              {recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-orange-700">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Demo Tabs */}
      <div className="flex border-b mb-6">
        {[
          { key: 'basic', label: 'Basic Demo' },
          { key: 'caching', label: 'Caching Demo' },
          { key: 'dashboard', label: 'Dashboard' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveDemo(tab.key as any)}
            className={`px-4 py-2 font-medium ${
              activeDemo === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Basic Demo Tab */}
      {activeDemo === 'basic' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Request Optimization Demos</h3>
            
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleBasicRequest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Basic Optimized Request
              </button>
              
              <button
                onClick={handleDeduplicationDemo}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Deduplication Demo (5 identical requests)
              </button>
              
              <button
                onClick={handleCompressionDemo}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Compression Demo (Large payload)
              </button>
              
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear Results
              </button>
            </div>

            {/* Results */}
            <div className="bg-gray-50 p-3 rounded max-h-60 overflow-y-auto">
              <h4 className="font-medium mb-2">Request Results:</h4>
              {requestResults.length === 0 ? (
                <p className="text-gray-500 text-sm">No requests made yet. Try the buttons above!</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {requestResults.map((result, index) => (
                    <li key={index} className="font-mono text-xs bg-white p-2 rounded">
                      {result}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Caching Demo Tab */}
      {activeDemo === 'caching' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Optimized Cache Demo</h3>
            
            <div className="flex gap-3 mb-4">
              <button
                onClick={refreshCache}
                disabled={cacheLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {cacheLoading ? 'Loading...' : 'Refresh Cache'}
              </button>
              
              <div className="flex items-center text-sm text-gray-600">
                Cache age: {Math.floor(age / 1000)}s
                {isStale && <span className="ml-2 text-orange-600">(Stale)</span>}
              </div>
            </div>

            {cacheError && (
              <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
                <p className="text-red-700 text-sm">Cache Error: {cacheError}</p>
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-medium mb-2">Cached Data:</h4>
              {cacheLoading ? (
                <p className="text-gray-500">Loading cached data...</p>
              ) : cachedData ? (
                <ul className="space-y-2">
                  {cachedData.map(item => (
                    <li key={item.id} className="bg-white p-2 rounded text-sm">
                      <strong>{item.title}</strong>: {item.content}
                      <br />
                      <span className="text-gray-500 text-xs">
                        Cached at: {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No cached data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeDemo === 'dashboard' && (
        <div>
          <PerformanceOptimizationDashboard />
        </div>
      )}
    </div>
  );
};

export default PerformanceOptimizationExample;