import React, { useState, useEffect } from 'react';
import { useSellerRealTime } from '../../../../contexts/SellerWebSocketContext';

interface SellerNotification {
  id: string;
  type: 'order' | 'payment' | 'review' | 'tier' | 'system';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: Date;
}

interface SellerNotificationCenterProps {
  className?: string;
  maxVisible?: number;
  autoHide?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const SellerNotificationCenter: React.FC<SellerNotificationCenterProps> = ({
  className = '',
  maxVisible = 5,
  autoHide = true,
  position = 'top-right'
}) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isConnected
  } = useSellerRealTime();

  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState<SellerNotification[]>([]);

  useEffect(() => {
    // Show only recent unread notifications when collapsed
    if (!isExpanded) {
      const recent = notifications
        .filter(n => !n.read)
        .slice(0, maxVisible);
      setVisibleNotifications(recent);
    } else {
      // Show all notifications when expanded
      setVisibleNotifications(notifications.slice(0, 20)); // Limit to 20 for performance
    }
  }, [notifications, isExpanded, maxVisible]);

  // Auto-hide notifications after delay
  useEffect(() => {
    if (autoHide && visibleNotifications.length > 0 && !isExpanded) {
      const timer = setTimeout(() => {
        visibleNotifications.forEach(notification => {
          if (notification.priority !== 'urgent') {
            markAsRead(notification.id);
          }
        });
      }, 10000); // 10 seconds

      return () => clearTimeout(timer);
    }
  }, [visibleNotifications, autoHide, isExpanded, markAsRead]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order':
        return '📦';
      case 'payment':
        return '💰';
      case 'review':
        return '⭐';
      case 'tier':
        return '🏆';
      case 'system':
        return '⚙️';
      default:
        return '📢';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleNotificationClick = (notification: SellerNotification) => {
    markAsRead(notification.id);
    
    // Handle notification-specific actions
    switch (notification.type) {
      case 'order':
        // Navigate to order details
        if (notification.data?.orderId) {
          window.location.href = `/seller/orders/${notification.data.orderId}`;
        }
        break;
      case 'payment':
        // Navigate to payments
        window.location.href = '/seller/payments';
        break;
      case 'review':
        // Navigate to reviews
        window.location.href = '/seller/reviews';
        break;
      case 'tier':
        // Navigate to tier information
        window.location.href = '/seller/tier';
        break;
      default:
        break;
    }
  };

  if (!isConnected && visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
      {/* Notification badge/toggle */}
      {unreadCount > 0 && !isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="mb-2 px-3 py-2 bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
            </span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </button>
      )}

      {/* Notification panel */}
      {(isExpanded || visibleNotifications.length > 0) && (
        <div className="w-80 max-h-96 bg-white rounded-lg shadow-xl border overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Seller Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Connection status */}
          {!isConnected && (
            <div className="px-4 py-2 bg-yellow-50 border-b">
              <div className="flex items-center space-x-2 text-yellow-800">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm">Reconnecting...</span>
              </div>
            </div>
          )}

          {/* Notifications list */}
          <div className="max-h-64 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    getPriorityColor(notification.priority)
                  } ${!notification.read ? 'font-medium' : 'opacity-75'}`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {notification.data && (
                        <div className="mt-2 text-xs text-gray-500">
                          {notification.type === 'order' && notification.data.amount && (
                            <span>Amount: {notification.data.amount} {notification.data.currency}</span>
                          )}
                          {notification.type === 'payment' && notification.data.transactionHash && (
                            <span>TX: {notification.data.transactionHash.slice(0, 10)}...</span>
                          )}
                          {notification.type === 'review' && notification.data.rating && (
                            <span>Rating: {notification.data.rating}/5 stars</span>
                          )}
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <button
                  onClick={clearNotifications}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
                <span className="text-xs text-gray-500">
                  {notifications.length} total
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerNotificationCenter;