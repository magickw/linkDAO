/**
 * React Hook for Offline Sync
 * Provides interface for managing offline actions and sync
 * Requirements: 8.7, 10.7
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  offlineSyncService,
  OfflineAction,
  SyncResult,
  ConflictResolutionStrategy
} from '../services/offlineSyncService';
import { RealTimeNotification } from '../types/realTimeNotifications';
import { LiveContentUpdate } from '../services/communityRealTimeUpdateService';

// Hook options
interface UseOfflineSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  enableRetry?: boolean;
  onSyncComplete?: (result: SyncResult) => void;
  onConflict?: (action: OfflineAction) => void;
  onError?: (error: any) => void;
}

// Queue status interface
interface QueueStatus {
  notifications: number;
  updates: number;
  actions: {
    pending: number;
    syncing: number;
    synced: number;
    failed: number;
    conflicts: number;
  };
  lastSync: Date;
  syncInProgress: boolean;
  isOnline: boolean;
}

// Hook return interface
interface UseOfflineSyncReturn {
  // Status
  queueStatus: QueueStatus;
  isOnline: boolean;
  isSyncing: boolean;
  hasQueuedItems: boolean;
  
  // Actions
  queueNotification: (notification: RealTimeNotification) => void;
  queueUpdate: (update: LiveContentUpdate) => void;
  queueAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => string;
  
  // Sync operations
  syncNow: () => Promise<SyncResult>;
  clearQueue: () => void;
  
  // Conflict resolution
  failedActions: OfflineAction[];
  conflictedActions: OfflineAction[];
  resolveConflict: (actionId: string, strategy: ConflictResolutionStrategy, customData?: any) => boolean;
  
  // Event handlers
  onSyncStarted: (callback: () => void) => () => void;
  onSyncCompleted: (callback: (result: SyncResult) => void) => () => void;
  onSyncError: (callback: (error: any) => void) => () => void;
  onConflictDetected: (callback: (action: OfflineAction) => void) => () => void;
}

/**
 * Main offline sync hook
 */
