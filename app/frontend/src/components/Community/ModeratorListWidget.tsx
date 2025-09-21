import React, { useState, useCallback } from 'react';
import { Moderator } from '../../types/community';
import { formatDistanceToNow } from 'date-fns';

export interface ModeratorListWidgetProps {
  moderators: Moderator[];
  loading?: boolean;
  error?: string | null;
  onModeratorClick?: (moderator: Moderator) => void;
}

interface ModeratorListState {
  isExpanded: boolean;
  showAllModerators: boolean;
}

/**
 * ModeratorListWidget Component
 * 
 * Displays community moderators with usernames, roles, tenure, and online status.
 * Shows special badges for different moderator roles and last active time for offline moderators.
 */
export const ModeratorListWidget: React.FC<ModeratorListWidgetProps> = ({
  moderators,
  loading = false,
  error = null,
  onModeratorClick
}) => {
  const [state, setState] = useState<ModeratorListState>({
    isExpanded: true,
    showAllModerators: false
  });

  const toggleExpansion = useCallback(() => {
    setState(prev => ({
      ...prev,
      isExpanded: !prev.isExpanded
    }));
  }, []);

  const toggleShowAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      showAllModerators: !prev.showAllModerators
    }));
  }, []);

  const handleModeratorClick = useCallback((moderator: Moderator) => {
    if (onModeratorClick) {
      onModeratorClick(moderator);
    }
  }, [onModeratorClick]);

  const getRoleBadge = (role: Moderator['role']) => {
    const badges = {
      owner: {
        text: 'Owner',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      },
      admin: {
        text: 'Admin',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      },
      moderator: {
        text: 'Mod',
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      }
    };

    const badge = badges[role];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  const getOnlineIndicator = (isOnline: boolean) => {
    return (
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
    );
  };

  const formatTenure = (days: number): string => {
    if (days < 30) {
      return `${days}d`;
    } else if (days < 365) {
      return `${Math.floor(days / 30)}mo`;
    } else {
      return `${Math.floor(days / 365)}y`;
    }
  };

  const formatLastActive = (lastActive: Date): string => {
    return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
  };

  // Sort moderators by role priority and online status
  const sortedModerators = [...moderators].sort((a, b) => {
    const rolePriority = { owner: 0, admin: 1, moderator: 2 };
    const aPriority = rolePriority[a.role];
    const bPriority = rolePriority[b.role];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // If same role, sort by online status (online first)
    if (a.isOnline !== b.isOnline) {
      return b.isOnline ? 1 : -1;
    }
    
    // If same role and online status, sort by tenure (longer first)
    return b.tenure - a.tenure;
  });

  // Show first 5 moderators by default, with option to show all
  const displayedModerators = state.showAllModerators 
    ? sortedModerators 
    : sortedModerators.slice(0, 5);

  const hasMoreModerators = sortedModerators.length > 5;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Moderators
          </h3>
        </div>
        <div className="px-4 py-6">
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Moderators
          </h3>
        </div>
        <div className="px-4 py-6">
          <div className="text-center text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (moderators.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Moderators
          </h3>
        </div>
        <div className="px-4 py-6">
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            No moderators found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={toggleExpansion}
          className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-expanded={state.isExpanded}
          aria-controls="moderator-list"
        >
          <span>Moderators ({moderators.length})</span>
          <svg
            className={`w-4 h-4 transition-transform ${state.isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Moderator List */}
      {state.isExpanded && (
        <div id="moderator-list" className="divide-y divide-gray-100 dark:divide-gray-700">
          {displayedModerators.map((moderator) => (
            <div
              key={moderator.id}
              className={`px-4 py-3 ${
                onModeratorClick 
                  ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors' 
                  : ''
              }`}
              onClick={() => handleModeratorClick(moderator)}
              role={onModeratorClick ? 'button' : undefined}
              tabIndex={onModeratorClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onModeratorClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleModeratorClick(moderator);
                }
              }}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar and Online Indicator */}
                <div className="relative flex-shrink-0">
                  {moderator.avatar ? (
                    <img
                      src={moderator.avatar}
                      alt={`${moderator.displayName || moderator.username}'s avatar`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {(moderator.displayName || moderator.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    {getOnlineIndicator(moderator.isOnline)}
                  </div>
                </div>

                {/* Moderator Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {moderator.displayName || moderator.username}
                    </span>
                    {getRoleBadge(moderator.role)}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTenure(moderator.tenure)} tenure
                    </span>
                    {!moderator.isOnline && (
                      <>
                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatLastActive(moderator.lastActive)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Show More/Less Button */}
          {hasMoreModerators && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={toggleShowAll}
                className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
              >
                {state.showAllModerators 
                  ? 'Show Less' 
                  : `Show ${moderators.length - 5} More Moderators`
                }
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModeratorListWidget;