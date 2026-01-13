import { webSocketManager, initializeWebSocketManager } from '@/services/webSocketManager';
import { getAccount as wagmiGetAccount } from '@wagmi/core';
import { config } from '@/lib/rainbowkit';

// Global flag to prevent multiple initializations
let isInitializing = false;
let isInitialized = false;

/**
 * Safe wrapper for wagmi getAccount to prevent connector errors
 */
function safeGetAccount() {
  try {
    if (!config || !config.connectors || config.connectors.length === 0) {
      return { isConnected: false, connector: null, address: undefined };
    }
    return wagmiGetAccount(config);
  } catch (error) {
    console.warn('Error getting account from wagmi:', error);
    return { isConnected: false, connector: null, address: undefined };
  }
}

/**
 * Initialize WebSocket connections with proper error handling
 * This should be called once during app startup
 */
export const initializeWebSockets = async (): Promise<boolean> => {
  // Prevent multiple concurrent initializations
  if (isInitializing) {
    console.log('WebSocket initialization already in progress, waiting...');
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isInitialized;
  }

  // Return early if already initialized
  if (isInitialized) {
    console.log('WebSocketManager already initialized');
    return true;
  }

  try {
    isInitializing = true;
    console.log('Starting WebSocket initialization...');

    // Get wallet address from wagmi
    const account = safeGetAccount();
    const walletAddress = account.address || '';

    // Initialize WebSocketManager
    await initializeWebSocketManager(walletAddress);

    isInitialized = true;
    console.log('WebSocketManager initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize WebSocketManager:', error);
    isInitialized = false;
    return false;
  } finally {
    isInitializing = false;
  }
};

/**
 * Get the initialized WebSocketManager instance
 * Returns null if not yet initialized
 */
export const getWebSocketManager = (): typeof webSocketManager | null => {
  return isInitialized ? webSocketManager : null;
};

/**
 * Check if WebSocketManager is initialized
 */
export const isWebSocketManagerInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Shutdown WebSocket connections
 * Should be called during app cleanup
 */
export const shutdownWebSockets = (): void => {
  if (isInitialized) {
    console.log('Shutting down WebSocket connections...');
    webSocketManager.shutdown();
    isInitialized = false;
    isInitializing = false;
  }
};

/**
 * Reconnect WebSocket connections
 * Useful for handling network interruptions
 */
export const reconnectWebSockets = async (): Promise<void> => {
  if (!isInitialized) {
    console.warn('Cannot reconnect: WebSocketManager not initialized');
    return;
  }

  try {
    console.log('Reconnecting WebSocket connections...');
    await webSocketManager.reconnectPrimary();
    webSocketManager.reconnectLiveChat();
    console.log('WebSocket reconnection completed');
  } catch (error) {
    console.error('Failed to reconnect WebSockets:', error);
  }
};

// Export types for convenience
export type { WebSocketManager } from '@/services/webSocketManager';