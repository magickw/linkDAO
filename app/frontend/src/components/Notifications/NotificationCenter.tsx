/**
 * NotificationCenter Component
 * Central panel for viewing and managing notifications
 * Implements requirements 6.1, 6.3, 6.4 from the interconnected social platform spec
 */

import React, { useState, useMemo } from 'react';
import { Notification } from './NotificationSystem';
import { NotificationItem } from './NotificationItem';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onOpenPreferences: () => void;
  isOnline?: boolean;
  pendingNotifications?: number;
}

type FilterType = 'all' | 'unread' | 'message' | 'reaction' | 'mention' | 'community' | 'governance' | 'financial' | 'social_interaction' | 'marketplace';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onOpenPreferences,
  isOnline = true,
  pendingNotifications = 0
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Apply filter
    switch (activeFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.isRead);
        break;
      case 'message':
        filtered = filtered.filter(n => n.type === 'message');
        break;
      case 'reaction':
        filtered = filtered.filter(n => n.type === 'reaction');
        break;
      case 'mention':
        filtered = filtered.filter(n => n.type === 'mention');
        break;
      case 'community':
        filtered = filtered.filter(n => n.type === 'community');
        break;
      case 'governance':
        filtered = filtered.filter(n => n.type === 'governance');
        break;
      case 'financial':
        filtered = filtered.filter(n => ['tip', 'award'].includes(n.type));
        break;
      case 'social_interaction':
        filtered = filtered.filter(n => ['post_upvote', 'post_downvote', 'comment_upvote', 'comment_downvote', 'new_comment', 'comment_reply', 'post_reply', 'bookmark', 'reaction'].includes(n.type));
        break;
      case 'marketplace':
        filtered = filtered.filter(n => ['new_order', 'cancellation_request', 'dispute_opened', 'review_received', 'order_update', 'payment_received', 'return_requested', 'shipped', 'delivered'].includes(n.type));
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.fromName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, activeFilter, searchQuery]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};

    filteredNotifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    return groups;
  }, [filteredNotifications]);

  const getFilterCount = (filter: FilterType): number => {
    switch (filter) {
      case 'all':
        return notifications.length;
      case 'unread':
        return unreadCount;
      case 'message':
        return notifications.filter(n => n.type === 'message').length;
      case 'reaction':
        return notifications.filter(n => n.type === 'reaction').length;
      case 'mention':
        return notifications.filter(n => n.type === 'mention').length;
      case 'community':
        return notifications.filter(n => n.type === 'community').length;
      case 'governance':
        return notifications.filter(n => n.type === 'governance').length;
      case 'financial':
        return notifications.filter(n => ['tip', 'award'].includes(n.type)).length;
      case 'social_interaction':
        return notifications.filter(n => ['post_upvote', 'post_downvote', 'comment_upvote', 'comment_downvote', 'new_comment', 'comment_reply', 'post_reply', 'bookmark'].includes(n.type)).length;
      case 'marketplace':
        return notifications.filter(n => ['new_order', 'cancellation_request', 'dispute_opened', 'review_received', 'order_update', 'payment_received', 'return_requested', 'shipped', 'delivered'].includes(n.type)).length;
      default:
        return 0;
    }
  };

  const getFilterIcon = (filter: FilterType) => {
    switch (filter) {
      case 'message':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'reaction':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'mention':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        );
      case 'community':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'governance':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'financial':
        return (
          <span className="text-sm">💰</span>
        );
      case 'social_interaction':
        return (
          <span className="text-sm">❤️</span>
        );
      case 'marketplace':
        return (
          <span className="text-sm">🛍️</span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-16 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
            {!isOnline && (
              <span className="bg-yellow-500 text-black text-xs rounded-full px-2 py-1" title="Offline mode">
                Offline
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenPreferences}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Notification preferences"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-yellow-500 text-black text-center py-2 px-4 text-sm font-medium">
            You are currently offline. Notifications will sync when you're back online.
          </div>
        )}

        {/* Pending Notifications Indicator */}
        {pendingNotifications > 0 && (
          <div className="bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium">
            {pendingNotifications} notification{pendingNotifications > 1 ? 's' : ''} waiting to sync...
          </div>
        )}

        {/* Search and Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                disabled={!isOnline && pendingNotifications > 0}
              />
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap disabled:opacity-50"
                disabled={!isOnline && pendingNotifications > 0}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 overflow-x-auto">
            {(['all', 'unread', 'message', 'social_interaction', 'financial', 'marketplace', 'mention', 'community', 'governance'] as FilterType[]).map((filter) => {
              const count = getFilterCount(filter);
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`
                    flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }
                    ${!isOnline && pendingNotifications > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  disabled={!isOnline && pendingNotifications > 0}
                >
                  {getFilterIcon(filter)}
                  <span className="capitalize">{filter.replace('_', ' ')}</span>
                  {count > 0 && (
                    <span className={`
                      px-1.5 py-0.5 rounded-full text-xs
                      ${isActive
                        ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : Object.keys(groupedNotifications).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm">
                {searchQuery ? 'No notifications match your search' :
                  !isOnline && pendingNotifications > 0 ? 'Notifications will appear when synced' : 'No notifications yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(groupedNotifications).map(([date, notifications]) => (
                <div key={date}>
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {date}
                  </div>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => onMarkAsRead(notification.id)}
                      onDelete={() => onDelete(notification.id)}
                      isOnline={isOnline}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;