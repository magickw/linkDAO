import React, { useState, useMemo, useCallback } from 'react';
import { Search, Star, Users, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { EnhancedCommunityData, CommunityIconListProps } from '../../../types/communityEnhancements';
import { useCommunityCache } from '../../../hooks/useCommunityCache';
import LoadingSkeletons from '../SharedComponents/LoadingSkeletons';

/**
 * CommunityIconList Component
 * 
 * Displays a list of communities with icons, badges, and search functionality.
 * Implements caching, hover animations, and visual feedback.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.6
 */
export const CommunityIconList: React.FC<CommunityIconListProps> = ({
  communities,
  selectedCommunity,
  onCommunitySelect,
  showBadges = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredCommunity, setHoveredCommunity] = useState<string | null>(null);
  
  const { getCachedIcon, preloadIcons } = useCommunityCache();

  // Filter communities based on search query
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities;
    
    return communities.filter(community =>
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      community.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [communities, searchQuery]);

  // Sort communities by activity and user membership
  const sortedCommunities = useMemo(() => {
    return [...filteredCommunities].sort((a, b) => {
      // Prioritize joined communities
      if (a.userMembership.isJoined && !b.userMembership.isJoined) return -1;
      if (!a.userMembership.isJoined && b.userMembership.isJoined) return 1;
      
      // Then by activity level
      return b.activityMetrics.trendingScore - a.activityMetrics.trendingScore;
    });
  }, [filteredCommunities]);

  // Preload icons for visible communities
  React.useEffect(() => {
    const visibleCommunities = sortedCommunities.slice(0, 20);
    preloadIcons(visibleCommunities.map(c => ({ id: c.id, iconUrl: c.icon })));
  }, [sortedCommunities, preloadIcons]);

  const handleCommunityClick = useCallback((communityId: string) => {
    onCommunitySelect(communityId);
  }, [onCommunitySelect]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, communityId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCommunityClick(communityId);
    }
  }, [handleCommunityClick]);

  const getActivityLevelColor = (level: number): string => {
    if (level > 0.8) return 'text-green-500';
    if (level > 0.5) return 'text-yellow-500';
    return 'text-gray-400';
  };

  const formatTokenBalance = (balance: number): string => {
    if (balance >= 1000000) return `${(balance / 1000000).toFixed(1)}M`;
    if (balance >= 1000) return `${(balance / 1000).toFixed(1)}K`;
    return balance.toString();
  };

  if (communities.length === 0) {
    return <LoadingSkeletons.CommunityListSkeleton count={5} />;
  }

  return (
    <div className="community-icon-list bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Communities
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse communities' : 'Expand communities'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
        
        {isExpanded && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {/* Community List */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {sortedCommunities.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No communities found' : 'No communities available'}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {sortedCommunities.map((community) => (
                <div
                  key={community.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCommunityClick(community.id)}
                  onKeyDown={(e) => handleKeyDown(e, community.id)}
                  onMouseEnter={() => setHoveredCommunity(community.id)}
                  onMouseLeave={() => setHoveredCommunity(null)}
                  className={`
                    flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200
                    hover:bg-gray-50 dark:hover:bg-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${selectedCommunity === community.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                      : 'hover:shadow-sm'
                    }
                    ${hoveredCommunity === community.id ? 'transform scale-[1.02]' : ''}
                  `}
                >
                  {/* Community Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                      <img
                        src={getCachedIcon(community.id) || community.icon}
                        alt={`${community.name} icon`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(community.name)}&background=6366f1&color=fff`;
                        }}
                      />
                    </div>
                    
                    {/* Activity Indicator */}
                    <div className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800
                      ${community.activityMetrics.engagementRate > 0.7 ? 'bg-green-500' :
                        community.activityMetrics.engagementRate > 0.4 ? 'bg-yellow-500' : 'bg-gray-400'}
                    `} />
                  </div>

                  {/* Community Info */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {community.name}
                      </h4>
                      
                      {/* Badges */}
                      {showBadges && (
                        <div className="flex items-center space-x-1 ml-2">
                          {community.userMembership.isJoined && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                          
                          {community.activityMetrics.trendingScore > 0.8 && (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>{community.memberCount.toLocaleString()}</span>
                      </div>
                      
                      {/* Token Balance Badge */}
                      {showBadges && community.userMembership.tokenBalance > 0 && (
                        <div className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 
                                      text-blue-800 dark:text-blue-300 rounded-full">
                          {formatTokenBalance(community.userMembership.tokenBalance)}
                        </div>
                      )}
                      
                      {/* Reputation Badge */}
                      {showBadges && community.userMembership.reputation > 0 && (
                        <div className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 
                                      text-purple-800 dark:text-purple-300 rounded-full">
                          {community.userMembership.reputation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityIconList;