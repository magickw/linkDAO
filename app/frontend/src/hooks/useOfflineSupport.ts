/**
 * Offline Support Hook
 * Provides offline functionality and sync capabilities to components
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineManager, OfflineState, QueuedAction } from '../services/OfflineManager';

interface UseOfflineSupportReturn {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  syncInProgress: boolean;
  lastSyncTime?: Date;
  queueAction: (type: string, payload: any, options?: {
    priority?: 'low' | 'medium' | 'high';
    maxRetries?: number;
  }) => string;
  executeOrQueue: <T>(
    type: string,
    executor: () => Promise<T>,
    payload?: any,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ) => Promise<T | null>;
  syncNow: () => Promise<void>;
  clearQueue: () => void;
  removeAction: (actionId: string) => void;
  getQueueStats: () => {
    total: number;
    byPriority: Record<string, number>;
    oldestAction?: Date;
  };
}

export const useOfflineSupport = (): UseOfflineSupportReturn => {
  const [state, setState] = useState<OfflineState>(offlineManager.getState());

  useEffect(() => {
    const unsubscribe = offlineManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const queueAction = useCallback((
    type: string,
    payload: any,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ) => {
    return offlineManager.queueAction(type, payload, options);
  }, []);

  const executeOrQueue = useCallback(async <T>(
    type: string,
    executor: () => Promise<T>,
    payload?: any,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ): Promise<T | null> => {
    return offlineManager.executeOrQueue(type, executor, payload, options);
  }, []);

  const syncNow = useCallback(async () => {
    await offlineManager.syncQueuedActions();
  }, []);

  const clearQueue = useCallback(() => {
    offlineManager.clearQueue();
  }, []);

  const removeAction = useCallback((actionId: string) => {
    offlineManager.removeAction(actionId);
  }, []);

  const getQueueStats = useCallback(() => {
    return offlineManager.getQueueStats();
  }, []);

  return {
    isOnline: state.isOnline,
    queuedActions: state.queuedActions,
    syncInProgress: state.syncInProgress,
    lastSyncTime: state.lastSyncTime,
    queueAction,
    executeOrQueue,
    syncNow,
    clearQueue,
    removeAction,
    getQueueStats
  };
};

// Specialized hooks for different offline scenarios

export const useOfflinePostCreation = () => {
  const { executeOrQueue, queueAction, isOnline } = useOfflineSupport();

  const createPost = useCallback(async (postData: any) => {
    return executeOrQueue(
      'CREATE_POST',
      async () => {
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        if (!response.ok) throw new Error('Failed to create post');
        return response.json();
      },
      postData,
      { priority: 'high' }
    );
  }, [executeOrQueue]);

  return { createPost, isOnline };
};

export const useOfflineReactions = () => {
  const { executeOrQueue, isOnline } = useOfflineSupport();

  const reactToPost = useCallback(async (postId: string, reactionType: string, amount?: number) => {
    return executeOrQueue(
      'REACT_TO_POST',
      async () => {
        const response = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: reactionType, amount })
        });
        if (!response.ok) throw new Error('Failed to react to post');
        return response.json();
      },
      { postId, reactionType, amount },
      { priority: 'medium' }
    );
  }, [executeOrQueue]);

  return { reactToPost, isOnline };
};

export const useOfflineTipping = () => {
  const { executeOrQueue, isOnline } = useOfflineSupport();

  const tipUser = useCallback(async (recipientId: string, amount: number, token: string) => {
    return executeOrQueue(
      'TIP_USER',
      async () => {
        const response = await fetch('/api/tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId, amount, token })
        });
        if (!response.ok) throw new Error('Failed to tip user');
        return response.json();
      },
      { recipientId, amount, token },
      { priority: 'high' }
    );
  }, [executeOrQueue]);

  return { tipUser, isOnline };
};

export const useOfflineProfileUpdate = () => {
  const { executeOrQueue, isOnline } = useOfflineSupport();

  const updateProfile = useCallback(async (profileData: any) => {
    return executeOrQueue(
      'UPDATE_PROFILE',
      async () => {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
      },
      profileData,
      { priority: 'medium' }
    );
  }, [executeOrQueue]);

  return { updateProfile, isOnline };
};

export const useOfflineCommunityActions = () => {
  const { executeOrQueue, isOnline } = useOfflineSupport();

  const joinCommunity = useCallback(async (communityId: string) => {
    return executeOrQueue(
      'JOIN_COMMUNITY',
      async () => {
        const response = await fetch(`/api/communities/${communityId}/join`, {
          method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to join community');
        return response.json();
      },
      { communityId },
      { priority: 'medium' }
    );
  }, [executeOrQueue]);

  const leaveCommunity = useCallback(async (communityId: string) => {
    return executeOrQueue(
      'LEAVE_COMMUNITY',
      async () => {
        const response = await fetch(`/api/communities/${communityId}/leave`, {
          method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to leave community');
        return response.json();
      },
      { communityId },
      { priority: 'low' }
    );
  }, [executeOrQueue]);

  return { joinCommunity, leaveCommunity, isOnline };
};