import { useState, useEffect, useCallback } from 'react';
import { getOfflineActionQueue } from '../services/offlineActionQueue';

interface OfflineStatus {
  isOnline: boolean;
  queueSize: number;
  isSupported: boolean;
}

interface UseOfflineSupportReturn {
  isOnline: boolean;
  queueSize: number;
  isSupported: boolean;
  queuedActions: any[];
  syncInProgress: boolean;
  lastSyncTime: Date | null;
  queueAction: (action: any) => Promise<boolean>;
  syncActions: () => Promise<boolean>;
  syncNow: () => Promise<boolean>;
  clearQueue: () => void;
  removeAction: (actionId: string) => void;
  getQueueStats: () => any;
  isActionQueued: (actionId: string) => boolean;
  // Additional properties for compatibility
  syncStatus: any;
  offlineDocuments: any[];
  isDocumentAvailableOffline: (docId: string) => boolean;
  capabilities: any;
  performanceMetrics: any;
  performanceAlerts: any[];
  syncDocuments: () => Promise<void>;
  cacheDocument: (doc: any) => void;
  clearOfflineCache: () => void;
  getAdaptiveLoadingStrategy: () => any;
  loading: boolean;
  syncing: boolean;
  error: Error | null;
}

export const useEnhancedOfflineSupport = (): UseOfflineSupportReturn => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return false;
  });
  const [queueSize, setQueueSize] = useState(0);
  const [queuedActions, setQueuedActions] = useState<any[]>([]);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [trackedActions, setTrackedActions] = useState<Set<string>>(new Set());
  
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Update online status from browser events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to service worker messages for queue updates
    const handleConnectionStatus = (data: any) => {
      setIsOnline(data.isOnline);
      setQueueSize(data.queueSize || 0);
    };

    const handleSyncComplete = (data: any) => {
      setQueueSize(data.queueSize || 0);
      setSyncInProgress(false);
      setLastSyncTime(new Date());
      // Clear queued actions tracking
      setTrackedActions(new Set());
      setQueuedActions([]);
    };

    if (isSupported) {
      const queue = getOfflineActionQueue();
      if (queue) {
        queue.addEventListener('CONNECTION_STATUS_CHANGED', handleConnectionStatus);
        queue.addEventListener('OFFLINE_SYNC_COMPLETE', handleSyncComplete);

        // Get initial status
        queue.getOfflineStatus().then(initialStatus => {
          setIsOnline(initialStatus.isOnline);
          setQueueSize(initialStatus.queueSize);
        });
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      
      if (isSupported) {
        const queue = getOfflineActionQueue();
        if (queue) {
          queue.removeEventListener('CONNECTION_STATUS_CHANGED', handleConnectionStatus);
          queue.removeEventListener('OFFLINE_SYNC_COMPLETE', handleSyncComplete);
        }
      }
    };
  }, [isSupported]);

  const queueAction = useCallback(async (action: any): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Offline support not available');
      return false;
    }

    const queue = getOfflineActionQueue();
    if (!queue) {
      console.warn('Offline action queue not available');
      return false;
    }

    try {
      const success = await queue.queueAction(action);
      if (success && action.id) {
        setTrackedActions(prev => new Set(prev).add(action.id));
        setQueueSize(prev => prev + 1);
        setQueuedActions(prev => [...prev, action]);
      }
      return success;
    } catch (error) {
      console.error('Failed to queue action:', error);
      return false;
    }
  }, [isSupported]);

  const syncActions = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Offline support not available');
      return false;
    }

    const queue = getOfflineActionQueue();
    if (!queue) {
      console.warn('Offline action queue not available');
      return false;
    }

    try {
      setSyncInProgress(true);
      const result = await queue.syncOfflineActions();
      if (result) {
        setLastSyncTime(new Date());
      }
      return result;
    } catch (error) {
      console.error('Failed to sync actions:', error);
      return false;
    } finally {
      setSyncInProgress(false);
    }
  }, [isSupported]);

  const syncNow = useCallback(async (): Promise<boolean> => {
    return syncActions();
  }, [syncActions]);

  const clearQueue = useCallback(() => {
    setQueuedActions([]);
    setQueueSize(0);
    setTrackedActions(new Set());
  }, []);

  const removeAction = useCallback((actionId: string) => {
    setQueuedActions(prev => prev.filter(action => action.id !== actionId));
    setTrackedActions(prev => {
      const newSet = new Set(prev);
      newSet.delete(actionId);
      return newSet;
    });
    setQueueSize(prev => Math.max(0, prev - 1));
  }, []);

  const getQueueStats = useCallback(() => {
    const byPriority = queuedActions.reduce((acc, action) => {
      const priority = action.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, { high: 0, medium: 0, low: 0 });

    const oldestAction = queuedActions.length > 0 
      ? new Date(Math.min(...queuedActions.map(a => a.timestamp || Date.now())))
      : null;

    return {
      byPriority,
      oldestAction,
      total: queuedActions.length
    };
  }, [queuedActions]);

  const isActionQueued = useCallback((actionId: string): boolean => {
    return trackedActions.has(actionId);
  }, [trackedActions]);

  return {
    isOnline,
    queueSize,
    isSupported,
    queuedActions,
    syncInProgress,
    lastSyncTime,
    queueAction,
    syncActions,
    syncNow,
    clearQueue,
    removeAction,
    getQueueStats,
    isActionQueued,
    // Additional properties for compatibility
    syncStatus: { 
      status: syncInProgress ? 'syncing' : 'idle',
      lastSync: lastSyncTime,
      progress: 0
    },
    offlineDocuments: [],
    isDocumentAvailableOffline: () => false,
    capabilities: { offline: isSupported, sync: isSupported },
    performanceMetrics: { responseTime: 0, errorRate: 0 },
    performanceAlerts: [],
    syncDocuments: async () => {},
    cacheDocument: () => {},
    clearOfflineCache: () => {},
    getAdaptiveLoadingStrategy: () => ({ strategy: 'default' }),
    loading: syncInProgress,
    syncing: syncInProgress,
    error: null
  };
};

