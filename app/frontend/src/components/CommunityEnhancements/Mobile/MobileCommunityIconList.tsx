import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { EnhancedCommunityData } from '../../../types/communityEnhancements';
import { useCommunityCache } from '../../../hooks/useCommunityCache';

interface MobileCommunityIconListProps {
  communities: EnhancedCommunityData[];
  selectedCommunity?: string;
  onCommunitySelect: (communityId: string) => void;
  showBadges?: boolean;
}

/**
 * MobileCommunityIconList Component
 * 
 * Touch-friendly community list optimized for mobile devices with
 * larger touch targets, search functionality, and smooth animations.
 */
export const MobileCommunityIconList: React.FC<MobileCommunityIconListProps> = ({
  communities,
  selectedCommunity,
  onCommunitySelect,
  showBadges = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { getCachedIcon, preloadIcons } = useCommunityCache();

  // Filter communities based on search query
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) {
      return communities;
    }

    const query = searchQuery.toLowerCase();
    return communities.filter(community =>
      community.name.toLowerCase().includes(query) ||
      community.description.toLowerCase().includes(query)
    );
  }, [communities, searchQuery]);

  // Preload icons for visible communities
  React.useEffect(() => {
    const iconsToPreload = filteredCommunities
      .filter(community => community.icon && !getCachedIcon(community.id))
      .map(community => ({
        id: community.id,
        iconUrl: community.icon!
      }));

    if (iconsToPreload.length > 0) {
      preloadIcons(iconsToPreload);
    }
  }, [filteredCommunities, getCachedIcon, preloadIcons]);

  // Separate joined and available communities
  const { joinedCommunities, availableCommunities } = useMemo(() => {
    const joined = filteredCommunities.filter(c => c.userMembership.isJoined);
    const available = filteredCommunities.filter(c => !c.userMembership.isJoined);
    
    return {
      joinedCommunities: joined.sort((a, b) => a.name.localeCompare(b.name)),
      availableCommunities: available.sort((a, b) => b.activityMetrics.trendingScore - a.activityMetrics.trendingScore)
    };
  }, [filteredCommunities]);

  const handleCommunityPress = (communityId: string) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onCommunitySelect(communityId);
  };

  return (
    <div className="px-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search communities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Joined Communities */}
      {joinedCommunities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-2">
            Joined Communities ({joinedCommunities.length})
          </h3>
          <div className="space-y-2">
            {joinedCommunities.map((community) => (
              <MobileCommunityItem
                key={community.id}
                community={community}
                isSelected={selectedCommunity === community.id}
                onSelect={handleCommunityPress}
                showBadges={showBadges}
                getCachedIcon={getCachedIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Communities */}
      {availableCommunities.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-2">
            Discover Communities ({availableCommunities.length})
          </h3>
          <div className="space-y-2">
            {availableCommunities.map((community) => (
              <MobileCommunityItem
                key={community.id}
                community={community}
                isSelected={selectedCommunity === community.id}
                onSelect={handleCommunityPress}
                showBadges={showBadges}
                getCachedIcon={getCachedIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredCommunities.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <svg className="mx-auto w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No communities found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  );
};

interface MobileCommunityItemProps {
  community: EnhancedCommunityData;
  isSelected: boolean;
  onSelect: (communityId: string) => void;
  showBadges: boolean;
  getCachedIcon: (communityId: string) => string | null;
}

const MobileCommunityItem: React.FC<MobileCommunityItemProps> = ({
  community,
  isSelected,
  onSelect,
  showBadges,
  getCachedIcon
}) => {
  const [imageError, setImageError] = useState(false);
  const cachedIcon = getCachedIcon(community.id);

  const getActivityColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(community.id)}
      className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
      }`}
    >
      {/* Community Icon */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
          {!imageError && (cachedIcon || community.icon) ? (
            <img
              src={cachedIcon || community.icon}
              alt={community.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Activity Indicator */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getActivityColor(community.activityMetrics.activityLevel)}`} />
      </div>

      {/* Community Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">
            {community.name}
          </h4>
          {community.userMembership.isJoined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Joined
            </span>
          )}
        </div>

        <div className="flex items-center space-x-4 mt-1">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {community.memberCount.toLocaleString()} members
          </span>
          
          {showBadges && community.userMembership.isJoined && (
            <div className="flex items-center space-x-2">
              {community.userMembership.reputation > 0 && (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {community.userMembership.reputation} rep
                </span>
              )}
              {community.userMembership.tokenBalance > 0 && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  {community.userMembership.tokenBalance} tokens
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}
    </motion.button>
  );
};

export default MobileCommunityIconList;