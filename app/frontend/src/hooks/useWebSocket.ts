import { useState, useEffect, useCallback } from 'react';
import { webSocketService } from '@/services/webSocketService';
import { useWeb3 } from '@/context/Web3Context';

export const useWebSocket = () => {
  const { address } = useWeb3();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    try {
      webSocketService.connect();
      
      // Register event listeners
      webSocketService.on('connected', () => {
        setIsConnected(true);
        setError(null);
        
        // Register user address if available
        if (address) {
          webSocketService.register(address);
        }
      });
      
      webSocketService.on('disconnected', () => {
        setIsConnected(false);
      });
      
      webSocketService.on('error', (err: string) => {
        setError(err);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to WebSocket server');
    }

    // Cleanup on unmount
    return () => {
      webSocketService.off('connected', () => {});
      webSocketService.off('disconnected', () => {});
      webSocketService.off('error', () => {});
      webSocketService.disconnect();
    };
  }, []);

  // Re-register when address changes
  useEffect(() => {
    if (isConnected && address) {
      webSocketService.register(address);
    }
  }, [address, isConnected]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (isConnected) {
      webSocketService.send(event, data);
    } else {
      setError('Not connected to WebSocket server');
    }
  }, [isConnected]);

  return { isConnected, error, sendMessage };
};