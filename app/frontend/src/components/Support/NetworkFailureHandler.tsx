/**
 * Enhanced Network Failure Handler Component
 * Provides comprehensive network failure handling with graceful degradation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  WifiIcon,
  CheckCircleIcon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  LanguageIcon,
  ShieldCheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useOfflineSupport, usePerformanceMonitoring } from '../../hooks/useOfflineSupport';

interface NetworkFailureHandlerProps {
  children: React.ReactNode;
  fallbackContent?: React.ReactNode;
  showRetryButton?: boolean;
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  enableOfflineMode?: boolean;
  enablePerformanceMonitoring?: boolean;
  criticalPaths?: string[];
  onNetworkStatusChange?: (isOnline: boolean) => void;
  onRetryAttempt?: (attempt: number) => void;
  onOfflineModeActivated?: () => void;
}

interface NetworkCondition {
  type: 'fast' | 'slow' | 'offline' | 'unstable';
  latency: number;
  bandwidth: number;
  reliability: number;
}

interface ConnectionQuality {
  signal: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  speed: number;
  stability: number;
  lastTest: Date;
}

export const NetworkFailureHandler: React.FC<NetworkFailureHandlerProps> = ({
  children,
  fallbackContent,
  showRetryButton = true,
  autoRetry = true,
  retryInterval = 30000,
  maxRetries = 5,
  enableOfflineMode = true,
  enablePerformanceMonitoring = true,
  criticalPaths = [],
  onNetworkStatusChange,
  onRetryAttempt,
  onOfflineModeActivated
}) => {
  const {
    isOnline,
    syncStatus,
    offlineDocuments,
    isDocumentAvailableOffline,
    capabilities,
    performanceMetrics,
    performanceAlerts,
    syncDocuments,
    cacheDocument,
    clearOfflineCache,
    getAdaptiveLoadingStrategy,
    loading: offlineLoading,
    syncing,
    error: offlineError
  } = useOfflineSupport();

  const {
    metrics: perfMetrics,
    alerts: perfAlerts,
    getNetworkCondition,
    resolveAlert
  } = usePerformanceMonitoring();

  const [networkError, setNetworkError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [failedRequests, setFailedRequests] = useState<string[]>([]);
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTestRef = useRef<AbortController | null>(null);
  const lastNetworkTestRef = useRef<Date | null>(null);

  // Enhanced network condition monitoring
  const testNetworkCondition = useCallback(async (): Promise<NetworkCondition> => {
    const startTime = performance.now();
    
    try {
      // Test with multiple endpoints for reliability
      const testEndpoints = [
        '/api/health',
        '/api/client-info',
        ...criticalPaths.slice(0, 2)
      ];
      
      const promises = testEndpoints.map(async (endpoint) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch(endpoint, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return { success: response.ok, latency: performance.now() - startTime };
        } catch (error) {
          clearTimeout(timeoutId);
          return { success: false, latency: 5000 };
        }
      });
      
      const results = await Promise.allSettled(promises);
      const successfulTests = results.filter(r => r.status === 'fulfilled' && r.value.success);
      const avgLatency = results.reduce((acc, r) => {
        if (r.status === 'fulfilled') {
          return acc + r.value.latency;
        }
        return acc + 5000;
      }, 0) / results.length;
      
      const reliability = successfulTests.length / results.length;
      
      // Estimate bandwidth based on latency and success rate
      let bandwidth = 0;
      if (avgLatency < 100 && reliability > 0.8) {
        bandwidth = 10; // Fast connection
      } else if (avgLatency < 500 && reliability > 0.6) {
        bandwidth = 5; // Medium connection
      } else if (reliability > 0.3) {
        bandwidth = 1; // Slow connection
      }
      
      let type: NetworkCondition['type'] = 'offline';
      if (reliability > 0.8 && avgLatency < 200) {
        type = 'fast';
      } else if (reliability > 0.6 && avgLatency < 1000) {
        type = 'slow';
      } else if (reliability > 0.3) {
        type = 'unstable';
      }
      
      return {
        type,
        latency: avgLatency,
        bandwidth,
        reliability
      };
      
    } catch (error) {
      return {
        type: 'offline',
        latency: 5000,
        bandwidth: 0,
        reliability: 0
      };
    }
  }, [criticalPaths]);

  // Update connection quality
  const updateConnectionQuality = useCallback(async () => {
    if (!isOnline) {
      setConnectionQuality({
        signal: 'none',
        speed: 0,
        stability: 0,
        lastTest: new Date()
      });
      return;
    }

    const condition = await testNetworkCondition();
    setNetworkCondition(condition);
    
    let signal: ConnectionQuality['signal'] = 'none';
    if (condition.reliability > 0.9 && condition.latency < 100) {
      signal = 'excellent';
    } else if (condition.reliability > 0.7 && condition.latency < 300) {
      signal = 'good';
    } else if (condition.reliability > 0.5 && condition.latency < 1000) {
      signal = 'fair';
    } else if (condition.reliability > 0.2) {
      signal = 'poor';
    }
    
    setConnectionQuality({
      signal,
      speed: condition.bandwidth,
      stability: condition.reliability * 100,
      lastTest: new Date()
    });
    
    lastNetworkTestRef.current = new Date();
  }, [isOnline, testNetworkCondition]);

  // Track online/offline status with enhanced monitoring
  useEffect(() => {
    if (isOnline) {
      setLastOnlineTime(new Date());
      setNetworkError(null);
      setRetryCount(0);
      setReconnectionAttempts(0);
      setEmergencyMode(false);
      
      // Test connection quality when coming back online
      updateConnectionQuality();
      
      if (showOfflineMessage) {
        // Show reconnection message briefly
        setTimeout(() => setShowOfflineMessage(false), 3000);
      }
      
      // Notify parent component
      onNetworkStatusChange?.(true);
      
    } else {
      setShowOfflineMessage(true);
      setConnectionQuality(prev => prev ? { ...prev, signal: 'none', speed: 0 } : null);
      
      if (enableOfflineMode && !offlineModeActive) {
        setOfflineModeActive(true);
        onOfflineModeActivated?.();
      }
      
      // Notify parent component
      onNetworkStatusChange?.(false);
    }
  }, [isOnline, showOfflineMessage, enableOfflineMode, offlineModeActive, onNetworkStatusChange, onOfflineModeActivated, updateConnectionQuality]);

  // Enhanced auto-retry mechanism with exponential backoff
  useEffect(() => {
    if (!isOnline && autoRetry && retryCount < maxRetries && !emergencyMode) {
      // Exponential backoff: base interval * 2^retryCount
      const backoffInterval = retryInterval * Math.pow(2, retryCount);
      const maxInterval = 5 * 60 * 1000; // Max 5 minutes
      const actualInterval = Math.min(backoffInterval, maxInterval);
      
      retryTimeoutRef.current = setTimeout(() => {
        handleRetry();
      }, actualInterval);

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };
    }
  }, [isOnline, autoRetry, retryCount, maxRetries, retryInterval, emergencyMode]);

  // Periodic connection quality testing
  useEffect(() => {
    if (!isOnline || !enablePerformanceMonitoring) return;

    const interval = setInterval(() => {
      const now = new Date();
      const lastTest = lastNetworkTestRef.current;
      
      // Test every 30 seconds if no recent test
      if (!lastTest || now.getTime() - lastTest.getTime() > 30000) {
        updateConnectionQuality();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOnline, enablePerformanceMonitoring, updateConnectionQuality]);

  // Enhanced network error handling
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      if (error?.name === 'NetworkError' || 
          error?.message?.includes('fetch') ||
          error?.message?.includes('Failed to fetch') ||
          error?.code === 'NETWORK_ERROR') {
        
        const errorMessage = getNetworkErrorMessage(error);
        setNetworkError(errorMessage);
        
        // Track failed request
        if (error?.url) {
          setFailedRequests(prev => [...prev.slice(-9), error.url]);
        }
        
        console.error('Network error caught:', error);
        
        // Activate emergency mode if too many failures
        if (failedRequests.length >= 5) {
          setEmergencyMode(true);
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('fetch') || 
          event.message?.includes('network') ||
          event.message?.includes('connection')) {
        
        const errorMessage = getNetworkErrorMessage(event.error);
        setNetworkError(errorMessage);
        console.error('Network error caught:', event.error);
      }
    };

    // Handle fetch errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await originalFetch(...args);

        // Track successful requests
        if (response.ok && failedRequests.length > 0) {
          setFailedRequests(prev => prev.slice(1));
        }

        return response;
      } catch (error) {
        // Add URL to error for tracking
        if (args[0] && typeof args[0] === 'string') {
          (error as any).url = args[0];
        }
        throw error;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.fetch = originalFetch;
    };
  }, [failedRequests.length]);

  // Helper function to get user-friendly error messages
  const getNetworkErrorMessage = (error: any): string => {
    if (error?.message?.includes('Failed to fetch')) {
      return 'Unable to connect to server';
    }
    if (error?.code === 'TIMEOUT') {
      return 'Request timed out';
    }
    if (error?.status === 0) {
      return 'Network connection lost';
    }
    if (error?.status >= 500) {
      return 'Server temporarily unavailable';
    }
    if (error?.status >= 400) {
      return 'Request failed - please try again';
    }
    return 'Network request failed';
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setReconnectionAttempts(prev => prev + 1);
    
    // Notify parent component
    onRetryAttempt?.(retryCount + 1);
    
    // Cancel any existing connection test
    if (connectionTestRef.current) {
      connectionTestRef.current.abort();
    }
    
    connectionTestRef.current = new AbortController();
    
    try {
      // Test network connectivity with multiple endpoints
      const testResults = await Promise.allSettled([
        fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: connectionTestRef.current.signal,
          timeout: 10000
        } as any),
        fetch('/api/client-info', { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: connectionTestRef.current.signal,
          timeout: 10000
        } as any)
      ]);
      
      const successfulTests = testResults.filter(
        result => result.status === 'fulfilled' && result.value.ok
      );
      
      if (successfulTests.length > 0) {
        setNetworkError(null);
        setRetryCount(0);
        setReconnectionAttempts(0);
        setFailedRequests([]);
        setEmergencyMode(false);
        
        // Update connection quality
        await updateConnectionQuality();
        
        // Sync documents if offline mode was active
        if (offlineModeActive && enableOfflineMode) {
          try {
            await syncDocuments();
          } catch (syncError) {
            console.warn('Failed to sync documents after reconnection:', syncError);
          }
        }
        
      } else {
        throw new Error('All connection tests failed');
      }
    } catch (error) {
      console.error('Retry failed:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setNetworkError('Connection test cancelled');
      } else {
        setNetworkError(getNetworkErrorMessage(error));
      }
      
      // Activate emergency mode after multiple failures
      if (retryCount >= maxRetries - 1) {
        setEmergencyMode(true);
      }
    } finally {
      setIsRetrying(false);
      connectionTestRef.current = null;
    }
  };

  // Emergency cache critical documents
  const handleEmergencyCache = useCallback(async () => {
    if (!enableOfflineMode) return;
    
    try {
      // Cache critical paths
      for (const path of criticalPaths) {
        try {
          await cacheDocument(path);
        } catch (error) {
          console.warn(`Failed to cache critical document ${path}:`, error);
        }
      }
      
      // Cache current page if possible
      if (typeof window !== 'undefined') {
        try {
          await cacheDocument(window.location.pathname);
        } catch (error) {
          console.warn('Failed to cache current page:', error);
        }
      }
      
    } catch (error) {
      console.error('Emergency caching failed:', error);
    }
  }, [enableOfflineMode, criticalPaths, cacheDocument]);

  const dismissOfflineMessage = () => {
    setShowOfflineMessage(false);
  };

  const getOfflineCapabilities = () => {
    const totalDocs = offlineDocuments.length;
    const criticalDocs = offlineDocuments.filter(doc => doc.critical).length;
    const translatedDocs = offlineDocuments.filter(doc => doc.language !== 'en').length;
    
    return {
      documentsAvailable: totalDocs,
      criticalDocsAvailable: criticalDocs,
      searchAvailable: true, // Client-side search works offline
      translationsAvailable: translatedDocs,
      cacheSize: capabilities?.estimatedStorage || 0,
      lastSync: syncStatus?.lastSync || null,
      syncEnabled: capabilities?.serviceWorkerSupported || false,
      storageUsed: capabilities?.usedStorage || 0,
      storageQuota: capabilities?.estimatedStorage || 0
    };
  };

  const getConnectionStatusIcon = () => {
    if (!connectionQuality) return <WifiIcon className="h-5 w-5" />;
    
    switch (connectionQuality.signal) {
      case 'excellent':
        return <SignalIcon className="h-5 w-5 text-green-600" />;
      case 'good':
        return <SignalIcon className="h-5 w-5 text-blue-600" />;
      case 'fair':
        return <SignalIcon className="h-5 w-5 text-yellow-600" />;
      case 'poor':
        return <SignalIcon className="h-5 w-5 text-orange-600" />;
      case 'none':
        return <SignalSlashIcon className="h-5 w-5 text-red-600" />;
      default:
        return <WifiIcon className="h-5 w-5" />;
    }
  };

  const getConnectionStatusText = () => {
    if (!connectionQuality) return 'Testing connection...';
    
    const { signal, speed, stability } = connectionQuality;
    
    switch (signal) {
      case 'excellent':
        return `Excellent connection (${speed} Mbps, ${Math.round(stability)}% stable)`;
      case 'good':
        return `Good connection (${speed} Mbps, ${Math.round(stability)}% stable)`;
      case 'fair':
        return `Fair connection (${speed} Mbps, ${Math.round(stability)}% stable)`;
      case 'poor':
        return `Poor connection (${speed} Mbps, ${Math.round(stability)}% stable)`;
      case 'none':
        return 'No connection detected';
      default:
        return 'Connection status unknown';
    }
  };

  const getTimeSinceLastOnline = () => {
    if (!lastOnlineTime) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - lastOnlineTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  // Enhanced offline message with detailed capabilities
  if (showOfflineMessage && !isOnline) {
    const offlineCapabilities = getOfflineCapabilities();
    const timeSinceOnline = getTimeSinceLastOnline();
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              {emergencyMode ? (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              ) : (
                <WifiIcon className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {emergencyMode ? 'Connection Issues Detected' : 'You\'re Offline'}
            </h3>
            
            <p className="text-gray-600 mb-4">
              {emergencyMode 
                ? 'Multiple connection failures detected. Operating in emergency mode.'
                : 'No internet connection detected. You can still access cached documentation.'
              }
            </p>
            
            {timeSinceOnline && (
              <p className="text-sm text-gray-500 mb-4">
                Last online: {timeSinceOnline}
              </p>
            )}
            
            {reconnectionAttempts > 0 && (
              <p className="text-sm text-orange-600 mb-4">
                Reconnection attempts: {reconnectionAttempts}
              </p>
            )}
            
            {/* Enhanced offline capabilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Available Content
                </h4>
                <div className="text-sm text-blue-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Documents:</span>
                    <span className="font-medium">{offlineCapabilities.documentsAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Critical guides:</span>
                    <span className="font-medium">{offlineCapabilities.criticalDocsAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Translations:</span>
                    <span className="font-medium">{offlineCapabilities.translationsAvailable}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-3 flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Offline Features
                </h4>
                <div className="text-sm text-green-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Search:</span>
                    <span className="font-medium">✓ Available</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Navigation:</span>
                    <span className="font-medium">✓ Available</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bookmarks:</span>
                    <span className="font-medium">✓ Available</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Storage information */}
            {offlineCapabilities.storageUsed > 0 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Cache storage:</span>
                  <span>
                    {Math.round(offlineCapabilities.storageUsed / 1024 / 1024)} MB used
                    {offlineCapabilities.storageQuota > 0 && 
                      ` of ${Math.round(offlineCapabilities.storageQuota / 1024 / 1024)} MB`
                    }
                  </span>
                </div>
                {offlineCapabilities.lastSync && (
                  <div className="flex items-center justify-between text-sm text-gray-600 mt-1">
                    <span>Last sync:</span>
                    <span>{new Date(offlineCapabilities.lastSync).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {showRetryButton && !emergencyMode && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isRetrying ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      <span>Retrying...</span>
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4" />
                      <span>Retry Connection</span>
                    </>
                  )}
                </button>
              )}
              
              {emergencyMode && enableOfflineMode && (
                <button
                  onClick={handleEmergencyCache}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <CloudArrowDownIcon className="h-4 w-4" />
                  <span>Cache Critical Content</span>
                </button>
              )}
              
              <button
                onClick={dismissOfflineMessage}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Continue Offline
              </button>
              
              <button
                onClick={() => setShowDetailedStatus(!showDetailedStatus)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                Details
              </button>
            </div>
            
            {/* Detailed status */}
            {showDetailedStatus && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <h5 className="font-medium text-gray-900 mb-2">Connection Details</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Retry attempts: {retryCount} of {maxRetries}</div>
                  <div>Failed requests: {failedRequests.length}</div>
                  <div>Emergency mode: {emergencyMode ? 'Active' : 'Inactive'}</div>
                  <div>Auto-retry: {autoRetry ? 'Enabled' : 'Disabled'}</div>
                  {networkCondition && (
                    <>
                      <div>Network type: {networkCondition.type}</div>
                      <div>Latency: {Math.round(networkCondition.latency)}ms</div>
                      <div>Reliability: {Math.round(networkCondition.reliability * 100)}%</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enhanced reconnection message
  if (isOnline && lastOnlineTime && showOfflineMessage) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-green-100 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">Back Online!</h4>
              <p className="text-sm text-green-700 mb-2">
                Connection restored. {syncing ? 'Syncing latest updates...' : 'Ready to sync.'}
              </p>
              
              {connectionQuality && (
                <div className="flex items-center text-xs text-green-600">
                  {getConnectionStatusIcon()}
                  <span className="ml-1">{getConnectionStatusText()}</span>
                </div>
              )}
              
              {reconnectionAttempts > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Reconnected after {reconnectionAttempts} attempt{reconnectionAttempts > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={dismissOfflineMessage}
              className="p-1 hover:bg-green-200 rounded transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-green-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced network error display
  if (networkError && isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 shadow-lg max-w-sm">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900">Network Error</h4>
              <p className="text-sm text-red-700 mb-2">{networkError}</p>
              
              {connectionQuality && (
                <div className="flex items-center text-xs text-red-600 mb-2">
                  {getConnectionStatusIcon()}
                  <span className="ml-1">{getConnectionStatusText()}</span>
                </div>
              )}
              
              {failedRequests.length > 0 && (
                <p className="text-xs text-red-600">
                  {failedRequests.length} recent failure{failedRequests.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => setNetworkError(null)}
              className="p-1 hover:bg-red-200 rounded transition-colors"
            >
              <XMarkIcon className="h-4 w-4 text-red-600" />
            </button>
          </div>
          
          {showRetryButton && (
            <div className="mt-3 space-y-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isRetrying ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4" />
                    <span>Retry</span>
                  </>
                )}
              </button>
              
              {enableOfflineMode && (
                <button
                  onClick={() => {
                    setOfflineModeActive(true);
                    setNetworkError(null);
                    onOfflineModeActivated?.();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <CloudArrowDownIcon className="h-4 w-4" />
                  <span>Use Offline Mode</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show connection quality indicator for online users
  if (isOnline && connectionQuality && enablePerformanceMonitoring && 
      (connectionQuality.signal === 'poor' || connectionQuality.signal === 'fair')) {
    return (
      <>
        <div className="fixed top-4 left-4 z-40">
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              <div className="text-sm">
                <div className="font-medium text-yellow-900">Slow Connection</div>
                <div className="text-yellow-700">{getConnectionStatusText()}</div>
              </div>
            </div>
          </div>
        </div>
        {children}
      </>
    );
  }

  // Show performance alerts
  if (performanceAlerts && performanceAlerts.length > 0 && enablePerformanceMonitoring) {
    const criticalAlerts = performanceAlerts.filter(alert => alert.type === 'critical');
    
    if (criticalAlerts.length > 0) {
      return (
        <>
          <div className="fixed bottom-4 right-4 z-40">
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-3 shadow-lg max-w-sm">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <div className="font-medium text-orange-900">Performance Alert</div>
                  <div className="text-orange-700">{criticalAlerts[0].message}</div>
                </div>
                <button
                  onClick={() => resolveAlert(criticalAlerts[0].id)}
                  className="p-1 hover:bg-orange-200 rounded transition-colors"
                >
                  <XMarkIcon className="h-3 w-3 text-orange-600" />
                </button>
              </div>
            </div>
          </div>
          {children}
        </>
      );
    }
  }

  // Render children with fallback content if provided and there are issues
  if (fallbackContent && (networkError || !isOnline || emergencyMode)) {
    return <>{fallbackContent}</>;
  }

  // Render children normally
  return <>{children}</>;
};