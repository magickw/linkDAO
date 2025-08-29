import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import UnifiedPostCreation from '@/components/UnifiedPostCreation';
import { FeedSkeleton, ProgressiveLoader } from '@/components/LoadingSkeletons';
import { FeedErrorBoundary, NetworkError } from '@/components/ErrorBoundaries';
import { NoPostsState, LoadingState } from '@/components/FallbackStates';

// Mock profile data - in a real app this would come from the backend
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://placehold.co/40',
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
  },
};

type FeedFilter = 'all' | 'following' | 'trending';

interface FeedViewProps {
  highlightedPostId?: string;
  className?: string;
}

export default function FeedView({ highlightedPostId, className = '' }: FeedViewProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [postCreationExpanded, setPostCreationExpanded] = useState(false);

  // Show success toast when post is created
  useEffect(() => {
    if (createPostSuccess) {
      addToast('Post created successfully!', 'success');
    }
  }, [createPostSuccess, addToast]);

  // Show error toast when post creation fails
  useEffect(() => {
    if (createPostError) {
      addToast(`Error creating post: ${createPostError}`, 'error');
    }
  }, [createPostError, addToast]);

  // Load profiles for posts
  useEffect(() => {
    const loadProfiles = async () => {
      // In a real implementation, we would fetch profiles from the backend
      // For now, we'll use mock data
      setProfiles(mockProfiles);
    };

    if (feed.length > 0) {
      loadProfiles();
    }
  }, [feed]);

  // Simulate infinite scrolling
  const loadMore = useCallback(() => {
    if (!isFeedLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
      // In a real implementation, we would fetch more posts from the backend
      // For now, we'll just simulate reaching the end
      setHasMore(false);
    }
  }, [isFeedLoading, hasMore]);

  // Handle scroll event for infinite scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || !hasMore) {
        return;
      }
      loadMore();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore, hasMore]);

  const handlePostSubmit = async (data: CreatePostInput) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to post', 'error');
      return;
    }
    
    try {
      await createPost(data);
      setPostCreationExpanded(false);
    } catch (error) {
      console.error('Error creating post:', error);
      // Error handling is done in the UnifiedPostCreation component
    }
  };

  // Handle tipping
  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API to process the tip
      // and handle the token transfer
      console.log(`Tipping ${amount} ${token} on post ${postId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  // Filter posts based on active filter
  const filteredFeed = feed.filter(post => {
    switch (activeFilter) {
      case 'following':
        // In a real app, this would check if the user follows the post author
        return true; // For now, show all posts
      case 'trending':
        // In a real app, this would filter by trending algorithm
        // For now, use a simple heuristic based on post age and tags
        const postAge = Date.now() - new Date(post.createdAt).getTime();
        const isRecent = postAge < 24 * 60 * 60 * 1000; // Less than 24 hours old
        const hasTrendingTags = post.tags.some(tag => 
          ['defi', 'nft', 'governance', 'trending'].includes(tag.toLowerCase())
        );
        return isRecent && hasTrendingTags;
      default:
        return true;
    }
  });

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Feed Header with Filters */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
          Social Feed
        </h1>
        
        {/* Feed Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Posts', icon: '🌐' },
            { id: 'following', label: 'Following', icon: '👥' },
            { id: 'trending', label: 'Trending', icon: '🔥' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as FeedFilter)}
              className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap min-w-0 ${
                activeFilter === filter.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="text-base md:text-sm">{filter.icon}</span>
              <span className="hidden sm:inline">{filter.label}</span>
              <span className="sm:hidden text-xs">{filter.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unified Post Creation Interface - Hidden on mobile (use FAB instead) */}
      {isConnected && (
        <UnifiedPostCreation
          context="feed"
          onSubmit={handlePostSubmit}
          isLoading={isCreatingPost}
          expanded={postCreationExpanded}
          onExpandedChange={setPostCreationExpanded}
          className="mb-4 md:mb-6 hidden md:block"
        />
      )}

      {/* Posts Feed */}
      <FeedErrorBoundary onRetry={() => window.location.reload()}>
        <div className="space-y-3 md:space-y-6">
          {isFeedLoading && page === 1 ? (
            /* Loading State */
            <FeedSkeleton postCount={3} />
          ) : feedError ? (
            /* Error State */
            <NetworkError 
              error={feedError}
              onRetry={() => window.location.reload()}
            />
          ) : filteredFeed.length === 0 ? (
            /* Empty State */
            <NoPostsState
              isConnected={isConnected}
              activeFilter={activeFilter}
              onCreatePost={() => setPostCreationExpanded(true)}
            />
          ) : (
            /* Posts List */
            <>
              {filteredFeed.map((post) => {
                const authorProfile = profiles[post.author] || { 
                  handle: 'Unknown', 
                  ens: '', 
                  avatarCid: 'https://placehold.co/40' 
                };
                
                return (
                  <Web3SocialPostCard 
                    key={post.id} 
                    post={post} 
                    profile={authorProfile} 
                    onTip={handleTip}
                    className="transition-all duration-300 hover:shadow-lg"
                  />
                );
              })}
              
              {/* Progressive Loading */}
              <ProgressiveLoader
                isLoading={isFeedLoading && page > 1}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            </>
          )}
        </div>
      </FeedErrorBoundary>


    </div>
  );
}