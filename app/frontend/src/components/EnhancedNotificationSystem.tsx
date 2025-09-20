/**
 * Enhanced Notification System Component
 * Implements real-time notifications with better visual indicators and categorization
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Share2,
  Award,
  Zap,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Check,
  X,
  Settings,
  Filter,
  MoreHorizontal,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  Star,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { GlassPanel } from '@/design-system';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'share' | 'mention' | 'achievement' | 'transaction' | 'community' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  avatar?: string;
  metadata?: {
    postId?: string;
    userId?: string;
    communityId?: string;
    transactionHash?: string;
    amount?: string;
    token?: string;
  };
}

interface NotificationGroup {
  type: string;
  count: number;
  notifications: Notification[];
  latestTimestamp: Date;
}

interface EnhancedNotificationSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  className?: string;
}

export default function EnhancedNotificationSystem({
  isOpen,
  onClose,
  onNotificationClick,
  className = ''
}: EnhancedNotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'transactions'>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'type' | 'date'>('type');
  const [showSettings, setShowSettings] = useState(false);

  // Mock notifications data
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'like',
      title: 'New Like',
      message: 'alexj liked your post about DeFi yield farming',
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      read: false,
      priority: 'medium',
      avatar: 'https://placehold.co/32',
      metadata: { postId: 'post-123', userId: 'user-456' }
    },
    {
      id: '2',
      type: 'comment',
      title: 'New Comment',
      message: 'sarah.eth commented on your post: "Great insights on the new protocol!"',
      timestamp: new Date(Date.now() - 600000), // 10 minutes ago
      read: false,
      priority: 'high',
      avatar: 'https://placehold.co/32',
      metadata: { postId: 'post-123', userId: 'user-789' }
    },
    {
      id: '3',
      type: 'follow',
      title: 'New Follower',
      message: 'vitalik.eth started following you',
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      read: true,
      priority: 'high',
      avatar: 'https://placehold.co/32',
      metadata: { userId: 'user-101' }
    },
    {
      id: '4',
      type: 'transaction',
      title: 'Transaction Confirmed',
      message: 'Your swap of 100 USDC to LDAO has been confirmed',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      read: true,
      priority: 'medium',
      metadata: { 
        transactionHash: '0x1234...5678',
        amount: '100',
        token: 'USDC'
      }
    },
    {
      id: '5',
      type: 'achievement',
      title: 'Achievement Unlocked',
      message: 'You earned the "Community Builder" badge for creating 10 posts',
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      read: false,
      priority: 'medium'
    },
    {
      id: '6',
      type: 'community',
      title: 'Community Update',
      message: 'DeFi Protocols community has a new governance proposal',
      timestamp: new Date(Date.now() - 10800000), // 3 hours ago
      read: true,
      priority: 'low',
      avatar: 'https://placehold.co/32',
      metadata: { communityId: 'community-123' }
    }
  ];

  useEffect(() => {
    setNotifications(mockNotifications);
  }, []);

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = `w-5 h-5 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-blue-500' :
      'text-gray-500'
    }`;

    switch (type) {
      case 'like': return <Heart className={iconClass} />;
      case 'comment': return <MessageCircle className={iconClass} />;
      case 'follow': return <UserPlus className={iconClass} />;
      case 'share': return <Share2 className={iconClass} />;
      case 'mention': return <AlertCircle className={iconClass} />;
      case 'achievement': return <Award className={iconClass} />;
      case 'transaction': return <DollarSign className={iconClass} />;
      case 'community': return <Users className={iconClass} />;
      case 'system': return <Info className={iconClass} />;
      default: return <Bell className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
      case 'high': return 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10';
      case 'medium': return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
      default: return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-800/50';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread': return !notification.read;
      case 'mentions': return notification.type === 'mention' || notification.type === 'comment';
      case 'transactions': return notification.type === 'transaction';
      default: return true;
    }
  });

  const groupedNotifications = (): NotificationGroup[] => {
    if (groupBy === 'none') {
      return [{
        type: 'all',
        count: filteredNotifications.length,
        notifications: filteredNotifications,
        latestTimestamp: filteredNotifications[0]?.timestamp || new Date()
      }];
    }

    if (groupBy === 'type') {
      const groups: { [key: string]: Notification[] } = {};
      filteredNotifications.forEach(notification => {
        if (!groups[notification.type]) {
          groups[notification.type] = [];
        }
        groups[notification.type].push(notification);
      });

      return Object.entries(groups).map(([type, notifications]) => ({
        type,
        count: notifications.length,
        notifications: notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        latestTimestamp: notifications[0]?.timestamp || new Date()
      })).sort((a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime());
    }

    // Group by date
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const groups: { [key: string]: Notification[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    filteredNotifications.forEach(notification => {
      const notificationDate = new Date(notification.timestamp);
      if (notificationDate.toDateString() === today.toDateString()) {
        groups['Today'].push(notification);
      } else if (notificationDate.toDateString() === yesterday.toDateString()) {
        groups['Yesterday'].push(notification);
      } else {
        groups['Earlier'].push(notification);
      }
    });

    return Object.entries(groups)
      .filter(([_, notifications]) => notifications.length > 0)
      .map(([type, notifications]) => ({
        type,
        count: notifications.length,
        notifications: notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        latestTimestamp: notifications[0]?.timestamp || new Date()
      }));
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end p-4"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Notification Panel */}
        <motion.div
          initial={{ opacity: 0, x: 400, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 400, scale: 0.9 }}
          className={`relative w-full max-w-md ${className}`}
        >
          <GlassPanel className="p-0 overflow-hidden max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h2>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {(['all', 'unread', 'mentions', 'transactions'] as const).map((filterType) => (
                    <button
                      key={filterType}
                      onClick={() => setFilter(filterType)}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                        filter === filterType
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    </button>
                  ))}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                          Group by
                        </label>
                        <select
                          value={groupBy}
                          onChange={(e) => setGroupBy(e.target.value as any)}
                          className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="none">None</option>
                          <option value="type">Type</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No notifications</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {groupedNotifications().map((group) => (
                    <div key={group.type}>
                      {groupBy !== 'none' && (
                        <div className="px-4 py-2 bg-gray-50/80 dark:bg-gray-800/80">
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {group.type} ({group.count})
                          </h3>
                        </div>
                      )}
                      
                      {group.notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`relative p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                            !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                          } hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors cursor-pointer group`}
                          onClick={() => {
                            onNotificationClick(notification);
                            markAsRead(notification.id);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Icon/Avatar */}
                            <div className="flex-shrink-0">
                              {notification.avatar ? (
                                <img
                                  src={notification.avatar}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  {getNotificationIcon(notification.type, notification.priority)}
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                      {formatTimeAgo(notification.timestamp)}
                                    </span>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notification.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                      title="Mark as read"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notification.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}