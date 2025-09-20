import React, { useState, useEffect, useCallback } from 'react';
import { 
  CommunityNotification, 
  NotificationPriority,
  NotificationUrgency,
  RealTimeNotification
} from '../../types/realTimeNotifications';

interface CommunityEventNotificationsProps {
  communityIds: string[];
  onEventClick: (event: CommunityEvent) => void;
  onJoinEvent: (eventId: string) => void;
  onDismissEvent: (eventId: string) => void;
  className?: string;
}

interface CommunityEvent {
  id: string;
  communityId: string;
  communityName: string;
  communityIcon?: string;
  type: 'new_member' | 'new_post' | 'announcement' | 'event' | 'milestone' | 'governance' | 'contest';
  title: string;
  description: string;
  timestamp: Date;
  urgency: NotificationUrgency;
  priority: NotificationPriority;
  metadata: Record<string, any>;
  actionable: boolean;
  expiresAt?: Date;
}

interface EventGroup {
  communityId: string;
  communityName: string;
  communityIcon?: string;
  events: CommunityEvent[];
  unreadCount: number;
  highestPriority: NotificationPriority;
}

const CommunityEventNotifications: React.FC<CommunityEventNotificationsProps> = ({
  communityIds,
  onEventClick,
  onJoinEvent,
  onDismissEvent,
  className = ''
}) => {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<EventGroup[]>([]);
  const [expandedCommunities, setExpandedCommunities] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'actionable' | 'urgent'>('all');

  // Handle community notifications
  const handleCommunityNotification = useCallback((notification: RealTimeNotification) => {
    if (notification.category === 'community') {
      const communityNotif = notification as CommunityNotification;
      
      // Only process notifications for subscribed communities
      if (!communityIds.includes(communityNotif.metadata.communityId)) {
        return;
      }

      const event: CommunityEvent = {
        id: notification.id,
        communityId: communityNotif.metadata.communityId,
        communityName: communityNotif.metadata.communityName,
        communityIcon: communityNotif.metadata.communityIcon,
        type: communityNotif.metadata.eventType,
        title: notification.title,
        description: notification.message,
        timestamp: new Date(notification.timestamp),
        urgency: notification.urgency,
        priority: notification.priority,
        metadata: communityNotif.metadata.eventData || {},
        actionable: isEventActionable(communityNotif.metadata.eventType, communityNotif.metadata.eventData),
        expiresAt: notification.expiresAt ? new Date(notification.expiresAt) : undefined
      };

      setEvents(prev => {
        // Avoid duplicates
        const exists = prev.some(e => e.id === event.id);
        if (exists) return prev;
        
        // Add new event and sort by priority and timestamp
        const updated = [event, ...prev].sort((a, b) => {
          const priorityOrder = {
            [NotificationPriority.URGENT]: 4,
            [NotificationPriority.HIGH]: 3,
            [NotificationPriority.NORMAL]: 2,
            [NotificationPriority.LOW]: 1
          };
          
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        return updated;
      });
    }
  }, [communityIds]);

  // Set up notification listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).realTimeNotificationService) {
      const service = (window as any).realTimeNotificationService;
      service.on('notification:community', handleCommunityNotification);

      return () => {
        service.off('notification:community', handleCommunityNotification);
      };
    }
  }, [handleCommunityNotification]);

  // Group events by community
  useEffect(() => {
    const groups = events.reduce((acc, event) => {
      const existingGroup = acc.find(g => g.communityId === event.communityId);
      
      if (existingGroup) {
        existingGroup.events.push(event);
        existingGroup.unreadCount++;
        if (getPriorityValue(event.priority) > getPriorityValue(existingGroup.highestPriority)) {
          existingGroup.highestPriority = event.priority;
        }
      } else {
        acc.push({
          communityId: event.communityId,
          communityName: event.communityName,
          communityIcon: event.communityIcon,
          events: [event],
          unreadCount: 1,
          highestPriority: event.priority
        });
      }
      
      return acc;
    }, [] as EventGroup[]);

    setGroupedEvents(groups);
  }, [events]);

  const isEventActionable = (eventType: string, eventData: any): boolean => {
    switch (eventType) {
      case 'event':
        return eventData?.canJoin === true;
      case 'governance':
        return eventData?.canVote === true;
      case 'contest':
        return eventData?.canParticipate === true;
      case 'announcement':
        return eventData?.requiresResponse === true;
      default:
        return false;
    }
  };

  const getPriorityValue = (priority: NotificationPriority): number => {
    const values = {
      [NotificationPriority.URGENT]: 4,
      [NotificationPriority.HIGH]: 3,
      [NotificationPriority.NORMAL]: 2,
      [NotificationPriority.LOW]: 1
    };
    return values[priority];
  };

  const getEventIcon = (eventType: string): string => {
    const icons = {
      'new_member': '👋',
      'new_post': '📝',
      'announcement': '📢',
      'event': '🎉',
      'milestone': '🏆',
      'governance': '🗳️',
      'contest': '🏅'
    };
    return icons[eventType as keyof typeof icons] || '📢';
  };

  const getEventColor = (priority: NotificationPriority): string => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'border-red-500 bg-red-50';
      case NotificationPriority.HIGH:
        return 'border-orange-500 bg-orange-50';
      case NotificationPriority.NORMAL:
        return 'border-blue-500 bg-blue-50';
      case NotificationPriority.LOW:
        return 'border-gray-400 bg-gray-50';
      default:
        return 'border-gray-400 bg-white';
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const toggleCommunityExpansion = (communityId: string) => {
    setExpandedCommunities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(communityId)) {
        newSet.delete(communityId);
      } else {
        newSet.add(communityId);
      }
      return newSet;
    });
  };

  const filteredGroups = groupedEvents.filter(group => {
    switch (filter) {
      case 'actionable':
        return group.events.some(e => e.actionable);
      case 'urgent':
        return group.highestPriority === NotificationPriority.URGENT || 
               group.highestPriority === NotificationPriority.HIGH;
      default:
        return true;
    }
  });

  const renderEvent = (event: CommunityEvent) => (
    <div
      key={event.id}
      className={`
        p-4 border-l-4 rounded-lg cursor-pointer transition-all duration-200
        ${getEventColor(event.priority)} hover:shadow-md
      `}
      onClick={() => onEventClick(event)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-2xl">{getEventIcon(event.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900 truncate">
                {event.title}
              </h4>
              {event.priority === NotificationPriority.URGENT && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  URGENT
                </span>
              )}
              {event.actionable && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  ACTION REQUIRED
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {event.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {formatTimestamp(event.timestamp)}
              </span>
              {event.expiresAt && (
                <span className="text-xs text-red-600 font-medium">
                  Expires {formatTimestamp(event.expiresAt)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {event.actionable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoinEvent(event.id);
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-full transition-colors"
            >
              {event.type === 'event' ? 'Join' :
               event.type === 'governance' ? 'Vote' :
               event.type === 'contest' ? 'Participate' : 'Respond'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismissEvent(event.id);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );

  if (filteredGroups.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-2">🏘️</div>
        <p className="text-gray-500">No community events</p>
        <p className="text-sm text-gray-400">
          {filter === 'all' ? 'Events will appear here when they happen' :
           filter === 'actionable' ? 'No events require your action right now' :
           'No urgent events at the moment'}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Community Events</h3>
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Events</option>
            <option value="actionable">Action Required</option>
            <option value="urgent">Urgent Only</option>
          </select>
          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            {events.length}
          </span>
        </div>
      </div>

      {/* Community Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div key={group.communityId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Community Header */}
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleCommunityExpansion(group.communityId)}
            >
              <div className="flex items-center space-x-3">
                <img 
                  src={group.communityIcon || '/default-community.png'} 
                  alt={group.communityName}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h4 className="font-medium text-gray-900">{group.communityName}</h4>
                  <p className="text-sm text-gray-600">
                    {group.events.length} event{group.events.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {group.unreadCount > 0 && (
                  <span className={`
                    text-white text-xs px-2 py-1 rounded-full
                    ${group.highestPriority === NotificationPriority.URGENT ? 'bg-red-500' :
                      group.highestPriority === NotificationPriority.HIGH ? 'bg-orange-500' :
                      'bg-blue-500'}
                  `}>
                    {group.unreadCount}
                  </span>
                )}
                <svg 
                  className={`w-4 h-4 transition-transform ${
                    expandedCommunities.has(group.communityId) ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Events List */}
            {expandedCommunities.has(group.communityId) && (
              <div className="divide-y divide-gray-100">
                {group.events.map(renderEvent)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityEventNotifications;