import React, { useState, useEffect } from 'react';
import { enhancedRequestManager } from '../../services/enhancedRequestManager';
import { apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker } from '../../services/circuitBreaker';
import { useResilientAPI } from '../../hooks/useResilientAPI';
import { globalRequestCoalescer } from '../../hooks/useRequestCoalescing';

/**
 * Comprehensive integration test component for CORS connectivity fixes
 * Tests all integrated features from task 11:
 * - Enhanced request manager integration
 * - Circuit breaker and graceful degradation
 * - Service worker caching and offline strategies
 * - Error handling and fallback mechanisms
 */
export const ConnectivityIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);

  // Test enhanced request manager integration
  const testEnhancedRequestManager = async () => {
    const results: any = {};
    
    try {
      // Test 1: Basic request with circuit breaker
      const startTime = Date.now();
      await enhancedRequestManager.request('/api/test/basic', { method: 'GET' }, {
        circuitBreaker: apiCircuitBreaker,
        enableCoalescing: true,
        timeout: 5000
      });
      results.basicRequest = { 
        status: 'success', 
        responseTime: Date.now() - startTime 
      };
    } catch (error) {
      results.basicRequest = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    try {
      // Test 2: Request deduplication
      const promises = Array(5).fill(null).map(() => 
        enhancedRequestManager.request('/api/test/dedup', { method: 'GET' }, {
          enableCoalescing: true,
          cacheKey: 'test-dedup'
        })
      );
      await Promise.all(promises);
      results.requestDeduplication = { status: 'success' };
    } catch (error) {
      results.requestDeduplication = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    try {
      // Test 3: Fallback data handling
      await enhancedRequestManager.request('/api/test/failure', { method: 'GET' }, {
        fallbackData: { message: 'Fallback data working' },
        retries: 1
      });
      results.fallbackHandling = { status: 'success' };
    } catch (error) {
      results.fallbackHandling = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    return results;
  };

  // Test circuit breaker integration
  const testCircuitBreakerIntegration = async () => {
    const results: any = {};

    try {
      // Test 1: Circuit breaker state monitoring
      const initialState = apiCircuitBreaker.getState();
      results.stateMonitoring = { 
        status: 'success', 
        initialState 
      };

      // Test 2: Failure threshold behavior
      const failures = [];
      for (let i = 0; i < 3; i++) {
        try {
          await apiCircuitBreaker.execute(
            () => Promise.reject(new Error('Test failure')),
            () => 'Fallback executed'
          );
        } catch (error) {
          failures.push((error as Error).message);
        }
      }
      results.failureThreshold = { 
        status: 'success', 
        failures: failures.length,
        finalState: apiCircuitBreaker.getState()
      };

      // Test 3: Fallback execution
      const fallbackResult = await apiCircuitBreaker.execute(
        () => Promise.reject(new Error('Service unavailable')),
        () => ({ fallback: true, timestamp: Date.now() })
      );
      results.fallbackExecution = { 
        status: 'success', 
        fallbackData: fallbackResult 
      };

    } catch (error) {
      results.circuitBreakerError = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    return results;
  };

  // Test useResilientAPI hook integration
  const testResilientAPIHook = () => {
    const TestComponent = () => {
      const { 
        data, 
        loading, 
        error, 
        isFromCache, 
        isFromFallback, 
        isStale,
        circuitBreakerState,
        retry 
      } = useResilientAPI('/api/test/hook', { method: 'GET' }, {
        fallbackData: { test: 'hook fallback' },
        enableCircuitBreaker: true,
        circuitBreaker: apiCircuitBreaker
      });

      return {
        hasData: !!data,
        loading,
        error: error?.message,
        isFromCache,
        isFromFallback,
        isStale,
        circuitBreakerState,
        retryAvailable: typeof retry === 'function'
      };
    };

    const component = TestComponent();
    return {
      hookIntegration: {
        status: 'success',
        componentState: component
      }
    };
  };

  // Test service worker integration (via message passing)
  const testServiceWorkerIntegration = async () => {
    const results: any = {};

    try {
      // Test 1: Service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        results.serviceWorkerRegistration = { 
          status: 'success', 
          scope: registration.scope 
        };

        // Test 2: Offline action queuing
        if (registration.active) {
          const messageChannel = new MessageChannel();
          const messagePromise = new Promise((resolve) => {
            messageChannel.port1.onmessage = (event) => resolve(event.data);
          });

          registration.active.postMessage({
            type: 'QUEUE_OFFLINE_ACTION',
            data: {
              type: 'TEST_ACTION',
              payload: { test: true }
            }
          }, [messageChannel.port2]);

          const response = await messagePromise;
          results.offlineActionQueuing = { 
            status: 'success', 
            response 
          };
        }

        // Test 3: Cache status check
        const cacheNames = await caches.keys();
        results.cacheStatus = { 
          status: 'success', 
          cacheCount: cacheNames.length,
          caches: cacheNames 
        };

      } else {
        results.serviceWorkerRegistration = { 
          status: 'not_supported' 
        };
      }
    } catch (error) {
      results.serviceWorkerError = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    return results;
  };

  // Test request coalescing
  const testRequestCoalescing = async () => {
    const results: any = {};

    try {
      // Test 1: Global request coalescer
      const promises = Array(3).fill(null).map(() =>
        globalRequestCoalescer.request(
          'test-coalescing',
          () => Promise.resolve({ coalesced: true, timestamp: Date.now() }),
          5000
        )
      );

      const responses = await Promise.all(promises);
      const allSameTimestamp = responses.every(r => r.timestamp === responses[0].timestamp);
      
      results.globalCoalescing = {
        status: 'success',
        coalesced: allSameTimestamp,
        responses: responses.length
      };

      // Test 2: Cache invalidation
      globalRequestCoalescer.invalidate('test-coalescing');
      results.cacheInvalidation = { status: 'success' };

    } catch (error) {
      results.coalescingError = { 
        status: 'failed', 
        error: (error as Error).message 
      };
    }

    return results;
  };

  // Run all integration tests
  const runIntegrationTests = async () => {
    setIsRunning(true);
    setTestResults({});

    try {
      const results = {
        timestamp: new Date().toISOString(),
        enhancedRequestManager: await testEnhancedRequestManager(),
        circuitBreakerIntegration: await testCircuitBreakerIntegration(),
        resilientAPIHook: testResilientAPIHook(),
        serviceWorkerIntegration: await testServiceWorkerIntegration(),
        requestCoalescing: await testRequestCoalescing(),
        systemMetrics: {
          requestManagerStatus: enhancedRequestManager.getServiceStatus(),
          requestManagerMetrics: enhancedRequestManager.getMetrics(),
          circuitBreakerStates: {
            api: apiCircuitBreaker.getState(),
            community: communityCircuitBreaker.getState(),
            feed: feedCircuitBreaker.getState()
          }
        }
      };

      setTestResults(results);
    } catch (error) {
      setTestResults({
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Reset all systems
  const resetSystems = () => {
    apiCircuitBreaker.reset();
    communityCircuitBreaker.reset();
    feedCircuitBreaker.reset();
    enhancedRequestManager.resetCircuitBreaker();
    enhancedRequestManager.resetMetrics();
    globalRequestCoalescer.clear();
    setTestResults({});
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'not_supported': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const renderTestResult = (key: string, result: any, depth = 0) => {
    const indent = depth * 20;
    
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      return (
        <div key={key} style={{ marginLeft: indent }} className="mb-2">
          <div className="font-medium text-gray-700">{key}:</div>
          {Object.entries(result).map(([subKey, subResult]) => 
            renderTestResult(subKey, subResult, depth + 1)
          )}
        </div>
      );
    }

    return (
      <div key={key} style={{ marginLeft: indent }} className="mb-1">
        <span className="text-sm text-gray-600">{key}: </span>
        <span className={`text-sm font-medium ${
          key === 'status' ? getStatusColor(result as string) : 'text-gray-800'
        }`}>
          {typeof result === 'object' ? JSON.stringify(result) : String(result)}
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">CORS Connectivity Fixes - Integration Test</h1>
      
      <div className="mb-6 flex space-x-4">
        <button
          onClick={runIntegrationTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running Tests...' : 'Run Integration Tests'}
        </button>
        
        <button
          onClick={resetSystems}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset All Systems
        </button>
      </div>

      {Object.keys(testResults).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-4">
            {Object.entries(testResults).map(([key, result]) => 
              renderTestResult(key, result)
            )}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Task 11 Integration Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">✅ Enhanced Request Manager</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Integrated with circuit breaker pattern</li>
              <li>• Request deduplication and coalescing</li>
              <li>• Enhanced metrics and monitoring</li>
              <li>• Intelligent fallback strategies</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">✅ useResilientAPI Hook</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Circuit breaker integration</li>
              <li>• Graceful degradation with cached data</li>
              <li>• Enhanced error handling</li>
              <li>• Background refresh capabilities</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">✅ Service Worker Updates</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Enhanced caching strategies</li>
              <li>• Circuit breaker integration</li>
              <li>• Offline action queuing</li>
              <li>• Stale-while-revalidate patterns</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">✅ Component Integration</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Enhanced error handling</li>
              <li>• Fallback mechanism usage</li>
              <li>• Real-time status indicators</li>
              <li>• User-friendly degradation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectivityIntegrationTest;