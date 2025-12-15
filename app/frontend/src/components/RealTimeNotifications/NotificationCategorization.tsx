import React, { useState, useMemo } from 'react';
import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority,
  MentionNotification,
  TipNotification,
  GovernanceNotification,
  CommunityNotification,
  ReactionNotification
} from '../../types/realTimeNotifications';

interface NotificationCategorizationProps {
  notifications: RealTimeNotification[];
  onNotificationClick: (notification: RealTimeNotification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
  className?: string;
}

interface CategoryGroup {
  category: NotificationCategory;
  label: string;
  icon: string;
  color: string;
  notifications: RealTimeNotification[];
  unreadCount: number;
}

const NotificationCategorization: React.FC<NotificationCategorizationProps> = ({
  notifications,
  onNotificationClick,
  onMarkAsRead,
  onDismiss,
  className = ''
}) => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'priority'>('timestamp');

  const categoryConfig = useMemo(() => ({
    [NotificationCategory.MENTION]: {
      label: 'Mentions',
      icon: '👤',
      color: 'bg-blue-500'
    },
    [NotificationCategory.TIP]: {
      label: 'Tips',
      icon: '💰',
      color: 'bg-green-500'
    },
    [NotificationCategory.GOVERNANCE]: {
      label: 'Governance',
      icon: '🏛️',
      color: 'bg-purple-500'
    },
    [NotificationCategory.COMMUNITY]: {
      label: 'Community',
      icon: '👥',
      color: 'bg-orange-500'
    },
    [NotificationCategory.REACTION]: {
      label: 'Reactions',
      icon: '❤️',
      color: 'bg-pink-500'
    },
    [NotificationCategory.COMMENT]: {
      label: 'Comments',
      icon: '💬',
      color: 'bg-indigo-500'
    },
    [NotificationCategory.FOLLOW]: {
      label: 'Follows',
      icon: '👥',
      color: 'bg-teal-500'
    },
    [NotificationCategory.SYSTEM]: {
      label: 'System',
      icon: '⚙️',
      color: 'bg-gray-500'
    }
  }), []);

  const categorizedNotifications = useMemo(() => {
    const groups: CategoryGroup[] = Object.values(NotificationCategory).map(category => {
      const categoryNotifications = notifications.filter(n => n.category === category);
      const unreadCount = categoryNotifications.filter(n => !n.read).length;
      
      return {
        category,
        label: categoryConfig[category].label,
        icon: categoryConfig[category].icon,
        color: categoryConfig[category].color,
        notifications: categoryNotifications,
        unreadCount
      };
    }).filter(group => group.notifications.length > 0);

    return groups;
  }, [notifications, categoryConfig]);

