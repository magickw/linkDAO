import React, { useState } from 'react';
import { CommunityWithIcons } from '@/types/navigation';

interface CommunityIconListProps {
  communities: CommunityWithIcons[];
  activeCommunityId?: string;
  onCommunitySelect: (communityId: string) => void;
  onCommunityToggle: (communityId: string) => void;
  showAllCommunities: boolean;
  onToggleShowAll: () => void;
  className?: string;
}

export default function CommunityIconList({
  communities,
  activeCommunityId,
  onCommunitySelect,
  onCommunityToggle,
  showAllCommunities,
  onToggleShowAll,
  className = ''
}: CommunityIconListProps) {
  const [hoveredCommunity, setHoveredCommunity] = useState<string | null>(null);

  // Filter joined communities
  const joinedCommunities = communities.filter(c => c.isJoined);
  const availableCommunities = communities.filter(c => !c.isJoined);

  // Display limited communities or all based on state
  const displayedJoinedCommunities = showAllCommunities 
    ? joinedCommunities 
    : joinedCommunities.slice(0, 5);

  const getActivityIndicatorColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-purple-600 dark:text-purple-400';
      case 'moderator': return 'text-blue-600 dark:text-blue-400';
      case 'member': return 'text-gray-600 dark:text-gray-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={className}>
      {/* Joined Communities Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          My Communities
        </div>
        <div className="flex items-center space-x-2">
          {joinedCommunities.length > 5 && (
            <button
              onClick={onToggleShowAll}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              {showAllCommunities ? 'Show Less' : `+${joinedCommunities.length - 5} more`}
            </button>
          )}
        </div>
      </div>

      {joinedCommunities.length > 0 ? (
        <div className="space-y-1 mb-6">
          {displayedJoinedCommunities.map((community) => (
            <div
              key={community.id}
              className="relative"
              onMouseEnter={() => setHoveredCommunity(community.id)}
              onMouseLeave={() => setHoveredCommunity(null)}
            >
              <button
                onClick={() => onCommunitySelect(community.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  activeCommunityId === community.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200 shadow-sm'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                {/* Community Icon/Avatar */}
                <div className="relative mr-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-lg">
                    {community.icon || community.avatar}
                  </div>
                  
                  {/* Activity Indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${getActivityIndicatorColor(community.activityLevel)}`}></div>
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium truncate">{community.displayName}</div>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className={getRoleColor(community.userRole.type)}>
                      {community.userRole.type}
                    </span>
                    <span>•</span>
                    <span>{community.memberCount.toLocaleString()} members</span>
                  </div>
                </div>

                {/* Unread Count Badge */}
                {community.unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 text-xs bg-primary-500 text-white rounded-full font-medium animate-pulse">
                    {community.unreadCount > 99 ? '99+' : community.unreadCount}
                  </span>
                )}
              </button>

              {/* Hover Preview */}
              {hoveredCommunity === community.id && (
                <div className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xl">
                      {community.icon || community.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {community.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {community.memberCount.toLocaleString()} members
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    Last activity: {formatLastActivity(community.lastActivity)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${getRoleColor(community.userRole.type)}`}>
                      {community.userRole.type.charAt(0).toUpperCase() + community.userRole.type.slice(1)}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getActivityIndicatorColor(community.activityLevel)}`}></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            No communities joined yet
          </p>
        </div>
      )}

      {/* Discover Communities Section */}
      {availableCommunities.length > 0 && (
        <>
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Discover
          </div>
          <div className="space-y-1">
            {availableCommunities.slice(0, 3).map((community) => (
              <div
                key={community.id}
                className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-lg mr-3">
                  {community.icon || community.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {community.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {community.memberCount.toLocaleString()} members
                  </div>
                </div>
                <button
                  onClick={() => onCommunityToggle(community.id)}
                  className="ml-2 px-3 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors font-medium"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}