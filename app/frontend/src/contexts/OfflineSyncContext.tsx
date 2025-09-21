import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  OfflineSyncState,
  QueuedAction,
  SyncStatus,
  SyncError,
  ConflictResolution,
  ActionType
} from './types';

// Action Types
type OfflineSyncAction =
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'QUEUE_ACTION'; payload: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'> }
  | { type: 'REMOVE_ACTION'; payload: string }
  | { type: 'UPDATE_ACTION'; payload: { id: string; updates: Partial<QueuedAction> } }
  | { type: 'INCREMENT_RETRY'; payload: string }
  | { type: 'SET_SYNC_STATUS'; payload: Partial<SyncStatus> }
  | { type: 'ADD_SYNC_ERROR'; payload: { action: QueuedAction; error: string } }
  | { type: 'RESOLVE_SYNC_ERROR'; payload: string }
  | { type: 'ADD_CONFLICT'; payload: Omit<ConflictResolution, 'id' | 'timestamp'> }
  | { type: 'RESOLVE_CONFLICT'; payload: { id: string; resolution: any } }
  | { type: 'UPDATE_LAST_SYNC'; payload: Date }
  | { type: 'CLEAR_COMPLETED_ACTIONS' }
  | { type: 'REORDER_QUEUE'; payload: QueuedAction[] };

// Initial State
const initialState: OfflineSyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  queuedActions: [],
  syncStatus: {
    isActive: false,
    progress: 0,
    errors: [],
    lastSuccessfulSync: new Date(),
  },
  conflictResolution: [],
  lastSyncTime: new Date(),
};

// Reducer
function offlineSyncReducer(state: OfflineSyncState, action: OfflineSyncAction): OfflineSyncState {
  switch (action.type) {
    case 'SET_ONLINE_STATUS': {
      return {
        ...state,
        isOnline: action.payload,
      };
    }

    case 'QUEUE_ACTION': {
      const queuedAction: QueuedAction = {
        ...action.payload,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
      };

      // Insert action based on priority
      const newQueue = [...state.queuedActions];
      const insertIndex = findInsertIndex(newQueue, queuedAction);
      newQueue.splice(insertIndex, 0, queuedAction);

      return {
        ...state,
        queuedActions: newQueue,
      };
    }

    case 'REMOVE_ACTION': {
      const newQueue = state.queuedActions.filter(action => action.id !== action.payload);
      return {
        ...state,
        queuedActions: newQueue,
      };
    }

    case 'UPDATE_ACTION': {
      const { id, updates } = action.payload;
      const newQueue = state.queuedActions.map(queuedAction =>
        queuedAction.id === id
          ? { ...queuedAction, ...updates }
          : queuedAction
      );

      return {
        ...state,
        queuedActions: newQueue,
      };
    }

    case 'INCREMENT_RETRY': {
      const newQueue = state.queuedActions.map(queuedAction =>
        queuedAction.id === action.payload
          ? { ...queuedAction, retryCount: queuedAction.retryCount + 1 }
          : queuedAction
      );

      return {
        ...state,
        queuedActions: newQueue,
      };
    }

    case 'SET_SYNC_STATUS': {
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          ...action.payload,
        },
      };
    }

    case 'ADD_SYNC_ERROR': {
      const { action: failedAction, error } = action.payload;
      const syncError: SyncError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: failedAction,
        error,
        timestamp: new Date(),
        resolved: false,
      };

      const newErrors = [...state.syncStatus.errors, syncError];

      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          errors: newErrors,
        },
      };
    }

    case 'RESOLVE_SYNC_ERROR': {
      const newErrors = state.syncStatus.errors.map(error =>
        error.id === action.payload
          ? { ...error, resolved: true }
          : error
      );

      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          errors: newErrors,
        },
      };
    }

    case 'ADD_CONFLICT': {
      const conflict: ConflictResolution = {
        ...action.payload,
        id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      return {
        ...state,
        conflictResolution: [...state.conflictResolution, conflict],
      };
    }

    case 'RESOLVE_CONFLICT': {
      const { id, resolution } = action.payload;
      const newConflicts = state.conflictResolution.map(conflict =>
        conflict.id === id
          ? { ...conflict, resolution }
          : conflict
      );

      return {
        ...state,
        conflictResolution: newConflicts,
      };
    }

    case 'UPDATE_LAST_SYNC': {
      return {
        ...state,
        lastSyncTime: action.payload,
        syncStatus: {
          ...state.syncStatus,
          lastSuccessfulSync: action.payload,
        },
      };
    }

    case 'CLEAR_COMPLETED_ACTIONS': {
      // Remove actions that have been successfully processed
      const newQueue = state.queuedActions.filter(action => 
        action.retryCount < 3 // Keep actions that haven't exceeded retry limit
      );

      return {
        ...state,
        queuedActions: newQueue,
      };
    }

    case 'REORDER_QUEUE': {
      return {
        ...state,
        queuedActions: action.payload,
      };
    }

    default:
      return state;
  }
}

// Helper Functions
function findInsertIndex(queue: QueuedAction[], newAction: QueuedAction): number {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const newPriority = priorityOrder[newAction.priority];

  for (let i = 0; i < queue.length; i++) {
    const currentPriority = priorityOrder[queue[i].priority];
    if (newPriority < currentPriority) {
      return i;
    }
  }

  return queue.length;
}

function canExecuteAction(action: QueuedAction, dependencies: QueuedAction[]): boolean {
  if (!action.dependencies || action.dependencies.length === 0) {
    return true;
  }

  // Check if all dependencies have been completed
  return action.dependencies.every(depId => 
    !dependencies.some(dep => dep.id === depId)
  );
}

// Context
interface OfflineSyncContextType {
  state: OfflineSyncState;
  queueAction: (type: ActionType, payload: any, priority?: 'low' | 'medium' | 'high', dependencies?: string[]) => string;
  removeAction: (actionId: string) => void;
  syncActions: () => Promise<void>;
  retryFailedActions: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: any) => void;
  clearQueue: () => void;
  getQueuedActionsCount: () => number;
  getFailedActionsCount: () => number;
  getUnresolvedConflictsCount: () => number;
  isActionQueued: (type: ActionType, payload: any) => boolean;
  getActionsByType: (type: ActionType) => QueuedAction[];
  estimateSyncTime: () => number;
  pauseSync: () => void;
  resumeSync: () => void;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

// Provider
interface OfflineSyncProviderProps {
  children: React.ReactNode;
}

