import React, { useState, useEffect, useCallback } from 'react';
import { RealTimeNotification, NotificationQueue } from '../../types/realTimeNotifications';

interface OfflineNotificationQueueProps {
  onSyncComplete: (syncedCount: number) => void;
  onRetryFailed: (failedNotifications: RealTimeNotification[]) => void;
  className?: string;
}

interface QueueStats {
  offline: number;
  failed: number;
  syncing: number;
  lastSync: Date | null;
  syncInProgress: boolean;
}

interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: RealTimeNotification;
}

const OfflineNotificationQueue: React.FC<OfflineNotificationQueueProps> = ({
  onSyncComplete,
  onRetryFailed,
  className = ''
}) => {
  const [queueStats, setQueueStats] = useState<QueueStats>({
    offline: 0,
    failed: 0,
    syncing: 0,
    lastSync: null,
    syncInProgress: false
  });
  
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [autoSync, setAutoSync] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (autoSync) {
        syncOfflineNotifications();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync]);

  // Load queue stats from storage
  const loadQueueStats = useCallback(() => {
    try {
      const stored = localStorage.getItem('notification_queue');
      if (stored) {
        const queue: NotificationQueue = JSON.parse(stored);
        setQueueStats(prev => ({
          ...prev,
          offline: queue.offline.length,
          failed: queue.failed.length
        }));
      }
    } catch (error) {
      console.warn('Could not load queue stats:', error);
    }
  }, []);

  // Initialize queue stats
  useEffect(() => {
    loadQueueStats();
    
    // Refresh stats periodically
    const interval = setInterval(loadQueueStats, 5000);
    return () => clearInterval(interval);
  }, [loadQueueStats]);

  // Sync offline notifications
  const syncOfflineNotifications = useCallback(async () => {
    if (!isOnline || queueStats.syncInProgress) {
      return;
    }

    try {
      const stored = localStorage.getItem('notification_queue');
      if (!stored) return;

      const queue: NotificationQueue = JSON.parse(stored);
      const offlineNotifications = [...queue.offline];
      
      if (offlineNotifications.length === 0) return;

      setQueueStats(prev => ({ ...prev, syncInProgress: true }));
      setSyncProgress({
        total: offlineNotifications.length,
        completed: 0,
        failed: 0
      });

      const syncedNotifications: RealTimeNotification[] = [];
      const failedNotifications: RealTimeNotification[] = [];

      // Process notifications in batches
      const batchSize = 5;
      for (let i = 0; i < offlineNotifications.length; i += batchSize) {
        const batch = offlineNotifications.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (notification) => {
            setSyncProgress(prev => prev ? { ...prev, current: notification } : null);
            
            try {
              // Simulate processing notification
              await processOfflineNotification(notification);
              syncedNotifications.push(notification);
              
              setSyncProgress(prev => prev ? { 
                ...prev, 
                completed: prev.completed + 1 
              } : null);
              
            } catch (error) {
              console.error('Failed to sync notification:', error);
              failedNotifications.push(notification);
              
              setSyncProgress(prev => prev ? { 
                ...prev, 
                failed: prev.failed + 1 
              } : null);
            }
          })
        );

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update queue in storage
      const updatedQueue: NotificationQueue = {
        online: queue.online,
        offline: [],
        failed: [...queue.failed, ...failedNotifications]
      };

      localStorage.setItem('notification_queue', JSON.stringify(updatedQueue));

      // Update stats
      setQueueStats(prev => ({
        ...prev,
        offline: 0,
        failed: updatedQueue.failed.length,
        syncInProgress: false,
        lastSync: new Date()
      }));

      setSyncProgress(null);

      // Notify parent components
      onSyncComplete(syncedNotifications.length);
      
      if (failedNotifications.length > 0) {
        onRetryFailed(failedNotifications);
      }

    } catch (error) {
      console.error('Sync process failed:', error);
      setQueueStats(prev => ({ ...prev, syncInProgress: false }));
      setSyncProgress(null);
    }
  }, [isOnline, queueStats.syncInProgress, onSyncComplete, onRetryFailed]);

  // Process individual offline notification
  const processOfflineNotification = async (notification: RealTimeNotification): Promise<void> => {
    // Check retry attempts
    const attempts = retryAttempts.get(notification.id) || 0;
    if (attempts >= 3) {
      throw new Error('Max retry attempts exceeded');
    }

    // Simulate API call to process notification
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve();
        } else {
          setRetryAttempts(prev => new Map(prev).set(notification.id, attempts + 1));
          reject(new Error('Processing failed'));
        }
      }, Math.random() * 1000 + 500); // 500-1500ms delay
    });
  };

  // Retry failed notifications
  const retryFailedNotifications = useCallback(async () => {
    try {
      const stored = localStorage.getItem('notification_queue');
      if (!stored) return;

      const queue: NotificationQueue = JSON.parse(stored);
      const failedNotifications = [...queue.failed];
      
      if (failedNotifications.length === 0) return;

      setQueueStats(prev => ({ ...prev, syncInProgress: true }));
      
      const retriedNotifications: RealTimeNotification[] = [];
      const stillFailedNotifications: RealTimeNotification[] = [];

      for (const notification of failedNotifications) {
        try {
          await processOfflineNotification(notification);
          retriedNotifications.push(notification);
        } catch (error) {
          stillFailedNotifications.push(notification);
        }
      }

      // Update queue
      const updatedQueue: NotificationQueue = {
        ...queue,
        failed: stillFailedNotifications
      };

      localStorage.setItem('notification_queue', JSON.stringify(updatedQueue));

      setQueueStats(prev => ({
        ...prev,
        failed: stillFailedNotifications.length,
        syncInProgress: false
      }));

      if (retriedNotifications.length > 0) {
        onSyncComplete(retriedNotifications.length);
      }

    } catch (error) {
      console.error('Retry process failed:', error);
      setQueueStats(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [onSyncComplete]);

  // Clear failed notifications
  const clearFailedNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem('notification_queue');
      if (!stored) return;

      const queue: NotificationQueue = JSON.parse(stored);
      const updatedQueue: NotificationQueue = {
        ...queue,
        failed: []
      };

      localStorage.setItem('notification_queue', JSON.stringify(updatedQueue));
      setQueueStats(prev => ({ ...prev, failed: 0 }));
      setRetryAttempts(new Map());

    } catch (error) {
      console.error('Could not clear failed notifications:', error);
    }
  }, []);

  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getTotalQueueSize = () => {
    return queueStats.offline + queueStats.failed;
  };

  if (getTotalQueueSize() === 0 && !queueStats.syncInProgress) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <h3 className="font-medium text-gray-900">
              Notification Queue
            </h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded"
              />
              <span>Auto-sync</span>
            </label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {queueStats.offline}
            </div>
            <div className="text-xs text-gray-500">Offline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {queueStats.failed}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {queueStats.syncing}
            </div>
            <div className="text-xs text-gray-500">Syncing</div>
          </div>
        </div>

        {/* Sync Progress */}
        {syncProgress && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Syncing notifications...
              </span>
              <span className="text-sm text-blue-600">
                {syncProgress.completed}/{syncProgress.total}
              </span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(syncProgress.completed / syncProgress.total) * 100}%` 
                }}
              />
            </div>
            
            {syncProgress.current && (
              <div className="text-xs text-blue-600 truncate">
                Processing: {syncProgress.current.title}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="text-sm text-gray-600 mb-4">
          <div className="flex items-center justify-between">
            <span>Connection:</span>
            <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last sync:</span>
            <span>{formatLastSync(queueStats.lastSync)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          {queueStats.offline > 0 && isOnline && (
            <button
              onClick={syncOfflineNotifications}
              disabled={queueStats.syncInProgress}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm py-2 px-3 rounded-lg transition-colors"
            >
              {queueStats.syncInProgress ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
          
          {queueStats.failed > 0 && (
            <>
              <button
                onClick={retryFailedNotifications}
                disabled={queueStats.syncInProgress}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm py-2 px-3 rounded-lg transition-colors"
              >
                Retry Failed
              </button>
              
              <button
                onClick={clearFailedNotifications}
                className="bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-3 rounded-lg transition-colors"
                title="Clear failed notifications"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Offline Message */}
        {!isOnline && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-600">⚠️</span>
              <div className="text-sm">
                <div className="font-medium text-yellow-800">
                  You're offline
                </div>
                <div className="text-yellow-700">
                  Notifications will be queued and synced when you're back online
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineNotificationQueue;