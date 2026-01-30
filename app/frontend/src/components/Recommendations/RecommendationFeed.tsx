import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronRight, Users } from 'lucide-react';
import UserRecommendationService, { RecommendationScore } from '@/services/userRecommendationService';
import UserRecommendationCard from './UserRecommendationCard';
import { useWeb3 } from '@/context/Web3Context';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';

interface RecommendationFeedProps {
  limit?: number;
  algorithm?: 'collaborative' | 'content' | 'hybrid';
  communityId?: string;
  showHeader?: boolean;
  showRefresh?: boolean;
  showViewAll?: boolean;
  onUserSelect?: (userId: string) => void;
  className?: string;
}

export function RecommendationFeed({
  limit = 5,
  algorithm = 'hybrid',
  communityId,
  showHeader = true,
  showRefresh = true,
  showViewAll = true,
  onUserSelect,
  className = ''
}: RecommendationFeedProps) {
  const { address, isConnected } = useWeb3();
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadRecommendations = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await UserRecommendationService.getUserRecommendations({
        limit: limit * 2, // Fetch more to account for dismissed
        algorithm,
        communityId
      });

      const activeRecommendations = response.data.recommendations.filter(
        rec => !dismissed.has(rec.userId)
      );

      setRecommendations(activeRecommendations.slice(0, limit));
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, address, limit, algorithm, communityId, dismissed]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations();
  };

  const handleDismiss = (userId: string) => {
    setDismissed(prev => new Set([...prev, userId]));
    setRecommendations(prev => prev.filter(rec => rec.userId !== userId));
  };

  const handleFollow = async (userId: string) => {
    // This would integrate with your existing follow service
    console.log('Following user:', userId);
    // For now, just log - the follow action should be handled by the parent
  };

  const handleFeedback = (userId: string, action: 'view' | 'follow' | 'dismiss' | 'report') => {
    UserRecommendationService.recordFeedback({
      recommendedUserId: userId,
      action
    }).catch(console.error);

    if (action === 'view' && onUserSelect) {
      onUserSelect(userId);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (!isConnected) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users size={20} className="mr-2" />
              Who to Follow
            </h3>
          </div>
        )}
        <EmptyState
          message="Connect your wallet to see personalized recommendations"
          type="auth"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users size={20} className="mr-2" />
              Who to Follow
            </h3>
          </div>
        )}
        <LoadingSkeletons count={limit} type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users size={20} className="mr-2" />
              Who to Follow
            </h3>
          </div>
        )}
        <RetryState
          message={error}
          onRetry={loadRecommendations}
        />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users size={20} className="mr-2" />
              Who to Follow
            </h3>
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        )}
        <EmptyState
          message="No recommendations available at the moment. Check back later!"
          type="empty"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <Users size={20} className="mr-2" />
            Who to Follow
          </h3>
          <div className="flex items-center space-x-2">
            {showRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
                aria-label="Refresh recommendations"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )}
            {showViewAll && (
              <button
                onClick={() => onUserSelect?.('view-all')}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center"
              >
                View All
                <ChevronRight size={16} className="ml-1" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {recommendations.map((recommendation) => (
          <UserRecommendationCard
            key={recommendation.userId}
            recommendation={recommendation}
            onFollow={handleFollow}
            onDismiss={handleDismiss}
            onFeedback={handleFeedback}
          />
        ))}
      </div>
    </div>
  );
}

export default RecommendationFeed;