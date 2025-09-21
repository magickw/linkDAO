import React, { useState, useEffect, useCallback } from 'react';
import { Community } from '../../models/Community';
import { CommunityService } from '../../services/communityService';

export interface RelatedCommunity {
  id: string;
  name: string;
  displayName: string;
  description: string;
  memberCount: number;
  category: string;
  tags: string[];
  avatar?: string;
  isJoined: boolean;
  similarityScore: number;
}

export interface RelatedCommunitiesWidgetProps {
  currentCommunity: Community;
  onJoinCommunity: (communityId: string) => Promise<void>;
  className?: string;
}

interface RelatedCommunitiesState {
  relatedCommunities: RelatedCommunity[];
  popularCommunities: RelatedCommunity[];
  loading: boolean;
  error: string | null;
  showingFallback: boolean;
}

/**
 * RelatedCommunitiesWidget Component
 * 
 * Displays community recommendations based on shared members, topics, and tags.
 * Falls back to popular communities when no related ones exist.
 * Includes join buttons for easy community discovery.
 */
export const RelatedCommunitiesWidget: React.FC<RelatedCommunitiesWidgetProps> = ({
  currentCommunity,
  onJoinCommunity,
  className = ''
}) => {
  const [state, setState] = useState<RelatedCommunitiesState>({
    relatedCommunities: [],
    popularCommunities: [],
    loading: true,
    error: null,
    showingFallback: false
  });

  const [joiningCommunities, setJoiningCommunities] = useState<Set<string>>(new Set());

  /**
   * Calculate similarity score between communities based on:
   * - Shared tags (40% weight)
   * - Same category (30% weight)
   * - Member count similarity (20% weight)
   * - Description similarity (10% weight)
   */
  const calculateSimilarityScore = useCallback((community: Community): number => {
    let score = 0;

    // Shared tags (40% weight)
    const sharedTags = community.tags.filter(tag => 
      currentCommunity.tags.includes(tag)
    );
    const tagScore = sharedTags.length / Math.max(community.tags.length, currentCommunity.tags.length, 1);
    score += tagScore * 0.4;

    // Same category (30% weight)
    if (community.category === currentCommunity.category) {
      score += 0.3;
    }

    // Member count similarity (20% weight)
    const memberRatio = Math.min(community.memberCount, currentCommunity.memberCount) / 
                       Math.max(community.memberCount, currentCommunity.memberCount, 1);
    score += memberRatio * 0.2;

    // Description similarity (10% weight) - simple keyword matching
    const currentWords = currentCommunity.description.toLowerCase().split(/\s+/);
    const communityWords = community.description.toLowerCase().split(/\s+/);
    const sharedWords = currentWords.filter(word => 
      word.length > 3 && communityWords.includes(word)
    );
    const descScore = sharedWords.length / Math.max(currentWords.length, communityWords.length, 1);
    score += descScore * 0.1;

    return Math.min(score, 1); // Cap at 1.0
  }, [currentCommunity]);

  /**
   * Transform Community to RelatedCommunity with similarity score
   */
  const transformToRelatedCommunity = useCallback((community: Community): RelatedCommunity => ({
    id: community.id,
    name: community.name,
    displayName: community.displayName,
    description: community.description,
    memberCount: community.memberCount,
    category: community.category,
    tags: community.tags,
    avatar: community.avatar,
    isJoined: false, // This would come from user's membership data
    similarityScore: calculateSimilarityScore(community)
  }), [calculateSimilarityScore]);

  /**
   * Fetch related communities based on recommendation algorithm
   */
  const fetchRelatedCommunities = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get all communities in the same category
      const categoryCommunities = await CommunityService.getAllCommunities({
        category: currentCommunity.category,
        limit: 50
      });

      // Get communities with shared tags
      const tagCommunities = await CommunityService.getAllCommunities({
        tags: currentCommunity.tags,
        limit: 50
      });

      // Combine and deduplicate
      const allCommunities = [...categoryCommunities, ...tagCommunities]
        .filter((community, index, arr) => 
          community.id !== currentCommunity.id && // Exclude current community
          arr.findIndex(c => c.id === community.id) === index // Deduplicate
        );

      // Calculate similarity scores and sort
      const relatedWithScores = allCommunities
        .map(transformToRelatedCommunity)
        .filter(community => community.similarityScore > 0.15) // Minimum similarity threshold
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 5); // Top 5 related communities

      // If no related communities found, get popular communities as fallback
      let popularFallback: RelatedCommunity[] = [];
      if (relatedWithScores.length === 0) {
        const trending = await CommunityService.getTrendingCommunities(5);
        popularFallback = trending
          .filter(community => community.id !== currentCommunity.id)
          .map(community => ({
            ...transformToRelatedCommunity(community),
            similarityScore: 0 // No similarity, just popular
          }));
      }

      setState(prev => ({
        ...prev,
        relatedCommunities: relatedWithScores,
        popularCommunities: popularFallback,
        showingFallback: relatedWithScores.length === 0,
        loading: false
      }));

    } catch (error) {
      console.error('Error fetching related communities:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load related communities',
        loading: false
      }));
    }
  }, [currentCommunity, transformToRelatedCommunity]);

  /**
   * Handle joining a community
   */
  const handleJoinCommunity = useCallback(async (communityId: string) => {
    try {
      setJoiningCommunities(prev => new Set(prev).add(communityId));
      await onJoinCommunity(communityId);
      
      // Update the joined status in state
      setState(prev => ({
        ...prev,
        relatedCommunities: prev.relatedCommunities.map(community =>
          community.id === communityId ? { ...community, isJoined: true } : community
        ),
        popularCommunities: prev.popularCommunities.map(community =>
          community.id === communityId ? { ...community, isJoined: true } : community
        )
      }));
    } catch (error) {
      console.error('Error joining community:', error);
    } finally {
      setJoiningCommunities(prev => {
        const newSet = new Set(prev);
        newSet.delete(communityId);
        return newSet;
      });
    }
  }, [onJoinCommunity]);

  /**
   * Format member count for display
   */
  const formatMemberCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, []);

  /**
   * Render a community card
   */
  const renderCommunityCard = useCallback((community: RelatedCommunity) => {
    const isJoining = joiningCommunities.has(community.id);
    
    return (
      <div
        key={community.id}
        className="flex items-center space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        {/* Community Avatar */}
        <div className="flex-shrink-0">
          {community.avatar ? (
            <img
              src={community.avatar}
              alt={`${community.displayName} avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {community.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Community Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {community.displayName}
            </h4>
            {community.similarityScore > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {Math.round(community.similarityScore * 100)}% match
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {formatMemberCount(community.memberCount)} members
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">
            {community.description}
          </p>
        </div>

        {/* Join Button */}
        <div className="flex-shrink-0">
          {community.isJoined ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Joined
            </span>
          ) : (
            <button
              onClick={() => handleJoinCommunity(community.id)}
              disabled={isJoining}
              className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Join ${community.displayName}`}
            >
              {isJoining ? 'Joining...' : 'Join'}
            </button>
          )}
        </div>
      </div>
    );
  }, [joiningCommunities, formatMemberCount, handleJoinCommunity]);

  // Fetch related communities on mount and when current community changes
  useEffect(() => {
    fetchRelatedCommunities();
  }, [fetchRelatedCommunities]);

  const communitiesToShow = state.showingFallback ? state.popularCommunities : state.relatedCommunities;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {state.showingFallback ? 'Popular Communities' : 'Similar Communities'}
        </h3>
        {!state.showingFallback && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Based on shared interests and topics
          </p>
        )}
      </div>

      {/* Loading State */}
      {state.loading && (
        <div className="px-4 py-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="px-4 py-6">
          <div className="text-center">
            <div className="text-sm text-red-600 dark:text-red-400 mb-2">
              {state.error}
            </div>
            <button
              onClick={fetchRelatedCommunities}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Communities List */}
      {!state.loading && !state.error && (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {communitiesToShow.length > 0 ? (
            communitiesToShow.map(renderCommunityCard)
          ) : (
            <div className="px-4 py-6 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No related communities found
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with "View More" link */}
      {!state.loading && !state.error && communitiesToShow.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors">
            View all communities
          </button>
        </div>
      )}
    </div>
  );
};

export default RelatedCommunitiesWidget;