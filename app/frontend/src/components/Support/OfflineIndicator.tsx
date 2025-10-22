/**
 * Offline Indicator Component
 * Shows offline status and provides offline functionality controls
 */

import React, { useState, useEffect } from 'react';
import {
  WifiIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { offlineSupportService, SyncStatus, OfflineCapabilities } from '../../services/offlineSupportService';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [capabilities, setCapabilities] = useState<OfflineCapabilities | null>(null);
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Initialize offline support
    const initializeOfflineSupport = async () => {
      try {
        await offlineSupportService.initialize();
        
        // Get initial status
        const status = await offlineSupportService.getSyncStatus();
        setSyncStatus(status);
        
        // Get capabilities
        const caps = await offlineSupportService.getCapabilities();
        setCapabilities(caps);
      } catch (error) {
        console.error('Failed to initialize offline support:', error);
      }
    };

    initializeOfflineSupport();

    // Set up listeners
    const handleOnlineStatus = (online: boolean) => {
      setIsOnline(online);
    };

    const handleSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    offlineSupportService.addOnlineStatusListener(handleOnlineStatus);
    offlineSupportService.addSyncStatusListener(handleSyncStatus);

    return () => {
      offlineSupportService.removeOnlineStatusListener(handleOnlineStatus);
      offlineSupportService.removeSyncStatusListener(handleSyncStatus);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    
    setSyncing(true);
    try {
      await offlineSupportService.syncDocuments();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await offlineSupportService.clearOfflineCache();
      const status = await offlineSupportService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-600';
    if (syncStatus?.pendingSync && syncStatus.pendingSync > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    }
    if (syncing) {
      return <ArrowPathIcon className="h-5 w-5 animate-spin" />;
    }
    if (syncStatus?.pendingSync && syncStatus.pendingSync > 0) {
      return <CloudArrowUpIcon className="h-5 w-5" />;
    }
    return <CheckCircleIcon className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncing) return 'Syncing...';
    if (syncStatus?.pendingSync && syncStatus.pendingSync > 0) {
      return `${syncStatus.pendingSync} pending`;
    }
    return 'Online';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main indicator */}
      <button
        onClick={() => setShowOfflinePanel(!showOfflinePanel)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${getStatusColor()} hover:bg-gray-100`}
        title={`Status: ${getStatusText()}`}
      >
        {getStatusIcon()}
        {showDetails && (
          <span className="text-sm font-medium">{getStatusText()}</span>
        )}
      </button>

      {/* Offline panel */}
      {showOfflinePanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowOfflinePanel(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Offline Status
                </h3>
                <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
                  {getStatusIcon()}
                  <span className="text-sm font-medium">{getStatusText()}</span>
                </div>
              </div>

              {/* Connection status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <WifiIcon className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-medium">
                    {isOnline ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {isOnline 
                    ? 'You can access all documentation and sync updates.'
                    : 'You can still access cached documents offline.'
                  }
                </p>
              </div>

              {/* Sync status */}
              {syncStatus && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Sync Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Documents available:</span>
                      <span className="font-medium">
                        {syncStatus.documentsAvailable} / {syncStatus.totalDocuments}
                      </span>
                    </div>
                    {syncStatus.lastSync && (
                      <div className="flex justify-between">
                        <span>Last sync:</span>
                        <span className="font-medium">
                          {new Date(syncStatus.lastSync).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {syncStatus.pendingSync > 0 && (
                      <div className="flex justify-between">
                        <span>Pending sync:</span>
                        <span className="font-medium text-yellow-600">
                          {syncStatus.pendingSync} items
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Storage info */}
              {capabilities && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Storage</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span className="font-medium">
                        {formatBytes(capabilities.usedStorage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Available:</span>
                      <span className="font-medium">
                        {formatBytes(capabilities.estimatedStorage - capabilities.usedStorage)}
                      </span>
                    </div>
                    {capabilities.estimatedStorage > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(capabilities.usedStorage / capabilities.estimatedStorage) * 100}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {capabilities && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Capabilities</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      {capabilities.serviceWorkerSupported ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span>Service Worker</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {capabilities.cacheAPISupported ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span>Cache API</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {capabilities.backgroundSyncSupported ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span>Background Sync</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {capabilities.pushNotificationsSupported ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                      )}
                      <span>Push Notifications</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={handleSync}
                  disabled={!isOnline || syncing}
                  className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <CloudArrowDownIcon className="h-4 w-4" />
                  )}
                  <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                
                <button
                  onClick={handleClearCache}
                  className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  title="Clear offline cache"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {!isOnline && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">You're offline</p>
                      <p className="text-yellow-700">
                        You can still access cached documents. Changes will sync when you're back online.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};