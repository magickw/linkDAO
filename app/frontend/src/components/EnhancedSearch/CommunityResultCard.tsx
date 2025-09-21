import React, { useState } from 'react';
import { EnhancedCommunity } from '../../types/enhancedSearch';

interface CommunityResultCardProps {
  community: EnhancedCommunity;
  position: number;
  onClick: (id: string) => void;
  onFollow: (id: string) => Promise<void>;
  onJoin: (id: string) => Promise<void>;
  onBookmark: (id: string, title: string, description?: string) => Promise<void>;
}

export function CommunityResultCard({
  community,
  position,
  onClick,
  onFollow,
  onJoin,
  onBookmark
}: CommunityResultCardProps) {
  const [following, setFollowing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(true);
    try {
      await onFollow(community.id);
    } finally {
      setFollowing(false);
    }
  };

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setJoining(true);
    try {
      await onJoin(community.id);
    } finally {
      setJoining(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      await onBookmark(community.id, community.displayName, community.description);
    } finally {
      setBookmarking(false);
    }
  };

  const getActivityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGrowthIndicator = (rate: number) => {
    if (rate > 0.1) return { icon: '📈', color: 'text-green-600 dark:text-green-400', text: 'Fast Growing' };
    if (rate > 0.05) return { icon: '📊', color: 'text-blue-600 dark:text-blue-400', text: 'Growing' };
    if (rate > 0) return { icon: '➡️', color: 'text-gray-600 dark:text-gray-400', text: 'Stable' };
    return { icon: '📉', color: 'text-red-600 dark:text-red-400', text: 'Declining' };
  };

  const growth = getGrowthIndicator(community.engagementMetrics.growthRate);

  return (
    <div
      onClick={() => onClick(community.id)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group relative"
    >
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        {/* Community Avatar */}
        <div className="flex-shrink-0">
          {community.avatar ? (
            <img
              src={community.avatar}
              alt={community.displayName}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {community.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {community.displayName}
            </h3>
            
            {/* Badges */}
            {community.featured && (
              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 text-xs rounded-full font-medium">
                ⭐ Featured
              </span>
            )}
            
            {community.trending && (
              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full font-medium">
                🔥 Trending
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            r/{community.name}
          </p>
          
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{community.memberCount.toLocaleString()} members</span>
            <span>•</span>
            <span className={growth.color}>
              {growth.icon} {growth.text}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Bookmark"
          >
            {bookmarking ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
        {community.description}
      </p>

      {/* Category and Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs rounded-full font-medium">
          {community.category}
        </span>
        {community.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
        {community.tags.length > 2 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            +{community.tags.length - 2}
          </span>
        )}
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Active Members</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {community.engagementMetrics.activeMembers.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Posts This Week</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {community.engagementMetrics.postsThisWeek.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Activity Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500 dark:text-gray-400">Activity Score</span>
          <span className={`font-medium ${getActivityColor(community.engagementMetrics.activityScore)}`}>
            {community.engagementMetrics.activityScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              community.engagementMetrics.activityScore >= 80 ? 'bg-green-500' :
              community.engagementMetrics.activityScore >= 60 ? 'bg-yellow-500' :
              community.engagementMetrics.activityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${community.engagementMetrics.activityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Recent Activity */}
      {community.recentActivity.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Activity</div>
          <div className="space-y-1">
            {community.recentActivity.slice(0, 2).map((activity, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                <span className="flex-shrink-0">
                  {activity.type === 'post' && '📝'}
                  {activity.type === 'comment' && '💬'}
                  {activity.type === 'member_joined' && '👋'}
                  {activity.type === 'event' && '📅'}
                </span>
                <span className="truncate">{activity.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleJoin}
          disabled={joining}
          className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {joining ? (
            <div className="flex items-center justify-center space-x-1">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Joining...</span>
            </div>
          ) : (
            'Join Community'
          )}
        </button>
        
        <button
          onClick={handleFollow}
          disabled={following}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {following ? (
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Follow'
          )}
        </button>
      </div>

      {/* Mutual Connections */}
      {community.mutualConnections && community.mutualConnections > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {community.mutualConnections} mutual connection{community.mutualConnections !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Recommendation Score Indicator */}
      {community.recommendationScore && community.recommendationScore > 0.8 && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full" title="Highly recommended for you"></div>
      )}
    </div>
  );
}