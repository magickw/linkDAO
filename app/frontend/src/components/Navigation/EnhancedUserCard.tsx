import React from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  reputation?: {
    level: string;
    totalScore: number;
  };
}

interface EnhancedUserCardProps {
  user: User;
  onClick?: () => void;
  className?: string;
}

export const EnhancedUserCard: React.FC<EnhancedUserCardProps> = ({
  user,
  onClick,
  className = ''
}) => {
  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${className}`}
      onClick={onClick}
    >
      <img
        src={user.avatar}
        alt={user.displayName}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {user.displayName}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          @{user.username}
        </div>
        {user.reputation && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            {typeof user.reputation.level === 'string' 
              ? user.reputation.level 
              : (user.reputation.level as any)?.name || 'Level'} • {user.reputation.totalScore} pts
          </div>
        )}
      </div>
    </div>
  );
};