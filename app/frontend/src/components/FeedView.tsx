import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import UnifiedPostCreation from '@/components/UnifiedPostCreation';

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
  const handleTip = async (postId: string, amount: number, token: string) => {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Social Feed
        </h1>
        
        {/* Feed Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { id: 'all', label: 'All Posts', icon: '🌐' },
            { id: 'following', label: 'Following', icon: '👥' },
            { id: 'trending', label: 'Trending', icon: '🔥' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as FeedFilter)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeFilter === filter.id
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unified Post Creation Interface */}
      {isConnected && (
        <UnifiedPostCreation
          context="feed"
          onSubmit={handlePostSubmit}
          isLoading={isCreatingPost}
          expanded={postCreationExpanded}
          onExpandedChange={setPostCreationExpanded}
          className="mb-6"
        />
      )}

      {/* Posts Feed */}
      <div className="space-y-6">
        {isFeedLoading && page === 1 ? (
          /* Loading State */
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : feedError ? (
          /* Error State */
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Error loading feed
            </h3>
            <p className="text-red-600 dark:text-red-300">
              {feedError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        ) : filteredFeed.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {activeFilter === 'following' ? 'No posts from people you follow' :
               activeFilter === 'trending' ? 'No trending posts right now' :
               'No posts yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {isConnected 
                ? activeFilter === 'following' 
                  ? 'Follow some users to see their posts here.'
                  : activeFilter === 'trending'
                  ? 'Check back later for trending content.'
                  : 'Be the first to post something!'
                : 'Connect your wallet to see posts from the community.'}
            </p>
            {isConnected && activeFilter === 'all' && (
              <button 
                onClick={() => setPostCreationExpanded(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
              >
                Create Your First Post
              </button>
            )}
          </div>
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
            
            {/* Loading More Indicator */}
            {isFeedLoading && page > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                  <p className="text-gray-600 dark:text-gray-300">Loading more posts...</p>
                </div>
              </div>
            )}
            
            {/* End of Feed Indicator */}
            {!hasMore && filteredFeed.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  You've reached the end of the feed
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Check back later for new posts
                </p>
              </div>
            )}
          </>
        )}
      </div>


    </div>
  );
}