export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncReturn {
  const {
    autoSync = true,
    syncInterval = 30000,
    enableRetry = true,
    onSyncComplete,
    onConflict,
    onError
  } = options;

  // State
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    notifications: 0,
    updates: 0,
    actions: {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      conflicts: 0
    },
    lastSync: new Date(),
    syncInProgress: false,
    isOnline: navigator.onLine
  });

  const [failedActions, setFailedActions] = useState<OfflineAction[]>([]);
  const [conflictedActions, setConflictedActions] = useState<OfflineAction[]>([]);

  // Refs
  const mountedRef = useRef(true);
  const listenersRef = useRef<Map<string, Function>>(new Map());
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Update queue status
  const updateQueueStatus = useCallback(() => {
    if (!mountedRef.current) return;
    
    const status = offlineSyncService.getQueueStatus();
    setQueueStatus(status);
    setFailedActions(offlineSyncService.getFailedActions());
    setConflictedActions(offlineSyncService.getConflictedActions());
  }, []);

  // Queue operations
  const queueNotification = useCallback((notification: RealTimeNotification) => {
    offlineSyncService.queueNotification(notification);
  }, []);

  const queueUpdate = useCallback((update: LiveContentUpdate) => {
    offlineSyncService.queueUpdate(update);
  }, []);

  const queueAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => {
    return offlineSyncService.queueAction(action);
  }, []);

  // Sync operations
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    try {
      const result = await offlineSyncService.forceSyncNow();
      if (onSyncComplete) {
        onSyncComplete(result);
      }
      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }, [onSyncComplete, onError]);

  const clearQueue = useCallback(() => {
    offlineSyncService.clearQueue();
  }, []);

  // Conflict resolution
  const resolveConflict = useCallback((
    actionId: string, 
    strategy: ConflictResolutionStrategy, 
    customData?: any
  ) => {
    return offlineSyncService.resolveConflict(actionId, strategy, customData);
  }, []);

  // Event handlers
  const onSyncStarted = useCallback((callback: () => void) => {
    offlineSyncService.on('sync:started', callback);
    listenersRef.current.set('sync:started', callback);
    
    return () => {
      offlineSyncService.off('sync:started', callback);
      listenersRef.current.delete('sync:started');
    };
  }, []);

  const onSyncCompleted = useCallback((callback: (result: SyncResult) => void) => {
    offlineSyncService.on('sync:completed', callback);
    listenersRef.current.set('sync:completed', callback);
    
    return () => {
      offlineSyncService.off('sync:completed', callback);
      listenersRef.current.delete('sync:completed');
    };
  }, []);

  const onSyncError = useCallback((callback: (error: any) => void) => {
    offlineSyncService.on('sync:error', callback);
    listenersRef.current.set('sync:error', callback);
    
    return () => {
      offlineSyncService.off('sync:error', callback);
      listenersRef.current.delete('sync:error');
    };
  }, []);

  const onConflictDetected = useCallback((callback: (action: OfflineAction) => void) => {
    offlineSyncService.on('retry:conflict', callback);
    listenersRef.current.set('retry:conflict', callback);
    
    return () => {
      offlineSyncService.off('retry:conflict', callback);
      listenersRef.current.delete('retry:conflict');
    };
  }, []);

  // Setup event listeners
  useEffect(() => {
    const handleQueueUpdate = () => {
      updateQueueStatus();
    };

    const handleSyncCompleted = (result: SyncResult) => {
      updateQueueStatus();
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    };

    const handleSyncError = (error: any) => {
      updateQueueStatus();
      if (onError) {
        onError(error);
      }
    };

    const handleConflict = (action: OfflineAction) => {
      updateQueueStatus();
      if (onConflict) {
        onConflict(action);
      }
    };

    const handleOnline = () => {
      updateQueueStatus();
    };

    const handleOffline = () => {
      updateQueueStatus();
    };

    // Register listeners
    offlineSyncService.on('notification:queued', handleQueueUpdate);
    offlineSyncService.on('update:queued', handleQueueUpdate);
    offlineSyncService.on('action:queued', handleQueueUpdate);
    offlineSyncService.on('sync:started', handleQueueUpdate);
    offlineSyncService.on('sync:completed', handleSyncCompleted);
    offlineSyncService.on('sync:error', handleSyncError);
    offlineSyncService.on('retry:conflict', handleConflict);
    offlineSyncService.on('conflict:resolved', handleQueueUpdate);
    offlineSyncService.on('connection:online', handleOnline);
    offlineSyncService.on('connection:offline', handleOffline);
    offlineSyncService.on('queue:cleared', handleQueueUpdate);

    // Initial status update
    updateQueueStatus();

    return () => {
      // Cleanup listeners
      offlineSyncService.off('notification:queued', handleQueueUpdate);
      offlineSyncService.off('update:queued', handleQueueUpdate);
      offlineSyncService.off('action:queued', handleQueueUpdate);
      offlineSyncService.off('sync:started', handleQueueUpdate);
      offlineSyncService.off('sync:completed', handleSyncCompleted);
      offlineSyncService.off('sync:error', handleSyncError);
      offlineSyncService.off('retry:conflict', handleConflict);
      offlineSyncService.off('conflict:resolved', handleQueueUpdate);
      offlineSyncService.off('connection:online', handleOnline);
      offlineSyncService.off('connection:offline', handleOffline);
      offlineSyncService.off('queue:cleared', handleQueueUpdate);
    };
  }, [updateQueueStatus, onSyncComplete, onError, onConflict]);

  // Auto-sync setup
  useEffect(() => {
    if (!autoSync) return;

    const startAutoSync = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (navigator.onLine && !queueStatus.syncInProgress) {
          syncNow().catch(error => {
            console.error('Auto-sync failed:', error);
          });
        }
      }, syncInterval);
    };

    startAutoSync();

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [autoSync, syncInterval, syncNow, queueStatus.syncInProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      
      // Cleanup any remaining listeners
      listenersRef.current.forEach((callback, event) => {
        offlineSyncService.off(event, callback);
      });
      listenersRef.current.clear();
    };
  }, []);

  // Computed values
  const isOnline = queueStatus.isOnline;
  const isSyncing = queueStatus.syncInProgress;
  const hasQueuedItems = queueStatus.notifications > 0 || 
                        queueStatus.updates > 0 || 
                        queueStatus.actions.pending > 0 ||
                        queueStatus.actions.failed > 0 ||
                        queueStatus.actions.conflicts > 0;

  return {
    // Status
    queueStatus,
    isOnline,
    isSyncing,
    hasQueuedItems,
    
    // Actions
    queueNotification,
    queueUpdate,
    queueAction,
    
    // Sync operations
    syncNow,
    clearQueue,
    
    // Conflict resolution
    failedActions,
    conflictedActions,
    resolveConflict,
    
    // Event handlers
    onSyncStarted,
    onSyncCompleted,
    onSyncError,
    onConflictDetected
  };
}