export function OfflineSyncProvider({ children }: OfflineSyncProviderProps) {
  const [state, dispatch] = useReducer(offlineSyncReducer, initialState);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncPausedRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      if (!syncPausedRef.current) {
        syncActions();
      }
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (state.isOnline && state.queuedActions.length > 0 && !syncPausedRef.current) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (!state.syncStatus.isActive) {
          syncActions();
        }
      }, 30000); // Sync every 30 seconds
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [state.isOnline, state.queuedActions.length, state.syncStatus.isActive]);

  // Persist queue to localStorage
  useEffect(() => {
    const queueData = {
      queuedActions: state.queuedActions,
      lastSyncTime: state.lastSyncTime,
    };
    localStorage.setItem('offlineSync_queue', JSON.stringify(queueData));
  }, [state.queuedActions, state.lastSyncTime]);

  // Restore queue from localStorage on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem('offlineSync_queue');
      if (savedQueue) {
        const { queuedActions, lastSyncTime } = JSON.parse(savedQueue);
        
        // Restore actions with updated timestamps
        queuedActions.forEach((action: any) => {
          dispatch({
            type: 'QUEUE_ACTION',
            payload: {
              ...action,
              timestamp: new Date(action.timestamp),
            },
          });
        });

        if (lastSyncTime) {
          dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date(lastSyncTime) });
        }
      }
    } catch (error) {
      console.error('Failed to restore offline sync queue:', error);
    }
  }, []);

  const queueAction = useCallback((
    type: ActionType,
    payload: any,
    priority: 'low' | 'medium' | 'high' = 'medium',
    dependencies?: string[]
  ): string => {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    dispatch({
      type: 'QUEUE_ACTION',
      payload: {
        type,
        payload,
        priority,
        dependencies,
      },
    });

    return actionId;
  }, []);

  const removeAction = useCallback((actionId: string) => {
    dispatch({ type: 'REMOVE_ACTION', payload: actionId });
  }, []);

  const syncActions = useCallback(async (): Promise<void> => {
    if (!state.isOnline || state.syncStatus.isActive || syncPausedRef.current) {
      return;
    }

    dispatch({ type: 'SET_SYNC_STATUS', payload: { isActive: true, progress: 0 } });

    try {
      const actionsToSync = state.queuedActions.filter(action => 
        canExecuteAction(action, state.queuedActions) && action.retryCount < 3
      );

      if (actionsToSync.length === 0) {
        dispatch({ type: 'SET_SYNC_STATUS', payload: { isActive: false, progress: 100 } });
        return;
      }

      let completedCount = 0;

      for (const action of actionsToSync) {
        try {
          // Execute the action
          await executeAction(action);
          
          // Remove successful action from queue
          dispatch({ type: 'REMOVE_ACTION', payload: action.id });
          
          completedCount++;
          const progress = (completedCount / actionsToSync.length) * 100;
          dispatch({ type: 'SET_SYNC_STATUS', payload: { progress } });

        } catch (error) {
          console.error('Failed to sync action:', action, error);
          
          // Increment retry count
          dispatch({ type: 'INCREMENT_RETRY', payload: action.id });
          
          // Add sync error
          dispatch({
            type: 'ADD_SYNC_ERROR',
            payload: {
              action,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          // If max retries exceeded, remove from queue
          if (action.retryCount >= 2) {
            dispatch({ type: 'REMOVE_ACTION', payload: action.id });
          }
        }
      }

      dispatch({ 
        type: 'SET_SYNC_STATUS', 
        payload: { 
          isActive: false, 
          progress: 100,
          currentAction: undefined,
        } 
      });
      
      dispatch({ type: 'UPDATE_LAST_SYNC', payload: new Date() });

    } catch (error) {
      console.error('Sync process failed:', error);
      dispatch({ 
        type: 'SET_SYNC_STATUS', 
        payload: { 
          isActive: false, 
          progress: 0,
          currentAction: undefined,
        } 
      });
    }
  }, [state.isOnline, state.syncStatus.isActive, state.queuedActions]);

  const executeAction = async (action: QueuedAction): Promise<void> => {
    // Update sync status with current action
    dispatch({ 
      type: 'SET_SYNC_STATUS', 
      payload: { currentAction: `${action.type}: ${action.payload.id || 'Unknown'}` } 
    });

    // Simulate API calls based on action type
    switch (action.type) {
      case 'CREATE_POST':
        // TODO: Integrate with actual post creation API
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Synced CREATE_POST:', action.payload);
        break;

      case 'REACT_TO_POST':
        // TODO: Integrate with reaction API
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Synced REACT_TO_POST:', action.payload);
        break;

      case 'TIP_USER':
        // TODO: Integrate with tipping API
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('Synced TIP_USER:', action.payload);
        break;

      case 'FOLLOW_USER':
        // TODO: Integrate with follow API
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('Synced FOLLOW_USER:', action.payload);
        break;

      case 'JOIN_COMMUNITY':
        // TODO: Integrate with community API
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log('Synced JOIN_COMMUNITY:', action.payload);
        break;

      case 'UPDATE_PROFILE':
        // TODO: Integrate with profile API
        await new Promise(resolve => setTimeout(resolve, 1200));
        console.log('Synced UPDATE_PROFILE:', action.payload);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const retryFailedActions = useCallback(async (): Promise<void> => {
    const failedActions = state.queuedActions.filter(action => action.retryCount > 0);
    
    for (const action of failedActions) {
      // Reset retry count to give it another chance
      dispatch({ 
        type: 'UPDATE_ACTION', 
        payload: { 
          id: action.id, 
          updates: { retryCount: 0 } 
        } 
      });
    }

    // Trigger sync
    await syncActions();
  }, [state.queuedActions, syncActions]);

  const resolveConflict = useCallback((conflictId: string, resolution: any) => {
    dispatch({ type: 'RESOLVE_CONFLICT', payload: { id: conflictId, resolution } });
  }, []);

  const clearQueue = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED_ACTIONS' });
  }, []);

  const getQueuedActionsCount = useCallback((): number => {
    return state.queuedActions.length;
  }, [state.queuedActions.length]);

  const getFailedActionsCount = useCallback((): number => {
    return state.queuedActions.filter(action => action.retryCount > 0).length;
  }, [state.queuedActions]);

  const getUnresolvedConflictsCount = useCallback((): number => {
    return state.conflictResolution.filter(conflict => !conflict.resolution).length;
  }, [state.conflictResolution]);

  const isActionQueued = useCallback((type: ActionType, payload: any): boolean => {
    return state.queuedActions.some(action => 
      action.type === type && 
      JSON.stringify(action.payload) === JSON.stringify(payload)
    );
  }, [state.queuedActions]);

  const getActionsByType = useCallback((type: ActionType): QueuedAction[] => {
    return state.queuedActions.filter(action => action.type === type);
  }, [state.queuedActions]);

  const estimateSyncTime = useCallback((): number => {
    const actionTimes = {
      CREATE_POST: 2000,
      REACT_TO_POST: 500,
      TIP_USER: 1500,
      FOLLOW_USER: 300,
      JOIN_COMMUNITY: 800,
      UPDATE_PROFILE: 1200,
    };

    return state.queuedActions.reduce((total, action) => {
      return total + (actionTimes[action.type] || 1000);
    }, 0);
  }, [state.queuedActions]);

  const pauseSync = useCallback(() => {
    syncPausedRef.current = true;
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const resumeSync = useCallback(() => {
    syncPausedRef.current = false;
    if (state.isOnline && state.queuedActions.length > 0) {
      syncActions();
    }
  }, [state.isOnline, state.queuedActions.length, syncActions]);

  const contextValue: OfflineSyncContextType = {
    state,
    queueAction,
    removeAction,
    syncActions,
    retryFailedActions,
    resolveConflict,
    clearQueue,
    getQueuedActionsCount,
    getFailedActionsCount,
    getUnresolvedConflictsCount,
    isActionQueued,
    getActionsByType,
    estimateSyncTime,
    pauseSync,
    resumeSync,
  };

  return (
    <OfflineSyncContext.Provider value={contextValue}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

// Hook
export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSync must be used within an OfflineSyncProvider');
  }
  return context;
}