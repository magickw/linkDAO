/**
 * Cache Performance Monitor Component
 * Displays real-time cache performance metrics and controls
 */

import React, { useState, useEffect } from 'react';
import { useIntelligentCache } from '../../../hooks/useIntelligentCache';
import { useToast } from '@/context/ToastContext';

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  lastCleanup: number;
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
  const { getCacheStats, clearCache, monitorCachePerformance } = useIntelligentCache();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Update cache statistics
  useEffect(() => {
    const updateStats = async () => {
      try {
        const stats = getCacheStats();
        setCacheStats(stats);
        
        // Add to performance history
        const dataPoint: PerformanceData = {
          timestamp: Date.now(),
          hitRate: stats.hitRate,
          memoryUsage: stats.totalSize,
          networkSavings: stats.hitRate * 0.8 // Estimate network savings
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
      const interval = setInterval(updateStats, 30000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

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

  const { addToast } = useToast ? useToast() : { addToast: (m: string) => console.log(m) };

  const handleClearCaches = async () => {
    if (window.confirm('Are you sure you want to clear all caches? This will reset all cached data.')) {
      try {
        await clearCache();
        addToast('All caches cleared successfully', 'success');
      } catch (error) {
        addToast('Failed to clear caches: ' + String(error), 'error');
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
            <div className={`w-3 h-3 rounded-full ${navigator.onLine ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="text-lg font-semibold">Cache Performance</h3>
            {false && (
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
          {!cacheStats ? (
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
                  <div className={`text-xl font-semibold ${getHitRateColor(cacheStats?.hitRate || 0)}`}>
                    {formatPercentage(cacheStats?.hitRate || 0)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Memory Usage</div>
                  <div className={`text-xl font-semibold ${getMemoryUsageColor(cacheStats?.totalSize || 0)}`}>
                    {formatBytes(cacheStats?.totalSize || 0)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Network Savings</div>
                  <div className="text-xl font-semibold text-green-600">
                    {formatPercentage((cacheStats?.hitRate || 0) * 0.8)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className={`text-xl font-semibold ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
                    {navigator.onLine ? 'Online' : 'Offline'}
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
                    <div className="text-sm font-medium text-gray-700 mb-2">Cache Entries</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Total Entries: {cacheStats.entryCount || 0}</div>
                      <div>Total Size: {formatBytes(cacheStats.totalSize || 0)}</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.hitRate || 0)}</div>
                      <div>Last Cleanup: {new Date(cacheStats.lastCleanup || 0).toLocaleTimeString()}</div>
                    </div>
                  </div>

                  {/* Image Cache */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Performance Metrics</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Entries: {cacheStats.entryCount || 0}</div>
                      <div>Size: {formatBytes(cacheStats.totalSize || 0)}</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.hitRate || 0)}</div>
                      <div>Status: Active</div>
                    </div>
                  </div>

                  {/* Intelligent Cache */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Cache Statistics</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Memory: {formatBytes(cacheStats.totalSize || 0)}</div>
                      <div>Entries: {cacheStats.entryCount || 0}</div>
                      <div>Hit Rate: {formatPercentage(cacheStats.hitRate || 0)}</div>
                      <div>Efficiency: {formatPercentage((cacheStats.hitRate || 0) * 0.9)}</div>
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