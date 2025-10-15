import React from 'react';
import { Bell, Vote, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface GovernanceNotificationBadgeProps {
  count: number;
  type?: 'pending' | 'urgent' | 'expiring' | 'completed';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * GovernanceNotificationBadge Component
 * 
 * Displays governance notification badges with different types and urgency levels.
 * Used to show pending votes, expiring proposals, and other governance activities.
 * 
 * Requirements: 1.7 (governance notification badges on community icons)
 */
export const GovernanceNotificationBadge: React.FC<GovernanceNotificationBadgeProps> = ({
  count,
  type = 'pending',
  size = 'sm',
  showIcon = true,
  showLabel = false,
  onClick,
  className = ''
}) => {
  const getTypeConfig = (type: 'pending' | 'urgent' | 'expiring' | 'completed') => {
    switch (type) {
      case 'urgent':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          pulseColor: 'bg-red-400',
          label: 'Urgent',
          shouldPulse: true
        };
      case 'expiring':
        return {
          icon: Clock,
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          pulseColor: 'bg-orange-400',
          label: 'Expiring',
          shouldPulse: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          pulseColor: 'bg-green-400',
          label: 'Completed',
          shouldPulse: false
        };
      case 'pending':
      default:
        return {
          icon: Vote,
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          pulseColor: 'bg-blue-400',
          label: 'Pending',
          shouldPulse: false
        };
    }
  };

  const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-5 h-5',
          text: 'text-xs',
          icon: 'w-3 h-3',
          padding: 'px-1.5 py-0.5'
        };
      case 'md':
        return {
          container: 'w-6 h-6',
          text: 'text-sm',
          icon: 'w-4 h-4',
          padding: 'px-2 py-1'
        };
      case 'lg':
        return {
          container: 'w-8 h-8',
          text: 'text-base',
          icon: 'w-5 h-5',
          padding: 'px-3 py-1.5'
        };
      default:
        return {
          container: 'w-5 h-5',
          text: 'text-xs',
          icon: 'w-3 h-3',
          padding: 'px-1.5 py-0.5'
        };
    }
  };

  const typeConfig = getTypeConfig(type);
  const sizeConfig = getSizeConfig(size);
  const { icon: TypeIcon } = typeConfig;

  const displayCount = count > 99 ? '99+' : count.toString();

  if (count === 0) return null;

  const badgeContent = (
    <div
      className={`
        relative inline-flex items-center justify-center rounded-full font-medium
        ${typeConfig.bgColor} ${typeConfig.textColor} ${sizeConfig.container}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `}
      onClick={onClick}
      title={`${count} ${typeConfig.label.toLowerCase()} governance notification${count > 1 ? 's' : ''}`}
    >
      {/* Pulse Animation for Urgent/Expiring */}
      {typeConfig.shouldPulse && (
        <div className={`
          absolute inset-0 rounded-full animate-ping
          ${typeConfig.pulseColor} opacity-75
        `} />
      )}
      
      {/* Content */}
      <div className="relative flex items-center justify-center">
        {showIcon && size !== 'sm' && (
          <TypeIcon className={`${sizeConfig.icon} mr-1`} />
        )}
        <span className={`${sizeConfig.text} font-bold`}>
          {displayCount}
        </span>
      </div>
    </div>
  );

  if (showLabel) {
    return (
      <div className="inline-flex items-center space-x-2">
        {badgeContent}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {typeConfig.label} Vote{count > 1 ? 's' : ''}
        </span>
      </div>
    );
  }

  return badgeContent;
};

export default GovernanceNotificationBadge;