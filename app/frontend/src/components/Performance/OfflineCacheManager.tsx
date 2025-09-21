import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  size: number;
  accessCount: number;
  lastAccessed: number;
}

interface OfflineAction {
  id: string;
  type: 'post' | 'reaction' | 'comment' | 'follow' | 'like';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

interface OfflineCacheState {
  isOnline: boolean;
  cacheSize: number;
  maxCacheSize: number;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime: number | null;
}

interface OfflineCacheContextType extends OfflineCacheState {
  cacheData: <T>(key: string, data: T, options?: CacheOptions) => Promise<void>;
  getCachedData: <T>(key: string) => Promise<T | null>;
  removeCachedData: (key: string) => Promise<void>;
  clearCache: () => Promise<void>;
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  syncOfflineActions: () => Promise<void>;
  getCacheStats: () => Promise<CacheStats>;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  priority?: 'low' | 'normal' | 'high' | 'critical';
  compress?: boolean;
}

interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestItem: number;
  newestItem: number;
  priorityBreakdown: Record<string, number>;
}

const OfflineCacheContext = createContext<OfflineCacheContextType | undefined>(undefined);

interface OfflineCacheManagerProps {
  children: ReactNode;
  maxCacheSize?: number; // in bytes
  defaultTTL?: number; // in milliseconds
  enableCompression?: boolean;
  syncInterval?: number; // in milliseconds
}

export function OfflineCacheManager({
  children,
  maxCacheSize = 50 * 1024 * 1024, // 50MB
  defaultTTL = 24 * 60 * 60 * 1000, // 24 hours
  enableCompression = true,
  syncInterval = 30000 // 30 seconds
}: OfflineCacheManagerProps) {
  const [state, setState] = useState<OfflineCacheState>({
    isOnline: navigator.onLine,
    cacheSize: 0,
    maxCacheSize,
    pendingActions: [],
    syncInProgress: false,
    lastSyncTime: null
  });

  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  // Initialize IndexedDB
  useEffect(() => {
    initializeDB();
  }, []);

  // Set up network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      syncOfflineActions();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up periodic sync
  useEffect(() => {
    if (state.isOnline && syncInterval > 0) {
      const interval = setInterval(() => {
        syncOfflineActions();
      }, syncInterval);

      return () => clearInterval(interval);
    }
  }, [state.isOnline, syncInterval]);

  const initializeDB = async () => {
    try {
      const database = await openDatabase();
      setDb(database);
      
      // Load initial state
      const cacheSize = await calculateCacheSize(database);
      const pendingActions = await loadPendingActions(database);
      
      setState(prev => ({
        ...prev,
        cacheSize,
        pendingActions
      }));
    } catch (error) {
      console.error('Failed to initialize offline cache database:', error);
    }
  };

  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineCache', 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('expiresAt', 'expiresAt');
          cacheStore.createIndex('priority', 'priority');
          cacheStore.createIndex('lastAccessed', 'lastAccessed');
        }

        // Offline actions store
        if (!db.objectStoreNames.contains('offlineActions')) {
          const actionsStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
          actionsStore.createIndex('type', 'type');
          actionsStore.createIndex('timestamp', 'timestamp');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  };

  const calculateCacheSize = async (database: IDBDatabase): Promise<number> => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result as CacheItem[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        resolve(totalSize);
      };
    });
  };

  const loadPendingActions = async (database: IDBDatabase): Promise<OfflineAction[]> => {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(['offlineActions'], 'readonly');
      const store = transaction.objectStore('offlineActions');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  const cacheData = useCallback(async (
    key: string, 
    data: any, 
    options: CacheOptions = {}
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const {
      ttl = defaultTTL,
      priority = 'normal',
      compress = enableCompression
    } = options;

    const now = Date.now();
    const serializedData = JSON.stringify(data);
    const compressedData = compress ? await compressData(serializedData) : serializedData;
    const size = new Blob([compressedData]).size;

    // Check if we need to evict items
    if (state.cacheSize + size > maxCacheSize) {
      await evictItems(size);
    }

    const cacheItem: CacheItem = {
      data: compressedData,
      timestamp: now,
      expiresAt: now + ttl,
      priority,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, ...cacheItem });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setState(prev => ({ ...prev, cacheSize: prev.cacheSize + size }));
        resolve();
      };
    });
  }, [db, defaultTTL, enableCompression, maxCacheSize, state.cacheSize]);

  const getCachedData = useCallback(async (key: string): Promise<any | null> => {
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const result = request.result;

        if (!result) {
          setMissCount(prev => prev + 1);
          resolve(null);
          return;
        }

        const now = Date.now();

        // Check if expired
        if (now > result.expiresAt) {
          store.delete(key);
          setMissCount(prev => prev + 1);
          resolve(null);
          return;
        }

        // Update access statistics
        result.accessCount++;
        result.lastAccessed = now;
        store.put({ key, ...result });

        setHitCount(prev => prev + 1);

        try {
          const decompressedData = await decompressData(result.data);
          const parsedData = JSON.parse(decompressedData);
          resolve(parsedData);
        } catch (error) {
          console.error('Failed to decompress/parse cached data:', error);
          resolve(null);
        }
      };
    });
  }, [db]);

  const removeCachedData = useCallback(async (key: string): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      // Get item size first
      const getRequest = store.get(key);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        const deleteRequest = store.delete(key);
        
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onsuccess = () => {
          if (item) {
            setState(prev => ({ ...prev, cacheSize: prev.cacheSize - item.size }));
          }
          resolve();
        };
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }, [db]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setState(prev => ({ ...prev, cacheSize: 0 }));
        resolve();
      };
    });
  }, [db]);

  const addOfflineAction = useCallback(async (
    action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const offlineAction: OfflineAction = {
      ...action,
      id: `${action.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      const request = store.add(offlineAction);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        setState(prev => ({
          ...prev,
          pendingActions: [...prev.pendingActions, offlineAction]
        }));
        resolve();
      };
    });
  }, [db]);

  const syncOfflineActions = useCallback(async (): Promise<void> => {
    if (!db || !state.isOnline || state.syncInProgress || state.pendingActions.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, syncInProgress: true }));

    try {
      const actionsToSync = [...state.pendingActions];
      const syncResults = await Promise.allSettled(
        actionsToSync.map(action => syncAction(action))
      );

      const successfulActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      syncResults.forEach((result, index) => {
        const action = actionsToSync[index];
        
        if (result.status === 'fulfilled') {
          successfulActions.push(action.id);
        } else {
          action.retryCount++;
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          }
        }
      });

      // Remove successful actions from database
      if (successfulActions.length > 0) {
        await removeOfflineActions(successfulActions);
      }

      // Update failed actions in database
      if (failedActions.length > 0) {
        await updateOfflineActions(failedActions);
      }

      setState(prev => ({
        ...prev,
        pendingActions: failedActions,
        lastSyncTime: Date.now()
      }));

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  }, [db, state.isOnline, state.syncInProgress, state.pendingActions]);

  const syncAction = async (action: OfflineAction): Promise<void> => {
    const endpoint = getEndpointForAction(action);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(action.data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
  };

  const getEndpointForAction = (action: OfflineAction): string => {
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
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const removeOfflineActions = async (actionIds: string[]): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      
      let completed = 0;
      const total = actionIds.length;

      actionIds.forEach(id => {
        const request = store.delete(id);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  };

  const updateOfflineActions = async (actions: OfflineAction[]): Promise<void> => {
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['offlineActions'], 'readwrite');
      const store = transaction.objectStore('offlineActions');
      
      let completed = 0;
      const total = actions.length;

      actions.forEach(action => {
        const request = store.put(action);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  };

  const evictItems = async (requiredSpace: number): Promise<void> => {
    if (!db) return;

    // Implement LRU eviction with priority consideration
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('lastAccessed');
      const request = index.openCursor();

      let freedSpace = 0;
      const itemsToDelete: string[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor && freedSpace < requiredSpace) {
          const item = cursor.value;
          
          // Don't evict critical priority items
          if (item.priority !== 'critical') {
            itemsToDelete.push(item.key);
            freedSpace += item.size;
          }
          
          cursor.continue();
        } else {
          // Delete selected items
          Promise.all(
            itemsToDelete.map(key => removeCachedData(key))
          ).then(() => resolve()).catch(reject);
        }
      };

      request.onerror = () => reject(request.error);
    });
  };

  const getCacheStats = useCallback(async (): Promise<CacheStats> => {
    if (!db) {
      return {
        totalItems: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        oldestItem: 0,
        newestItem: 0,
        priorityBreakdown: {}
      };
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const items = request.result as (CacheItem & { key: string })[];
        
        const stats: CacheStats = {
          totalItems: items.length,
          totalSize: items.reduce((sum, item) => sum + item.size, 0),
          hitRate: hitCount / (hitCount + missCount) || 0,
          missRate: missCount / (hitCount + missCount) || 0,
          oldestItem: Math.min(...items.map(item => item.timestamp)),
          newestItem: Math.max(...items.map(item => item.timestamp)),
          priorityBreakdown: items.reduce((acc, item) => {
            acc[item.priority] = (acc[item.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        resolve(stats);
      };
    });
  }, [db, hitCount, missCount]);

  // Utility functions for compression
  const compressData = async (data: string): Promise<string> => {
    if (!enableCompression) return data;
    
    // Simple compression using built-in compression
    try {
      const compressed = new TextEncoder().encode(data);
      return btoa(String.fromCharCode(...compressed));
    } catch {
      return data; // Fallback to uncompressed
    }
  };

  const decompressData = async (data: string): Promise<string> => {
    if (!enableCompression) return data;
    
    try {
      const decoded = atob(data);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return data; // Fallback assuming uncompressed
    }
  };

  const contextValue: OfflineCacheContextType = {
    ...state,
    cacheData,
    getCachedData,
    removeCachedData,
    clearCache,
    addOfflineAction,
    syncOfflineActions,
    getCacheStats
  };

  return (
    <OfflineCacheContext.Provider value={contextValue}>
      {children}
      <OfflineIndicator />
      <SyncIndicator />
    </OfflineCacheContext.Provider>
  );
}

// Offline indicator component
function OfflineIndicator() {
  const { isOnline } = useOfflineCache();

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      exit={{ y: -100 }}
      className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white text-center py-2 text-sm"
    >
      <div className="flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>You're offline. Actions will sync when connection returns.</span>
      </div>
    </motion.div>
  );
}

// Sync indicator component
function SyncIndicator() {
  const { syncInProgress, pendingActions } = useOfflineCache();

  if (!syncInProgress && pendingActions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-lg"
    >
      <div className="flex items-center space-x-2">
        {syncInProgress ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Syncing...</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 bg-white rounded-full"></div>
            <span className="text-sm">{pendingActions.length} pending</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Hook to use offline cache
export function useOfflineCache() {
  const context = useContext(OfflineCacheContext);
  if (context === undefined) {
    throw new Error('useOfflineCache must be used within an OfflineCacheManager');
  }
  return context;
}

// Hook for caching API responses
export function useCachedAPI<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions & { enabled?: boolean } = {}
) {
  const { getCachedData, cacheData } = useOfflineCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, ...cacheOptions } = options;

  useEffect(() => {
    if (!enabled) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try cache first
        const cachedData = await getCachedData<T>(key);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        // Fetch from network
        const freshData = await fetchFn();
        setData(freshData);
        
        // Cache the result
        await cacheData(key, freshData, cacheOptions);
        
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [key, enabled]);

  return { data, loading, error };
}

export default OfflineCacheManager;