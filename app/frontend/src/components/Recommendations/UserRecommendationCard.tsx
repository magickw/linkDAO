import React, { useState } from 'react';
import { RecommendationScore } from '@/services/userRecommendationService';
import { UserCircle, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface UserRecommendationCardProps {
  recommendation: RecommendationScore;
  onFollow?: (userId: string) => Promise<void>;
  onDismiss?: (userId: string) => void;
  onFeedback?: (userId: string, action: 'view' | 'follow' | 'dismiss' | 'report') => void;
}

export function UserRecommendationCard({
  recommendation,
  onFollow,
  onDismiss,
  onFeedback
}: UserRecommendationCardProps) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    if (following || loading || !onFollow) return;

    setLoading(true);
    try {
      await onFollow(recommendation.userId);
      setFollowing(true);
      onFeedback?.(recommendation.userId, 'follow');
    } catch (error) {
      console.error('Failed to follow user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.(recommendation.userId);
    onFeedback?.(recommendation.userId, 'dismiss');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 relative">
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Dismiss recommendation"
        >
          <X size={16} />
        </button>
      )}

      {/* User Info */}
      <div className="flex items-start space-x-3">
        <div className="relative flex-shrink-0">
          {recommendation.profile?.avatarUrl ? (
            <img
              src={recommendation.profile.avatarUrl}
              alt={recommendation.profile.displayName || recommendation.profile.handle}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UserCircle size={24} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {recommendation.profile?.displayName || recommendation.profile?.handle || 'Unknown User'}
            </h3>
            {recommendation.profile?.handle && recommendation.profile?.displayName && (
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                @{recommendation.profile.handle}
              </span>
            )}
          </div>

          {/* Mutual Connections */}
          {recommendation.mutualConnections > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span className="font-medium">{recommendation.mutualConnections}</span> mutual connection
              {recommendation.mutualConnections !== 1 ? 's' : ''}
            </p>
          )}

          {/* Reasons */}
          {recommendation.reasons.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {recommendation.reasons.slice(0, 2).map((reason, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                  >
                    {reason}
                  </span>
                ))}
                {recommendation.reasons.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{recommendation.reasons.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {recommendation.profile?.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {recommendation.profile.bio}
            </p>
          )}
        </div>

        {/* Score */}
        <div className={`text-2xl font-bold ${getScoreColor(Math.round(recommendation.score))}`}>
          {Math.round(recommendation.score)}%
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Reputation</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(recommendation.reputationScore)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Activity</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(recommendation.activityScore)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">Community</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {Math.round(recommendation.communityOverlap * 100)}%
          </div>
        </div>
      </div>

      {/* Follow Button */}
      {onFollow && (
        <button
          onClick={handleFollow}
          disabled={following || loading}
          className="w-full mt-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {following ? 'Following' : loading ? 'Loading...' : 'Follow'}
        </button>
      )}

      {/* Feedback Buttons */}
      {onFeedback && !following && (
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => onFeedback(recommendation.userId, 'view')}
            className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            View Profile
          </button>
          <button
            onClick={() => onFeedback(recommendation.userId, 'report')}
            className="flex-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            Report
          </button>
        </div>
      )}
    </div>
  );
}

export default UserRecommendationCard;