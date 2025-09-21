import React, { useState } from 'react';
import { EnhancedUserProfile } from '../../types/enhancedSearch';

interface UserResultCardProps {
  user: EnhancedUserProfile;
  position: number;
  onClick: (id: string) => void;
  onFollow: (id: string) => Promise<void>;
  onBookmark: (id: string, title: string, description?: string) => Promise<void>;
}

export function UserResultCard({
  user,
  position,
  onClick,
  onFollow,
  onBookmark
}: UserResultCardProps) {
  const [following, setFollowing] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(true);
    try {
      await onFollow(user.walletAddress);
    } finally {
      setFollowing(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      await onBookmark(user.walletAddress, user.handle || 'User', user.bioCid);
    } finally {
      setBookmarking(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const getReputationColor = (level: number) => {
    if (level >= 80) return 'text-purple-600 dark:text-purple-400';
    if (level >= 60) return 'text-blue-600 dark:text-blue-400';
    if (level >= 40) return 'text-green-600 dark:text-green-400';
    if (level >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getActivityColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      case 'epic':
        return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
      case 'rare':
        return 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <div
      onClick={() => onClick(user.walletAddress)}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group relative"
    >
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        {/* User Avatar */}
        <div className="flex-shrink-0 relative">
          <img
            src={user.avatarCid || 'https://placehold.co/48'}
            alt={user.handle || 'User'}
            className="w-12 h-12 rounded-full"
          />
          
          {/* Online Status */}
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
            Date.now() - user.lastActive.getTime() < 300000 ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {user.handle || 'Anonymous'}
            </h3>
            
            {/* Verification Badge */}
            {user.verified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {user.ens || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
          </p>
          
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Level {user.reputation.level}</span>
            <span>•</span>
            <span>Last active {formatTimeAgo(user.lastActive)}</span>
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

      {/* Bio */}
      {user.bioCid && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
          {user.bioCid}
        </p>
      )}

      {/* Reputation */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500 dark:text-gray-400">Reputation</span>
          <span className={`font-medium ${getReputationColor(user.reputation.totalScore)}`}>
            {user.reputation.totalScore.toLocaleString()}
            {user.reputation.rank && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                (#{user.reputation.rank})
              </span>
            )}
          </span>
        </div>
        
        {/* Reputation Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Posting:</span>
            <span className="text-gray-900 dark:text-white">{user.reputation.breakdown.posting}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Governance:</span>
            <span className="text-gray-900 dark:text-white">{user.reputation.breakdown.governance}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Community:</span>
            <span className="text-gray-900 dark:text-white">{user.reputation.breakdown.community}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Trading:</span>
            <span className="text-gray-900 dark:text-white">{user.reputation.breakdown.trading}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Badges</div>
          <div className="flex flex-wrap gap-1">
            {user.badges.slice(0, 3).map((badge) => (
              <span
                key={badge.id}
                className={`px-2 py-1 text-xs rounded-full font-medium ${getBadgeColor(badge.rarity)}`}
                title={badge.description}
              >
                {badge.icon} {badge.name}
              </span>
            ))}
            {user.badges.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                +{user.badges.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.followersCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Followers</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.followingCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Following</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.postsCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
        </div>
      </div>

      {/* Activity Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500 dark:text-gray-400">Activity</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {user.activityScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getActivityColor(user.activityScore)}`}
            style={{ width: `${user.activityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Mutual Connections */}
      {user.mutualConnections > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            {user.mutualConnections} mutual connection{user.mutualConnections !== 1 ? 's' : ''}
          </div>
          
          {/* Mutual Communities */}
          {user.mutualCommunities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {user.mutualCommunities.slice(0, 3).map((community) => (
                <span
                  key={community}
                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full"
                >
                  r/{community}
                </span>
              ))}
              {user.mutualCommunities.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{user.mutualCommunities.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Follow Button */}
      <button
        onClick={handleFollow}
        disabled={following}
        className="w-full px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {following ? (
          <div className="flex items-center justify-center space-x-1">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Following...</span>
          </div>
        ) : (
          'Follow'
        )}
      </button>
    </div>
  );
}