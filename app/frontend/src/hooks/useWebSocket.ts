import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketClientService, initializeWebSocketClient, getWebSocketClient } from '../services/webSocketClientService';

interface UseWebSocketConfig {
  url?: string;
  walletAddress: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

interface WebSocketHookReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Subscription methods
  subscribe: (type: 'feed' | 'community' | 'conversation' | 'user' | 'global', target: string, filters?: any) => string;
  unsubscribe: (subscriptionId: string) => void;
  
  // Legacy room methods
  joinCommunity: (communityId: string) => void;
  leaveCommunity: (communityId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // Event listeners
  on: (event: string, callback: Function) => void;
  off: (event: string, callback: Function) => void;
  
  // Utility
  send: (event: string, data: any, priority?: 'low' | 'medium' | 'high' | 'urgent') => void;
  getQueuedMessageCount: () => number;
}

export const useWebSocket = (config: UseWebSocketConfig): WebSocketHookReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  
  const serviceRef = useRef<WebSocketClientService | null>(null);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Initialize WebSocket service
  useEffect(() => {
    const wsConfig = {
      url: config.url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:10000',
      walletAddress: config.walletAddress,
      autoReconnect: config.autoReconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000
    };

    serviceRef.current = initializeWebSocketClient(wsConfig);

    // Set up connection state listener
    const handleConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
    };

    serviceRef.current.on('connection_state_changed', handleConnectionStateChange);

    // Auto-connect if enabled
    if (config.autoConnect !== false) {
      serviceRef.current.connect().catch(console.error);
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.off('connection_state_changed', handleConnectionStateChange);
        serviceRef.current.disconnect();
      }
    };
  }, [config.walletAddress, config.url, config.autoConnect, config.autoReconnect, config.reconnectAttempts, config.reconnectDelay]);

  // Connection methods
  const connect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, []);

  // Subscription methods
  const subscribe = useCallback((
    type: 'feed' | 'community' | 'conversation' | 'user' | 'global',
    target: string,
    filters?: any
  ): string => {
    if (serviceRef.current) {
      return serviceRef.current.subscribe(type, target, filters);
    }
    return '';
  }, []);

  const unsubscribe = useCallback((subscriptionId: string) => {
    if (serviceRef.current) {
      serviceRef.current.unsubscribe(subscriptionId);
    }
  }, []);

  // Legacy room methods
  const joinCommunity = useCallback((communityId: string) => {
    if (serviceRef.current) {
      serviceRef.current.joinCommunity(communityId);
    }
  }, []);

  const leaveCommunity = useCallback((communityId: string) => {
    if (serviceRef.current) {
      serviceRef.current.leaveCommunity(communityId);
    }
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.joinConversation(conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.leaveConversation(conversationId);
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.startTyping(conversationId);
    }
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.stopTyping(conversationId);
    }
  }, []);

  // Event listeners
  const on = useCallback((event: string, callback: Function) => {
    if (serviceRef.current) {
      serviceRef.current.on(event, callback);
      listenersRef.current.set(`${event}_${callback.toString()}`, callback);
    }
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    if (serviceRef.current) {
      serviceRef.current.off(event, callback);
      listenersRef.current.delete(`${event}_${callback.toString()}`);
    }
  }, []);

  // Utility methods
  const send = useCallback((event: string, data: any, priority?: 'low' | 'medium' | 'high' | 'urgent') => {
    if (serviceRef.current) {
      serviceRef.current.send(event, data, priority);
    }
  }, []);

  const getQueuedMessageCount = useCallback((): number => {
    return serviceRef.current?.getQueuedMessageCount() || 0;
  }, []);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((callback, key) => {
        const [event] = key.split('_');
        if (serviceRef.current) {
          serviceRef.current.off(event, callback);
        }
      });
      listenersRef.current.clear();
    };
  }, []);

  return {
    connectionState,
    isConnected: connectionState.status === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    joinCommunity,
    leaveCommunity,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    on,
    off,
    send,
    getQueuedMessageCount
  };
};

// Specialized hooks for common use cases
export const useFeedUpdates = (walletAddress: string) => {
  const webSocket = useWebSocket({ walletAddress });
  const [feedUpdates, setFeedUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (webSocket.isConnected) {
      const subscriptionId = webSocket.subscribe('feed', 'global');

      const handleFeedUpdate = (data: any) => {
        setFeedUpdates(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 updates
      };

      webSocket.on('feed_update', handleFeedUpdate);

      return () => {
        webSocket.off('feed_update', handleFeedUpdate);
        webSocket.unsubscribe(subscriptionId);
      };
    }
  }, [webSocket.isConnected]);

  return { feedUpdates, ...webSocket };
};

export const useCommunityUpdates = (walletAddress: string, communityId: string) => {
  const webSocket = useWebSocket({ walletAddress });
  const [communityUpdates, setCommunityUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (webSocket.isConnected && communityId) {
      const subscriptionId = webSocket.subscribe('community', communityId);

      const handleCommunityUpdate = (data: any) => {
        setCommunityUpdates(prev => [data, ...prev.slice(0, 49)]);
      };

      webSocket.on('community_post', handleCommunityUpdate);
      webSocket.on('community_update', handleCommunityUpdate);

      return () => {
        webSocket.off('community_post', handleCommunityUpdate);
        webSocket.off('community_update', handleCommunityUpdate);
        webSocket.unsubscribe(subscriptionId);
      };
    }
  }, [webSocket.isConnected, communityId]);

  return { communityUpdates, ...webSocket };
};

export const useConversationUpdates = (walletAddress: string, conversationId: string) => {
  const webSocket = useWebSocket({ walletAddress });
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (webSocket.isConnected && conversationId) {
      const subscriptionId = webSocket.subscribe('conversation', conversationId);

      const handleNewMessage = (data: any) => {
        setMessages(prev => [...prev, data]);
      };

      const handleUserTyping = (data: any) => {
        setTypingUsers(prev => new Set([...prev, data.userAddress]));
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.userAddress);
            return newSet;
          });
        }, 3000);
      };

      const handleUserStoppedTyping = (data: any) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userAddress);
          return newSet;
        });
      };

      webSocket.on('new_message', handleNewMessage);
      webSocket.on('user_typing', handleUserTyping);
      webSocket.on('user_stopped_typing', handleUserStoppedTyping);

      return () => {
        webSocket.off('new_message', handleNewMessage);
        webSocket.off('user_typing', handleUserTyping);
        webSocket.off('user_stopped_typing', handleUserStoppedTyping);
        webSocket.unsubscribe(subscriptionId);
      };
    }
  }, [webSocket.isConnected, conversationId]);

  return { 
    messages, 
    typingUsers: Array.from(typingUsers),
    ...webSocket 
  };
};

export default useWebSocket;