import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { SearchService, RecommendationOptions } from '@/services/searchService';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import { Community } from '@/models/Community';
import type { CommunityMembership } from '@/models/CommunityMembership';
import { UserProfile } from '@/models/UserProfile';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';

interface RecommendationSystemProps {
  type?: 'communities' | 'users' | 'both';
  basedOn?: 'activity' | 'interests' | 'network' | 'trending';
  limit?: number;
  showHeaders?: boolean;
  onItemSelect?: (type: 'community' | 'user', item: Community | UserProfile) => void;
  className?: string;
}

export default function RecommendationSystem({
  type = 'both',
  basedOn = 'activity',
  limit = 10,
  showHeaders = true,
  onItemSelect,
  className = ''
}: RecommendationSystemProps) {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState<Set<string>>(new Set());
  const [activeRecommendationType, setActiveRecommendationType] = useState(basedOn);

  // Load recommendations
  const loadRecommendations = useCallback(async (recommendationType: typeof basedOn) => {
    try {
      setLoading(true);
      setError(null);
      
      const options: RecommendationOptions = {
        userId: isConnected ? address : undefined,
        limit,
        excludeJoined: true,
        basedOn: recommendationType
      };

      const promises: Promise<any>[] = [];
      
      if (type === 'communities' || type === 'both') {
        promises.push(SearchService.getRecommendedCommunities(options));
      } else {
        promises.push(Promise.resolve([]));
      }
      
      if (type === 'users' || type === 'both') {
        promises.push(SearchService.getRecommendedUsers(options));
      } else {
        promises.push(Promise.resolve([]));
      }

      const [communities, users] = await Promise.all(promises);
      
      setRecommendedCommunities(communities);
      setRecommendedUsers(users);

      // Load user's joined communities if connected
      if (isConnected && address && (type === 'communities' || type === 'both')) {
        try {
          let memberships: CommunityMembership[] = [];
          try {
            memberships = await CommunityMembershipService.getUserMemberships(address);
          } catch (err) {
            // Handle 503 Service Unavailable specifically
            if (err instanceof Error && err.message.includes('503')) {
              console.warn('Backend service unavailable, using empty memberships');
              // Continue with empty memberships instead of throwing
              memberships = [];
            } else {
              // Re-throw other errors
              throw err;
            }
          }
          const joinedIds = new Set(memberships.map(m => m.communityId));
          setJoinedCommunities(joinedIds);
        } catch (err) {
          // User has no memberships, which is fine
          setJoinedCommunities(new Set());
        }
      }
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [type, limit, isConnected, address]);

  // Handle joining/leaving community
  const handleJoinCommunity = async (community: Community) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to join communities', 'error');
      return;
    }

    const isJoined = joinedCommunities.has(community.id);
    
    try {
      setJoinLoading(prev => new Set(prev).add(community.id));
      
      if (isJoined) {
        await CommunityMembershipService.leaveCommunity(community.id, address);
        setJoinedCommunities(prev => {
          const newSet = new Set(prev);
          newSet.delete(community.id);
          return newSet;
        });
        addToast(`Left r/${community.name}`, 'success');
      } else {
        await CommunityMembershipService.joinCommunity({
          userId: address,
          communityId: community.id,
          role: 'member'
        });
        setJoinedCommunities(prev => new Set(prev).add(community.id));
        addToast(`Joined r/${community.name}!`, 'success');
      }

      // Update community member count
      setRecommendedCommunities(prev => prev.map(c => 
        c.id === community.id 
          ? { ...c, memberCount: c.memberCount + (isJoined ? -1 : 1) }
          : c
      ));
    } catch (err) {
      console.error('Error joining/leaving community:', err);
      addToast(err instanceof Error ? err.message : 'Failed to update membership', 'error');
    } finally {
      setJoinLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(community.id);
        return newSet;
      });
    }
  };

  // Handle item selection
  const handleItemClick = (itemType: 'community' | 'user', item: Community | UserProfile) => {
    if (onItemSelect) {
      onItemSelect(itemType, item);
    } else {
      // Default navigation behavior
      if (itemType === 'community') {
        router.push(`/dashboard?community=${(item as Community).id}`);
      } else {
        router.push(`/profile?user=${(item as UserProfile).walletAddress}`);
      }
    }
  };

  // Handle recommendation type change
  const handleRecommendationTypeChange = (newType: typeof basedOn) => {
    setActiveRecommendationType(newType);
    loadRecommendations(newType);
  };

  // Initial load
  useEffect(() => {
    loadRecommendations(activeRecommendationType);
  }, [loadRecommendations, activeRecommendationType]);

  if (loading) {
    return (
      <div className={className}>
        <LoadingSkeletons.RecommendationCards count={limit} />
      </div>
    );
  }

  if (error) {
    return (
      <RetryState
        title="Failed to load recommendations"
        message={error}
        onRetry={() => loadRecommendations(activeRecommendationType)}
        className={className}
      />
    );
  }

  const hasRecommendations = recommendedCommunities.length > 0 || recommendedUsers.length > 0;

  if (!hasRecommendations) {
    return (
      <EmptyState
        title="No recommendations available"
        description={
          isConnected 
            ? "We're still learning about your preferences. Interact with more content to get personalized recommendations!"
            : "Connect your wallet to get personalized recommendations based on your activity."
        }
        icon={
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {showHeaders && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            💡 Recommended for You
          </h2>
          
          {/* Recommendation Type Selector */}
          <select
            value={activeRecommendationType}
            onChange={(e) => handleRecommendationTypeChange(e.target.value as typeof basedOn)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="activity">Based on Activity</option>
            <option value="interests">Based on Interests</option>
            <option value="network">Based on Network</option>
            <option value="trending">Trending</option>
          </select>
        </div>
      )}

      <div className="space-y-6">
        {/* Recommended Communities */}
        {(type === 'communities' || type === 'both') && recommendedCommunities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Communities You Might Like
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedCommunities.map((community) => {
                const isJoined = joinedCommunities.has(community.id);
                const isJoinLoading = joinLoading.has(community.id);
                
                return (
                  <div
                    key={community.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Community Banner */}
                    <div 
                      className="h-16 bg-gradient-to-r from-primary-500 to-secondary-500 relative cursor-pointer"
                      onClick={() => handleItemClick('community', community)}
                    >
                      {community.banner && (
                        <img 
                          src={community.banner} 
                          alt={`${community.displayName} banner`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="p-4">
                      {/* Community Info */}
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="flex items-center space-x-3 flex-1 cursor-pointer"
                          onClick={() => handleItemClick('community', community)}
                        >
                          {community.avatar ? (
                            <img 
                              src={community.avatar} 
                              alt={community.displayName}
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 shadow-sm -mt-8"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm -mt-8 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {community.displayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {community.displayName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              r/{community.name}
                            </p>
                          </div>
                        </div>

                        {/* Join/Leave Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinCommunity(community);
                          }}
                          disabled={isJoinLoading}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            isJoined
                              ? 'border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          } disabled:opacity-50`}
                        >
                          {isJoinLoading ? '...' : isJoined ? 'Leave' : 'Join'}
                        </button>
                      </div>

                      {/* Description */}
                      <p 
                        className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 cursor-pointer"
                        onClick={() => handleItemClick('community', community)}
                      >
                        {community.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{community.memberCount.toLocaleString()} members</span>
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {community.category}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recommended Users */}
        {(type === 'users' || type === 'both') && recommendedUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">👤</span>
              People You Might Know
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedUsers.map((user) => (
                <div
                  key={user.walletAddress}
                  onClick={() => handleItemClick('user', user)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <img 
                      src={user.avatarCid || 'https://placehold.co/40'} 
                      alt={user.handle || 'User'} 
                      className="w-12 h-12 rounded-full" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.handle || 'Anonymous'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {user.ens || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                      </p>
                    </div>
                  </div>
                  
                  {user.bioCid && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {user.bioCid}
                    </p>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle follow action
                      addToast('Follow functionality coming soon!', 'info');
                    }}
                    className="w-full px-3 py-1 text-sm font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}