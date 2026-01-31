import React, { useState } from 'react';
import { UserRecommendation } from '../../types/enhancedSearch';

interface UserRecommendationCardProps {
  recommendation: UserRecommendation;
  onFollow: (type: string, targetId: string) => Promise<void>;
  onBookmark: (type: string, itemId: string, title: string, description?: string) => Promise<void>;
}

export function UserRecommendationCard({
  recommendation,
  onFollow,
  onBookmark
}: UserRecommendationCardProps) {
  const [following, setFollowing] = useState(false);

  const { user, score, reason, type } = recommendation;

  const handleFollow = async () => {
    setFollowing(true);
    try {
      await onFollow('user', user.walletAddress);
    } finally {
      setFollowing(false);
    }
  };

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'mutual_connections':
        return '🤝';
      case 'shared_interests':
        return '🎯';
      case 'similar_activity':
        return '📊';
      case 'community_based':
        return '👥';
      default:
        return '✨';
    }
  };

  const getRecommendationTypeColor = (type: string) => {
    switch (type) {
      case 'mutual_connections':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300';
      case 'shared_interests':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300';
      case 'similar_activity':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300';
      case 'community_based':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
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

  // Helper to safely convert lastActive to a Date
  const getLastActiveTime = (): number => {
    if (!user.lastActive) return Date.now();

    // If it's already a Date, use it
    if (user.lastActive instanceof Date) {
      return user.lastActive.getTime();
    }

    // If it's a string, parse it
    if (typeof user.lastActive === 'string') {
      return new Date(user.lastActive).getTime();
    }

    // Fallback to current time
    return Date.now();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 relative">
      {/* Recommendation Badge */}
      <div className="absolute top-4 right-4">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationTypeColor(type)}`}>
          {getRecommendationTypeIcon(type)} {Math.round(score * 100)}%
        </div>
      </div>

      {/* User Header */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="relative mb-3">
          <img
            src={user.avatarCid || 'https://placehold.co/64'}
            alt={user.handle || 'User'}
            className="w-16 h-16 rounded-full"
          />
          
          {/* Verification Badge */}
          {user.verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          {/* Online Status */}
          <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
            Date.now() - getLastActiveTime() < 300000 ? 'bg-green-500' : 'bg-gray-400'
          }`}></div>
        </div>
        
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
          {user.handle || 'Anonymous'}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {user.ens || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
        </p>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Level {typeof user.reputation.level === 'object' && user.reputation.level !== null && 'name' in user.reputation.level
            ? String(user.reputation.level.name)
            : String(user.reputation.level)} • Active {formatTimeAgo(user.lastActive)}
        </div>
      </div>

      {/* Bio */}
      {user.bioCid && (
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 text-center">
          {user.bioCid}
        </p>
      )}

      {/* Recommendation Reason */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Why this recommendation?
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {reason}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.followersCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Followers</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.postsCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Posts</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {user.reputation.totalScore}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Reputation</div>
        </div>
      </div>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-center">
            <div className="flex space-x-1">
              {user.badges.slice(0, 3).map((badge) => (
                <span
                  key={badge.id}
                  className="text-lg"
                  title={badge.name}
                >
                  {badge.icon}
                </span>
              ))}
              {user.badges.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 self-center">
                  +{user.badges.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mutual Connections */}
      {recommendation.mutualConnections && recommendation.mutualConnections > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          {recommendation.mutualConnections} mutual connection{recommendation.mutualConnections !== 1 ? 's' : ''}
        </div>
      )}

      {/* Mutual Communities */}
      {recommendation.mutualCommunities && recommendation.mutualCommunities.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
            Mutual Communities
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {recommendation.mutualCommunities.slice(0, 2).map((community) => (
              <span
                key={community}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full"
              >
                r/{community}
              </span>
            ))}
            {recommendation.mutualCommunities.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{recommendation.mutualCommunities.length - 2}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Shared Interests */}
      {recommendation.sharedInterests && recommendation.sharedInterests.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">
            Shared Interests
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {recommendation.sharedInterests.slice(0, 2).map((interest) => (
              <span
                key={interest}
                className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {recommendation.sharedInterests.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{recommendation.sharedInterests.length - 2}
              </span>
            )}
          </div>
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