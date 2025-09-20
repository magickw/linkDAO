import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GovernanceNotification, 
  NotificationPriority,
  RealTimeNotification
} from '../../types/realTimeNotifications';

interface PriorityNotificationsProps {
  onNotificationAction: (notificationId: string, action: 'vote' | 'view' | 'dismiss') => void;
  className?: string;
}

interface PriorityNotificationModalProps {
  notification: GovernanceNotification;
  onAction: (action: 'vote' | 'view' | 'dismiss') => void;
  onClose: () => void;
}

const PriorityNotificationModal: React.FC<PriorityNotificationModalProps> = ({
  notification,
  onAction,
  onClose
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');

  useEffect(() => {
    if (!notification.metadata.votingDeadline) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const deadline = new Date(notification.metadata.votingDeadline!);
      const diff = deadline.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Voting ended');
        setUrgencyLevel('critical');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const days = Math.floor(hours / 24);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours % 24}h remaining`);
        setUrgencyLevel(days < 2 ? 'high' : 'medium');
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
        setUrgencyLevel(hours < 6 ? 'critical' : 'high');
      } else {
        setTimeRemaining(`${minutes}m remaining`);
        setUrgencyLevel('critical');
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [notification.metadata.votingDeadline]);

  const getUrgencyStyles = () => {
    switch (urgencyLevel) {
      case 'critical':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700',
          pulse: 'animate-pulse'
        };
      case 'high':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700',
          pulse: ''
        };
      case 'medium':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          pulse: ''
        };
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700',
          pulse: ''
        };
    }
  };

  const styles = getUrgencyStyles();

  const getActionText = () => {
    switch (notification.metadata.action) {
      case 'created':
        return 'A new governance proposal has been created';
      case 'voting_started':
        return 'Voting has started on a governance proposal';
      case 'voting_ending':
        return 'Voting is ending soon on a governance proposal';
      case 'executed':
        return 'A governance proposal has been executed';
      case 'rejected':
        return 'A governance proposal has been rejected';
      default:
        return 'Governance proposal update';
    }
  };

  const getQuorumStatus = () => {
    if (!notification.metadata.quorumStatus) return null;

    const statusConfig = {
      'met': { text: 'Quorum met ✓', color: 'text-green-600' },
      'not_met': { text: 'Quorum not met', color: 'text-red-600' },
      'approaching': { text: 'Approaching quorum', color: 'text-yellow-600' }
    };

    const config = statusConfig[notification.metadata.quorumStatus];
    return (
      <div className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </div>
    );
  };

  const getUserVoteStatus = () => {
    if (!notification.metadata.userVoteStatus) return null;

    return notification.metadata.userVoteStatus === 'voted' ? (
      <div className="text-sm text-green-600 font-medium">
        ✓ You have voted
      </div>
    ) : (
      <div className="text-sm text-orange-600 font-medium">
        ⚠️ You haven't voted yet
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div 
        className={`
          relative max-w-md w-full bg-white rounded-lg shadow-xl border-l-4 
          ${styles.border} ${styles.bg} ${styles.pulse}
        `}
      >
        {/* Urgent indicator */}
        {urgencyLevel === 'critical' && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
        )}

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🏛️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Governance Alert
                </h3>
                <p className={`text-sm ${styles.text}`}>
                  {getActionText()}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h4 className="font-semibold text-gray-900 mb-3">
            {notification.metadata.proposalTitle}
          </h4>

          {/* Time remaining */}
          {notification.metadata.votingDeadline && (
            <div className={`mb-4 p-3 rounded-lg ${styles.bg} border ${styles.border}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Voting Deadline:
                </span>
                <span className={`text-sm font-bold ${styles.text}`}>
                  {timeRemaining}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(notification.metadata.votingDeadline).toLocaleString()}
              </div>
            </div>
          )}

          {/* Status indicators */}
          <div className="space-y-2 mb-6">
            {getQuorumStatus()}
            {getUserVoteStatus()}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {notification.metadata.userVoteStatus === 'not_voted' && 
             notification.metadata.action !== 'executed' && 
             notification.metadata.action !== 'rejected' && (
              <button
                onClick={() => onAction('vote')}
                className={`
                  flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors
                  ${styles.button}
                `}
              >
                Vote Now
              </button>
            )}
            
            <button
              onClick={() => onAction('view')}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              View Details
            </button>
            
            <button
              onClick={() => onAction('dismiss')}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Progress bar for time remaining */}
        {notification.metadata.votingDeadline && urgencyLevel !== 'critical' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${
                urgencyLevel === 'critical' ? 'bg-red-500' :
                urgencyLevel === 'high' ? 'bg-orange-500' :
                urgencyLevel === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${Math.max(0, Math.min(100, 
                  (new Date(notification.metadata.votingDeadline).getTime() - Date.now()) / 
                  (24 * 60 * 60 * 1000) * 100
                ))}%` 
              }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

const PriorityNotifications: React.FC<PriorityNotificationsProps> = ({
  onNotificationAction,
  className = ''
}) => {
  const [priorityNotifications, setPriorityNotifications] = useState<GovernanceNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<GovernanceNotification | null>(null);

  const addPriorityNotification = (notification: RealTimeNotification) => {
    if (notification.category === 'governance' && 
        notification.priority === NotificationPriority.URGENT) {
      const govNotification = notification as GovernanceNotification;
      
      setPriorityNotifications(prev => {
        // Avoid duplicates
        const exists = prev.some(n => n.id === govNotification.id);
        if (exists) return prev;
        
        return [govNotification, ...prev];
      });

      // Show immediately if no current notification
      if (!currentNotification) {
        setCurrentNotification(govNotification);
      }
    }
  };

  const handleNotificationAction = (action: 'vote' | 'view' | 'dismiss') => {
    if (!currentNotification) return;

    onNotificationAction(currentNotification.id, action);
    
    // Remove current notification and show next
    setPriorityNotifications(prev => {
      const filtered = prev.filter(n => n.id !== currentNotification.id);
      setCurrentNotification(filtered.length > 0 ? filtered[0] : null);
      return filtered;
    });
  };

  const handleClose = () => {
    handleNotificationAction('dismiss');
  };

  // Expose method to add priority notifications
  useEffect(() => {
    (window as any).addPriorityNotification = addPriorityNotification;
    return () => {
      delete (window as any).addPriorityNotification;
    };
  }, [currentNotification]);

  // Auto-show next notification when current is dismissed
  useEffect(() => {
    if (!currentNotification && priorityNotifications.length > 0) {
      setCurrentNotification(priorityNotifications[0]);
    }
  }, [currentNotification, priorityNotifications]);

  return (
    <div className={className}>
      {currentNotification && (
        <PriorityNotificationModal
          notification={currentNotification}
          onAction={handleNotificationAction}
          onClose={handleClose}
        />
      )}
      
      {/* Queue indicator */}
      {priorityNotifications.length > 1 && (
        <div className="fixed bottom-4 right-4 z-40 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {priorityNotifications.length - 1} more governance alerts
            </span>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityNotifications;