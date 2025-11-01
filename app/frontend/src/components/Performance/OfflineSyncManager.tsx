import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceWorkerCacheService } from '../../services/serviceWorkerCacheService';

interface SyncAction {
  id: string;
  type: 'post' | 'reaction' | 'comment' | 'follow' | 'like' | 'share';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  estimatedSize: number;
}

interface SyncStats {
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  failedActions: number;
  totalDataSize: number;
  lastSyncTime: number | null;
  syncInProgress: boolean;
  networkSpeed: 'slow' | 'normal' | 'fast';
}

interface OfflineSyncContextType {
  isOnline: boolean;
  syncStats: SyncStats;
  addAction: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => Promise<void>;
  syncNow: () => Promise<void>;
  clearFailedActions: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;
  getSyncHistory: () => Promise<SyncAction[]>;
}

interface OfflineSyncManagerProps {
  children: ReactNode;
  syncInterval?: number;
  maxRetries?: number;
  batchSize?: number;
  enableBackgroundSync?: boolean;
  enableConflictResolution?: boolean;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncManager({
  children,
  syncInterval = 30000, // 30 seconds
  maxRetries = 3,
  batchSize = 5,
  enableBackgroundSync = true,
  enableConflictResolution = true
}: OfflineSyncManagerProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalActions: 0,
    pendingActions: 0,
    completedActions: 0,
    failedActions: 0,
    totalDataSize: 0,
    lastSyncTime: null,
    syncInProgress: false,
    networkSpeed: 'normal'
  });

  const [isPaused, setIsPaused] = useState(false);
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncAction[]>([]);
  const [conflictResolution, setConflictResolution] = useState<Map<string, any>>(new Map());

  // Initialize IndexedDB and enhanced cache service
  useEffect(() => {
    initializeDB();
    initializeEnhancedSync();
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isPaused) {
        syncNow();
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
  }, [isPaused]);

  // Periodic sync
  useEffect(() => {
    if (!isOnline || isPaused) return;

    const interval = setInterval(() => {
      if (syncStats.pendingActions > 0) {
        syncNow();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [isOnline, isPaused, syncStats.pendingActions, syncInterval]);

  // Background sync registration
  useEffect(() => {
    if (enableBackgroundSync && 'serviceWorker' in navigator) {
      registerBackgroundSync();
    }
  }, [enableBackgroundSync]);

  // Network speed detection
  useEffect(() => {
    detectNetworkSpeed();
  }, [isOnline]);

  const initializeDB = async () => {
    try {
      const database = await openDatabase();
      setDb(database);
      
      // Load existing sync queue
      const existingActions = await loadSyncQueue(database);
      setSyncQueue(existingActions);
      
      // Update stats
      updateSyncStats(existingActions);
    } catch (error) {
      console.error('Failed to initialize sync database:', error);
    }
  };

  const initializeEnhancedSync = async () => {
    try {
      // Initialize enhanced service worker cache service if not already done
      await serviceWorkerCacheService.initialize();
      
      // Set up BroadcastChannel for sync coordination
      if ('BroadcastChannel' in window) {
        const syncChannel = new BroadcastChannel('offline-sync');
        
        syncChannel.addEventListener('message', (event) => {
          const { type, data } = event.data;
          
          switch (type) {
            case 'SYNC_COMPLETED':
              // Update sync stats when background sync completes
              setSyncStats(prev => ({
                ...prev,
                lastSyncTime: Date.now(),
                syncInProgress: false
              }));
              break;
            case 'SYNC_FAILED':
              console.warn('Background sync failed:', data);
              break;
            case 'QUEUE_UPDATED':
              // Refresh queue when updated from service worker
              if (db) {
                loadSyncQueue(db).then(actions => {
                  setSyncQueue(actions);
                  updateSyncStats(actions);
                });
              }
              break;
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize enhanced sync:', error);
    }
  };

  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineSync', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sync actions store
        if (!db.objectStoreNames.contains('syncActions')) {
          const store = db.createObjectStore('syncActions', { keyPath: 'id' });
          store.createIndex('type', 'type');
          store.createIndex('status', 'status');
          store.createIndex('priority', 'priority');
          store.createIndex('timestamp', 'timestamp');
        }

        // Conflict resolution store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictStore.createIndex('type', 'type');
          conflictStore.createIndex('timestamp', 'timestamp');
        }

        // Sync history store
        if (!db.objectStoreNames.contains('syncHistory')) {
          const historyStore = db.createObjectStore('syncHistory', { keyPath: 'id' });
          historyStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  };

  const loadSyncQueue = async (database: IDBDatabase): Promise<SyncAction[]> => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['syncActions'], 'readonly');
      const store = transaction.objectStore('syncActions');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  const addAction = useCallback(async (
    actionData: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount' | 'status'>
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const action: SyncAction = {
      ...actionData,
      id: generateActionId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    // Store in database
    await storeAction(action);
    
    // Add to queue
    setSyncQueue(prev => {
      const newQueue = [...prev, action].sort((a, b) => {
        // Sort by priority and timestamp
        const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return a.timestamp - b.timestamp;
      });
      
      updateSyncStats(newQueue);
      return newQueue;
    });

    // Trigger immediate sync if online and high priority
    if (isOnline && !isPaused && (action.priority === 'high' || action.priority === 'critical')) {
      syncNow();
    }
  }, [db, isOnline, isPaused]);

  const storeAction = async (action: SyncAction): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncActions'], 'readwrite');
      const store = transaction.objectStore('syncActions');
      const request = store.put(action);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const syncNow = useCallback(async (): Promise<void> => {
    if (!isOnline || isPaused || syncStats.syncInProgress || syncQueue.length === 0) {
      return;
    }

    setSyncStats(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Use enhanced service worker cache service for offline queue management
      await serviceWorkerCacheService.flushOfflineQueue();

      // Get actions to sync (respecting batch size)
      const actionsToSync = syncQueue
        .filter(action => action.status === 'pending')
        .slice(0, batchSize);

      if (actionsToSync.length === 0) {
        return;
      }

      // Update status to syncing
      const updatedActions = actionsToSync.map(action => ({
        ...action,
        status: 'syncing' as SyncAction['status']
      }));

      await Promise.all(updatedActions.map(storeAction));

      // Perform sync operations
      const syncResults = await Promise.allSettled(
        updatedActions.map(action => syncAction(action))
      );

      // Process results
      const completedActions: string[] = [];
      const failedActions: SyncAction[] = [];

      syncResults.forEach((result, index) => {
        const action = updatedActions[index];
        
        if (result.status === 'fulfilled') {
          completedActions.push(action.id);
        } else {
          action.retryCount++;
          action.status = action.retryCount >= maxRetries ? 'failed' : 'pending';
          
          if (action.status === 'pending') {
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, action.retryCount), 30000);
            setTimeout(() => {
              if (isOnline && !isPaused) {
                syncNow();
              }
            }, delay);
          }
          
          failedActions.push(action);
        }
      });

      // Update database and queue
      await Promise.all([
        ...completedActions.map(id => removeAction(id)),
        ...failedActions.map(action => storeAction(action))
      ]);

      // Update queue state
      setSyncQueue(prev => {
        const newQueue = prev.filter(action => !completedActions.includes(action.id))
          .map(action => {
            const failedAction = failedActions.find(fa => fa.id === action.id);
            return failedAction || action;
          });
        
        updateSyncStats(newQueue);
        return newQueue;
      });

      // Store sync history
      await storeSyncHistory(completedActions.length, failedActions.length);

      // Notify other tabs about sync completion
      if ('BroadcastChannel' in window) {
        const syncChannel = new BroadcastChannel('offline-sync');
        syncChannel.postMessage({
          type: 'SYNC_COMPLETED',
          data: {
            completed: completedActions.length,
            failed: failedActions.length,
            timestamp: Date.now()
          }
        });
      }

    } catch (error) {
      console.error('Sync operation failed:', error);
      
      // Notify other tabs about sync failure
      if ('BroadcastChannel' in window) {
        const syncChannel = new BroadcastChannel('offline-sync');
        syncChannel.postMessage({
          type: 'SYNC_FAILED',
          data: { error: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }
        });
      }
    } finally {
      setSyncStats(prev => ({ 
        ...prev, 
        syncInProgress: false,
        lastSyncTime: Date.now()
      }));
    }
  }, [isOnline, isPaused, syncStats.syncInProgress, syncQueue, batchSize, maxRetries]);

  const syncAction = async (action: SyncAction): Promise<void> => {
    const endpoint = getEndpointForAction(action);
    
    // Check for conflicts if enabled
    if (enableConflictResolution) {
      await checkForConflicts(action);
    }

    const response = await fetch(endpoint, {
      method: getMethodForAction(action),
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Action': 'true',
        'X-Action-Id': action.id,
        'X-Timestamp': action.timestamp.toString()
      },
      body: JSON.stringify(action.data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Sync failed: ${response.statusText} - ${errorData.message || ''}`);
    }

    // Handle conflict resolution response
    if (response.status === 409 && enableConflictResolution) {
      const conflictData = await response.json();
      await handleConflict(action, conflictData);
    }
  };

  const getEndpointForAction = (action: SyncAction): string => {
    switch (action.type) {
      case 'post':
        return '/api/posts';
      case 'reaction':
        return `/api/posts/${action.data.postId}/reactions`;
      case 'comment':
        return `/api/posts/${action.data.postId}/comments`;
      case 'follow':
        return '/api/users/follow';
      case 'like':
        return `/api/posts/${action.data.postId}/like`;
      case 'share':
        return `/api/posts/${action.data.postId}/share`;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const getMethodForAction = (action: SyncAction): string => {
    switch (action.type) {
      case 'post':
      case 'reaction':
      case 'comment':
      case 'follow':
      case 'like':
      case 'share':
        return 'POST';
      default:
        return 'POST';
    }
  };

  const checkForConflicts = async (action: SyncAction): Promise<void> => {
    // Check if there are any conflicting actions
    const conflictKey = `${action.type}_${action.data.postId || action.data.userId}`;
    
    if (conflictResolution.has(conflictKey)) {
      const existingConflict = conflictResolution.get(conflictKey);
      
      // Resolve based on timestamp (last write wins)
      if (action.timestamp > existingConflict.timestamp) {
        conflictResolution.set(conflictKey, action);
      } else {
        throw new Error('Conflict detected: newer version exists');
      }
    } else {
      conflictResolution.set(conflictKey, action);
    }
  };

  const handleConflict = async (action: SyncAction, conflictData: any): Promise<void> => {
    // Store conflict for manual resolution
    if (db) {
      const conflict = {
        id: `conflict_${action.id}`,
        actionId: action.id,
        type: action.type,
        localData: action.data,
        serverData: conflictData,
        timestamp: Date.now(),
        resolved: false
      };

      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      store.put(conflict);
    }

    throw new Error('Conflict requires manual resolution');
  };

  const removeAction = async (actionId: string): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncActions'], 'readwrite');
      const store = transaction.objectStore('syncActions');
      const request = store.delete(actionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const storeSyncHistory = async (completed: number, failed: number): Promise<void> => {
    if (!db) return;

    const historyEntry = {
      id: `sync_${Date.now()}`,
      timestamp: Date.now(),
      completed,
      failed,
      networkSpeed: syncStats.networkSpeed
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncHistory'], 'readwrite');
      const store = transaction.objectStore('syncHistory');
      const request = store.put(historyEntry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const clearFailedActions = useCallback(async (): Promise<void> => {
    if (!db) return;

    const failedActions = syncQueue.filter(action => action.status === 'failed');
    
    await Promise.all(failedActions.map(action => removeAction(action.id)));
    
    setSyncQueue(prev => {
      const newQueue = prev.filter(action => action.status !== 'failed');
      updateSyncStats(newQueue);
      return newQueue;
    });
  }, [db, syncQueue]);

  const pauseSync = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeSync = useCallback(() => {
    setIsPaused(false);
    if (isOnline && syncQueue.length > 0) {
      syncNow();
    }
  }, [isOnline, syncQueue.length, syncNow]);

  const getSyncHistory = useCallback(async (): Promise<SyncAction[]> => {
    if (!db) return [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['syncHistory'], 'readonly');
      const store = transaction.objectStore('syncHistory');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }, [db]);

  const updateSyncStats = (actions: SyncAction[]) => {
    const stats = actions.reduce((acc, action) => {
      acc.totalActions++;
      acc.totalDataSize += action.estimatedSize;
      
      switch (action.status) {
        case 'pending':
          acc.pendingActions++;
          break;
        case 'completed':
          acc.completedActions++;
          break;
        case 'failed':
          acc.failedActions++;
          break;
      }
      
      return acc;
    }, {
      totalActions: 0,
      pendingActions: 0,
      completedActions: 0,
      failedActions: 0,
      totalDataSize: 0
    });

    setSyncStats(prev => ({ ...prev, ...stats }));
  };

  const detectNetworkSpeed = async () => {
    if (!isOnline) return;

    try {
      const startTime = performance.now();
      await fetch('/api/ping', { method: 'HEAD' });
      const endTime = performance.now();
      const latency = endTime - startTime;

      let speed: 'slow' | 'normal' | 'fast';
      if (latency > 1000) {
        speed = 'slow';
      } else if (latency < 200) {
        speed = 'fast';
      } else {
        speed = 'normal';
      }

      setSyncStats(prev => ({ ...prev, networkSpeed: speed }));
    } catch (error) {
      setSyncStats(prev => ({ ...prev, networkSpeed: 'slow' }));
    }
  };

  const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('offline-sync');
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  };

  const generateActionId = (): string => {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const contextValue: OfflineSyncContextType = {
    isOnline,
    syncStats,
    addAction,
    syncNow,
    clearFailedActions,
    pauseSync,
    resumeSync,
    getSyncHistory
  };

  return (
    <OfflineSyncContext.Provider value={contextValue}>
      {children}
      <SyncStatusIndicator />
    </OfflineSyncContext.Provider>
  );
}

// Sync status indicator component
function SyncStatusIndicator() {
  const { isOnline, syncStats } = useOfflineSync();
  const [showDetails, setShowDetails] = useState(false);

  if (isOnline && syncStats.pendingActions === 0 && !syncStats.syncInProgress) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 left-4 z-50"
    >
      <div 
        className={`p-3 rounded-lg shadow-lg cursor-pointer ${
          !isOnline ? 'bg-orange-500' : 
          syncStats.syncInProgress ? 'bg-blue-500' : 
          syncStats.failedActions > 0 ? 'bg-red-500' : 'bg-green-500'
        } text-white`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {syncStats.syncInProgress ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-white/30"></div>
          )}
          
          <div className="text-sm">
            {!isOnline ? 'Offline' : 
             syncStats.syncInProgress ? 'Syncing...' : 
             syncStats.pendingActions > 0 ? `${syncStats.pendingActions} pending` : 
             'Synced'}
          </div>
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 pt-2 border-t border-white/20 text-xs space-y-1"
            >
              <div>Total: {syncStats.totalActions}</div>
              <div>Pending: {syncStats.pendingActions}</div>
              <div>Completed: {syncStats.completedActions}</div>
              <div>Failed: {syncStats.failedActions}</div>
              <div>Size: {(syncStats.totalDataSize / 1024).toFixed(1)}KB</div>
              <div>Speed: {syncStats.networkSpeed}</div>
              {syncStats.lastSyncTime && (
                <div>Last: {new Date(syncStats.lastSyncTime).toLocaleTimeString()}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Hook to use offline sync
export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSync must be used within an OfflineSyncManager');
  }
  return context;
}

// Hook for adding offline actions
export function useOfflineAction() {
  const { addAction, isOnline } = useOfflineSync();

  const executeAction = useCallback(async (
    type: SyncAction['type'],
    data: any,
    priority: SyncAction['priority'] = 'normal'
  ) => {
    const estimatedSize = JSON.stringify(data).length;
    
    await addAction({
      type,
      data,
      priority,
      maxRetries: 3,
      estimatedSize
    });

    // Return a promise that resolves when the action is synced (if online)
    if (isOnline) {
      return new Promise((resolve) => {
        // In a real implementation, you'd track the specific action
        setTimeout(resolve, 1000);
      });
    }
  }, [addAction, isOnline]);

  return { executeAction, isOnline };
}

export default OfflineSyncManager;