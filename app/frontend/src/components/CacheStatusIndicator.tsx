/**
 * Cache Status Indicator Component
 * Shows real-time cache performance and status
 */

import React, { useState, useEffect } from 'react';
import { serviceWorkerCacheService } from '../services/serviceWorkerCacheService';

interface CacheStatusProps {
  showDetails?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

interface CacheStatus {
  isOnline: boolean;
  hitRate: number;
  queueSize: number;
  storageUsed: number;
  storagePercentage: number;
  lastSync: number | null;
  // syncInProgress: boolean; // Not currently available in service worker cache stats
}

const CacheStatusIndicator: React.FC<CacheStatusProps> = ({
  showDetails = false,
  position = 'top-right',
  className = ''
}) => {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isOnline: navigator.onLine,
    hitRate: 0,
    queueSize: 0,
    storageUsed: 0,
    storagePercentage: 0,
    lastSync: null,
    // syncInProgress: false // Not currently available in service worker cache stats
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Update cache status
  const updateCacheStatus = async () => {
    try {
      const stats = await serviceWorkerCacheService.getCacheStats();
      const performanceMetrics = serviceWorkerCacheService.getPerformanceMetrics();
      
      setCacheStatus({
        isOnline: navigator.onLine,
        hitRate: performanceMetrics.summary?.hitRates?.overall?.ratio || 0,
        queueSize: stats.sync?.queueSize || 0,
        storageUsed: stats.storage?.used || 0,
        storagePercentage: stats.storage?.percentage || 0,
        lastSync: stats.sync?.lastSyncTime || null
      });
      
      setIsLoading(false);
    } catch (error) {
      console.warn('Failed to update cache status:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    updateCacheStatus();
    
    // Update every 10 seconds
    const interval = setInterval(updateCacheStatus, 10000);
    
    // Listen for network status changes
    const handleOnline = () => updateCacheStatus();
    const handleOffline = () => updateCacheStatus();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get status color based on performance
  const getStatusColor = (): string => {
    if (!cacheStatus.isOnline) return 'bg-orange-500';
    // if (cacheStatus.syncInProgress) return 'bg-blue-500'; // Not available
    if (cacheStatus.queueSize > 10) return 'bg-yellow-500';
    if (cacheStatus.hitRate < 0.7) return 'bg-red-500';
    return 'bg-green-500';
  };

  // Get status text
  const getStatusText = (): string => {
    if (!cacheStatus.isOnline) return 'Offline';
    // if (cacheStatus.syncInProgress) return 'Syncing'; // Not available
    if (cacheStatus.queueSize > 0) return `${cacheStatus.queueSize} queued`;
    return 'Online';
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  if (isLoading) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
        <div className="bg-white rounded-lg shadow-lg border p-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border">
        {/* Compact Status */}
        <div 
          className="p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
            <span className="text-sm font-medium text-gray-900">
              {getStatusText()}
            </span>
            {showDetails && (
              <span className="text-xs text-gray-500">
                {(cacheStatus.hitRate * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-3 min-w-64">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cache Hit Rate</span>
                <span className="font-medium">
                  {(cacheStatus.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sync Queue</span>
                <span className="font-medium">
                  {cacheStatus.queueSize} items
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Storage Used</span>
                <span className="font-medium">
                  {formatBytes(cacheStatus.storageUsed)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Storage %</span>
                <span className="font-medium">
                  {cacheStatus.storagePercentage.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Sync</span>
                <span className="font-medium">
                  {formatTimeAgo(cacheStatus.lastSync)}
                </span>
              </div>
            </div>

            {/* Storage Usage Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Storage Usage</span>
                <span>{cacheStatus.storagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    cacheStatus.storagePercentage > 80 ? 'bg-red-500' :
                    cacheStatus.storagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(cacheStatus.storagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex space-x-2">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await serviceWorkerCacheService.flushOfflineQueue();
                    updateCacheStatus();
                  } catch (error) {
                    console.error('Failed to flush queue:', error);
                  }
                }}
                disabled={cacheStatus.queueSize === 0}
                className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Sync
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateCacheStatus();
                }}
                className="flex-1 px-2 py-1 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheStatusIndicator;