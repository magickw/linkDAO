import React, { useState, useEffect, useCallback } from 'react';
import { Community } from '@/models/Community';
import { CommunityService } from '@/services/communityService';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';

interface CommunityDiscoveryProps {
  onCommunitySelect?: (community: Community) => void;
  className?: string;
}

type FilterOption = 'all' | 'trending' | 'new' | 'joined';
type CategoryFilter = 'all' | string;

export default function CommunityDiscovery({ onCommunitySelect, className = '' }: CommunityDiscoveryProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState<Set<string>>(new Set());

  const categories = [
    'all', 'Technology', 'Gaming', 'Art', 'Music', 'Sports', 
    'Education', 'Business', 'Science', 'Politics', 'Entertainment', 'Lifestyle'
  ];

  // Load communities based on current filters
  const loadCommunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let communitiesData: Community[] = [];
      
      if (searchQuery.trim()) {
        // Search communities
        communitiesData = await CommunityService.searchCommunities(searchQuery.trim());
      } else if (activeFilter === 'trending') {
        // Get trending communities
        communitiesData = await CommunityService.getTrendingCommunities(20);
      } else {
        // Get all communities with filters
        const params: any = { limit: 50 };
        if (categoryFilter !== 'all') {
          params.category = categoryFilter;
        }
        communitiesData = await CommunityService.getAllCommunities(params);
      }

      // Sort based on filter
      if (activeFilter === 'new') {
        communitiesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (activeFilter === 'trending') {
        communitiesData.sort((a, b) => b.memberCount - a.memberCount);
      }

      setCommunities(communitiesData);

      // Load user's joined communities if connected
      if (isConnected && address) {
        try {
          let memberships = [];
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
          
          // Filter to show only joined communities if that filter is active
          if (activeFilter === 'joined') {
            setCommunities(communitiesData.filter(c => joinedIds.has(c.id)));
          }
        } catch (err) {
          // User has no memberships, which is fine
          setJoinedCommunities(new Set());
        }
      }
    } catch (err) {
      console.error('Error loading communities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, categoryFilter, isConnected, address]);

  // Initial load and reload when filters change
  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

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
      setCommunities(prev => prev.map(c => 
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

  const handleCommunityClick = (community: Community) => {
    if (onCommunitySelect) {
      onCommunitySelect(community);
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <LoadingSkeletons.CommunityGrid count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <RetryState
        title="Failed to load communities"
        message={error}
        onRetry={loadCommunities}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'trending', label: 'Trending' },
              { id: 'new', label: 'New' },
              ...(isConnected ? [{ id: 'joined', label: 'Joined' }] : [])
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterOption)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Communities Grid */}
      {communities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.map((community) => {
            const isJoined = joinedCommunities.has(community.id);
            const isJoinLoading = joinLoading.has(community.id);
            
            return (
              <div
                key={community.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Community Banner */}
                <div 
                  className="h-20 bg-gradient-to-r from-primary-500 to-secondary-500 relative"
                  onClick={() => handleCommunityClick(community)}
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
                  {/* Community Avatar and Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="flex items-center space-x-3 flex-1 cursor-pointer"
                      onClick={() => handleCommunityClick(community)}
                    >
                      {community.avatar ? (
                        <img 
                          src={community.avatar} 
                          alt={community.displayName}
                          className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-800 shadow-sm -mt-6"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm -mt-6 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {community.displayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {community.displayName}
                        </h3>
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
                    onClick={() => handleCommunityClick(community)}
                  >
                    {community.description}
                  </p>

                  {/* Stats and Tags */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{community.memberCount.toLocaleString()} members</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {community.category}
                      </span>
                    </div>
                  </div>

                  {/* Tags */}
                  {community.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {community.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {community.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{community.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={searchQuery ? 'No communities found' : 'No communities available'}
          description={
            searchQuery 
              ? `No communities match "${searchQuery}". Try a different search term.`
              : 'There are no communities to display with the current filters.'
          }
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
          action={searchQuery ? {
            label: 'Clear Search',
            onClick: () => setSearchQuery('')
          } : undefined}
        />
      )}
    </div>
  );
}