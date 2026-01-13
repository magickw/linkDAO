/**
 * WebSocket Hook
 * React hook for WebSocket real-time updates
 */

import { useEffect, useRef } from 'react';
import { webSocketService, WebSocketEvent } from '../services';
import { useAuthStore } from '../store';

export function useWebSocket() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token || initialized.current) {
      return;
    }

    // Connect to WebSocket
    webSocketService.connect(token);
    initialized.current = true;

    // Cleanup on unmount
    return () => {
      webSocketService.disconnect();
      initialized.current = false;
    };
  }, [isAuthenticated, token]);

  return {
    isConnected: webSocketService.isConnected(),
    on: webSocketService.on.bind(webSocketService),
    off: webSocketService.off.bind(webSocketService),
    send: webSocketService.send.bind(webSocketService),
    joinRoom: webSocketService.joinRoom.bind(webSocketService),
    leaveRoom: webSocketService.leaveRoom.bind(webSocketService),
  };
}

export type { WebSocketEvent };