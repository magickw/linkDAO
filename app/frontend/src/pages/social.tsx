import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import Web3SocialSidebar from '@/components/Web3SocialSidebar';
import Web3SocialNav from '@/components/Web3SocialNav';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet from '@/components/BottomSheet';
import MigrationNotice from '@/components/MigrationNotice';
import MigrationGuide from '@/components/MigrationGuide';

// Mock profile data
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

export default function SocialFeed() {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const [showMigrationGuide, setShowMigrationGuide] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle migration to new dashboard
  useEffect(() => {
    const handleMigration = async () => {
      // Save current scroll position for restoration
      sessionStorage.setItem('legacy-scroll-position', JSON.stringify({
        x: window.scrollX,
        y: window.scrollY
      }));

      // Preserve any existing feed state
      const currentFeedState = {
        activeTab,
        timeFilter,
        scrollPosition: window.scrollY
      };
      sessionStorage.setItem('legacy-feed-state', JSON.stringify(currentFeedState));

      if (isConnected) {
        // Show migration notice first
        setShowMigrationNotice(true);
        
        // Auto-redirect after a short delay if user doesn't interact
        const redirectTimer = setTimeout(() => {
          setIsRedirecting(true);
          // Redirect to home (which will show dashboard for authenticated users)
          router.push('/?view=feed');
        }, 3000); // Reduced from 5000 to 3000 for better UX

        return () => clearTimeout(redirectTimer);
      } else {
        // For non-connected users, show the migration notice
        const hasSeenSocialMigration = localStorage.getItem('social-migration-seen');
        if (!hasSeenSocialMigration) {
          setShowMigrationNotice(true);
        }
      }
    };

    handleMigration();
  }, [isConnected, router, activeTab, timeFilter]);

  const handleMigrationDismiss = () => {
    setShowMigrationNotice(false);
    localStorage.setItem('social-migration-seen', 'true');
    
    if (isConnected) {
      setIsRedirecting(true);
      router.push('/');
    }
  };

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
      // Add the author address to the post data
      const postData: CreatePostInput = {
        ...data,
        author: address,
      };
      
      await createPost(postData);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };

  // Handle tokenized voting
  const handleVote = async (postId: string, voteType: 'up' | 'down', amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API to process the vote
      // and handle the microtransaction of tokens
      console.log(`Voting ${voteType} on post ${postId} with ${amount} tokens`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addToast(`${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully!`, 'success');
    } catch (error) {
      console.error('Error voting:', error);
      addToast(`Failed to ${voteType} vote. Please try again.`, 'error');
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

  // Handle wallet action
  const handleWalletAction = (action: string) => {
    setIsWalletSheetOpen(false);
    addToast(`Wallet action: ${action}`, 'info');
    // In a real implementation, this would navigate to the appropriate page or open a modal
  };

  // Handle post action
  const handlePostAction = (action: string) => {
    setIsPostSheetOpen(false);
    if (action === 'standard' || action === 'proposal' || action === 'defi' || action === 'nft' || action === 'question') {
      setIsModalOpen(true);
    } else {
      addToast(`Post action: ${action}`, 'info');
    }
  };

  // Show migration notice
  if (showMigrationNotice) {
    return (
      <>
        <Layout title="Social Feed - LinkDAO">
          <div className="px-4 py-6 sm:px-0">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Web3 Social Feed</h1>
              
              {/* Migration Banner */}
              <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-2">🎉 Social Feed Has Moved!</h2>
                    <p className="text-primary-100 mb-3">
                      Your social feed is now part of our integrated dashboard experience with enhanced features:
                    </p>
                    <ul className="text-primary-100 text-sm space-y-1 mb-3">
                      <li>• Unified feed with community posts</li>
                      <li>• Better mobile experience</li>
                      <li>• Enhanced Web3 features</li>
                      <li>• Seamless navigation</li>
                    </ul>
                    <p className="text-primary-100 text-sm">
                      {isConnected ? 'Redirecting you to the new dashboard in 3 seconds...' : 'Connect your wallet to access the new dashboard.'}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {isConnected && (
                      <button
                        onClick={() => {
                          setIsRedirecting(true);
                          router.push('/?view=feed');
                        }}
                        className="bg-white text-primary-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                      >
                        Go Now
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isConnected) {
                          handleMigrationDismiss();
                        } else {
                          setShowMigrationGuide(true);
                        }
                      }}
                      className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors font-medium text-sm"
                    >
                      {isConnected ? 'Stay Here' : 'Learn More'}
                    </button>
                  </div>
                </div>
              </div>

              {isRedirecting && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Redirecting to your new dashboard...</p>
                </div>
              )}
            </div>
          </div>
        </Layout>
        
        <MigrationNotice
          type="social"
          onDismiss={handleMigrationDismiss}
        />
        
        {showMigrationGuide && (
          <MigrationGuide
            fromPage="social"
            onClose={() => setShowMigrationGuide(false)}
          />
        )}
      </>
    );
  }

  return (
    <Layout title="Social Feed - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Web3 Social Feed</h1>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="lg:w-3/4">
              {/* Web3 Social Navigation */}
              <Web3SocialNav 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
                timeFilter={timeFilter} 
                onTimeFilterChange={setTimeFilter} 
              />
              
              {/* Create Post Button */}
              {isConnected && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
                  <div 
                    onClick={() => setIsPostSheetOpen(true)}
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                      <div className="ml-3 text-gray-500 dark:text-gray-400">
                        What's happening in Web3?
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Posts Feed */}
              <div className="space-y-4">
                {isFeedLoading && page === 1 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <p className="text-gray-600 dark:text-gray-300">Loading feed...</p>
                  </div>
                ) : feedError ? (
                  <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                    <p>Error loading feed: {feedError}</p>
                  </div>
                ) : feed.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No posts yet</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      {isConnected 
                        ? 'Be the first to post!' 
                        : 'Connect your wallet to see posts from the community.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {feed.map((post) => {
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
                        />
                      );
                    })}
                    
                    {isFeedLoading && page > 1 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <p className="text-gray-600 dark:text-gray-300">Loading more posts...</p>
                      </div>
                    )}
                    
                    {!hasMore && feed.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <p className="text-gray-500 dark:text-gray-400">You've reached the end of the feed</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <Web3SocialSidebar />
            </div>
          </div>
        </div>
      </div>
      
      {/* Post Creation Modal */}
      <PostCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handlePostSubmit}
        isLoading={isCreatingPost}
      />
      
      {/* Wallet Actions Bottom Sheet */}
      <BottomSheet 
        isOpen={isWalletSheetOpen} 
        onClose={() => setIsWalletSheetOpen(false)}
        title="Wallet Actions"
      >
        <div className="p-4">
          <button 
            onClick={() => handleWalletAction('connect')}
            className="w-full p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </BottomSheet>
      
      {/* Post Creation Bottom Sheet */}
      <BottomSheet 
        isOpen={isPostSheetOpen} 
        onClose={() => setIsPostSheetOpen(false)}
        title="Create Post"
      >
        <div className="p-4">
          <button 
            onClick={() => handlePostAction('standard')}
            className="w-full p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Post
          </button>
        </div>
      </BottomSheet>
    </Layout>
  );
}