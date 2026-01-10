/**
 * NotificationToast Component
 * Toast notification for real-time alerts
 * Implements requirements 6.1, 6.3 from the interconnected social platform spec
 */

import React, { useEffect, useState } from 'react';
import { Notification } from './NotificationSystem';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onAction?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Animation and auto-dismiss logic
  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Auto-dismiss timer based on priority
    const dismissDelay = notification.priority === 'urgent' ? 10000 :
      notification.priority === 'high' ? 7000 : 5000;

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (dismissDelay / 100));
        if (newProgress <= 0) {
          clearInterval(progressInterval);
          handleDismiss();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, dismissDelay);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
      clearInterval(progressInterval);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  };

  const getToastStyles = () => {
    const baseStyles = 'transform transition-all duration-300 ease-in-out';

    if (!isVisible) {
      return `${baseStyles} translate-x-full opacity-0`;
    }

    return `${baseStyles} translate-x-0 opacity-100`;
  };

  const getPriorityStyles = () => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-l-4 border-gray-500 bg-white dark:bg-gray-800';
    }
  };

  const getNotificationIcon = () => {
    const iconClass = "w-5 h-5";

    switch (notification.type) {
      case 'message':
        return (
          <svg className={`${iconClass} text-blue-600 dark:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'reaction':
        return (
          <svg className={`${iconClass} text-red-600 dark:text-red-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'mention':
        return (
          <svg className={`${iconClass} text-yellow-600 dark:text-yellow-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        );
      case 'community':
        return (
          <svg className={`${iconClass} text-green-600 dark:text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'governance':
        return (
          <svg className={`${iconClass} text-purple-600 dark:text-purple-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'system':
        return (
          <svg className={`${iconClass} text-gray-600 dark:text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'tip':
        return (
          <span className="text-xl">💰</span>
        );
      case 'bookmark':
        return (
          <span className="text-xl">🔖</span>
        );
      case 'award':
        return (
          <span className="text-xl">🏆</span>
        );
      case 'new_comment':
      case 'comment_reply':
      case 'post_reply':
        return (
          <svg className={`${iconClass} text-blue-600 dark:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'post_upvote':
      case 'comment_upvote':
        return (
          <span className="text-xl">⬆️</span>
        );
      case 'post_downvote':
      case 'comment_downvote':
        return (
          <span className="text-xl">⬇️</span>
        );
      default:
        return (
          <svg className={`${iconClass} text-blue-600 dark:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  };

  return (
    <div className={`${getToastStyles()} max-w-sm w-full`}>
      <div className={`
        rounded-lg shadow-lg overflow-hidden
        ${getPriorityStyles()}
      `}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Icon or Avatar */}
            <div className="flex-shrink-0">
              {notification.avatarUrl ? (
                <img
                  src={notification.avatarUrl}
                  alt={notification.fromName || 'User'}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {getNotificationIcon()}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {notification.message}
                  </p>

                  {notification.fromName && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      from {notification.fromName}
                    </p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Action buttons */}
              {(notification.actionUrl || onAction) && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      if (onAction) {
                        onAction();
                      }
                      handleDismiss();
                    }}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {notification.type === 'message' ? 'Reply' :
                      notification.type === 'community' ? 'View' :
                        notification.type === 'governance' ? 'Vote' :
                          'View'}
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Priority indicator */}
        {notification.priority === 'urgent' && (
          <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-xs font-medium">Urgent</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NotificationToast;