/**
 * Hook for offline action queuing only
 */
export function useOfflineActions() {
  const {
    queueAction,
    failedActions,
    conflictedActions,
    resolveConflict,
    queueStatus
  } = useOfflineSync({
    autoSync: false
  });

  const queueVote = useCallback((proposalId: string, vote: 'yes' | 'no' | 'abstain', votingPower?: number) => {
    return queueAction({
      type: 'vote',
      data: { proposalId, vote, votingPower },
      priority: 'high',
      maxRetries: 3,
      contextId: proposalId,
      userId: 'current_user' // In real app, get from auth
    });
  }, [queueAction]);

  const queueTip = useCallback((postId: string, amount: number, token: string, message?: string) => {
    return queueAction({
      type: 'tip',
      data: { postId, amount, token, message },
      priority: 'high',
      maxRetries: 3,
      contextId: postId,
      userId: 'current_user'
    });
  }, [queueAction]);

  const queueComment = useCallback((postId: string, content: string, parentId?: string) => {
    return queueAction({
      type: 'comment',
      data: { postId, content, parentId },
      priority: 'normal',
      maxRetries: 5,
      contextId: postId,
      userId: 'current_user'
    });
  }, [queueAction]);

  const queueReaction = useCallback((postId: string, reactionType: string, emoji: string) => {
    return queueAction({
      type: 'reaction',
      data: { postId, reactionType, emoji },
      priority: 'low',
      maxRetries: 3,
      contextId: postId,
      userId: 'current_user'
    });
  }, [queueAction]);

  const queueFollow = useCallback((targetUserId: string, follow: boolean) => {
    return queueAction({
      type: 'follow',
      data: { targetUserId, follow },
      priority: 'normal',
      maxRetries: 3,
      contextId: targetUserId,
      userId: 'current_user'
    });
  }, [queueAction]);

  const queueJoinCommunity = useCallback((communityId: string, join: boolean) => {
    return queueAction({
      type: 'join_community',
      data: { communityId, join },
      priority: 'normal',
      maxRetries: 3,
      contextId: communityId,
      userId: 'current_user'
    });
  }, [queueAction]);

  return {
    // Queue actions
    queueVote,
    queueTip,
    queueComment,
    queueReaction,
    queueFollow,
    queueJoinCommunity,
    
    // Status
    pendingActions: queueStatus.actions.pending,
    failedActions,
    conflictedActions,
    
    // Conflict resolution
    resolveConflict
  };
}

/**
 * Hook for sync status monitoring only
 */
export function useSyncStatus() {
  const {
    queueStatus,
    isOnline,
    isSyncing,
    hasQueuedItems,
    syncNow,
    clearQueue
  } = useOfflineSync({
    autoSync: false
  });

  return {
    queueStatus,
    isOnline,
    isSyncing,
    hasQueuedItems,
    syncNow,
    clearQueue
  };
}

export default useOfflineSync;