  const filteredNotifications = useMemo(() => {
    let filtered = activeCategory === 'all' 
      ? notifications 
      : notifications.filter(n => n.category === activeCategory);

    // Sort notifications
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = {
          [NotificationPriority.URGENT]: 4,
          [NotificationPriority.HIGH]: 3,
          [NotificationPriority.NORMAL]: 2,
          [NotificationPriority.LOW]: 1
        };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
      }
      
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return filtered;
  }, [notifications, activeCategory, sortBy]);

  const totalUnreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const renderNotificationContent = (notification: RealTimeNotification) => {
    switch (notification.category) {
      case NotificationCategory.MENTION:
        const mentionNotif = notification as MentionNotification;
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={mentionNotif.metadata.mentionedByAvatar || '/images/default-avatar.png'} 
              alt={mentionNotif.metadata.mentionedByUsername}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{mentionNotif.metadata.mentionedByUsername}</span>
                {' '}mentioned you
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {mentionNotif.metadata.context}
              </p>
            </div>
          </div>
        );

      case NotificationCategory.TIP:
        const tipNotif = notification as TipNotification;
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={tipNotif.metadata.tipperAvatar || '/images/default-avatar.png'} 
              alt={tipNotif.metadata.tipperUsername}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{tipNotif.metadata.tipperUsername}</span>
                {' '}tipped you{' '}
                <span className="font-bold text-green-600">
                  {tipNotif.metadata.tipAmount} {tipNotif.metadata.tokenSymbol}
                </span>
              </p>
              {tipNotif.metadata.message && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  "{tipNotif.metadata.message}"
                </p>
              )}
            </div>
          </div>
        );

      case NotificationCategory.GOVERNANCE:
        const govNotif = notification as GovernanceNotification;
        return (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 text-sm">🏛️</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{govNotif.metadata.proposalTitle}</p>
              <p className="text-xs text-gray-600 mt-1">
                {govNotif.metadata.action === 'voting_ending' && govNotif.metadata.votingDeadline && (
                  <span className="text-red-600 font-medium">
                    Voting ends {new Date(govNotif.metadata.votingDeadline).toLocaleDateString()}
                  </span>
                )}
                {govNotif.metadata.action === 'created' && 'New proposal created'}
                {govNotif.metadata.action === 'voting_started' && 'Voting has started'}
                {govNotif.metadata.action === 'executed' && 'Proposal executed'}
                {govNotif.metadata.action === 'rejected' && 'Proposal rejected'}
              </p>
            </div>
          </div>
        );

      case NotificationCategory.COMMUNITY:
        const communityNotif = notification as CommunityNotification;
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={communityNotif.metadata.communityIcon || '/default-community.png'} 
              alt={communityNotif.metadata.communityName}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{communityNotif.metadata.communityName}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {communityNotif.metadata.eventType === 'new_member' && 'New member joined'}
                {communityNotif.metadata.eventType === 'new_post' && 'New post published'}
                {communityNotif.metadata.eventType === 'announcement' && 'New announcement'}
                {communityNotif.metadata.eventType === 'event' && 'Community event'}
                {communityNotif.metadata.eventType === 'milestone' && 'Milestone reached'}
              </p>
            </div>
          </div>
        );

      case NotificationCategory.REACTION:
        const reactionNotif = notification as ReactionNotification;
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={reactionNotif.metadata.reactorAvatar || '/images/default-avatar.png'} 
              alt={reactionNotif.metadata.reactorUsername}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium">{reactionNotif.metadata.reactorUsername}</span>
                {' '}reacted with {reactionNotif.metadata.reactionEmoji}
                {reactionNotif.metadata.tokenAmount && (
                  <span className="text-green-600 font-medium">
                    {' '}({reactionNotif.metadata.tokenAmount} tokens)
                  </span>
                )}
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-sm">📢</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>
          </div>
        );
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT: return 'border-l-red-500';
      case NotificationPriority.HIGH: return 'border-l-orange-500';
      case NotificationPriority.NORMAL: return 'border-l-blue-500';
      case NotificationPriority.LOW: return 'border-l-gray-400';
      default: return 'border-l-gray-400';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'priority')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="timestamp">Sort by Time</option>
              <option value="priority">Sort by Priority</option>
            </select>
            {totalUnreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {totalUnreadCount}
              </span>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          {categorizedNotifications.map(group => (
            <button
              key={group.category}
              onClick={() => setActiveCategory(group.category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                activeCategory === group.category
                  ? `${group.color} text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{group.icon}</span>
              <span>{group.label}</span>
              {group.unreadCount > 0 && (
                <span className="bg-white text-gray-800 text-xs px-1 rounded-full ml-1">
                  {group.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => onNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {renderNotificationContent(notification)}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                    <div className="flex space-x-1">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(notification.id);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(notification.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Priority indicator for urgent notifications */}
                {notification.priority === NotificationPriority.URGENT && (
                  <div className="mt-2 flex items-center space-x-1 text-red-600">
                    <span className="text-xs">🚨</span>
                    <span className="text-xs font-medium">URGENT</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCategorization;