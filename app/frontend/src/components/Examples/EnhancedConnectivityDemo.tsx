import React, { useState, useEffect } from 'react';
import { useResilientAPI, useCommunities, useFeed } from '../../hooks/useResilientAPI';
import { enhancedRequestManager } from '../../services/enhancedRequestManager';
import { apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker } from '../../services/circuitBreaker';

/**
 * Enhanced Connectivity Demo Component
 * Demonstrates the integrated resilience features including:
 * - Circuit breaker integration
 * - Graceful degradation with cached/fallback data
 * - Request coalescing and deduplication
 * - Enhanced error handling
 * - Offline support with action queuing
 */
export const EnhancedConnectivityDemo: React.FC = () => {
  const [serviceStatus, setServiceStatus] = useState(enhancedRequestManager.getServiceStatus());
  const [metrics, setMetrics] = useState(enhancedRequestManager.getMetrics());
  const [circuitBreakerStates, setCircuitBreakerStates] = useState({
    api: apiCircuitBreaker.getState(),
    community: communityCircuitBreaker.getState(),
    feed: feedCircuitBreaker.getState()
  });

  // Test different API endpoints with resilient hooks
  const { 
    data: communities, 
    loading: communitiesLoading, 
    error: communitiesError,
    isFromCache: communitiesFromCache,
    isFromFallback: communitiesFromFallback,
    isStale: communitiesStale,
    circuitBreakerState: communitiesCircuitState,
    retry: retryCommunitiesRequest,
    refresh: refreshCommunities
  } = useCommunities();

  const { 
    data: feed, 
    loading: feedLoading, 
    error: feedError,
    isFromCache: feedFromCache,
    isFromFallback: feedFromFallback,
    isStale: feedStale,
    circuitBreakerState: feedCircuitState,
    retry: retryFeedRequest,
    refresh: refreshFeed
  } = useFeed();

  // Custom API test with enhanced request manager
  const { 
    data: testData, 
    loading: testLoading, 
    error: testError,
    isFromCache: testFromCache,
    retry: retryTestRequest
  } = useResilientAPI('/api/test/connectivity', { method: 'GET' }, {
    fallbackData: { message: 'Fallback test data', timestamp: Date.now() },
    enableCircuitBreaker: true,
    circuitBreaker: apiCircuitBreaker
  });

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setServiceStatus(enhancedRequestManager.getServiceStatus());
      setMetrics(enhancedRequestManager.getMetrics());
      setCircuitBreakerStates({
        api: apiCircuitBreaker.getState(),
        community: communityCircuitBreaker.getState(),
        feed: feedCircuitBreaker.getState()
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to circuit breaker state changes
  useEffect(() => {
    const unsubscribeApi = apiCircuitBreaker.subscribe((state) => {
      setCircuitBreakerStates(prev => ({ ...prev, api: state }));
    });

    const unsubscribeCommunity = communityCircuitBreaker.subscribe((state) => {
      setCircuitBreakerStates(prev => ({ ...prev, community: state }));
    });

    const unsubscribeFeed = feedCircuitBreaker.subscribe((state) => {
      setCircuitBreakerStates(prev => ({ ...prev, feed: state }));
    });

    return () => {
      unsubscribeApi();
      unsubscribeCommunity();
      unsubscribeFeed();
    };
  }, []);

  const handleResetCircuitBreakers = () => {
    apiCircuitBreaker.reset();
    communityCircuitBreaker.reset();
    feedCircuitBreaker.reset();
    enhancedRequestManager.resetCircuitBreaker();
    enhancedRequestManager.resetMetrics();
  };

  const handleTestFailure = async () => {
    try {
      await enhancedRequestManager.request('/api/test/failure', { method: 'GET' }, {
        retries: 1,
        timeout: 5000
      });
    } catch (error) {
      console.log('Expected test failure:', (error as Error).message);
    }
  };

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-600';
      case 'HALF_OPEN': return 'text-yellow-600';
      case 'OPEN': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDataSourceBadge = (isFromCache: boolean, isFromFallback: boolean, isStale: boolean) => {
    if (isFromFallback) return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">Fallback</span>;
    if (isStale) return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Stale Cache</span>;
    if (isFromCache) return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Fresh Cache</span>;
    return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Network</span>;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Enhanced Connectivity & Resilience Demo</h1>
      
      {/* Service Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Service Status</h3>
          <div className={`text-lg font-bold ${serviceStatus.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {serviceStatus.isAvailable ? 'Available' : 'Unavailable'}
          </div>
          <div className="text-sm text-gray-500">
            Failures: {serviceStatus.consecutiveFailures}
          </div>
          <div className="text-sm text-gray-500">
            Error Rate: {(serviceStatus.errorRate * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Request Metrics</h3>
          <div className="text-lg font-bold text-blue-600">
            {metrics.totalRequests}
          </div>
          <div className="text-sm text-gray-500">
            Success: {metrics.successfulRequests}
          </div>
          <div className="text-sm text-gray-500">
            Failed: {metrics.failedRequests}
          </div>
          <div className="text-sm text-gray-500">
            Avg Response: {metrics.averageResponseTime.toFixed(0)}ms
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Circuit Breakers</h3>
          <div className="space-y-1">
            <div className={`text-sm ${getStatusColor(circuitBreakerStates.api)}`}>
              API: {circuitBreakerStates.api}
            </div>
            <div className={`text-sm ${getStatusColor(circuitBreakerStates.community)}`}>
              Community: {circuitBreakerStates.community}
            </div>
            <div className={`text-sm ${getStatusColor(circuitBreakerStates.feed)}`}>
              Feed: {circuitBreakerStates.feed}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-2">Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleResetCircuitBreakers}
              className="w-full px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reset All
            </button>
            <button
              onClick={handleTestFailure}
              className="w-full px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
            >
              Test Failure
            </button>
          </div>
        </div>
      </div>

      {/* API Endpoint Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Communities API Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Communities API</h3>
            {getDataSourceBadge(communitiesFromCache, communitiesFromFallback, communitiesStale)}
          </div>
          
          <div className="mb-4">
            <div className={`text-sm ${getStatusColor(communitiesCircuitState)}`}>
              Circuit: {communitiesCircuitState}
            </div>
            {communitiesLoading && <div className="text-blue-600">Loading...</div>}
            {communitiesError && (
              <div className="text-red-600 text-sm">
                Error: {(communitiesError as Error).message}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600">
              Communities: {Array.isArray(communities) ? communities.length : 0}
            </div>
            {Array.isArray(communities) && communities.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Latest: {(communities[0] as any)?.name || 'N/A'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={retryCommunitiesRequest}
              disabled={communitiesLoading}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Retry Request
            </button>
            <button
              onClick={refreshCommunities}
              disabled={communitiesLoading}
              className="w-full px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Force Refresh
            </button>
          </div>
        </div>

        {/* Feed API Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Feed API</h3>
            {getDataSourceBadge(feedFromCache, feedFromFallback, feedStale)}
          </div>
          
          <div className="mb-4">
            <div className={`text-sm ${getStatusColor(feedCircuitState)}`}>
              Circuit: {feedCircuitState}
            </div>
            {feedLoading && <div className="text-blue-600">Loading...</div>}
            {feedError && (
              <div className="text-red-600 text-sm">
                Error: {(feedError as Error).message}
              </div>
            )}
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600">
              Posts: {Array.isArray(feed) ? feed.length : 0}
            </div>
            {Array.isArray(feed) && feed.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Latest: {(feed[0] as any)?.title || (feed[0] as any)?.content?.substring(0, 30) || 'N/A'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={retryFeedRequest}
              disabled={feedLoading}
              className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Retry Request
            </button>
            <button
              onClick={refreshFeed}
              disabled={feedLoading}
              className="w-full px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Force Refresh
            </button>
          </div>
        </div>

        {/* Test API */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Test API</h3>
            {getDataSourceBadge(testFromCache, false, false)}
          </div>
          
          <div className="mb-4">
            {testLoading && <div className="text-blue-600">Loading...</div>}
            {testError && (
              <div className="text-red-600 text-sm">
                Error: {(testError as Error).message}
              </div>
            )}
          </div>

          <div className="mb-4">
            {testData && (
              <div className="text-sm text-gray-600">
                <div>Message: {(testData as any).message}</div>
                <div className="text-xs text-gray-500">
                  Time: {new Date((testData as any).timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={retryTestRequest}
            disabled={testLoading}
            className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Retry Test
          </button>
        </div>
      </div>

      {/* Integration Status */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Integration Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">✅ Implemented Features</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Enhanced request manager with circuit breaker integration</li>
              <li>• Resilient API hooks with graceful degradation</li>
              <li>• Request coalescing and deduplication</li>
              <li>• Intelligent caching with TTL and stale data support</li>
              <li>• Service worker with enhanced offline strategies</li>
              <li>• Circuit breaker pattern with 5 failure threshold</li>
              <li>• 60-second recovery timeout as specified</li>
              <li>• Comprehensive error handling and fallback mechanisms</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">🔄 Active Integrations</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Circuit breaker state monitoring</li>
              <li>• Automatic fallback to cached/stale data</li>
              <li>• Background cache refresh for critical APIs</li>
              <li>• Request metrics and performance tracking</li>
              <li>• Service health monitoring</li>
              <li>• Offline action queuing (via service worker)</li>
              <li>• Progressive enhancement for core features</li>
              <li>• Real-time connectivity status updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedConnectivityDemo;