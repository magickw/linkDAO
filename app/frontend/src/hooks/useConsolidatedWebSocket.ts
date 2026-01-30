/**
 * Consolidated WebSocket Hook
 * Ensures a single WebSocket connection is used across the application
 * Prevents duplicate connections and manages all real-time events from one place
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { ENV_CONFIG } from '@/config/environment';

// WebSocket connection states
type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// Reconnection configuration
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const CONNECTION_LOCK_TIMEOUT = 5000; // Prevent rapid reconnections

// Singleton socket instance
let globalSocket: Socket | null = null;
let connectionRefCount = 0;
let connectionState: ConnectionState = 'disconnected';
const connectionCallbacks: Array<(state: ConnectionState) => void> = [];
const eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

interface UseConsolidatedWebSocketOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Consolidated WebSocket Hook
 * Provides a single, shared WebSocket connection across the entire application
 */
export function useConsolidatedWebSocket(options: UseConsolidatedWebSocketOptions = {}) {
  const { enabled = true, onConnect, onDisconnect, onError } = options;
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const connectionLockRef = useRef<boolean>(false);
  const lastConnectionAttemptRef = useRef<number>(0);
  const localCallbackRef = useRef<((state: ConnectionState) => void) | null>(null);

  // Update local connection state and notify callbacks
  const updateConnectionState = useCallback((state: ConnectionState) => {
    connectionState = state;
    connectionCallbacks.forEach(callback => callback(state));
  }, []);

  // Add event listener
  const addEventListener = useCallback(<T extends (...args: any[]) => void>(
    event: string,
    listener: T
  ): (() => void) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    
    const listeners = eventListeners.get(event)!;
    listeners.push(listener);
    
    // If we're already connected, subscribe to the event
    if (globalSocket?.connected) {
      globalSocket.on(event, listener);
    }
    
    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      
      // Remove event listener from socket if no more listeners
      if (listeners.length === 0 && globalSocket) {
        globalSocket.off(event, listener);
      }
    };
  }, []);

  // Emit event
  const emit = useCallback((event: string, ...args: any[]) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, ...args);
    } else {
      console.warn(`Cannot emit event '${event}' - WebSocket not connected`);
    }
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (!address || !isAuthenticated || !enabled) return;

    // Prevent rapid reconnection attempts using a lock and time check
    const now = Date.now();
    if (connectionLockRef.current) {
      return; // Another connection attempt is in progress
    }

    // Enforce minimum time between connection attempts
    if (now - lastConnectionAttemptRef.current < CONNECTION_LOCK_TIMEOUT) {
      return;
    }

    // Don't reconnect if already connected or connecting
    if (globalSocket?.connected) {
      return;
    }

    // Check if we've exceeded max reconnection attempts
    if (connectionState === 'failed') {
      return; // Already gave up, don't retry
    }

    // Acquire connection lock
    connectionLockRef.current = true;
    lastConnectionAttemptRef.current = now;
    updateConnectionState('connecting');

    try {
      globalSocket = io(ENV_CONFIG.WS_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        auth: {
          address,
          type: 'consolidated'
        },
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: INITIAL_RECONNECT_DELAY,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
        timeout: 30000
      });

      globalSocket.on('connect', () => {
        console.log('[ConsolidatedWebSocket] Socket.IO connected:', globalSocket?.id);
        updateConnectionState('connected');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
        connectionLockRef.current = false;

        // Subscribe to notification events for this user
        globalSocket?.emit('subscribe', {
          channel: 'notifications',
          address: address,
        });

        // Attach all existing event listeners
        eventListeners.forEach((listeners, event) => {
          listeners.forEach(listener => {
            globalSocket?.on(event, listener);
          });
        });

        // Notify connection callback
        onConnect?.();
      });

      globalSocket.on('connect_error', (error) => {
        console.error('[ConsolidatedWebSocket] Socket.IO connection error:', error.message);
        connectionLockRef.current = false;

        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          updateConnectionState('failed');
        } else {
          updateConnectionState('reconnecting');
        }
        
        onError?.(error);
      });

      globalSocket.on('disconnect', (reason) => {
        console.log('[ConsolidatedWebSocket] Socket.IO disconnected:', reason);
        updateConnectionState('disconnected');
        connectionLockRef.current = false;
        onDisconnect?.(reason);
      });

      globalSocket.on('reconnect', (attemptNumber) => {
        console.log('[ConsolidatedWebSocket] Socket.IO reconnected after', attemptNumber, 'attempts');
        updateConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      });

      globalSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('[ConsolidatedWebSocket] Socket.IO reconnect attempt:', attemptNumber);
        updateConnectionState('reconnecting');
      });

      globalSocket.on('reconnect_failed', () => {
        console.error('[ConsolidatedWebSocket] Socket.IO reconnection failed');
        updateConnectionState('failed');
        connectionLockRef.current = false;
      });

    } catch (error) {
      console.error('[ConsolidatedWebSocket] Failed to create Socket.IO connection:', error);
      updateConnectionState('disconnected');
      connectionLockRef.current = false;
      onError?.(error as Error);
    }
  }, [address, isAuthenticated, enabled, updateConnectionState, onConnect, onDisconnect, onError]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (globalSocket) {
      globalSocket.disconnect();
      globalSocket = null;
    }

    reconnectAttemptsRef.current = 0; // Reset attempts on manual disconnect
    connectionLockRef.current = false; // Release lock
    updateConnectionState('disconnected');
  }, [updateConnectionState]);

  // Manage connection reference counting
  useEffect(() => {
    if (!enabled) return;

    // Increment reference count
    connectionRefCount++;
    console.log(`[ConsolidatedWebSocket] Connection reference count: ${connectionRefCount}`);

    // Register local callback
    localCallbackRef.current = (state: ConnectionState) => {
      // This will be called when connection state changes
    };
    connectionCallbacks.push(localCallbackRef.current);

    // Connect if this is the first reference
    if (connectionRefCount === 1) {
      connectWebSocket();
    }

    return () => {
      // Decrement reference count
      connectionRefCount--;
      console.log(`[ConsolidatedWebSocket] Connection reference count: ${connectionRefCount}`);

      // Remove local callback
      if (localCallbackRef.current) {
        const index = connectionCallbacks.indexOf(localCallbackRef.current);
        if (index > -1) {
          connectionCallbacks.splice(index, 1);
        }
        localCallbackRef.current = null;
      }

      // Disconnect if no more references
      if (connectionRefCount <= 0) {
        disconnectWebSocket();
        connectionRefCount = 0;
      }
    };
  }, [enabled, connectWebSocket, disconnectWebSocket]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (enabled && isConnected && isAuthenticated && address) {
      // Small delay to prevent race conditions during initial load
      const connectTimeout = setTimeout(() => {
        connectWebSocket();
      }, 100);

      return () => {
        clearTimeout(connectTimeout);
      };
    } else if (!enabled || !isConnected || !isAuthenticated) {
      // Disconnect when auth state becomes invalid
      if (connectionRefCount > 0) {
        connectionRefCount = 0;
        disconnectWebSocket();
      }
    }
  }, [enabled, isConnected, isAuthenticated, address, connectWebSocket, disconnectWebSocket]);

  return {
    socket: globalSocket,
    connectionState,
    isConnected: connectionState === 'connected',
    addEventListener,
    emit,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket
  };
}

/**
 * Hook for listening to specific WebSocket events
 */
export function useWebSocketEvent<T extends (...args: any[]) => void>(
  event: string,
  listener: T,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const { addEventListener } = useConsolidatedWebSocket();

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = addEventListener(event, listener);
    return unsubscribe;
  }, [event, listener, enabled, addEventListener]);
}

export default useConsolidatedWebSocket;