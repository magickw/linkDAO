/**
 * Cache Performance Monitor Component
 * Displays real-time cache performance metrics and controls
 */

import React, { useState, useEffect } from 'react';
import { useIntelligentCache } from '../../../hooks/useIntelligentCache';
import { intelligentCacheIntegration } from '../../../services/intelligentCacheIntegration';

interface CacheStats {
  intelligent: any;
  images: any;
  serviceWorker: any;
  community: any;
}

interface PerformanceData {
  timestamp: number;
  hitRate: number;
  memoryUsage: number;
  networkSavings: number;
}

const CachePerformanceMonitor: React.FC<{
  isVisible?: boolean;
  onClose?: () => void;
}> = ({ isVisible = false, onClose }) => {
  const { cacheMetrics, isReady, clearAllCaches, isOnline, hasOfflineActions } = useIntelligentCache();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Update cache statistics
  useEffect(() => {
    if (!isReady) return;

    const updateStats = async () => {
      try {
        const stats = await intelligentCacheIntegration.getCacheStatistics();
        setCacheStats(stats);
        
        // Add to performance history
        const dataPoint: PerformanceData = {
          timestamp: Date.now(),
          hitRate: cacheMetrics.hitRate,
          memoryUsage: cacheMetrics.memoryUsage,
          networkSavings: cacheMetrics.networkSavings
        };
        
        setPerformanceHistory(prev => {
          const newHistory = [...prev, dataPoint];
          // Keep only last 50 data points
          return newHistory.slice(-50);
        });
      } catch (error) {
        console.warn('Failed to update cache stats:', error);
      }
    };

    updateStats();
    
    if (autoRefresh) {
      const interval = setInterval(updateStats, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isReady, cacheMetrics, autoRefresh]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number): string => {
    return (value * 100).toFixed(1) + '%';
  };

  const getHitRateColor = (hitRate: number): string => {
    if (hitRate >= 0.8) return 'text-green-600';
    if (hitRate >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMemoryUsageColor = (usage: number): string => {
    const maxUsage = 100 * 1024 * 1024; // 100MB
    const percentage = usage / maxUsage;
    
    if (percentage < 0.7) return 'text-green-600';
    if (percentage < 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleClearCaches = async () => {
    if (window.confirm('Are you sure you want to clear all caches? This will reset all cached data.')) {
      try {
        await clearAllCaches();
        alert('All caches cleared successfully');
      } catch (error) {
        alert('Failed to clear caches: ' + error);
      }
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Cache Performance Monitor"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 ${isExpanded ? 'bg-black bg-opacity-50' : ''}`}>
      <div className={`
        fixed bg-white rounded-lg shadow-xl transition-all duration-300
        ${isExpanded 
          ? 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-4xl h-4/5' 
          : 'bottom-4 right-4 w-80 max-h-96'
        }
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="text-lg font-semibold">Cache Performance</h3>
            {hasOfflineActions && (
              <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                Offline Actions Queued
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1 rounded ${autoRefresh ? 'text-blue-600' : 'text-gray-400'}`}
              title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M20 12H4" : "M12 4v16m8-8H4"} />
              </svg>
            </button>
            <button
              onClick={onClose || (() => setIsExpanded(false))}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: isExpanded ? 'calc(100% - 120px)' : '300px' }}>
          {!isReady ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Initializing cache system...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Hit Rate</div>
                  <div className={`text-xl font-semibold ${getHitRateColor(cacheMetrics.hitRate)}`}>
                    {formatPercentage(cacheMetrics.hitRate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Memory Usage</div>
                  <div className={`text-xl font-semibold ${getMemoryUsageColor(cacheMetrics.memoryUsage)}`}>
                    {formatBytes(cacheMetrics.memoryUsage)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Network Savings</div>
                  <div className="text-xl font-semibold text-green-600">
                    {cacheMetrics.networkSavings}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className={`text-xl font-semibold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>

              {/* Performance Chart (only in expanded view) */}
              {isExpanded && performanceHistory.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Hit Rate Trend</h4>
                  <div className="h-32 flex items-end space-x-1">
                    {performanceHistory.slice(-20).map((data, index) => (
                      <div
                        key={index}
                        className="bg-blue-500 rounded-t"
                        style={{
                          height: `${Math.max(data.hitRate * 100, 2)}%`,
                          width: `${100 / 20}%`
                        }}
                        title={`${formatPercentage(data.hitRate)} at ${new Date(data.timestamp).toLocaleTimeString()}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cache Details */}
              {cacheStats && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Cache Details</h4>
                  
                  {/* Community Cache */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Community Cache</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Icons: {cacheStats.community.icons?.size || 0} items</div>
                      <div>Previews: {cacheStats.community.previews?.size || 0} items</div>
                      <div>Profiles: {cacheStats.community.profiles?.profiles?.size || 0} items</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.community.icons?.hitRate || 0)}</div>
                    </div>
                  </div>

                  {/* Image Cache */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Image Cache</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Size: {cacheStats.images?.size || 0} items</div>
                      <div>Total Size: {formatBytes(cacheStats.images?.totalSize || 0)}</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.images?.hitRate || 0)}</div>
                      <div>Oldest: {cacheStats.images?.oldestEntry ? new Date(cacheStats.images.oldestEntry).toLocaleTimeString() : 'N/A'}</div>
                    </div>
                  </div>

                  {/* Intelligent Cache */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Intelligent Cache</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Memory: {formatBytes(cacheStats.intelligent?.memoryUsage || 0)}</div>
                      <div>Savings: {cacheStats.intelligent?.networkSavings || 0}</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.intelligent?.hitRate || 0)}</div>
                      <div>Response Time: {(cacheStats.intelligent?.averageResponseTime || 0).toFixed(0)}ms</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-2 border-t border-gray-200">
                <button
                  onClick={handleClearCaches}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Clear All Caches
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm py-2 px-3 rounded transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CachePerformanceMonitor;