import React, { useState, useMemo, useCallback } from 'react';
import { Search, Star, Users, TrendingUp, ChevronDown, ChevronUp, Crown, Shield, Coins, Vote, Bell } from 'lucide-react';
import { EnhancedCommunityData, CommunityIconListProps } from '../../../types/communityEnhancements';
import { CommunityWithWeb3Data, UserRoleMap, TokenBalanceMap } from '../../../types/web3Post';
import { useCommunityCache } from '../../../hooks/useCommunityCache';
import LoadingSkeletons from '../SharedComponents/LoadingSkeletons';
import RoleBadge from '../SharedComponents/RoleBadge';
import TokenBalanceDisplay from '../SharedComponents/TokenBalanceDisplay';
import VotingPowerIndicator from '../SharedComponents/VotingPowerIndicator';
import GovernanceNotificationBadge from '../SharedComponents/GovernanceNotificationBadge';

interface ExtendedCommunityIconListProps extends Omit<CommunityIconListProps, 'communities'> {
  communities: CommunityWithWeb3Data[];
  userRoles?: UserRoleMap;
  tokenBalances?: TokenBalanceMap;
  searchQuery?: string;
  showWeb3Features?: boolean;
}

/**
 * CommunityIconList Component with Web3 Features
 * 
 * Displays a list of communities with icons, badges, role indicators, token balances,
 * and governance notifications. Implements caching, hover animations, and visual feedback.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7
 */
export const CommunityIconList: React.FC<ExtendedCommunityIconListProps> = ({
  communities,
  selectedCommunity,
  onCommunitySelect,
  showBadges = true,
  userRoles = {},
  tokenBalances = {},
  searchQuery = '',
  showWeb3Features = true
}) => {
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
      if (a.userMembership?.isJoined && !b.userMembership?.isJoined) return -1;
      if (!a.userMembership?.isJoined && b.userMembership?.isJoined) return 1;
      
      // Then by activity level
      return (b.activityMetrics?.trendingScore || 0) - (a.activityMetrics?.trendingScore || 0);
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

  // Get role icon and color
  const getRoleDisplay = (communityId: string) => {
    const role = userRoles[communityId];
    if (!role) return null;

    switch (role) {
      case 'admin':
        return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
      case 'moderator':
        return { icon: Shield, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' };
      case 'member':
        return { icon: Users, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' };
      default:
        return null;
    }
  };

  // Get user's token balance for community
  const getUserTokenBalance = (communityId: string): number => {
    return tokenBalances[communityId] || 0;
  };

  // Get voting power indicator
  const getVotingPowerLevel = (balance: number): 'high' | 'medium' | 'low' | 'none' => {
    if (balance >= 10000) return 'high';
    if (balance >= 1000) return 'medium';
    if (balance > 0) return 'low';
    return 'none';
  };

  if (communities.length === 0) {
    return <LoadingSkeletons.CommunityListSkeleton count={5} />;
  }

  return (
    <div className="community-icon-list bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            My Communities
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
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 ring-2 ring-transparent hover:ring-blue-200 dark:hover:ring-blue-800 transition-all duration-200">
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
                    
                    {/* Activity Indicator (Green Dot) */}
                    {community.isActive && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                    )}

                    {/* Governance Notifications Badge */}
                    {showWeb3Features && community.governanceNotifications && community.governanceNotifications > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <GovernanceNotificationBadge
                          count={community.governanceNotifications}
                          type="pending"
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* Community Info */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {community.name}
                        </h4>
                        
                        {/* Role Badge */}
                        {showWeb3Features && userRoles[community.id] && (
                          <RoleBadge 
                            role={userRoles[community.id]} 
                            size="sm"
                            showLabel={false}
                          />
                        )}
                      </div>
                      
                      {/* Status Badges */}
                      {showBadges && (
                        <div className="flex items-center space-x-1 ml-2">
                          {community.userMembership?.isJoined && (
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          )}
                          
                          {(community.activityMetrics?.trendingScore || 0) > 0.8 && (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <Users className="w-3 h-3" />
                        <span>{community.memberCount.toLocaleString()}</span>
                      </div>
                      
                      {/* Web3 Features */}
                      {showWeb3Features && (
                        <div className="flex items-center space-x-1">
                          {/* Token Balance */}
                          {(() => {
                            const balance = getUserTokenBalance(community.id);
                            if (balance > 0) {
                              return (
                                <TokenBalanceDisplay
                                  balance={balance}
                                  symbol={community.tokenRequirement?.tokenSymbol || 'TOKENS'}
                                  showSymbol={false}
                                  size="xs"
                                  variant="compact"
                                  stakingStatus={balance > 1000 ? 'staked' : 'unstaked'}
                                />
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Voting Power Indicator */}
                          {(() => {
                            const balance = getUserTokenBalance(community.id);
                            const votingLevel = getVotingPowerLevel(balance);
                            if (votingLevel !== 'none') {
                              const participationLevel = votingLevel === 'high' ? 'high' : 
                                                       votingLevel === 'medium' ? 'medium' : 'low';
                              return (
                                <VotingPowerIndicator
                                  votingPower={balance}
                                  participationLevel={participationLevel}
                                  size="xs"
                                  variant="icon-only"
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Hover Tooltip Content */}
                    {hoveredCommunity === community.id && (
                      <div className="absolute left-full ml-2 top-0 z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-48">
                        <div className="space-y-1">
                          <div className="font-medium">{community.name}</div>
                          <div className="text-gray-300">{community.memberCount.toLocaleString()} members</div>
                          {showWeb3Features && (
                            <>
                              {userRoles[community.id] && (
                                <div className="text-blue-300">Role: {userRoles[community.id]}</div>
                              )}
                              {getUserTokenBalance(community.id) > 0 && (
                                <div className="text-green-300">
                                  Balance: {formatTokenBalance(getUserTokenBalance(community.id))} tokens
                                </div>
                              )}
                              {community.governanceNotifications && community.governanceNotifications > 0 && (
                                <div className="text-red-300">
                                  {community.governanceNotifications} pending governance action{community.governanceNotifications > 1 ? 's' : ''}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {/* Tooltip Arrow */}
                        <div className="absolute left-0 top-3 -ml-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                      </div>
                    )}
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