import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Community } from '@/models/Community';
import { analyticsService } from '../../services/analyticsService';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';
import { ErrorCategory } from '../../utils/errorHandling/ErrorManager';
import { Skeleton } from '../LoadingSkeletons';
import { debounce } from '../../utils/performanceOptimizations';
import { KEYBOARD_KEYS } from '../../utils/accessibility';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

interface CommunityBase {
  id: string;
  name: string;
  displayName: string;
  memberCount: number;
  avatar?: string;
  description?: string;
}

interface AIRecommendation extends CommunityBase {
  reason: string;
  confidence: number;
  matchFactors: string[];
}

interface AICommunityRecommendationsProps {
  joinedCommunities: string[];
  allCommunities: CommunityBase[];
  onJoinCommunity: (communityId: string) => void;
  className?: string;
}

const AICommunityRecommendations: React.FC<AICommunityRecommendationsProps> = ({
  joinedCommunities,
  allCommunities,
  onJoinCommunity,
  className = ''
}) => {
  const { address } = useAccount();
  const { touchTargetClasses, isMobile } = useMobileOptimization();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefetching, setPrefetching] = useState(false);

  // Debounced recommendation fetching for performance
  const debouncedFetchRecommendations = useCallback(
    debounce(async () => {
      if (!address || allCommunities.length === 0) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // In a real implementation, this would call the AI service
        // For now, we'll simulate recommendations based on joined communities
        const simulateRecommendations = () => {
          // Find communities that aren't joined but might be relevant
          const unjoinedCommunities = allCommunities.filter(
            community => !joinedCommunities.includes(community.id)
          );
          
          // Sort by member count as a simple relevance metric
          const sortedCommunities = [...unjoinedCommunities].sort(
            (a, b) => b.memberCount - a.memberCount
          );
          
          // Take top 3 and add AI-like metadata
          return sortedCommunities.slice(0, 3).map(community => ({
            ...community,
            reason: `Based on your interest in similar communities`,
            confidence: Math.floor(Math.random() * 40) + 60, // 60-99%
            matchFactors: ['Member overlap', 'Topic similarity', 'Activity patterns']
          }));
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setRecommendations(simulateRecommendations());
        
        // Track successful recommendation fetch
        analyticsService.trackUserEvent('ai_recommendations_loaded', {
          communityCount: simulateRecommendations().length,
          joinedCommunityCount: joinedCommunities.length,
          totalCommunityCount: allCommunities.length
        });
      } catch (err) {
        setError('Failed to load recommendations');
        console.error('AI Recommendation Error:', err);
        
        // Track error for analytics
        analyticsService.trackUserEvent('ai_recommendations_error', {
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [address, allCommunities, joinedCommunities]
  );

  // Prefetch recommendations when component mounts
  useEffect(() => {
    const prefetchRecommendations = async () => {
      setPrefetching(true);
      try {
        // Simulate prefetching - in a real implementation, this would prefetch AI models
        await new Promise(resolve => setTimeout(resolve, 100));
      } finally {
        setPrefetching(false);
      }
    };

    prefetchRecommendations();
  }, []);

  useEffect(() => {
    debouncedFetchRecommendations();
  }, [debouncedFetchRecommendations]);

  // Handle join community action with analytics
  const handleJoinCommunity = (communityId: string) => {
    onJoinCommunity(communityId);
    
    // Track join action for analytics
    analyticsService.trackUserEvent('ai_recommendation_joined', {
      communityId,
      timestamp: new Date().toISOString()
    });
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
      e.preventDefault();
      action();
    }
  };

  if (!address || joinedCommunities.length === 0) {
    return null;
  }

  // Loading skeleton for prefetching
  if (prefetching) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <Skeleton className="h-5 w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary category={ErrorCategory.CONTENT}>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Recommendations
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
            <span className="text-gray-500 dark:text-gray-400">Finding communities for you...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
            <button
              onClick={() => debouncedFetchRecommendations()}
              className={`mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 ${touchTargetClasses}`}
            >
              Retry
            </button>
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((community) => (
              <div 
                key={community.id} 
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {community.displayName}
                      </h4>
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                        {community.confidence}% match
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {community.description || 'No description available'}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {community.matchFactors.slice(0, 2).map((factor, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinCommunity(community.id)}
                    onKeyDown={(e) => handleKeyDown(e, () => handleJoinCommunity(community.id))}
                    className={`ml-2 px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded ${touchTargetClasses}`}
                    aria-label={`Join ${community.displayName} community`}
                  >
                    Join
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {community.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No recommendations available at this time
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AICommunityRecommendations;