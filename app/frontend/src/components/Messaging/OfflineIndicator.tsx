import React, { useState, useEffect } from 'react';
import { OfflineMessageQueueService } from '../../services/offlineMessageQueueService';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [queueStats, setQueueStats] = useState({
    pendingMessages: 0,
    sendingMessages: 0,
    failedMessages: 0,
    offlineActions: 0,
  });
  const [showDetails, setShowDetails] = useState(false);

  const queueService = OfflineMessageQueueService.getInstance();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateStats();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial stats load
    updateStats();

    // Update stats periodically
    const statsInterval = setInterval(updateStats, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(statsInterval);
    };
  }, []);

  const updateStats = async () => {
    try {
      const stats = await queueService.getQueueStats();
      setQueueStats(stats);
      
      const networkStatus = queueService.getNetworkStatus();
      setSyncInProgress(networkStatus.syncInProgress);
    } catch (error) {
      console.error('Failed to update queue stats:', error);
    }
  };

  const handleForceSync = async () => {
    try {
      await queueService.forcSync();
      await updateStats();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm('Are you sure you want to clear all queued messages? This action cannot be undone.')) {
      try {
        await queueService.clearAllQueues();
        await updateStats();
      } catch (error) {
        console.error('Failed to clear queue:', error);
      }
    }
  };

  const getTotalPending = () => {
    return queueStats.pendingMessages + queueStats.sendingMessages + queueStats.offlineActions;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (syncInProgress) return 'text-yellow-500';
    if (getTotalPending() > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
      );
    }

    if (syncInProgress) {
      return (
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
      );
    }

    if (getTotalPending() > 0) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncInProgress) return 'Syncing...';
    if (getTotalPending() > 0) return `${getTotalPending()} pending`;
    return 'Online';
  };

  // Don't show indicator if everything is normal
  if (isOnline && !syncInProgress && getTotalPending() === 0) {
    return null;
  }

  return (
    <div className={`offline-indicator ${className}`}>
      <div className="relative">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${getStatusColor()} hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </button>

        {showDetails && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connection Status
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Overview */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Network Status:</span>
                  <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
                    {getStatusIcon()}
                    <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>

                {syncInProgress && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sync Status:</span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">In Progress</span>
                  </div>
                )}
              </div>

              {/* Queue Statistics */}
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Queue Status</h4>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Pending</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {queueStats.pendingMessages}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Sending</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {queueStats.sendingMessages}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Failed</div>
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      {queueStats.failedMessages}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    <div className="text-gray-600 dark:text-gray-400">Actions</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {queueStats.offlineActions}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {isOnline && getTotalPending() > 0 && (
                  <button
                    onClick={handleForceSync}
                    disabled={syncInProgress}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncInProgress ? 'Syncing...' : 'Force Sync'}
                  </button>
                )}

                {getTotalPending() > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Clear Queue
                  </button>
                )}
              </div>

              {/* Help Text */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {!isOnline 
                    ? 'Messages will be sent automatically when you come back online.'
                    : getTotalPending() > 0
                    ? 'Pending items will be processed automatically.'
                    : 'All messages are up to date.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};