/**
 * Hook to batch wallet connection state updates
 * Prevents multiple components from updating simultaneously when wallet connects
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface BatchedUpdate {
  id: string;
  update: () => void | Promise<void>;
  priority?: 'high' | 'normal' | 'low';
}

export function useBatchedWalletUpdates() {
  const { isConnected, address } = useAccount();
  const previousConnectionState = useRef({ isConnected: false, address: undefined as string | undefined });
  const updateQueue = useRef<BatchedUpdate[]>([]);
  const isProcessing = useRef(false);
  const batchTimeoutId = useRef<NodeJS.Timeout | null>(null);

  // Register an update to be batched
  const registerUpdate = useCallback((id: string, update: () => void | Promise<void>, priority: 'high' | 'normal' | 'low' = 'normal') => {
    // Remove existing update with same id
    updateQueue.current = updateQueue.current.filter(u => u.id !== id);
    
    // Add new update
    updateQueue.current.push({ id, update, priority });
    
    // Sort by priority
    updateQueue.current.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, []);

  // Process the batched updates
  const processBatch = useCallback(async () => {
    if (isProcessing.current || updateQueue.current.length === 0) {
      return;
    }

    isProcessing.current = true;
    const updates = [...updateQueue.current];
    updateQueue.current = [];

    console.log(`[BatchedUpdates] Processing ${updates.length} batched updates`);

    try {
      // Process updates with requestIdleCallback if available
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        for (const update of updates) {
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            await new Promise<void>((resolve) => {
              window.requestIdleCallback(() => {
                update.update();
                resolve();
              }, { timeout: 100 }); // 100ms timeout
            });
          } else {
            // Fallback for browsers without requestIdleCallback
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                update.update();
                resolve();
              }, 0);
            });
          }
        }
      } else {
        // Fallback: process updates with small delays
        for (const update of updates) {
          update.update();
          // Small delay to prevent blocking
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    } catch (error) {
      console.error('[BatchedUpdates] Error processing batch:', error);
    } finally {
      isProcessing.current = false;
      
      // Process any updates that were added during processing
      if (updateQueue.current.length > 0) {
        batchTimeoutId.current = setTimeout(processBatch, 10);
      }
    }
  }, []);

  // Detect wallet connection changes and trigger batch processing
  useEffect(() => {
    const connectionChanged = 
      previousConnectionState.current.isConnected !== isConnected ||
      previousConnectionState.current.address !== address;

    if (connectionChanged) {
      console.log(`[BatchedUpdates] Wallet connection changed:`, { isConnected, address });
      
      // Cancel any pending batch
      if (batchTimeoutId.current) {
        clearTimeout(batchTimeoutId.current);
      }

      // Schedule new batch with higher priority for connection events
      batchTimeoutId.current = setTimeout(() => {
        processBatch();
      }, isConnected ? 50 : 0); // Slight delay when connecting to allow navigation

      previousConnectionState.current = { isConnected, address: address || '' };
    }
  }, [isConnected, address, processBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutId.current) {
        clearTimeout(batchTimeoutId.current);
      }
    };
  }, []);

  return {
    registerUpdate,
    isProcessing: isProcessing.current,
    pendingUpdates: updateQueue.current.length
  };
}