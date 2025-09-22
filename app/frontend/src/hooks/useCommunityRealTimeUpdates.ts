/**
 * React Hook for Community Real-Time Updates
 * Provides easy-to-use interface for live content updates
 * Requirements: 8.1, 8.5, 8.7
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  communityRealTimeUpdateService,
  LiveContentUpdate,
  ContentUpdateIndicator
} from '../services/communityRealTimeUpdateService';

// Hook options
interface UseCommunityRealTimeUpdatesOptions {
  contextId?: string;
  contextType?: 'post' | 'community' | 'user';
  autoSubscribe?: boolean;
  enableIndicators?: boolean;
  batchUpdates?: boolean;
}

// Connection status interface
interface ConnectionStatus {
  isConnected: boolean;
  isOnline: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'offline';
  reconnectAttempts: number;
  lastHeartbeat: Date | null;
  queuedUpdates: number;
}

// Hook return interface
interface UseCommunityRealTimeUpdatesReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  isOnline: boolean;
  
  // Updates and indicators
  liveUpdates: LiveContentUpdate[];
  indicators: ContentUpdateIndicator[];
  hasNewContent: boolean;
  
  // Actions
  subscribeToContext: (contextId: string, contextType: 'post' | 'community' | 'user') => void;
  unsubscribeFromContext: (contextId: string, contextType: 'post' | 'community' | 'user') => void;
  dismissIndicator: (indicatorId: string) => void;
  clearIndicators: (contextId?: string) => void;
  forceSyncOfflineUpdates: () => void;
  clearOfflineQueue: () => void;
  
  // Event listeners
  onUpdate: (callback: (update: LiveContentUpdate) => void) => () => void;
  onBatchUpdate: (callback: (updates: { updates: Record<string, LiveContentUpdate[]>; timestamp: Date; count: number }) => void) => () => void;
  onIndicatorUpdate: (callback: (indicator: ContentUpdateIndicator) => void) => () => void;
  onConnectionChange: (callback: (status: ConnectionStatus) => void) => () => void;
}

/**
 * Main hook for community real-time updates
 */
