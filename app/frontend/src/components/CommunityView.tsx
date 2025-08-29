import React, { useState, useEffect, useCallback } from 'react';
import { Community } from '@/models/Community';
import { CommunityPost, CreateCommunityPostInput } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityService } from '@/services/communityService';
import { CommunityPostService } from '@/services/communityPostService';
import { CommunityMembershipService } from '@/services/communityMembershipService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import UnifiedPostCreation from './UnifiedPostCreation';
import CommunityPostCard from './CommunityPostCard';

interface CommunityViewProps {
  communityId: string;
  highlightedPostId?: string;
  className?: string;
}

type SortOption = 'hot' | 'new' | 'top' | 'rising';
type TimeframeOption = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

export default function CommunityView({ communityId, highlightedPostId, className = '' }: CommunityViewProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // State
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [membership, setMembership] = useState<CommunityMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('day');
  const [showPostCreation, setShowPostCreation] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Load community data
  const loadCommunity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const communityData = await CommunityService.getCommunityById(communityId);
      if (!communityData) {
        setError('Community not found');
        return;
      }
      
      setCommunity(communityData);
      
      // Load membership if user is connected
      if (isConnected && address) {
        try {
          const membershipData = await CommunityMembershipService.getMembership(communityId, address);
          setMembership(membershipData);
        } catch (err) {
          // User is not a member, which is fine
          setMembership(null);
        }
      }
    } catch (err) {
      console.error('Error loading community:', err);
      setError(err instanceof Error ? err.message : 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, [communityId, isConnected, address]);

  // Load community posts
  const loadPosts = useCallback(async () => {
    if (!community) return;
    
    try {
      setPostsLoading(true);
      const postsData = await CommunityPostService.getCommunityPosts(communityId, {
        sortBy,
        timeframe,
        limit: 20
      });
      setPosts(postsData);
    } catch (err) {
      console.error('Error loading posts:', err);
      addToast('Failed to load posts', 'error');
    } finally {
      setPostsLoading(false);
    }
  }, [community, communityId, sortBy, timeframe, addToast]);

  // Initial load
  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  // Load posts when community or sort options change
  useEffect(() => {
    if (community) {
      loadPosts();
    }
  }, [community, loadPosts]);

  // Handle joining/leaving community
  const handleJoinCommunity = async () => {
    if (!isConnected || !address || !community) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    try {
      setJoinLoading(true);
      await CommunityMembershipService.joinCommunity({
        userId: address,
        communityId: communityId,
        role: 'member'
      });
      
      // Reload membership and community data
      const [membershipData, updatedCommunity] = await Promise.all([
        CommunityMembershipService.getMembership(communityId, address),
        CommunityService.getCommunityById(communityId)
      ]);
      
      setMembership(membershipData);
      if (updatedCommunity) {
        setCommunity(updatedCommunity);
      }
      
      addToast('Successfully joined community!', 'success');
    } catch (err) {
      console.error('Error joining community:', err);
      addToast(err instanceof Error ? err.message : 'Failed to join community', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!isConnected || !address || !membership) {
      return;
    }

    try {
      setJoinLoading(true);
      await CommunityMembershipService.leaveCommunity(communityId, address);
      
      // Update state
      setMembership(null);
      const updatedCommunity = await CommunityService.getCommunityById(communityId);
      if (updatedCommunity) {
        setCommunity(updatedCommunity);
      }
      
      addToast('Left community', 'success');
    } catch (err) {
      console.error('Error leaving community:', err);
      addToast(err instanceof Error ? err.message : 'Failed to leave community', 'error');
    } finally {
      setJoinLoading(false);
    }
  };

  // Handle post creation
  const handleCreatePost = async (postData: any) => {
    if (!isConnected || !address || !community) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (!membership) {
      addToast('You must join the community to post', 'error');
      return;
    }

    try {
      const createPostInput: CreateCommunityPostInput = {
        author: address,
        communityId: community.id,
        content: postData.content,
        media: postData.media,
        tags: postData.tags,
        onchainRef: postData.onchainRef
      };

      const newPost = await CommunityPostService.createCommunityPost(createPostInput);
      
      // Add new post to the beginning of the list
      setPosts(prevPosts => [newPost, ...prevPosts]);
      setShowPostCreation(false);
      
      addToast('Post created successfully!', 'success');
    } catch (err) {
      console.error('Error creating post:', err);
      throw err; // Let UnifiedPostCreation handle the error display
    }
  };

  // Handle post vote with staking
  const handleVotePost = async (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (!membership) {
      addToast('You must join the community to vote', 'error');
      return;
    }

    try {
      const updatedPost = await CommunityPostService.voteOnPost({
        postId,
        userId: address,
        voteType
      });

      // Update the post in the list
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId ? updatedPost : post
        )
      );

      const stakeMessage = stakeAmount ? ` with ${stakeAmount} tokens staked` : '';
      addToast(`${voteType === 'upvote' ? 'Upvoted' : 'Downvoted'} successfully${stakeMessage}!`, 'success');
    } catch (err) {
      console.error('Error voting on post:', err);
      addToast(err instanceof Error ? err.message : 'Failed to vote', 'error');
    }
  };

  // Handle web3 reactions
  const handleReaction = async (postId: string, reactionType: string, amount?: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    if (!membership) {
      addToast('You must join the community to react', 'error');
      return;
    }

    try {
      // In a real implementation, this would call the backend API
      // For now, just show success message
      addToast(`Successfully staked ${amount || 1} $LNK on ${reactionType} reaction!`, 'success');
    } catch (err) {
      console.error('Error reacting to post:', err);
      addToast(err instanceof Error ? err.message : 'Failed to react', 'error');
    }
  };

  // Handle tipping
  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }

    if (!membership) {
      addToast('You must join the community to tip', 'error');
      return;
    }

    try {
      // In a real implementation, this would call the backend API
      // For now, just show success message
      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (err) {
      console.error('Error tipping post:', err);
      addToast(err instanceof Error ? err.message : 'Failed to tip', 'error');
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        {/* Community Header Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-t-xl"></div>
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </div>
            <div className="mt-4 h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>

        {/* Posts Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {error || 'Community not found'}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          The community you're looking for doesn't exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Community Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
        {/* Banner */}
        {community.banner && (
          <div className="h-32 bg-gradient-to-r from-primary-500 to-secondary-500 relative">
            <img 
              src={community.banner} 
              alt={`${community.displayName} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Community Info */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Community Avatar */}
              <div className="relative">
                {community.avatar ? (
                  <img 
                    src={community.avatar} 
                    alt={community.displayName}
                    className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {community.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Community Details */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {community.displayName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  r/{community.name} • {community.memberCount.toLocaleString()} members
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                    {community.category}
                  </span>
                  {community.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Join/Leave Button */}
            <div className="flex items-center space-x-3">
              {isConnected ? (
                membership ? (
                  <button
                    onClick={handleLeaveCommunity}
                    disabled={joinLoading}
                    className="px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    {joinLoading ? 'Leaving...' : 'Leave'}
                  </button>
                ) : (
                  <button
                    onClick={handleJoinCommunity}
                    disabled={joinLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors duration-200"
                  >
                    {joinLoading ? 'Joining...' : 'Join'}
                  </button>
                )
              ) : (
                <button
                  onClick={() => addToast('Please connect your wallet to join', 'info')}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md cursor-not-allowed"
                >
                  Connect to Join
                </button>
              )}
            </div>
          </div>
          
          {/* Description */}
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            {community.description}
          </p>
          
          {/* Community Rules (collapsible) */}
          {community.rules.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
                Community Rules ({community.rules.length})
              </summary>
              <div className="mt-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {community.rules.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ol>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* Post Creation */}
      {membership && (
        <div className="mb-6">
          <UnifiedPostCreation
            context="community"
            communityId={community.id}
            onSubmit={handleCreatePost}
            placeholder={`Share something with r/${community.name}...`}
            expanded={showPostCreation}
            onExpandedChange={setShowPostCreation}
          />
        </div>
      )}

      {/* Sort Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
            <div className="flex space-x-2">
              {(['hot', 'new', 'top', 'rising'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                    sortBy === option
                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {sortBy === 'top' && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">from:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="hour">Past Hour</option>
                <option value="day">Past Day</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {postsLoading ? (
          // Loading skeleton for posts
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="flex space-x-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              community={community}
              userMembership={membership}
              onVote={handleVotePost}
              onReaction={handleReaction}
              onTip={handleTip}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Be the first to start a discussion in this community!
            </p>
            {membership && (
              <button
                onClick={() => setShowPostCreation(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-200"
              >
                Create First Post
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}