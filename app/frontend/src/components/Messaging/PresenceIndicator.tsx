import React from 'react';

interface PresenceIndicatorProps {
  isOnline: boolean;
  lastSeen?: Date;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  isOnline,
  lastSeen,
  size = 'sm',
  showText = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className={`
          ${sizeClasses[size]}
          rounded-full
          ${isOnline
            ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]'
            : 'bg-gray-400'
          }
        `}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
      {showText && (
        <span className="text-xs text-gray-400">
          {isOnline ? 'Online' : lastSeen ? formatLastSeen(lastSeen) : 'Offline'}
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
