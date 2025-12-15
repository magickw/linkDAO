import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  RealTimeNotification, 
  NotificationCategory, 
  NotificationPriority,
  NotificationUrgency,
  MentionNotification,
  TipNotification,
  ReactionNotification
} from '../../types/realTimeNotifications';

interface ImmediateNotificationSystemProps {
  // Accept any notification-like payload here because the toast shape (ToastNotification)
  // differs from the RealTimeNotification type used elsewhere. We keep this loose to
  // avoid unsafe casts at the call sites and let callers handle the shape they expect.
  onNotificationClick: (notification: any) => void;
  onNotificationDismiss: (notificationId: string) => void;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoHideDelay?: number;
}

interface ToastNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  urgency: NotificationUrgency;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string;
  metadata: Record<string, any>;
  expiresAt?: Date;
  isVisible: boolean;
  isExiting: boolean;
  showTime: number;
}

const ImmediateNotificationToast: React.FC<{
  notification: ToastNotification;
  onDismiss: () => void;
  onClick: () => void;
  autoHideDelay: number;
}> = ({ notification, onDismiss, onClick, autoHideDelay }) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || notification.priority === NotificationPriority.URGENT) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - (100 / (autoHideDelay / 100));
        if (newProgress <= 0) {
          onDismiss();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, autoHideDelay, onDismiss, notification.priority]);

  const getNotificationIcon = () => {
    switch (notification.category) {
      case NotificationCategory.MENTION:
        return notification.metadata.mentionedByAvatar || '/images/default-avatar.png';
      case NotificationCategory.TIP:
        return notification.metadata.tipperAvatar || '/images/default-avatar.png';
      case NotificationCategory.REACTION:
        return notification.metadata.reactorAvatar || '/images/default-avatar.png';
      default:
        return '/icons/notification-default.png';
    }
  };

  const getNotificationColor = () => {
    switch (notification.priority) {
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

  const getCategoryIcon = () => {
    switch (notification.category) {
      case NotificationCategory.MENTION: return '👤';
      case NotificationCategory.TIP: return '💰';
      case NotificationCategory.GOVERNANCE: return '🏛️';
      case NotificationCategory.COMMUNITY: return '👥';
      case NotificationCategory.REACTION: return '❤️';
      case NotificationCategory.COMMENT: return '💬';
      case NotificationCategory.FOLLOW: return '👥';
      case NotificationCategory.SYSTEM: return '⚙️';
      default: return '🔔';
    }
  };

  const renderNotificationContent = () => {
    switch (notification.category) {
      case NotificationCategory.MENTION:
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={getNotificationIcon()} 
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.metadata.mentionedByUsername} mentioned you
              </p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {notification.metadata.context}
              </p>
            </div>
          </div>
        );

      case NotificationCategory.TIP:
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={getNotificationIcon()} 
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.metadata.tipperUsername} tipped you
              </p>
              <p className="text-sm font-bold text-green-600">
                {notification.metadata.tipAmount} {notification.metadata.tokenSymbol}
              </p>
              {notification.metadata.message && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                  "{notification.metadata.message}"
                </p>
              )}
            </div>
          </div>
        );

      case NotificationCategory.REACTION:
        return (
          <div className="flex items-start space-x-3">
            <img 
              src={getNotificationIcon()} 
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {notification.metadata.reactorUsername} reacted {notification.metadata.reactionEmoji}
              </p>
              {notification.metadata.tokenAmount && (
                <p className="text-xs text-green-600 font-medium">
                  {notification.metadata.tokenAmount} tokens staked
                </p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-lg">{getCategoryIcon()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 ${getNotificationColor()}
        transform transition-all duration-300 ease-out cursor-pointer
        ${notification.isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${notification.isExiting ? 'translate-x-full opacity-0' : ''}
        hover:shadow-xl hover:scale-105
      `}
      onClick={onClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Priority indicator */}
      {notification.priority === NotificationPriority.URGENT && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}

      {/* Content */}
      <div className="p-4">
        {renderNotificationContent()}
      </div>

      {/* Progress bar */}
      {notification.priority !== NotificationPriority.URGENT && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Category badge */}
      <div className="absolute top-2 left-2 text-lg">
        {getCategoryIcon()}
      </div>
    </div>
  );
};

const ImmediateNotificationSystem: React.FC<ImmediateNotificationSystemProps> = ({
  onNotificationClick,
  onNotificationDismiss,
  maxVisible = 5,
  position = 'top-right',
  autoHideDelay = 5000
}) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create container for notifications
    const notificationContainer = document.createElement('div');
    notificationContainer.id = 'immediate-notifications';
    notificationContainer.className = getContainerClasses();
    document.body.appendChild(notificationContainer);
    setContainer(notificationContainer);

    return () => {
      if (document.body.contains(notificationContainer)) {
        document.body.removeChild(notificationContainer);
      }
    };
  }, [position]);

  const getContainerClasses = () => {
    const baseClasses = 'fixed z-50 pointer-events-none';
    const spacing = 'p-4 space-y-3';
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-0 right-0 ${spacing}`;
      case 'top-left':
        return `${baseClasses} top-0 left-0 ${spacing}`;
      case 'bottom-right':
        return `${baseClasses} bottom-0 right-0 ${spacing}`;
      case 'bottom-left':
        return `${baseClasses} bottom-0 left-0 ${spacing}`;
      default:
        return `${baseClasses} top-0 right-0 ${spacing}`;
    }
  };

  const addNotification = useCallback((notification: RealTimeNotification) => {
    const toastNotification: ToastNotification = {
      id: notification.id,
      userId: notification.userId,
      category: notification.category,
      priority: notification.priority,
      urgency: notification.urgency,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      read: notification.read,
      dismissed: notification.dismissed,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      expiresAt: notification.expiresAt,
      isVisible: false,
      isExiting: false,
      showTime: Date.now()
    };

    setToasts(prev => {
      const newToasts = [toastNotification, ...prev].slice(0, maxVisible);
      
      // Animate in the new notification
      setTimeout(() => {
        setToasts(current => 
          current.map(toast => 
            toast.id === notification.id 
              ? { ...toast, isVisible: true }
              : toast
          )
        );
      }, 100);

      return newToasts;
    });
  }, [maxVisible]);

  const removeNotification = useCallback((notificationId: string) => {
    setToasts(prev => 
      prev.map(toast => 
        toast.id === notificationId 
          ? { ...toast, isExiting: true }
          : toast
      )
    );

    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== notificationId));
      onNotificationDismiss(notificationId);
    }, 300);
  }, [onNotificationDismiss]);

  const handleNotificationClick = useCallback((notification: ToastNotification) => {
    onNotificationClick(notification);
    removeNotification(notification.id);
  }, [onNotificationClick, removeNotification]);

  // Expose the addNotification method globally
  useEffect(() => {
    (window as any).addImmediateNotification = addNotification;
    return () => {
      delete (window as any).addImmediateNotification;
    };
  }, [addNotification]);

  if (!container) return null;

  return createPortal(
    <div className="space-y-3">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ImmediateNotificationToast
            notification={toast}
            onDismiss={() => removeNotification(toast.id)}
            onClick={() => handleNotificationClick(toast)}
            autoHideDelay={autoHideDelay}
          />
        </div>
      ))}
    </div>,
    container
  );
};

export default ImmediateNotificationSystem;