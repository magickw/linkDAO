import React, { createContext, useContext, ReactNode } from 'react';
import { useSellerWebSocket } from '../hooks/useSellerWebSocket';
import type { UseSellerWebSocketReturn } from '../hooks/useSellerWebSocket';

interface SellerWebSocketContextType extends UseSellerWebSocketReturn {
  // Additional context-specific methods can be added here
}

const SellerWebSocketContext = createContext<SellerWebSocketContextType | null>(null);

interface SellerWebSocketProviderProps {
  children: ReactNode;
  walletAddress: string;
  autoConnect?: boolean;
  enableNotifications?: boolean;
  enableAnalytics?: boolean;
}

export const SellerWebSocketProvider: React.FC<SellerWebSocketProviderProps> = ({
  children,
  walletAddress,
  autoConnect = true,
  enableNotifications = true,
  enableAnalytics = true
}) => {
  const sellerWebSocket = useSellerWebSocket({
    walletAddress,
    autoConnect,
    enableNotifications,
    enableAnalytics
  });

  if (!walletAddress) {
    console.warn('SellerWebSocketProvider: walletAddress is required');
    return <>{children}</>;
  }

  return (
    <SellerWebSocketContext.Provider value={sellerWebSocket}>
      {children}
      <SellerConnectionIndicator 
        isConnected={sellerWebSocket.isConnected}
        connectionStatus={sellerWebSocket.connectionStatus}
        unreadCount={sellerWebSocket.unreadCount}
      />
    </SellerWebSocketContext.Provider>
  );
};

// Connection indicator component
const SellerConnectionIndicator: React.FC<{
  isConnected: boolean;
  connectionStatus: any;
  unreadCount: number;
}> = ({ isConnected, connectionStatus, unreadCount }) => {
  if (isConnected && unreadCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Connection status */}
      {!isConnected && (
        <div className="mb-2 px-3 py-2 bg-orange-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              {connectionStatus.error ? 'Connection Error' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Notification badge */}
      {unreadCount > 0 && (
        <div className="px-3 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full" />
            <span className="text-sm font-medium">
              {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const useSellerWebSocketContext = (): SellerWebSocketContextType => {
  const context = useContext(SellerWebSocketContext);
  if (!context) {
    throw new Error('useSellerWebSocketContext must be used within a SellerWebSocketProvider');
  }
  return context;
};

// Hook for accessing seller WebSocket in components
export const useSellerRealTime = () => {
  const context = useSellerWebSocketContext();
  
  return {
    // Connection state
    isConnected: context.isConnected,
    connectionStatus: context.connectionStatus,
    
    // Quick access to common data
    orders: context.orders,
    analytics: context.analytics,
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    
    // Common actions
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead,
    clearNotifications: context.clearNotifications,
    
    // Event subscriptions (returns cleanup functions)
    onNewOrder: context.onNewOrder,
    onOrderStatusChange: context.onOrderStatusChange,
    onPaymentReceived: context.onPaymentReceived,
    onTierUpgrade: context.onTierUpgrade,
    
    // Utility
    requestDataRefresh: context.requestDataRefresh
  };
};

export default SellerWebSocketContext;