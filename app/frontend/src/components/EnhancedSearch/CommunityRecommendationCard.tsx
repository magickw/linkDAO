import React, { useState } from 'react';
import { CommunityRecommendation } from '../../types/enhancedSearch';

interface CommunityRecommendationCardProps {
  recommendation: CommunityRecommendation;
  onJoin: (communityId: string) => Promise<void>;
  onFollow: (type: string, targetId: string) => Promise<void>;
  onBookmark: (type: string, itemId: string, title: string, description?: string) => Promise<void>;
}

export function CommunityRecommendationCard({
  recommendation,
  onJoin,
  onFollow,
  onBookmark
}: CommunityRecommendationCardProps) {
  const [joining, setJoining] = useState(false);
  const [following, setFollowing] = useState(false);

  const { community, score, reason, type } = recommendation;

  const handleJoin = async () => {
    setJoining(true);
    try {
      await onJoin(community.id);
    } finally {
      setJoining(false);
    }
  };

  const handleFollow = async () => {
    setFollowing(true);
    try {
      await onFollow('community', community.id);
    } finally {
      setFollowing(false);
    }
  };

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'interest_based':
        return '🎯';
      case 'activity_based':
        return '📊';
      case 'network_based':
        return '🤝';
      case 'trending':
        return '🔥';
      case 'similar_members':
        return '👥';
      default:
        return '✨';
    }
  };

  const getRecommendationTypeColor = (type: string) => {
    switch (type) {
      case 'interest_based':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300';
      case 'activity_based':
        return 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300';
      case 'network_based':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300';
      case 'trending':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300';
      case 'similar_members':
        return 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200 relative">
      {/* Recommendation Badge */}
      <div className="absolute top-4 right-4">
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRecommendationTypeColor(type)}`}>
          {getRecommendationTypeIcon(type)} {Math.round(score * 100)}% match
        </div>
      </div>

      {/* Community Header */}
      <div className="flex items-center space-x-3 mb-4">
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
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {community.displayName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            r/{community.name}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
        {community.description}
      </p>

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
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Members</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {community.memberCount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Activity</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {community.engagementMetrics.activityScore}/100
          </div>
        </div>
      </div>

      {/* Mutual Connections */}
      {recommendation.mutualConnections && recommendation.mutualConnections > 0 && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {recommendation.mutualConnections} mutual connection{recommendation.mutualConnections !== 1 ? 's' : ''}
        </div>
      )}

      {/* Shared Interests */}
      {recommendation.sharedInterests && recommendation.sharedInterests.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Shared Interests
          </div>
          <div className="flex flex-wrap gap-1">
            {recommendation.sharedInterests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
            {recommendation.sharedInterests.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{recommendation.sharedInterests.length - 3}
              </span>
            )}
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
            'Join'
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
    </div>
  );
}