/**
 * Network Failure Handler Demo Component
 * Demonstrates the enhanced network failure handling capabilities
 */

import React, { useState } from 'react';
import { NetworkFailureHandler } from './NetworkFailureHandler';
import {
  WifiIcon,
  SignalSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const NetworkFailureHandlerDemo: React.FC = () => {
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [simulateSlowConnection, setSimulateSlowConnection] = useState(false);
  const [simulateNetworkError, setSimulateNetworkError] = useState(false);
  const [networkEvents, setNetworkEvents] = useState<string[]>([]);

  const addEvent = (event: string) => {
    setNetworkEvents(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${event}`]);
  };

  const handleNetworkStatusChange = (isOnline: boolean) => {
    addEvent(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
  };

  const handleRetryAttempt = (attempt: number) => {
    addEvent(`Retry attempt #${attempt}`);
  };

  const handleOfflineModeActivated = () => {
    addEvent('Offline mode activated');
  };

  // Simulate network conditions
  React.useEffect(() => {
    if (simulateOffline) {
      // Override navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      window.dispatchEvent(new Event('offline'));
    } else {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });
      window.dispatchEvent(new Event('online'));
    }
  }, [simulateOffline]);

  const criticalPaths = [
    '/api/support/documents/critical',
    '/api/support/search',
    '/api/support/translations/en'
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Network Failure Handler Demo
          </h1>
          
          {/* Demo Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Network Simulation</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={simulateOffline}
                    onChange={(e) => setSimulateOffline(e.target.checked)}
                    className="mr-2"
                  />
                  <SignalSlashIcon className="h-4 w-4 mr-1" />
                  Simulate Offline
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={simulateSlowConnection}
                    onChange={(e) => setSimulateSlowConnection(e.target.checked)}
                    className="mr-2"
                  />
                  <WifiIcon className="h-4 w-4 mr-1" />
                  Simulate Slow Connection
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={simulateNetworkError}
                    onChange={(e) => setSimulateNetworkError(e.target.checked)}
                    className="mr-2"
                  />
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Simulate Network Error
                </label>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Handler Features</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  Auto-retry with exponential backoff
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  Offline mode with cached content
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  Connection quality monitoring
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  Emergency mode for critical failures
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                  Performance alerts integration
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Events</h3>
              <div className="space-y-1 text-xs text-gray-600 max-h-32 overflow-y-auto">
                {networkEvents.length === 0 ? (
                  <p className="text-gray-400">No events yet...</p>
                ) : (
                  networkEvents.map((event, index) => (
                    <div key={index} className="p-1 bg-white rounded text-xs">
                      {event}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Configuration Display */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Handler Configuration</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Auto Retry:</span>
                <span className="ml-1 font-medium">Enabled</span>
              </div>
              <div>
                <span className="text-blue-700">Max Retries:</span>
                <span className="ml-1 font-medium">5</span>
              </div>
              <div>
                <span className="text-blue-700">Retry Interval:</span>
                <span className="ml-1 font-medium">30s</span>
              </div>
              <div>
                <span className="text-blue-700">Offline Mode:</span>
                <span className="ml-1 font-medium">Enabled</span>
              </div>
              <div>
                <span className="text-blue-700">Performance Monitoring:</span>
                <span className="ml-1 font-medium">Enabled</span>
              </div>
              <div>
                <span className="text-blue-700">Critical Paths:</span>
                <span className="ml-1 font-medium">{criticalPaths.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wrapped Content */}
        <NetworkFailureHandler
          showRetryButton={true}
          autoRetry={true}
          retryInterval={30000}
          maxRetries={5}
          enableOfflineMode={true}
          enablePerformanceMonitoring={true}
          criticalPaths={criticalPaths}
          onNetworkStatusChange={handleNetworkStatusChange}
          onRetryAttempt={handleRetryAttempt}
          onOfflineModeActivated={handleOfflineModeActivated}
          fallbackContent={
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                Fallback Content Active
              </h3>
              <p className="text-yellow-700">
                This is the fallback content displayed when network issues are detected.
              </p>
            </div>
          }
        >
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Protected Content Area
            </h2>
            
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-4">
                This content is protected by the NetworkFailureHandler. When network issues occur,
                users will see appropriate error messages, offline capabilities, and retry options.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Offline Features</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Cached document access</li>
                    <li>• Client-side search functionality</li>
                    <li>• Multi-language support</li>
                    <li>• Bookmark management</li>
                    <li>• Navigation history</li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Network Recovery</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Automatic connection testing</li>
                    <li>• Exponential backoff retry</li>
                    <li>• Connection quality monitoring</li>
                    <li>• Graceful degradation</li>
                    <li>• Emergency mode activation</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">
                    Network Handler Active
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  The NetworkFailureHandler is monitoring your connection and ready to provide
                  offline support if needed.
                </p>
              </div>
            </div>
          </div>
        </NetworkFailureHandler>
      </div>
    </div>
  );
};

export default NetworkFailureHandlerDemo;