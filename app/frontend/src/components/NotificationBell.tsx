import React, { useState, useMemo } from 'react';
import {
  Bell, Check, MessageCircle, AtSign, Hash, User,
  ThumbsUp, ThumbsDown, Repeat2, Award, Bookmark, Gift, Heart, Flame,
  Package, Truck, CheckCircle, XCircle, AlertTriangle, DollarSign, Clock, ShieldCheck
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useChatNotifications, ChatNotification } from '@/contexts/ChatNotificationContext';
import { useSocialNotifications, SocialNotification } from '@/contexts/SocialNotificationContext';
import { useOrderNotifications, OrderNotification } from '@/contexts/OrderNotificationContext';
import { NotificationCategory } from '@/types/realTimeNotifications';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Combined notification type
interface CombinedNotification {
  id: string;
  source: 'support' | 'chat' | 'social' | 'order';
  type?: string;
  chatType?: 'new_message' | 'mention' | 'channel_message';
  socialType?: NotificationCategory;
  orderType?: NotificationCategory;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  // Chat-specific fields
  conversationId?: string;
  // Social-specific fields
  postId?: string;
  postTitle?: string;
  // Order-specific fields
  orderId?: string;
  orderNumber?: string;
  productTitle?: string;
  productImage?: string;
  amount?: number;
  currency?: string;
  trackingNumber?: string;
  recipientType?: 'buyer' | 'seller';
  // Common fields
  fromAddress?: string;
  fromName?: string;
  avatarUrl?: string;
}