export function useCommunityRealTimeUpdates(
  options: UseCommunityRealTimeUpdatesOptions = {}
): UseCommunityRealTimeUpdatesReturn {
  const {
    contextId,
    contextType,
    autoSubscribe = true,
    enableIndicators = true,
    batchUpdates = true
  } = options;

  // State
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isOnline: navigator.onLine,
    quality: 'offline',
    reconnectAttempts: 0,
    lastHeartbeat: null,
    queuedUpdates: 0
  });

  const [liveUpdates, setLiveUpdates] = useState<LiveContentUpdate[]>([]);
  const [indicators, setIndicators] = useState<ContentUpdateIndicator[]>([]);
  const [hasNewContent, setHasNewContent] = useState(false);

  // Refs for cleanup
  const listenersRef = useRef<Map<string, Function>>(new Map());
  const mountedRef = useRef(true);

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = communityRealTimeUpdateService.getConnectionStatus();
    if (mountedRef.current) {
      setConnectionStatus(status);
    }
  }, []);

  // Update indicators
  const updateIndicators = useCallback(() => {
    if (!enableIndicators || !mountedRef.current) return;
    
    const currentIndicators = communityRealTimeUpdateService.getIndicators(contextId);
    setIndicators(currentIndicators);
    setHasNewContent(currentIndicators.length > 0);
  }, [contextId, enableIndicators]);

  // Subscribe to context
  const subscribeToContext = useCallback((id: string, type: 'post' | 'community' | 'user') => {
    communityRealTimeUpdateService.subscribeToContext(id, type);
  }, []);

  // Unsubscribe from context
  const unsubscribeFromContext = useCallback((id: string, type: 'post' | 'community' | 'user') => {
    communityRealTimeUpdateService.unsubscribeFromContext(id, type);
  }, []);

  // Dismiss indicator
  const dismissIndicator = useCallback((indicatorId: string) => {
    communityRealTimeUpdateService.dismissIndicator(indicatorId);
    updateIndicators();
  }, [updateIndicators]);

  // Clear indicators
  const clearIndicators = useCallback((id?: string) => {
    communityRealTimeUpdateService.clearIndicators(id);
    updateIndicators();
  }, [updateIndicators]);

  // Force sync offline updates
  const forceSyncOfflineUpdates = useCallback(() => {
    communityRealTimeUpdateService.forceSyncOfflineUpdates();
  }, []);

  // Clear offline queue
  const clearOfflineQueue = useCallback(() => {
    communityRealTimeUpdateService.clearOfflineQueue();
    updateConnectionStatus();
  }, [updateConnectionStatus]);

  // Event listener helpers
  const onUpdate = useCallback((callback: (update: LiveContentUpdate) => void) => {
    communityRealTimeUpdateService.on('update:received', callback);
    listenersRef.current.set('update:received', callback);
    
    return () => {
      communityRealTimeUpdateService.off('update:received', callback);
      listenersRef.current.delete('update:received');
    };
  }, []);

  const onBatchUpdate = useCallback((callback: (updates: any) => void) => {
    if (!batchUpdates) return () => {};
    
    communityRealTimeUpdateService.on('updates:batch', callback);
    listenersRef.current.set('updates:batch', callback);
    
    return () => {
      communityRealTimeUpdateService.off('updates:batch', callback);
      listenersRef.current.delete('updates:batch');
    };
  }, [batchUpdates]);

  const onIndicatorUpdate = useCallback((callback: (indicator: ContentUpdateIndicator) => void) => {
    if (!enableIndicators) return () => {};
    
    communityRealTimeUpdateService.on('indicator:updated', callback);
    listenersRef.current.set('indicator:updated', callback);
    
    return () => {
      communityRealTimeUpdateService.off('indicator:updated', callback);
      listenersRef.current.delete('indicator:updated');
    };
  }, [enableIndicators]);

  const onConnectionChange = useCallback((callback: (status: ConnectionStatus) => void) => {
    communityRealTimeUpdateService.on('connection:status_changed', callback);
    listenersRef.current.set('connection:status_changed', callback);
    
    return () => {
      communityRealTimeUpdateService.off('connection:status_changed', callback);
      listenersRef.current.delete('connection:status_changed');
    };
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Connection status listener
    const handleConnectionChange = (status: ConnectionStatus) => {
      if (mountedRef.current) {
        setConnectionStatus(status);
      }
    };

    // Update listeners
    const handleUpdate = (update: LiveContentUpdate) => {
      if (!mountedRef.current) return;
      
      setLiveUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
    };

    const handleBatchUpdate = (data: any) => {
      if (!mountedRef.current || !batchUpdates) return;
      
      const allUpdates = Object.values(data.updates).flat() as LiveContentUpdate[];
      setLiveUpdates(prev => [...allUpdates, ...prev.slice(0, 50 - allUpdates.length)]);
    };

    // Indicator listeners
    const handleIndicatorUpdate = (indicator: ContentUpdateIndicator) => {
      if (!mountedRef.current || !enableIndicators) return;
      updateIndicators();
    };

    const handleIndicatorDismissed = () => {
      if (!mountedRef.current || !enableIndicators) return;
      updateIndicators();
    };

    const handleIndicatorsCleared = () => {
      if (!mountedRef.current || !enableIndicators) return;
      updateIndicators();
    };

    // Offline/online listeners
    const handleOfflineSync = (data: { count: number }) => {
      console.log(`Synced ${data.count} offline updates`);
      updateConnectionStatus();
    };

    const handleOnline = () => {
      updateConnectionStatus();
    };

    const handleOffline = () => {
      updateConnectionStatus();
    };

    // Register listeners
    communityRealTimeUpdateService.on('connection:status_changed', handleConnectionChange);
    communityRealTimeUpdateService.on('update:received', handleUpdate);
    
    if (batchUpdates) {
      communityRealTimeUpdateService.on('updates:batch', handleBatchUpdate);
    }
    
    if (enableIndicators) {
      communityRealTimeUpdateService.on('indicator:updated', handleIndicatorUpdate);
      communityRealTimeUpdateService.on('indicator:dismissed', handleIndicatorDismissed);
      communityRealTimeUpdateService.on('indicators:cleared', handleIndicatorsCleared);
    }
    
    communityRealTimeUpdateService.on('offline:sync_completed', handleOfflineSync);
    communityRealTimeUpdateService.on('connection:online', handleOnline);
    communityRealTimeUpdateService.on('connection:offline', handleOffline);

    // Initial status update
    updateConnectionStatus();
    if (enableIndicators) {
      updateIndicators();
    }

    return () => {
      // Cleanup listeners
      communityRealTimeUpdateService.off('connection:status_changed', handleConnectionChange);
      communityRealTimeUpdateService.off('update:received', handleUpdate);
      
      if (batchUpdates) {
        communityRealTimeUpdateService.off('updates:batch', handleBatchUpdate);
      }
      
      if (enableIndicators) {
        communityRealTimeUpdateService.off('indicator:updated', handleIndicatorUpdate);
        communityRealTimeUpdateService.off('indicator:dismissed', handleIndicatorDismissed);
        communityRealTimeUpdateService.off('indicators:cleared', handleIndicatorsCleared);
      }
      
      communityRealTimeUpdateService.off('offline:sync_completed', handleOfflineSync);
      communityRealTimeUpdateService.off('connection:online', handleOnline);
      communityRealTimeUpdateService.off('connection:offline', handleOffline);
    };
  }, [batchUpdates, enableIndicators, updateConnectionStatus, updateIndicators]);

  // Auto-subscribe effect
  useEffect(() => {
    if (autoSubscribe && contextId && contextType) {
      subscribeToContext(contextId, contextType);
      
      return () => {
        unsubscribeFromContext(contextId, contextType);
      };
    }
  }, [autoSubscribe, contextId, contextType, subscribeToContext, unsubscribeFromContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Cleanup any remaining listeners
      listenersRef.current.forEach((callback, event) => {
        communityRealTimeUpdateService.off(event, callback);
      });
      listenersRef.current.clear();
    };
  }, []);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    isOnline: connectionStatus.isOnline,
    
    // Updates and indicators
    liveUpdates,
    indicators,
    hasNewContent,
    
    // Actions
    subscribeToContext,
    unsubscribeFromContext,
    dismissIndicator,
    clearIndicators,
    forceSyncOfflineUpdates,
    clearOfflineQueue,
    
    // Event listeners
    onUpdate,
    onBatchUpdate,
    onIndicatorUpdate,
    onConnectionChange
  };
}

