import React, { useEffect, useState } from 'react';
import { Clock, Users, LogOut, Star } from 'lucide-react';
import { useRouter } from 'next/router';

interface Community {
  id: string;
  name: string;
  displayName: string;
  avatar?: string;
  memberCount: number;
  lastVisited?: Date;
  visitCount?: number;
  isJoined?: boolean;
  isDefault?: boolean;
}

interface RecentAndFollowedCommunitiesProps {
  allCommunities: Community[];
  joinedCommunityIds: string[];
  onLeaveCommunity: (communityId: string) => void;
}

/**
 * RecentAndFollowedCommunities Component
 * 
 * Shows recently viewed communities and followed communities in the left sidebar
 * Allows users to manage their community memberships
 */
export const RecentAndFollowedCommunities: React.FC<RecentAndFollowedCommunitiesProps> = ({
  allCommunities,
  joinedCommunityIds,
  onLeaveCommunity
}) => {
  const router = useRouter();
  const [recentCommunities, setRecentCommunities] = useState<Community[]>([]);
  const [followedCommunities, setFollowedCommunities] = useState<Community[]>([]);

  // Load recent communities from localStorage
  useEffect(() => {
    const loadRecentCommunities = () => {
      try {
        const savedData = localStorage.getItem('frequent-communities');
        const frequentData: Record<string, { visitCount: number; lastVisited: string }> = 
          savedData ? JSON.parse(savedData) : {};

        // Get communities sorted by last visited date
        const recent = allCommunities
          .map(community => {
            const frequentInfo = frequentData[community.id];
            return {
              ...community,
              visitCount: frequentInfo?.visitCount || 0,
              lastVisited: frequentInfo?.lastVisited ? new Date(frequentInfo.lastVisited) : new Date(0)
            };
          })
          .filter(community => community.visitCount > 0) // Only communities that have been visited
          .sort((a, b) => b.lastVisited!.getTime() - a.lastVisited!.getTime())
          .slice(0, 5); // Show top 5

        setRecentCommunities(recent);
      } catch (error) {
        console.error('Error loading recent communities:', error);
        setRecentCommunities([]);
      }
    };

    const loadFollowedCommunities = () => {
      // Get communities that the user has joined
      const followed = allCommunities
        .filter(community => joinedCommunityIds.includes(community.id))
        .map(community => ({
          ...community,
          // Mark LinkDAO as default community
          isDefault: community.name === 'linkdao'
        }))
        .slice(0, 10); // Show at most 10

      setFollowedCommunities(followed);
    };

    loadRecentCommunities();
    loadFollowedCommunities();
  }, [allCommunities, joinedCommunityIds]);

  const formatLastVisited = (date?: Date): string => {
    if (!date) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleCommunityClick = (communityName: string | { slug?: string; id?: string; name?: string }) => {
    const segment = typeof communityName === 'string'
      ? encodeURIComponent(communityName)
      : encodeURIComponent(communityName.slug ?? communityName.id ?? communityName.name ?? '');
    router.push(`/communities/${segment}`);
  };

  const handleLeaveCommunity = (e: React.MouseEvent, communityId: string) => {
    e.stopPropagation();
    onLeaveCommunity(communityId);
  };

  return (
    <div className="space-y-4">
      {/* Recent Communities Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              Recent
            </h3>
          </div>
          
          <div className="space-y-2">
            {recentCommunities.length > 0 ? (
              recentCommunities.map((community) => (
                <div
                  key={community.id}
                  onClick={() => handleCommunityClick(community.name)}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                      {community.avatar ? (
                        <img
                          src={community.avatar}
                          alt={`${community.displayName} avatar`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                          {community.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {community.displayName}
                    </h4>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{formatLastVisited(community.lastVisited)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                <Clock className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p>No recent communities</p>
                <p className="text-xs mt-1">Communities you visit will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followed Communities Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users className="w-4 h-4 mr-2 text-green-500" />
              Communities
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {followedCommunities.length}
            </span>
          </div>
          
          <div className="space-y-2">
            {followedCommunities.length > 0 ? (
              followedCommunities.map((community) => (
                <div
                  key={community.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer transition-colors group"
                >
                  <div 
                    className="flex items-center flex-1 min-w-0"
                    onClick={() => handleCommunityClick(community.name)}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                        {community.avatar ? (
                          <img
                            src={community.avatar}
                            alt={`${community.displayName} avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                            {community.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 ml-3">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {community.displayName}
                        </h4>
                        {community.isDefault && (
                          <Star className="w-3 h-3 text-yellow-500 ml-1 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Users className="w-3 h-3 mr-1" />
                        <span>{community.memberCount.toLocaleString()} members</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleLeaveCommunity(e, community.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded transition-all"
                    aria-label={`Leave ${community.displayName}`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                <Users className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p>No joined communities</p>
                <p className="text-xs mt-1">Join communities to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};