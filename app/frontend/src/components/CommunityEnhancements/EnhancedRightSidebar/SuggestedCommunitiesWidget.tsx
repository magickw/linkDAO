import React, { useState, useEffect } from 'react';
import { EnhancedCommunityData } from '../../../types/communityEnhancements';
import { MicroInteractionLayer } from '../SharedComponents/MicroInteractionLayer';

interface SuggestedCommunity extends EnhancedCommunityData {
  mutualMemberCount: number;
  trendingScore: number;
  joinReason: 'mutual_connections' | 'similar_interests' | 'trending' | 'recommended';
  previewStats: {
    recentPosts: number;
    activeDiscussions: number;
    weeklyGrowth: number;
  };
}

interface SuggestedCommunitiesWidgetProps {
  suggestedCommunities: SuggestedCommunity[];
  onJoinCommunity: (communityId: string) => Promise<boolean>;
  onCommunityClick: (communityId: string) => void;
  maxSuggestions?: number;
}

interface CommunityPreviewProps {
  community: SuggestedCommunity;
  onClose: () => void;
}

const CommunityPreview: React.FC<CommunityPreviewProps> = ({ community, onClose }) => {
  return (
    <div className="absolute top-0 left-full ml-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Community header */}
      <div className="flex items-center space-x-3 mb-4">
        <img
          src={community.icon}
          alt={community.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{community.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {community.memberCount.toLocaleString()} members
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
        {community.description}
      </p>

      {/* Key statistics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {community.previewStats.recentPosts}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Posts this week</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {community.previewStats.activeDiscussions}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active discussions</div>
        </div>
      </div>

      {/* Growth indicator */}
      <div className="flex items-center justify-center space-x-2 mb-4">
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        <span className="text-sm text-green-600 dark:text-green-400 font-medium">
          +{community.previewStats.weeklyGrowth}% this week
        </span>
      </div>

      {/* Mutual connections */}
      {community.mutualMemberCount > 0 && (
        <div className="text-center text-sm text-blue-600 dark:text-blue-400 mb-4">
          {community.mutualMemberCount} of your connections are members
        </div>
      )}
    </div>
  );
};

interface ActivityIndicatorProps {
  level: 'high' | 'medium' | 'low' | 'very-high';
  trendingScore: number;
}

const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({ level, trendingScore }) => {
  const getIndicatorColor = () => {
    switch (level) {
      case 'very-high': return 'bg-red-500';
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
    }
  };

  const getIndicatorText = () => {
    switch (level) {
      case 'very-high': return 'Extremely Active';
      case 'high': return 'Very Active';
      case 'medium': return 'Active';
      case 'low': return 'Quiet';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {getIndicatorText()}
      </span>
      {trendingScore > 80 && (
        <span className="text-xs bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
          🔥 Trending
        </span>
      )}
    </div>
  );
};

interface JoinButtonProps {
  communityId: string;
  isJoined: boolean;
  onJoin: (communityId: string) => Promise<boolean>;
}

const JoinButton: React.FC<JoinButtonProps> = ({ communityId, isJoined, onJoin }) => {
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(isJoined);

  const handleJoin = async () => {
    if (hasJoined || isJoining) return;

    setIsJoining(true);
    try {
      const success = await onJoin(communityId);
      if (success) {
        setHasJoined(true);
      }
    } catch (error) {
      console.error('Failed to join community:', error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <MicroInteractionLayer interactionType="click">
      <button
        onClick={handleJoin}
        disabled={hasJoined || isJoining}
        className={`
          px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105
          ${hasJoined
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 cursor-default'
            : isJoining
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 cursor-wait'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
          disabled:transform-none disabled:hover:scale-100
        `}
      >
        {hasJoined ? (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Joined
          </span>
        ) : isJoining ? (
          <span className="flex items-center">
            <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Joining...
          </span>
        ) : (
          'Join'
        )}
      </button>
    </MicroInteractionLayer>
  );
};

interface SuggestionReasonProps {
  reason: SuggestedCommunity['joinReason'];
  mutualCount: number;
}

const SuggestionReason: React.FC<SuggestionReasonProps> = ({ reason, mutualCount }) => {
  const getReasonText = () => {
    switch (reason) {
      case 'mutual_connections':
        return `${mutualCount} of your connections joined`;
      case 'similar_interests':
        return 'Based on your interests';
      case 'trending':
        return 'Trending in your network';
      case 'recommended':
        return 'Recommended for you';
    }
  };

  const getReasonIcon = () => {
    switch (reason) {
      case 'mutual_connections':
        return '👥';
      case 'similar_interests':
        return '🎯';
      case 'trending':
        return '📈';
      case 'recommended':
        return '⭐';
    }
  };

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
      <span>{getReasonIcon()}</span>
      <span>{getReasonText()}</span>
    </div>
  );
};

interface CommunityCardProps {
  community: SuggestedCommunity;
  onJoin: (communityId: string) => Promise<boolean>;
  onClick: (communityId: string) => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onJoin, onClick }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => setShowPreview(true), 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPreview(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <MicroInteractionLayer interactionType="hover">
        <div
          onClick={() => onClick(community.id)}
          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
        >
          {/* Community header */}
          <div className="flex items-center space-x-3 mb-3">
            <img
              src={community.icon}
              alt={community.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                {community.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {community.memberCount.toLocaleString()} members
              </p>
            </div>
          </div>

          {/* Activity indicator */}
          <div className="mb-3">
            <ActivityIndicator
              level={community.activityMetrics.activityLevel}
              trendingScore={community.trendingScore}
            />
          </div>

          {/* Suggestion reason */}
          <div className="mb-3">
            <SuggestionReason
              reason={community.joinReason}
              mutualCount={community.mutualMemberCount}
            />
          </div>

          {/* Join button */}
          <div onClick={(e) => e.stopPropagation()}>
            <JoinButton
              communityId={community.id}
              isJoined={community.userMembership.isJoined}
              onJoin={onJoin}
            />
          </div>
        </div>
      </MicroInteractionLayer>

      {/* Preview on hover */}
      {showPreview && (
        <CommunityPreview
          community={community}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export const SuggestedCommunitiesWidget: React.FC<SuggestedCommunitiesWidgetProps> = ({
  suggestedCommunities,
  onJoinCommunity,
  onCommunityClick,
  maxSuggestions = 5
}) => {
  const [communities, setCommunities] = useState<SuggestedCommunity[]>(suggestedCommunities);

  // Sort communities by priority: mutual connections > trending > similar interests > recommended
  const sortedCommunities = [...communities]
    .sort((a, b) => {
      const priorityOrder = {
        mutual_connections: 0,
        trending: 1,
        similar_interests: 2,
        recommended: 3
      };
      
      if (priorityOrder[a.joinReason] !== priorityOrder[b.joinReason]) {
        return priorityOrder[a.joinReason] - priorityOrder[b.joinReason];
      }
      
      // Secondary sort by trending score
      return b.trendingScore - a.trendingScore;
    })
    .slice(0, maxSuggestions);

  // Update communities when prop changes
  useEffect(() => {
    setCommunities(suggestedCommunities);
  }, [suggestedCommunities]);

  if (communities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Suggested Communities
        </h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No community suggestions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Suggested Communities
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {sortedCommunities.length} suggestions
        </span>
      </div>

      {/* Communities list */}
      <div className="space-y-4">
        {sortedCommunities.map((community) => (
          <CommunityCard
            key={community.id}
            community={community}
            onJoin={onJoinCommunity}
            onClick={onCommunityClick}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
          Discover More Communities →
        </button>
      </div>
    </div>
  );
};

export default SuggestedCommunitiesWidget;