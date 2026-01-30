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
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group relative overflow-hidden"
    >
      {/* Social Proof Badge */}
      <div className="absolute top-3 right-3 flex items-center space-x-1">
        {community.mutualConnections && community.mutualConnections > 0 && (
          <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            <span>{community.mutualConnections}</span>
          </div>
        )}
        
        {community.recommendationScore && community.recommendationScore > 0.8 && (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Highly recommended for you"></div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
        {/* Community Avatar */}
        <div className="flex-shrink-0 self-start">
          {community.avatar ? (
            <img
              src={community.avatar}
              alt={community.displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
              <span className="text-white font-bold text-xl sm:text-2xl">
                {community.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
              {community.displayName}
            </h3>
            
            {/* Badges */}
            {community.featured && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full font-semibold flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Featured
              </span>
            )}
            
            {community.trending && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded-full font-semibold flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Trending
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">r/{community.name}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              {community.memberCount.toLocaleString()} members
            </span>
            <span className="hidden sm:inline">•</span>
            <span className={`flex items-center ${growth.color}`}>
              {growth.icon} {growth.text}
            </span>
          </div>

          {/* Category Tag */}
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
              {community.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 text-sm">
        {community.description}
      </p>

      {/* Tags */}
      {community.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {community.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {community.tags.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              +{community.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Engagement Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Active Members</div>
          <div className="font-bold text-gray-900 dark:text-white text-lg">
            {community.engagementMetrics.activeMembers.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            this week
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Posts</div>
          <div className="font-bold text-gray-900 dark:text-white text-lg">
            {community.engagementMetrics.postsThisWeek.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            this week
          </div>
        </div>
      </div>

      {/* Activity Score Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400 font-medium">Community Health</span>
          <span className={`font-bold ${getActivityColor(community.engagementMetrics.activityScore)}`}>
            {community.engagementMetrics.activityScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
              community.engagementMetrics.activityScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
              community.engagementMetrics.activityScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
              community.engagementMetrics.activityScore >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            style={{ width: `${community.engagementMetrics.activityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Recent Activity Preview */}
      {community.recentActivity.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Recent Activity
          </div>
          <div className="space-y-1.5">
            {community.recentActivity.slice(0, 2).map((activity, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 flex items-start space-x-2">
                <span className="flex-shrink-0 mt-0.5">
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
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          onClick={handleJoin}
          disabled={joining}
          className="flex-1 px-4 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {joining ? (
            <div className="flex items-center justify-center space-x-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Joining...</span>
            </div>
          ) : (
            'Join Community'
          )}
        </button>
        
        <div className="flex space-x-2">
          <button
            onClick={handleFollow}
            disabled={following}
            className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {following ? (
              <svg className="animate-spin h-4 w-4 mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Follow'
            )}
          </button>
          
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
    </div>
  );
}