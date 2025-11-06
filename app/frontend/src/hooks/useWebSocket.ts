import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketClientService, initializeWebSocketClient, getWebSocketClient } from '../services/webSocketClientService';
import { webSocketConnectionManager, WebSocketConnectionManager } from '../services/webSocketConnectionManager';
import { ENV_CONFIG } from '../config/environment';

interface UseWebSocketConfig {
  url?: string;
  walletAddress: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'polling';
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
  mode?: 'websocket' | 'polling' | 'hybrid' | 'disabled';
  resourceConstrained?: boolean;
}

interface WebSocketHookReturn {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  isRealTimeAvailable: boolean;
  socket?: any; // Raw socket access (deprecated, use methods instead)
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => void;
  forceReconnect: () => void;
  
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
  getRecommendedUpdateInterval: () => number;
}

export const useWebSocket = (config: UseWebSocketConfig): WebSocketHookReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    reconnectAttempts: 0,
    mode: 'websocket',
    resourceConstrained: false
  });
  
  const serviceRef = useRef<WebSocketClientService | null>(null);
  const managerRef = useRef<WebSocketConnectionManager>(webSocketConnectionManager);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Initialize WebSocket service and connection manager
  useEffect(() => {
    // Use environment config for consistent URL handling
    const backendUrl = ENV_CONFIG.BACKEND_URL || 'http://localhost:10000';
    const wsUrl = backendUrl.replace(/^http/, 'ws');
    
    const wsConfig = {
      url: config.url || ENV_CONFIG.WS_URL,
      walletAddress: config.walletAddress,
      autoReconnect: config.autoReconnect ?? true,
      reconnectAttempts: config.reconnectAttempts ?? 10,
      reconnectDelay: config.reconnectDelay ?? 1000
    };

    serviceRef.current = initializeWebSocketClient(wsConfig);

    // Set up connection state listeners for both service and manager
    const handleConnectionStateChange = (state: any) => {
      setConnectionState(prevState => ({
        ...prevState,
        ...state,
        status: state.status || prevState.status
      }));
    };

    const handleConnectionModeChange = (data: { mode: string }) => {
      setConnectionState(prevState => ({
        ...prevState,
        mode: data.mode as any,
        status: data.mode === 'websocket' ? 'connected' : 
                data.mode === 'polling' ? 'polling' : 'disconnected'
      }));
    };

    serviceRef.current.on('connection_state_changed', handleConnectionStateChange);
    managerRef.current.on('connection_mode_changed', handleConnectionModeChange);

    // Auto-connect if enabled
    if (config.autoConnect !== false) {
      managerRef.current.connect().catch(console.error);
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.off('connection_state_changed', handleConnectionStateChange);
        serviceRef.current.disconnect();
      }
      managerRef.current.off('connection_mode_changed', handleConnectionModeChange);
    };
  }, [config.walletAddress, config.url, config.autoConnect, config.autoReconnect, config.reconnectAttempts, config.reconnectDelay]);

  // Connection methods
  const connect = useCallback(async () => {
    await managerRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    managerRef.current.disconnect();
  }, []);

  const forceReconnect = useCallback(() => {
    managerRef.current.forceReconnect();
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
    // Listen on both service and manager for comprehensive coverage
    if (serviceRef.current) {
      serviceRef.current.on(event, callback);
    }
    managerRef.current.on(event, callback);
    listenersRef.current.set(`${event}_${callback.toString()}`, callback);
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    if (serviceRef.current) {
      serviceRef.current.off(event, callback);
    }
    managerRef.current.off(event, callback);
    listenersRef.current.delete(`${event}_${callback.toString()}`);
  }, []);

  // Utility methods
  const send = useCallback((event: string, data: any, priority?: 'low' | 'medium' | 'high' | 'urgent') => {
    managerRef.current.send(event, data);
  }, []);

  const getQueuedMessageCount = useCallback((): number => {
    return serviceRef.current?.getQueuedMessageCount() || 0;
  }, []);

  const getRecommendedUpdateInterval = useCallback((): number => {
    return managerRef.current.getRecommendedUpdateInterval();
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
    isConnected: connectionState.status === 'connected' || connectionState.status === 'polling',
    isRealTimeAvailable: managerRef.current.isRealTimeAvailable(),
    socket: serviceRef.current?.getSocket(),
    connect,
    disconnect,
    forceReconnect,
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
    getQueuedMessageCount,
    getRecommendedUpdateInterval
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