// Hook for specific action types
export const useOfflineActions = () => {
  const { queueAction, isOnline, queueSize, isSupported } = useEnhancedOfflineSupport();
  const status = { isOnline, queueSize, isSupported };

  const queueCreatePost = useCallback(async (postData: any, auth?: string) => {
    return queueAction({
      type: 'CREATE_POST',
      data: postData,
      auth,
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, [queueAction]);

  const queueCreateComment = useCallback(async (postId: string, commentData: any, auth?: string) => {
    return queueAction({
      type: 'CREATE_COMMENT',
      postId,
      data: commentData,
      auth,
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, [queueAction]);

  const queueReaction = useCallback(async (postId: string, reactionData: any, auth?: string) => {
    return queueAction({
      type: 'REACT_TO_POST',
      postId,
      data: reactionData,
      auth,
      id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, [queueAction]);

  const queueJoinCommunity = useCallback(async (communityId: string, joinData: any, auth?: string) => {
    return queueAction({
      type: 'JOIN_COMMUNITY',
      communityId,
      data: joinData,
      auth,
      id: `join_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, [queueAction]);

  const queueFollowUser = useCallback(async (userId: string, followData: any, auth?: string) => {
    return queueAction({
      type: 'FOLLOW_USER',
      userId,
      data: followData,
      auth,
      id: `follow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }, [queueAction]);

  return {
    status,
    queueCreatePost,
    queueCreateComment,
    queueReaction,
    queueJoinCommunity,
    queueFollowUser
  };
};

// Maintain compatibility with existing code
export const useOfflineSupport = useEnhancedOfflineSupport;

export default useEnhancedOfflineSupport;