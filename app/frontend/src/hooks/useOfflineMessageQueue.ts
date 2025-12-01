import { useState, useEffect, useCallback } from 'react';
import { OfflineMessageQueueService } from '../services/offlineMessageQueueService';
import { MessageQueue, OfflineAction } from '../types/messaging';

interface UseOfflineMessageQueueReturn {
  isOnline: boolean;
  syncInProgress: boolean;
  queueStats: {
    pendingMessages: number;
    sendingMessages: number;
    failedMessages: number;
    offlineActions: number;
  };
  queueMessage: (
    conversationId: string,
    content: string,
    contentType?: 'text' | 'image' | 'file' | 'post_share'
  ) => Promise<string>;
  queueAction: (action: Omit<OfflineAction, 'id'>) => Promise<string>;
  getPendingMessages: (conversationId: string) => Promise<MessageQueue[]>;
  retryFailedMessage: (failedMessageId: string) => Promise<boolean>;
  clearQueue: () => Promise<void>;
  forceSync: () => Promise<void>;
  getFailedMessages: () => Promise<any[]>;
}

export const useOfflineMessageQueue = (): UseOfflineMessageQueueReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [queueStats, setQueueStats] = useState({
    pendingMessages: 0,
    sendingMessages: 0,
    failedMessages: 0,
    offlineActions: 0,
  });

  const queueService = OfflineMessageQueueService.getInstance();

  // Update stats
  const updateStats = useCallback(async () => {
    try {
      const stats = await queueService.getQueueStats();
      setQueueStats(stats);
      
      const networkStatus = queueService.getNetworkStatus();
      setSyncInProgress(networkStatus.syncInProgress);
    } catch (error) {
      console.error('Failed to update queue stats:', error);
    }
  }, [queueService]);

  // Setup network listeners and periodic updates
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
  }, [updateStats]);

  // Queue a message
  const queueMessage = useCallback(async (
    conversationId: string,
    content: string,
    contentType: 'text' | 'image' | 'file' | 'post_share' = 'text'
  ): Promise<string> => {
    try {
      const messageId = await queueService.queueMessage(conversationId, content, contentType);
      await updateStats();
      return messageId;
    } catch (error) {
      console.error('Failed to queue message:', error);
      throw error;
    }
  }, [queueService, updateStats]);

  // Queue an offline action
  const queueAction = useCallback(async (action: Omit<OfflineAction, 'id'>): Promise<string> => {
    try {
      const actionId = await queueService.queueOfflineAction(action);
      await updateStats();
      return actionId;
    } catch (error) {
      console.error('Failed to queue action:', error);
      throw error;
    }
  }, [queueService, updateStats]);

  // Get pending messages for a conversation
  const getPendingMessages = useCallback(async (conversationId: string): Promise<MessageQueue[]> => {
    try {
      return await queueService.getPendingMessages(conversationId);
    } catch (error) {
      console.error('Failed to get pending messages:', error);
      return [];
    }
  }, [queueService]);

  // Retry a failed message
  const retryFailedMessage = useCallback(async (failedMessageId: string): Promise<boolean> => {
    try {
      const success = await queueService.retryFailedMessage(failedMessageId);
      await updateStats();
      return success;
    } catch (error) {
      console.error('Failed to retry message:', error);
      return false;
    }
  }, [queueService, updateStats]);

  // Clear all queues
  const clearQueue = useCallback(async (): Promise<void> => {
    try {
      await queueService.clearAllQueues();
      await updateStats();
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }, [queueService, updateStats]);

  // Force sync
  const forceSync = useCallback(async (): Promise<void> => {
    try {
      await queueService.forceSync();
      await updateStats();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  }, [queueService, updateStats]);

  // Get failed messages
  const getFailedMessages = useCallback(async (): Promise<any[]> => {
    try {
      return await queueService.getFailedMessages();
    } catch (error) {
      console.error('Failed to get failed messages:', error);
      return [];
    }
  }, [queueService]);

  return {
    isOnline,
    syncInProgress,
    queueStats,
    queueMessage,
    queueAction,
    getPendingMessages,
    retryFailedMessage,
    clearQueue,
    forceSync,
    getFailedMessages,
  };
};