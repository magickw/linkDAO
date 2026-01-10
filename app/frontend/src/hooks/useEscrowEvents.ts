/**
 * useEscrowEvents Hook
 * React hook for subscribing to escrow blockchain events
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import {
  EscrowEventListener,
  EscrowEventData,
  EventListenerCallbacks,
  createEscrowEventListener
} from '../services/escrowEventListener';
import { useToast } from '../context/ToastContext';

interface UseEscrowEventsOptions {
  /**
   * Enable/disable the event listener
   */
  enabled?: boolean;
  /**
   * Whether to sync events with backend
   */
  syncWithBackend?: boolean;
  /**
   * Filter events by escrow ID
   */
  escrowId?: bigint;
  /**
   * Custom callbacks for specific events
   */
  callbacks?: EventListenerCallbacks;
}

interface UseEscrowEventsResult {
  /**
   * Whether the listener is active
   */
  isListening: boolean;
  /**
   * Recent events (most recent first)
   */
  recentEvents: EscrowEventData[];
  /**
   * Start the listener
   */
  startListening: () => Promise<void>;
  /**
   * Stop the listener
   */
  stopListening: () => void;
  /**
   * Get historical events for an escrow
   */
  getEscrowHistory: (escrowId: bigint, fromBlock?: bigint) => Promise<EscrowEventData[]>;
  /**
   * Clear recent events
   */
  clearEvents: () => void;
  /**
   * Any error that occurred
   */
  error: Error | null;
}

const MAX_RECENT_EVENTS = 100;

export function useEscrowEvents(options: UseEscrowEventsOptions = {}): UseEscrowEventsResult {
  const {
    enabled = true,
    syncWithBackend = true,
    escrowId,
    callbacks: externalCallbacks
  } = options;

  const publicClient = usePublicClient();
  const { addToast } = useToast();

  const [isListening, setIsListening] = useState(false);
  const [recentEvents, setRecentEvents] = useState<EscrowEventData[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const listenerRef = useRef<EscrowEventListener | null>(null);

  // Add event to recent events list
  const addEvent = useCallback((event: EscrowEventData) => {
    // If escrowId filter is set, only add matching events
    if (escrowId !== undefined && event.escrowId !== escrowId) {
      return;
    }

    setRecentEvents((prev) => {
      const updated = [event, ...prev];
      // Keep only the most recent events
      return updated.slice(0, MAX_RECENT_EVENTS);
    });
  }, [escrowId]);

  // Combined callbacks
  const callbacks: EventListenerCallbacks = {
    onEscrowCreated: (data) => {
      addEvent(data);
      addToast('New escrow created', 'info');
      externalCallbacks?.onEscrowCreated?.(data);
    },
    onFundsLocked: (data) => {
      addEvent(data);
      addToast('Funds locked in escrow', 'info');
      externalCallbacks?.onFundsLocked?.(data);
    },
    onNFTDeposited: (data) => {
      addEvent(data);
      addToast('NFT deposited to escrow', 'info');
      externalCallbacks?.onNFTDeposited?.(data);
    },
    onReadyForRelease: (data) => {
      addEvent(data);
      addToast('Escrow ready for release', 'success');
      externalCallbacks?.onReadyForRelease?.(data);
    },
    onDeliveryConfirmed: (data) => {
      addEvent(data);
      addToast('Delivery confirmed - Transaction complete!', 'success');
      externalCallbacks?.onDeliveryConfirmed?.(data);
    },
    onDisputeOpened: (data) => {
      addEvent(data);
      addToast('Dispute opened on escrow', 'warning');
      externalCallbacks?.onDisputeOpened?.(data);
    },
    onEscrowResolved: (data) => {
      addEvent(data);
      addToast('Escrow dispute resolved', 'info');
      externalCallbacks?.onEscrowResolved?.(data);
    },
    onDeadlineRefund: (data) => {
      addEvent(data);
      addToast('Deadline refund processed', 'info');
      externalCallbacks?.onDeadlineRefund?.(data);
    },
    onNFTTransferred: (data) => {
      addEvent(data);
      externalCallbacks?.onNFTTransferred?.(data);
    },
    onAnyEvent: (data) => {
      externalCallbacks?.onAnyEvent?.(data);
    },
    onError: (err) => {
      setError(err);
      console.error('Escrow event listener error:', err);
      externalCallbacks?.onError?.(err);
    },
  };

  // Start listening
  const startListening = useCallback(async () => {
    if (!publicClient || listenerRef.current?.isActive()) {
      return;
    }

    try {
      setError(null);
      const listener = await createEscrowEventListener(publicClient, callbacks);
      listener.setBackendSyncEnabled(syncWithBackend);
      listenerRef.current = listener;
      setIsListening(true);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to start escrow event listener:', err);
    }
  }, [publicClient, syncWithBackend]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.stopListening();
      listenerRef.current = null;
      setIsListening(false);
    }
  }, []);

  // Get historical events
  const getEscrowHistory = useCallback(async (targetEscrowId: bigint, fromBlock?: bigint): Promise<EscrowEventData[]> => {
    if (!publicClient) {
      return [];
    }

    // Use existing listener or create temporary one
    if (listenerRef.current) {
      return listenerRef.current.getEscrowHistory(targetEscrowId, fromBlock);
    }

    // Create temporary listener just for history
    const tempListener = new EscrowEventListener(publicClient, {});
    return tempListener.getEscrowHistory(targetEscrowId, fromBlock);
  }, [publicClient]);

  // Clear events
  const clearEvents = useCallback(() => {
    setRecentEvents([]);
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && publicClient) {
      startListening();
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [enabled, publicClient]);

  return {
    isListening,
    recentEvents,
    startListening,
    stopListening,
    getEscrowHistory,
    clearEvents,
    error,
  };
}

/**
 * Hook for watching a specific escrow's events
 */
export function useEscrowStatus(escrowId: bigint | undefined) {
  const [status, setStatus] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<EscrowEventData | null>(null);

  const callbacks: EventListenerCallbacks = {
    onAnyEvent: (data) => {
      if (escrowId && data.escrowId === escrowId) {
        setLastEvent(data);
        // Update status based on event
        switch (data.eventType) {
          case 'EscrowCreated':
            setStatus('created');
            break;
          case 'FundsLocked':
            setStatus('funds_locked');
            break;
          case 'NFTDeposited':
            setStatus('nft_deposited');
            break;
          case 'EscrowReadyForRelease':
            setStatus('ready_for_release');
            break;
          case 'DeliveryConfirmed':
            setStatus('completed');
            break;
          case 'DisputeOpened':
            setStatus('disputed');
            break;
          case 'EscrowResolved':
            setStatus('resolved');
            break;
          case 'DeadlineRefund':
            setStatus('cancelled');
            break;
        }
      }
    },
  };

  const { isListening, error } = useEscrowEvents({
    enabled: !!escrowId,
    escrowId,
    callbacks,
  });

  return {
    status,
    lastEvent,
    isListening,
    error,
  };
}
