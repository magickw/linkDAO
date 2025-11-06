import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketContextType {
  // Connection state
  connectionState: {
    status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'polling';
    lastConnected?: Date;
    reconnectAttempts: number;
    error?: string;
    mode?: 'websocket' | 'polling' | 'hybrid' | 'disabled';
    resourceConstrained?: boolean;
  };
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

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  walletAddress: string;
  url?: string;
  autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  walletAddress,
  url,
  autoConnect = true
}) => {
  const webSocket = useWebSocket({
    walletAddress,
    url,
    autoConnect,
    autoReconnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  useEffect(() => {
    setConnectionStatus(webSocket.connectionState.status);
  }, [webSocket.connectionState.status]);

  // Global event handlers for debugging and monitoring
  useEffect(() => {
    if (webSocket.isConnected) {
      const handleGlobalEvent = (eventName: string) => (data: any) => {
        console.log(`WebSocket Event [${eventName}]:`, data);
      };

      // Set up global event listeners for debugging
      const events = [
        'feed_update',
        'community_post',
        'community_update',
        'new_message',
        'reaction_update',
        'tip_received',
        'notification',
        'user_status_update',
        'user_typing',
        'user_stopped_typing'
      ];

      events.forEach(event => {
        webSocket.on(event, handleGlobalEvent(event));
      });

      return () => {
        events.forEach(event => {
          webSocket.off(event, handleGlobalEvent(event));
        });
      };
    }
  }, [webSocket.isConnected]);

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
      {/* Connection status indicator */}
      <ConnectionStatusIndicator 
        status={connectionStatus}
        reconnectAttempts={webSocket.connectionState.reconnectAttempts}
        error={webSocket.connectionState.error}
      />
    </WebSocketContext.Provider>
  );
};

// Connection status indicator component
const ConnectionStatusIndicator: React.FC<{
  status: string;
  reconnectAttempts: number;
  error?: string;
}> = ({ status, reconnectAttempts, error }) => {
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Show indicator for non-connected states
    setShowIndicator(status !== 'connected');
  }, [status]);

  if (!showIndicator) return null;

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'reconnecting': return 'bg-orange-500';
      case 'polling': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return `Reconnecting... (${reconnectAttempts}/5)`;
      case 'polling': return 'Polling Mode';
      case 'error': return `Connection Error${error ? `: ${error}` : ''}`;
      default: return 'Disconnected';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${getStatusColor()} shadow-lg`}>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${status === 'connecting' || status === 'reconnecting' || status === 'polling' ? 'animate-pulse' : ''} bg-white`} />
          <span>{getStatusText()}</span>
        </div>
      </div>
    </div>
  );
};

export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

// Higher-order component for WebSocket functionality
export const withWebSocket = <P extends object>(
  Component: React.ComponentType<P & { webSocket: WebSocketContextType }>
) => {
  return (props: P) => {
    const webSocket = useWebSocketContext();
    return <Component {...props} webSocket={webSocket} />;
  };
};

export default WebSocketContext;