export const NotificationBell: React.FC = () => {
  const router = useRouter();
  const { notifications: supportNotifications, unreadCount: supportUnreadCount, markAsRead: markSupportAsRead, markAllAsRead: markAllSupportAsRead } = useNotifications();
  const {
    notifications: chatNotifications,
    unreadCount: chatUnreadCount,
    markAsRead: markChatAsRead,
    markAllAsRead: markAllChatAsRead,
    navigateToChat
  } = useChatNotifications();
  const {
    notifications: socialNotifications,
    unreadCount: socialUnreadCount,
    markAsRead: markSocialAsRead,
    markAllAsRead: markAllSocialAsRead,
    navigateToPost
  } = useSocialNotifications();
  const {
    notifications: orderNotifications,
    unreadCount: orderUnreadCount,
    markAsRead: markOrderAsRead,
    markAllAsRead: markAllOrderAsRead,
    navigateToOrder
  } = useOrderNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'social' | 'chat' | 'orders' | 'support'>('all');

  // Combine and sort all notifications
  const combinedNotifications = useMemo<CombinedNotification[]>(() => {
    const supportMapped: CombinedNotification[] = supportNotifications.map(n => ({
      id: n.id,
      source: 'support' as const,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: new Date(n.createdAt),
    }));

    const chatMapped: CombinedNotification[] = chatNotifications.map(n => ({
      id: n.id,
      source: 'chat' as const,
      chatType: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.timestamp,
      conversationId: n.conversationId,
      fromAddress: n.fromAddress,
      fromName: n.fromName,
      avatarUrl: n.avatarUrl,
    }));

    const socialMapped: CombinedNotification[] = socialNotifications.map(n => ({
      id: n.id,
      source: 'social' as const,
      socialType: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.timestamp,
      postId: n.postId,
      postTitle: n.postTitle,
      fromAddress: n.fromAddress,
      fromName: n.fromName,
      avatarUrl: n.fromAvatar,
    }));

    const orderMapped: CombinedNotification[] = orderNotifications.map(n => ({
      id: n.id,
      source: 'order' as const,
      orderType: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.timestamp,
      orderId: n.orderId,
      orderNumber: n.orderNumber,
      productTitle: n.productTitle,
      productImage: n.productImage,
      amount: n.amount,
      currency: n.currency,
      trackingNumber: n.trackingNumber,
      recipientType: n.recipientType,
    }));

    let filtered = [...supportMapped, ...chatMapped, ...socialMapped, ...orderMapped];

    if (activeTab === 'social') {
      filtered = socialMapped;
    } else if (activeTab === 'chat') {
      filtered = chatMapped;
    } else if (activeTab === 'orders') {
      filtered = orderMapped;
    } else if (activeTab === 'support') {
      filtered = supportMapped;
    }

    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [supportNotifications, chatNotifications, socialNotifications, orderNotifications, activeTab]);

  const totalUnreadCount = supportUnreadCount + chatUnreadCount + socialUnreadCount + orderUnreadCount;

  const handleMarkAsRead = (notification: CombinedNotification) => {
    if (notification.source === 'support') {
      markSupportAsRead(notification.id);
    } else if (notification.source === 'chat') {
      markChatAsRead(notification.id);
    } else if (notification.source === 'order') {
      markOrderAsRead(notification.id);
    } else {
      markSocialAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = () => {
    if (activeTab === 'all') {
      markAllSupportAsRead();
      markAllChatAsRead();
      markAllSocialAsRead();
      markAllOrderAsRead();
    } else if (activeTab === 'support') {
      markAllSupportAsRead();
    } else if (activeTab === 'chat') {
      markAllChatAsRead();
    } else if (activeTab === 'social') {
      markAllSocialAsRead();
    } else if (activeTab === 'orders') {
      markAllOrderAsRead();
    }
  };

  const handleNotificationClick = (notification: CombinedNotification) => {
    handleMarkAsRead(notification);

    if (notification.source === 'chat' && notification.conversationId) {
      setIsOpen(false);
      navigateToChat(notification.conversationId);
    } else if (notification.source === 'social' && notification.postId) {
      setIsOpen(false);
      navigateToPost(notification.postId);
    } else if (notification.source === 'order' && notification.orderId) {
      setIsOpen(false);
      navigateToOrder(notification.orderId);
    }
  };

  const getSocialNotificationIcon = (type?: NotificationCategory) => {
    switch (type) {
      case NotificationCategory.UPVOTE:
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case NotificationCategory.DOWNVOTE:
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      case NotificationCategory.REPOST:
        return <Repeat2 className="w-4 h-4 text-blue-500" />;
      case NotificationCategory.AWARD:
        return <Award className="w-4 h-4 text-yellow-500" />;
      case NotificationCategory.BOOKMARK:
        return <Bookmark className="w-4 h-4 text-purple-500" />;
      case NotificationCategory.TIP:
        return <Gift className="w-4 h-4 text-pink-500" />;
      case NotificationCategory.REACTION:
        return <Heart className="w-4 h-4 text-red-400" />;
      case NotificationCategory.MENTION:
        return <AtSign className="w-4 h-4 text-blue-400" />;
      default:
        return <Flame className="w-4 h-4 text-orange-500" />;
    }
  };

  const getOrderNotificationIcon = (type?: NotificationCategory) => {
    switch (type) {
      case NotificationCategory.ORDER_CREATED:
        return <Package className="w-4 h-4 text-blue-500" />;
      case NotificationCategory.ORDER_CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case NotificationCategory.ORDER_PROCESSING:
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case NotificationCategory.ORDER_SHIPPED:
        return <Truck className="w-4 h-4 text-blue-500" />;
      case NotificationCategory.ORDER_DELIVERED:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case NotificationCategory.ORDER_COMPLETED:
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case NotificationCategory.ORDER_CANCELLED:
        return <XCircle className="w-4 h-4 text-red-500" />;
      case NotificationCategory.ORDER_REFUNDED:
        return <DollarSign className="w-4 h-4 text-orange-500" />;
      case NotificationCategory.ORDER_DISPUTED:
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case NotificationCategory.PAYMENT_RECEIVED:
        return <DollarSign className="w-4 h-4 text-green-500" />;
      case NotificationCategory.DELIVERY_CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case NotificationCategory.ESCROW_FUNDED:
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case NotificationCategory.ESCROW_RELEASED:
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationIcon = (notification: CombinedNotification) => {
    if (notification.source === 'social') {
      return getSocialNotificationIcon(notification.socialType);
    }
    if (notification.source === 'order') {
      return getOrderNotificationIcon(notification.orderType);
    }
    if (notification.source === 'chat') {
      switch (notification.chatType) {
        case 'mention':
          return <AtSign className="w-4 h-4 text-blue-500" />;
        case 'channel_message':
          return <Hash className="w-4 h-4 text-purple-500" />;
        case 'new_message':
        default:
          return <MessageCircle className="w-4 h-4 text-green-500" />;
      }
    }
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const getAvatarBackground = (notification: CombinedNotification) => {
    if (notification.source === 'social') {
      switch (notification.socialType) {
        case NotificationCategory.UPVOTE:
          return 'bg-gradient-to-r from-green-500 to-emerald-500';
        case NotificationCategory.DOWNVOTE:
          return 'bg-gradient-to-r from-red-500 to-rose-500';
        case NotificationCategory.REPOST:
          return 'bg-gradient-to-r from-blue-500 to-cyan-500';
        case NotificationCategory.AWARD:
          return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        case NotificationCategory.TIP:
          return 'bg-gradient-to-r from-pink-500 to-rose-500';
        default:
          return 'bg-gradient-to-r from-purple-500 to-pink-500';
      }
    }
    if (notification.source === 'order') {
      switch (notification.orderType) {
        case NotificationCategory.ORDER_CREATED:
        case NotificationCategory.ORDER_CONFIRMED:
          return 'bg-gradient-to-r from-blue-500 to-indigo-500';
        case NotificationCategory.ORDER_SHIPPED:
        case NotificationCategory.ORDER_PROCESSING:
          return 'bg-gradient-to-r from-yellow-500 to-orange-500';
        case NotificationCategory.ORDER_DELIVERED:
        case NotificationCategory.ORDER_COMPLETED:
        case NotificationCategory.DELIVERY_CONFIRMED:
          return 'bg-gradient-to-r from-green-500 to-emerald-500';
        case NotificationCategory.ORDER_CANCELLED:
        case NotificationCategory.ORDER_DISPUTED:
          return 'bg-gradient-to-r from-red-500 to-rose-500';
        case NotificationCategory.ORDER_REFUNDED:
          return 'bg-gradient-to-r from-orange-500 to-amber-500';
        case NotificationCategory.PAYMENT_RECEIVED:
        case NotificationCategory.ESCROW_FUNDED:
        case NotificationCategory.ESCROW_RELEASED:
          return 'bg-gradient-to-r from-emerald-500 to-teal-500';
        default:
          return 'bg-gradient-to-r from-blue-500 to-purple-500';
      }
    }
    if (notification.source === 'chat') {
      return 'bg-gradient-to-r from-blue-500 to-purple-500';
    }
    return 'bg-gray-200 dark:bg-gray-600';
  };

  const currentUnreadCount = activeTab === 'all' ? totalUnreadCount
    : activeTab === 'social' ? socialUnreadCount
    : activeTab === 'chat' ? chatUnreadCount
    : activeTab === 'orders' ? orderUnreadCount
    : supportUnreadCount;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <Bell className="w-6 h-6" />
        {totalUnreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[420px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {currentUnreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All ({totalUnreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Package className="w-3 h-3 inline mr-1" />
                  Orders ({orderUnreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('social')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'social'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 inline mr-1" />
                  Social ({socialUnreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-3 h-3 inline mr-1" />
                  Chat ({chatUnreadCount})
                </button>
                <button
                  onClick={() => setActiveTab('support')}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'support'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Support ({supportUnreadCount})
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {combinedNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                  {activeTab === 'social' && (
                    <p className="text-xs mt-1">Upvotes, reposts, tips, and awards will appear here</p>
                  )}
                  {activeTab === 'orders' && (
                    <p className="text-xs mt-1">Order updates, shipping, and payment notifications will appear here</p>
                  )}
                </div>
              ) : (
                combinedNotifications.slice(0, 50).map((notification) => (
                  <div
                    key={`${notification.source}-${notification.id}`}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar / Icon */}
                      <div className="flex-shrink-0">
                        {notification.productImage ? (
                          <img
                            src={notification.productImage}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : notification.avatarUrl ? (
                          <img
                            src={notification.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getAvatarBackground(notification)}`}>
                            {notification.source === 'social' ? (
                              getSocialNotificationIcon(notification.socialType)
                            ) : notification.source === 'order' ? (
                              getOrderNotificationIcon(notification.orderType)
                            ) : notification.source === 'chat' ? (
                              <User className="w-5 h-5 text-white" />
                            ) : (
                              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification)}
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.postTitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate italic">
                            "{notification.postTitle}"
                          </p>
                        )}
                        {notification.productTitle && notification.source === 'order' && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                            {notification.productTitle}
                            {notification.orderNumber && (
                              <span className="ml-1 text-blue-500">#{notification.orderNumber}</span>
                            )}
                          </p>
                        )}
                        {notification.trackingNumber && (
                          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                            Tracking: {notification.trackingNumber}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {notification.createdAt.toLocaleString()}
                          </p>
                          {notification.fromName && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              from {notification.fromName}
                            </span>
                          )}
                          {notification.recipientType && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              notification.recipientType === 'buyer'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {notification.recipientType === 'buyer' ? 'Buyer' : 'Seller'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mark as read button */}
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification);
                          }}
                          className="flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              {(activeTab === 'all' || activeTab === 'orders') && (
                <Link
                  href="/account/orders"
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  My Orders
                </Link>
              )}
              {(activeTab === 'all' || activeTab === 'social') && (
                <Link
                  href="/feed"
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  View Feed
                </Link>
              )}
              {(activeTab === 'all' || activeTab === 'chat') && (
                <Link
                  href="/chat"
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Go to Chat
                </Link>
              )}
              {(activeTab === 'all' || activeTab === 'support') && (
                <Link
                  href="/support/dashboard"
                  className="flex-1 text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 py-2 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Support
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