/**
 * Hook for post-specific real-time updates
 */
export function usePostRealTimeUpdates(postId: string) {
  const {
    liveUpdates,
    indicators,
    hasNewContent,
    connectionStatus,
    dismissIndicator,
    clearIndicators,
    onUpdate
  } = useCommunityRealTimeUpdates({
    contextId: postId,
    contextType: 'post',
    autoSubscribe: true,
    enableIndicators: true
  });

  // Filter updates for this post
  const postUpdates = liveUpdates.filter(update => update.postId === postId);
  const postIndicators = indicators.filter(indicator => indicator.contextId === postId);

  // Specific update handlers
  const onCommentAdded = useCallback((callback: (comment: any) => void) => {
    return onUpdate((update: LiveContentUpdate) => {
      if (update.type === 'comment_added' && update.postId === postId) {
        callback(update.data);
      }
    });
  }, [onUpdate, postId]);

  const onReactionAdded = useCallback((callback: (reaction: any) => void) => {
    return onUpdate((update: LiveContentUpdate) => {
      if (update.type === 'reaction_added' && update.postId === postId) {
        callback(update.data);
      }
    });
  }, [onUpdate, postId]);

  const onTipReceived = useCallback((callback: (tip: any) => void) => {
    return onUpdate((update: LiveContentUpdate) => {
      if (update.type === 'tip_received' && update.postId === postId) {
        callback(update.data);
      }
    });
  }, [onUpdate, postId]);

  return {
    postUpdates,
    postIndicators,
    hasNewContent,
    connectionStatus,
    dismissIndicator,
    clearIndicators: () => clearIndicators(postId),
    onCommentAdded,
    onReactionAdded,
    onTipReceived
  };
}

/**
 * Hook for community-specific real-time updates
 */
export function useCommunityUpdates(communityId: string) {
  const {
    liveUpdates,
    indicators,
    hasNewContent,
    connectionStatus,
    dismissIndicator,
    clearIndicators,
    onUpdate
  } = useCommunityRealTimeUpdates({
    contextId: communityId,
    contextType: 'community',
    autoSubscribe: true,
    enableIndicators: true
  });

  // Filter updates for this community
  const communityUpdates = liveUpdates.filter(update => update.communityId === communityId);
  const communityIndicators = indicators.filter(indicator => indicator.contextId === communityId);

  // Specific update handlers
  const onPostCreated = useCallback((callback: (post: any) => void) => {
    return onUpdate((update: LiveContentUpdate) => {
      if (update.type === 'post_created' && update.communityId === communityId) {
        callback(update.data);
      }
    });
  }, [onUpdate, communityId]);

  const onPostUpdated = useCallback((callback: (updates: any) => void) => {
    return onUpdate((update: LiveContentUpdate) => {
      if (update.type === 'post_updated' && update.communityId === communityId) {
        callback(update.data);
      }
    });
  }, [onUpdate, communityId]);

  return {
    communityUpdates,
    communityIndicators,
    hasNewContent,
    connectionStatus,
    dismissIndicator,
    clearIndicators: () => clearIndicators(communityId),
    onPostCreated,
    onPostUpdated
  };
}

export default useCommunityRealTimeUpdates;