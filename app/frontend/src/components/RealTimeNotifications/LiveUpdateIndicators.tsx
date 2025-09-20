import React, { useState, useEffect } from 'react';
import { LiveUpdateIndicator, NotificationPriority } from '../../types/realTimeNotifications';

interface LiveUpdateIndicatorsProps {
  indicators: LiveUpdateIndicator[];
  onIndicatorClick: (indicator: LiveUpdateIndicator) => void;
  onDismiss: (indicator: LiveUpdateIndicator) => void;
  className?: string;
}

interface AnimatedIndicatorProps {
  indicator: LiveUpdateIndicator;
  onClick: () => void;
  onDismiss: () => void;
}

const AnimatedIndicator: React.FC<AnimatedIndicatorProps> = ({
  indicator,
  onClick,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Pulse for high priority indicators
    if (indicator.priority === NotificationPriority.HIGH || indicator.priority === NotificationPriority.URGENT) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [indicator.priority]);

  const getIndicatorConfig = () => {
    switch (indicator.type) {
      case 'new_posts':
        return {
          icon: '📝',
          label: 'New Posts',
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50'
        };
      case 'new_comments':
        return {
          icon: '💬',
          label: 'New Comments',
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50'
        };
      case 'new_reactions':
        return {
          icon: '❤️',
          label: 'New Reactions',
          color: 'bg-pink-500',
          textColor: 'text-pink-700',
          bgColor: 'bg-pink-50'
        };
      case 'live_discussion':
        return {
          icon: '🔥',
          label: 'Live Discussion',
          color: 'bg-orange-500',
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50'
        };
      default:
        return {
          icon: '🔔',
          label: 'Update',
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const config = getIndicatorConfig();
  const isUrgent = indicator.priority === NotificationPriority.URGENT;

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
        ${shouldPulse ? 'animate-pulse' : ''}
      `}
    >
      <div
        className={`
          relative flex items-center space-x-3 p-3 rounded-lg cursor-pointer
          ${config.bgColor} border border-gray-200 hover:shadow-md transition-shadow
          ${isUrgent ? 'ring-2 ring-red-400 ring-opacity-50' : ''}
        `}
        onClick={onClick}
      >
        {/* Urgent indicator */}
        {isUrgent && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
        )}

        {/* Icon */}
        <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center text-white text-sm`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${config.textColor}`}>
              {config.label}
            </span>
            {indicator.count > 0 && (
              <span className={`${config.color} text-white text-xs px-2 py-1 rounded-full`}>
                {indicator.count > 99 ? '99+' : indicator.count}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatTimestamp(indicator.lastUpdate)}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);

  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const LiveUpdateIndicators: React.FC<LiveUpdateIndicatorsProps> = ({
  indicators,
  onIndicatorClick,
  onDismiss,
  className = ''
}) => {
  const [visibleIndicators, setVisibleIndicators] = useState<LiveUpdateIndicator[]>([]);

  useEffect(() => {
    // Sort indicators by priority and timestamp
    const sortedIndicators = [...indicators].sort((a, b) => {
      const priorityOrder = {
        [NotificationPriority.URGENT]: 4,
        [NotificationPriority.HIGH]: 3,
        [NotificationPriority.NORMAL]: 2,
        [NotificationPriority.LOW]: 1
      };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
    });

    setVisibleIndicators(sortedIndicators);
  }, [indicators]);

  const handleDismiss = (indicator: LiveUpdateIndicator) => {
    // Animate out
    setVisibleIndicators(prev => prev.filter(i => 
      !(i.type === indicator.type && i.contextId === indicator.contextId)
    ));
    
    // Call parent dismiss handler after animation
    setTimeout(() => {
      onDismiss(indicator);
    }, 300);
  };

  if (visibleIndicators.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header for multiple indicators */}
      {visibleIndicators.length > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Live Updates ({visibleIndicators.length})</span>
          <button
            onClick={() => {
              visibleIndicators.forEach(indicator => handleDismiss(indicator));
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss all"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Indicators */}
      <div className="space-y-2">
        {visibleIndicators.map((indicator, index) => (
          <AnimatedIndicator
            key={`${indicator.type}-${indicator.contextId}-${index}`}
            indicator={indicator}
            onClick={() => onIndicatorClick(indicator)}
            onDismiss={() => handleDismiss(indicator)}
          />
        ))}
      </div>

      {/* Floating summary for many indicators */}
      {visibleIndicators.length > 3 && (
        <div className="mt-3 p-2 bg-gray-100 rounded-lg text-center">
          <span className="text-sm text-gray-600">
            {visibleIndicators.length} active updates
          </span>
          <button
            onClick={() => {
              visibleIndicators.forEach(indicator => onIndicatorClick(indicator));
            }}
            className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveUpdateIndicators;