import { useState, useEffect, useCallback } from 'react';
import { actionQueue } from '../services/actionQueueService';

interface QueuedAction {
  id: string;
  type: 'post' | 'comment' | 'community_join' | 'community_create' | 'product_create' | 'like' | 'follow';
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
  userId?: string;
}

interface UseActionQueueReturn {
  queue: QueuedAction[];
  queueSize: number;
  isProcessing: boolean;
  addAction: (
    type: QueuedAction['type'],
    data: any,
    options?: {
      priority?: QueuedAction['priority'];
      maxRetries?: number;
      userId?: string;
    }
  ) => Promise<string>;
  removeAction: (id: string) => boolean;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
}

export const useActionQueue = (): UseActionQueueReturn => {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = actionQueue.subscribe((newQueue) => {
      setQueue(newQueue);
    });

    // Initialize with current queue
    setQueue(actionQueue.getQueue());

    return unsubscribe;
  }, []);

  const addAction = useCallback(async (
    type: QueuedAction['type'],
    data: any,
    options: {
      priority?: QueuedAction['priority'];
      maxRetries?: number;
      userId?: string;
    } = {}
  ): Promise<string> => {
    try {
      const actionId = actionQueue.addAction(type, data, options);
      
      // Show user feedback
      if (navigator.onLine) {
        console.log(`Action queued and will be processed: ${type}`);
      } else {
        console.log(`Action queued for when connection returns: ${type}`);
      }
      
      return actionId;
    } catch (error) {
      console.error('Failed to queue action:', error);
      throw error;
    }
  }, []);

  const removeAction = useCallback((id: string): boolean => {
    return actionQueue.removeAction(id);
  }, []);

  const processQueue = useCallback(async (): Promise<void> => {
    setIsProcessing(true);
    try {
      await actionQueue.processQueue();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearQueue = useCallback((): void => {
    actionQueue.clearQueue();
  }, []);

  return {
    queue,
    queueSize: queue.length,
    isProcessing,
    addAction,
    removeAction,
    processQueue,
    clearQueue
  };
};

export default useActionQueue;