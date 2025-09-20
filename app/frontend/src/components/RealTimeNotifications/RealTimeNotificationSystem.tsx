import React, { useState, useEffect } from 'react';
import { useRealTimeNotifications } from '../../hooks/useRealTimeNotifications';
import NotificationCategorization from './NotificationCategorization';
import LiveUpdateIndicators from './LiveUpdateIndicators';
import ImmediateNotificationSystem from './ImmediateNotificationSystem';
import PriorityNotifications from './PriorityNotifications';
import LiveCommentUpdates from './LiveCommentUpdates';
import CommunityEventNotifications from './CommunityEventNotifications';
import OfflineNotificationQueue from './OfflineNotificationQueue';
import { 
  RealTimeNotification, 
  NotificationCategory,
  LiveUpdateIndicator
} from '../../types/realTimeNotifications';

interface RealTimeNotificationSystemProps {
  userId: string;
  token: string;
  communityIds?: string[];
  activePostId?: string;
  onNotificationClick?: (notification: RealTimeNotification) => void;
  onSettingsChange?: (settings: any) => void;
  className?: string;
}

const RealTimeNotificationSystem: React.FC<RealTimeNotificationSystemProps> = ({
  userId,
  token,
  communityIds = [],
  activePostId,
  onNotificationClick,
  onSettingsChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'live' | 'communities' | 'queue'>('notifications');
  const [showSettings, setShowSettings] = useState(false);

  const {
    notifications,
    unreadCount,
    liveIndicators,
    connectionStatus,
    settings,
    isConnected,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    updateSettings,
    requestDesktopPermission,
    subscribeToPost,
    unsubscribeFromPost,
    clearNotifications,
    getNotificationsByCategory
  } = useRealTimeNotifications({
    userId,
    token,
    autoConnect: true,
    maxNotifications: 100
  });

  // Handle notification clicks
  const handleNotificationClick = (notification: RealTimeNotification) => {
    markAsRead(notification.id);
    onNotificationClick?.(notification);
    
    // Navigate to notification context if it has an action URL
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Handle live indicator clicks
  const handleLiveIndicatorClick = (indicator: LiveUpdateIndicator) => {
    // Navigate to the context (post, discussion, etc.)
    if (indicator.contextId) {
      window.location.href = `/post/${indicator.contextId}`;
    }
  };

  // Handle priority notification actions
  const handlePriorityNotificationAction = (notificationId: string, action: 'vote' | 'view' | 'dismiss') => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    switch (action) {
      case 'vote':
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        break;
      case 'view':
        handleNotificationClick(notification);
        break;
      case 'dismiss':
        dismissNotification(notificationId);
        break;
    }
  };

  // Handle community event actions
  const handleCommunityEventClick = (event: any) => {
    // Navigate to community event
    window.location.href = `/community/${event.communityId}/event/${event.id}`;
  };

  const handleJoinEvent = (eventId: string) => {
    // Implement event joining logic
    console.log('Joining event:', eventId);
  };

  const handleDismissEvent = (eventId: string) => {
    dismissNotification(eventId);
  };

  // Handle offline sync
  const handleSyncComplete = (syncedCount: number) => {
    console.log(`Synced ${syncedCount} offline notifications`);
  };

  const handleRetryFailed = (failedNotifications: RealTimeNotification[]) => {
    console.log(`${failedNotifications.length} notifications failed to sync`);
  };

  // Handle live comment updates
  const handleNewComment = (comment: any) => {
    console.log('New comment:', comment);
  };

  const handleReactionUpdate = (commentId: string, reaction: any) => {
    console.log('Reaction update:', commentId, reaction);
  };

  // Settings management
  const handleSettingsUpdate = (newSettings: any) => {
    updateSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const handleRequestDesktopPermission = async () => {
    const granted = await requestDesktopPermission();
    if (granted) {
      console.log('Desktop notifications enabled');
    } else {
      console.log('Desktop notifications denied');
    }
  };

  // Connection management
  const handleReconnect = () => {
    if (!isConnected) {
      connect();
    }
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'notifications':
        return unreadCount;
      case 'live':
        return liveIndicators.length;
      case 'communities':
        return getNotificationsByCategory(NotificationCategory.COMMUNITY).length;
      case 'queue':
        // This would come from the queue component
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Real-time Notifications</h2>
          <div className="flex items-center space-x-2">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm text-gray-600 capitalize">
                {connectionStatus}
              </span>
            </div>

            {/* Reconnect Button */}
            {!isConnected && (
              <button
                onClick={handleReconnect}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Reconnect
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'live', label: 'Live Updates', icon: '📡' },
            { id: 'communities', label: 'Communities', icon: '🏘️' },
            { id: 'queue', label: 'Queue', icon: '📥' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {getTabCount(tab.id) > 0 && (
                <span className="bg-red-500 text-white text-xs px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center">
                  {getTabCount(tab.id)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Desktop Notifications</span>
              <button
                onClick={handleRequestDesktopPermission}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-lg transition-colors"
              >
                Enable
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto-connect</span>
              <input
                type="checkbox"
                checked={settings.categories[NotificationCategory.SYSTEM].enabled}
                onChange={(e) => handleSettingsUpdate({
                  categories: {
                    ...settings.categories,
                    [NotificationCategory.SYSTEM]: {
                      ...settings.categories[NotificationCategory.SYSTEM],
                      enabled: e.target.checked
                    }
                  }
                })}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sound Notifications</span>
              <input
                type="checkbox"
                checked={Object.values(settings.categories).some(cat => cat.sound)}
                onChange={(e) => {
                  const newCategories = { ...settings.categories };
                  Object.keys(newCategories).forEach(key => {
                    newCategories[key as NotificationCategory].sound = e.target.checked;
                  });
                  handleSettingsUpdate({ categories: newCategories });
                }}
                className="rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {activeTab === 'notifications' && (
          <NotificationCategorization
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAsRead={markAsRead}
            onDismiss={dismissNotification}
          />
        )}

        {activeTab === 'live' && (
          <div className="space-y-4">
            <LiveUpdateIndicators
              indicators={liveIndicators}
              onIndicatorClick={handleLiveIndicatorClick}
              onDismiss={(indicator) => {
                // Remove live indicator
                console.log('Dismissing live indicator:', indicator);
              }}
            />
            
            {activePostId && (
              <LiveCommentUpdates
                postId={activePostId}
                onNewComment={handleNewComment}
                onReactionUpdate={handleReactionUpdate}
              />
            )}
          </div>
        )}

        {activeTab === 'communities' && (
          <CommunityEventNotifications
            communityIds={communityIds}
            onEventClick={handleCommunityEventClick}
            onJoinEvent={handleJoinEvent}
            onDismissEvent={handleDismissEvent}
          />
        )}

        {activeTab === 'queue' && (
          <OfflineNotificationQueue
            onSyncComplete={handleSyncComplete}
            onRetryFailed={handleRetryFailed}
          />
        )}
      </div>

      {/* Global Components */}
      <ImmediateNotificationSystem
        onNotificationClick={handleNotificationClick}
        onNotificationDismiss={dismissNotification}
        position="top-right"
        maxVisible={5}
        autoHideDelay={5000}
      />

      <PriorityNotifications
        onNotificationAction={handlePriorityNotificationAction}
      />
    </div>
  );
};

export default RealTimeNotificationSystem;