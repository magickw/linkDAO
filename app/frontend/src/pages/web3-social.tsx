import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import Web3SocialSidebar from '@/components/Web3SocialSidebar';
import FloatingActionDock from '@/components/FloatingActionDock';
import BottomSheet, { PostActions } from '@/components/BottomSheet';
import { useRouter } from 'next/router';

// Mock profile data
const mockProfiles: Record<string, any> = {
  '0x1234567890123456789012345678901234567890': {
    handle: 'alexj',
    ens: 'alex.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 750,
    reputationTier: 'Expert',
    verified: true
  },
  '0x2345678901234567890123456789012345678901': {
    handle: 'samc',
    ens: 'sam.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 420,
    reputationTier: 'Apprentice',
    verified: false
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 890,
    reputationTier: 'Master',
    verified: true
  },
};

// Mock posts data
const mockPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    dao: 'ethereum-builders',
    title: 'New Yield Farming Strategy on Arbitrum',
    contentCid: 'Just deployed a new yield farming strategy on Arbitrum. Got 15% APY so far! What do you think about the risk profile? Check out the detailed analysis in the embedded chart.',
    mediaCids: [],
    tags: ['defi', 'yield', 'arbitrum'],
    createdAt: new Date(Date.now() - 3600000),
    onchainRef: '0x1234...5678',
    reputationScore: 750,
    commentCount: 24,
    stakedValue: 120
  },
  {
    id: '2',
    author: '0x2345678901234567890123456789012345678901',
    dao: 'nft-collectors',
    title: 'My Latest NFT Collection Drop',
    contentCid: 'Check out my latest NFT collection drop! Each piece represents a different DeFi protocol. Feedback welcome.',
    mediaCids: ['https://placehold.co/300'],
    tags: ['nft', 'art', 'defi'],
    createdAt: new Date(Date.now() - 7200000),
    onchainRef: '0x2345...6789',
    reputationScore: 420,
    commentCount: 18,
    stakedValue: 85
  },
  {
    id: '3',
    author: '0x3456789012345678901234567890123456789012',
    dao: 'dao-governance',
    title: 'Proposal: Quadratic Voting for Smaller Proposals',
    contentCid: 'Proposal for a new governance mechanism: Quadratic Voting for smaller proposals to increase participation. Thoughts?',
    mediaCids: [],
    tags: ['governance', 'proposal', 'dao'],
    createdAt: new Date(Date.now() - 10800000),
    onchainRef: '0x3456...7890',
    reputationScore: 890,
    commentCount: 56,
    stakedValue: 210
  },
  {
    id: '4',
    author: '0x1234567890123456789012345678901234567890',
    dao: 'defi-traders',
    title: 'Market Analysis: BTC to $100K?',
    contentCid: 'With the recent halving and institutional adoption, I believe BTC could reach $100K by end of year. Here\'s my technical analysis with on-chain data.',
    mediaCids: [],
    tags: ['defi', 'analysis', 'btc'],
    createdAt: new Date(Date.now() - 14400000),
    onchainRef: '0x4567...8901',
    reputationScore: 750,
    commentCount: 42,
    stakedValue: 165
  }
];

export default function Web3SocialFeed() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeSort, setActiveSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);

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
    setProfiles(mockProfiles);
  }, []);

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
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };

  // Handle token staking for reactions
  const handleReaction = async (postId: string, reactionType: string, amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }
    
    try {
      // In a real implementation, this would call the backend API to process the reaction
      // and handle the staking of tokens
      console.log(`Staking ${amount} $LNK on ${reactionType} reaction for post ${postId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addToast(`Successfully staked ${amount} $LNK on ${reactionType} reaction!`, 'success');
    } catch (error) {
      console.error('Error reacting:', error);
      addToast('Failed to react. Please try again.', 'error');
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

  // Handle post action
  const handlePostAction = (action: string) => {
    setIsPostSheetOpen(false);
    if (action === 'standard' || action === 'proposal' || action === 'defi' || action === 'nft' || action === 'question') {
      setIsCreateModalOpen(true);
    } else {
      addToast(`Post action: ${action}`, 'info');
    }
  };

  return (
    <Layout title="Web3 Social Feed - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Web3 Social Feed</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Connect, share, and engage with the decentralized community
              </p>
            </div>
            
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button 
                onClick={() => setIsPostSheetOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Post
              </button>
              
              <button 
                onClick={() => router.push('/dao')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                DAOs
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between mb-6 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow border border-white/30 dark:border-gray-700/50">
            <div className="flex flex-wrap gap-2 mb-4 md:mb-0">
              <button
                onClick={() => setActiveSort('hot')}
                className={`px-4 py-2 rounded-full text-sm font-medium touch-target ${
                  activeSort === 'hot'
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'bg-gray-100/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/50'
                }`}
              >
                🔥 Hot
              </button>
              <button
                onClick={() => setActiveSort('new')}
                className={`px-4 py-2 rounded-full text-sm font-medium touch-target ${
                  activeSort === 'new'
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'bg-gray-100/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/50'
                }`}
              >
                🆕 New
              </button>
              <button
                onClick={() => setActiveSort('top')}
                className={`px-4 py-2 rounded-full text-sm font-medium touch-target ${
                  activeSort === 'top'
                    ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-md'
                    : 'bg-gray-100/80 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-600/50'
                }`}
              >
                🏆 Top
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="bg-gray-100/80 dark:bg-gray-700/50 border-0 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-primary-500 touch-target"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          
          {/* Main Content - Posts Grid and Sidebar */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Posts Grid */}
            <div className="lg:w-3/4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {mockPosts.map((post) => {
                  const authorProfile = profiles[post.author] || { 
                    handle: 'Unknown', 
                    ens: '', 
                    avatarCid: 'https://placehold.co/40',
                    reputationScore: 0,
                    reputationTier: 'Novice',
                    verified: false
                  };
                  
                  return (
                    <Web3SocialPostCard 
                      key={post.id} 
                      post={post} 
                      profile={authorProfile} 
                      onReaction={handleReaction}
                      onTip={handleTip}
                    />
                  );
                })}
              </div>
              
              {/* Empty State */}
              {mockPosts.length === 0 && (
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow border border-white/30 dark:border-gray-700/50 p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No posts yet</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">
                    {isConnected 
                      ? 'Be the first to post!' 
                      : 'Connect your wallet to see posts from the community.'}
                  </p>
                  {isConnected ? (
                    <div className="mt-6">
                      <button
                        onClick={() => setIsPostSheetOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 touch-target"
                      >
                        Create your first post
                      </button>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 touch-target">
                        Connect Wallet
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <Web3SocialSidebar />
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Dock */}
      <FloatingActionDock />
      
      {/* Mobile Navigation - Hidden on larger screens */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="flex justify-around items-center py-2">
          <button 
            onClick={() => router.push('/')}
            className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 touch-target"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button 
            onClick={() => router.push('/social')}
            className="flex flex-col items-center justify-center p-2 text-primary-600 dark:text-primary-400 touch-target"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <span className="text-xs mt-1">Feed</span>
          </button>
          
          <button 
            onClick={() => setIsPostSheetOpen(true)}
            className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 touch-target"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-xs mt-1">Create</span>
          </button>
          
          <button 
            onClick={() => router.push('/dao')}
            className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 touch-target"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs mt-1">DAOs</span>
          </button>
          
          <button 
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 touch-target"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs mt-1">Profile</span>
          </button>
        </div>
      </div>
      
      {/* Add padding to content to account for mobile nav */}
      <div className="md:hidden pb-16"></div>
      
      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Post</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 touch-target"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form className="p-6">
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  placeholder="Give your post a title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  placeholder="Share your thoughts with the community..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                />
                <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
                  280 characters remaining
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  id="tags"
                  placeholder="defi, nft, governance"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add relevant tags to help others discover your post
                </p>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Post to DAO
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white">
                  <option>Select a DAO</option>
                  <option>Ethereum Builders</option>
                  <option>DeFi Traders</option>
                  <option>NFT Collectors</option>
                  <option>DAO Governance</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 touch-target"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Post Creation Bottom Sheet */}
      <BottomSheet 
        isOpen={isPostSheetOpen} 
        onClose={() => setIsPostSheetOpen(false)}
        title="Create Post"
      >
        <PostActions onAction={handlePostAction} />
      </BottomSheet>
    </Layout>
  );
}