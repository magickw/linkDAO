import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../../design-system/hooks/useResponsive';

interface GovernanceNotification {
  id: string;
  type: 'proposal_created' | 'proposal_ending' | 'vote_reminder' | 'proposal_passed' | 'proposal_failed';
  title: string;
  message: string;
  proposalId?: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
}

interface MobileGovernanceNotificationsProps {
  notifications: GovernanceNotification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationAction: (notificationId: string, action: string) => void;
  onRequestPermission: () => Promise<boolean>;
  hasPermission: boolean;
}

/**
 * MobileGovernanceNotifications Component
 * 
 * Mobile-optimized governance notification system with push notifications,
 * priority-based sorting, and quick action buttons.
 */
export const MobileGovernanceNotifications: React.FC<MobileGovernanceNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationAction,
  onRequestPermission,
  hasPermission
}) => {
  const { isMobile } = useResponsive();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  // Request notification permission on mount
  useEffect(() => {
    if (isMobile && !hasPermission) {
      // Show permission request after a short delay
      const timer = setTimeout(() => {
        onRequestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, hasPermission, onRequestPermission]);

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead;
      case 'urgent':
        return notification.priority === 'urgent' || notification.priority === 'high';
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort by priority first, then by timestamp
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => 
    (n.priority === 'urgent' || n.priority === 'high') && !n.isRead
  ).length;

  const handleNotificationTap = useCallback((notification: GovernanceNotification) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }

    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.actionRequired) {
      onNotificationAction(notification.id, 'view');
    }
  }, [onMarkAsRead, onNotificationAction]);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="mobile-governance-notifications">
      {/* Notification Bell */}
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowNotifications(true)}
          className="relative p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
          
          {/* Urgent Indicator */}
          {urgentCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full"
            />
          )}
        </motion.button>
      </div>

      {/* Permission Request Banner */}
      {!hasPermission && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Enable Governance Notifications
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Stay updated on proposals and voting deadlines
              </p>
            </div>
            <button
              onClick={onRequestPermission}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg font-medium"
            >
              Enable
            </button>
          </div>
        </motion.div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={filteredNotifications}
        filter={filter}
        onFilterChange={setFilter}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onNotificationTap={handleNotificationTap}
        unreadCount={unreadCount}
      />
    </div>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: GovernanceNotification[];
  filter: 'all' | 'unread' | 'urgent';
  onFilterChange: (filter: 'all' | 'unread' | 'urgent') => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationTap: (notification: GovernanceNotification) => void;
  unreadCount: number;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  filter,
  onFilterChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationTap,
  unreadCount
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Governance Notifications
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[
                  { key: 'all', label: 'All', count: notifications.length },
                  { key: 'unread', label: 'Unread', count: unreadCount },
                  { key: 'urgent', label: 'Urgent', count: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => onFilterChange(tab.key as any)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filter === tab.key
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {tab.label} {tab.count > 0 && `(${tab.count})`}
                  </button>
                ))}
              </div>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    No notifications found
                  </p>
                </div>
              ) : (
                <div className="space-y-1 p-4">
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onTap={() => onNotificationTap(notification)}
                      onMarkAsRead={() => onMarkAsRead(notification.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface NotificationItemProps {
  notification: GovernanceNotification;
  onTap: () => void;
  onMarkAsRead: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onTap,
  onMarkAsRead
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'proposal_created':
        return '📝';
      case 'proposal_ending':
        return '⏰';
      case 'vote_reminder':
        return '🗳️';
      case 'proposal_passed':
        return '✅';
      case 'proposal_failed':
        return '❌';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className={`border-l-4 rounded-r-xl p-4 transition-all ${getPriorityColor(notification.priority)} ${
        !notification.isRead ? 'shadow-md' : 'opacity-75'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`font-medium ${
                !notification.isRead 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${
                !notification.isRead 
                  ? 'text-gray-600 dark:text-gray-400' 
                  : 'text-gray-500 dark:text-gray-500'
              }`}>
                {notification.message}
              </p>
            </div>

            {/* Timestamp and Actions */}
            <div className="flex flex-col items-end space-y-1 ml-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimestamp(notification.timestamp)}
              </span>
              
              {!notification.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="w-2 h-2 bg-blue-600 rounded-full"
                  aria-label="Mark as read"
                />
              )}
            </div>
          </div>

          {/* Action Button */}
          {notification.actionRequired && (
            <div className="mt-3">
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg font-medium">
                {notification.type === 'vote_reminder' ? 'Vote Now' : 'View Details'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MobileGovernanceNotifications;