import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import FeedView from '@/components/FeedView';
import CommunityView from '@/components/CommunityView';
import NavigationSidebar from '@/components/NavigationSidebar';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet from '@/components/BottomSheet';
import Link from 'next/link';
import { Plus, Send, Vote, TrendingUp, Users, MessageCircle, Heart } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Mock profile data - only used as fallback
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
    reputationTier: 'Contributor',
    verified: false
  },
  '0x3456789012345678901234567890123456789012': {
    handle: 'taylorr',
    ens: 'taylor.eth',
    avatarCid: 'https://placehold.co/40',
    reputationScore: 890,
    reputationTier: 'Expert',
    verified: true
  },
};

// Mock posts data for the feed
const mockPosts = [
  {
    id: '1',
    author: '0x1234567890123456789012345678901234567890',
    dao: 'ethereum-builders',
    title: 'New Yield Farming Strategy on Arbitrum',
    contentCid: 'Just deployed a new yield farming strategy on Arbitrum. Got 15% APY so far! What do you think about the risk profile?',
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
    title: 'Proposal: Quadratic Voting Implementation',
    contentCid: 'Proposal for implementing quadratic voting for smaller governance proposals to increase participation. Thoughts?',
    mediaCids: [],
    tags: ['governance', 'proposal', 'dao'],
    createdAt: new Date(Date.now() - 10800000),
    onchainRef: '0x3456...7890',
    reputationScore: 890,
    commentCount: 56,
    stakedValue: 210
  }
];

export default function Home() {
  const { address, isConnected, balance } = useWeb3();
  const { addToast } = useToast();
  const { feed, isLoading: isFeedLoading } = useFeed(address);
  const { createPost, isLoading: isCreatingPost } = useCreatePost();
  const { data: profile } = useProfile(address);
  const { navigationState } = useNavigation();
  
  const [mounted, setMounted] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, any>>(mockProfiles);
  const [posts, setPosts] = useState(mockPosts);
  const [activeTab, setActiveTab] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use real feed data if available, otherwise fall back to mock data
  const displayPosts = feed && feed.length > 0 ? feed : posts;

  // Handle tipping
  const handleTip = async (postId: string, amount: string, token: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to tip', 'error');
      return;
    }
    
    try {
      console.log(`Tipping ${amount} ${token} on post ${postId}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast(`Successfully tipped ${amount} ${token}!`, 'success');
    } catch (error) {
      console.error('Error tipping:', error);
      addToast('Failed to send tip. Please try again.', 'error');
    }
  };

  // Handle voting
  const handleVote = async (postId: string, voteType: 'up' | 'down', amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }
    
    try {
      console.log(`Voting ${voteType} on post ${postId} with ${amount} tokens`);
      await new Promise(resolve => setTimeout(resolve, 500));
      addToast(`${voteType === 'up' ? 'Upvoted' : 'Downvoted'} successfully!`, 'success');
    } catch (error) {
      console.error('Error voting:', error);
      addToast(`Failed to ${voteType} vote. Please try again.`, 'error');
    }
  };

  // If not connected, show landing page
  if (!mounted || !isConnected) {
    return (
      <Layout title="LinkDAO - The Web3 Social Network">
        <div className="text-center py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            LinkDAO — The Web3 Social Network where Identity, Money, and Governance are Yours.
          </h1>
          <div className="mt-8 flex justify-center gap-4">
            <ConnectButton.Custom>
              {({ openConnectModal, authenticationStatus, mounted: rainbowMounted }) => {
                const ready = rainbowMounted && authenticationStatus !== 'loading';
                return (
                  <button
                    onClick={openConnectModal}
                    disabled={!ready}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    Get Started
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>

        <div className="py-16 bg-white dark:bg-gray-900 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Social</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Post, follow, and build your own Web3-native community without ads or censorship.
                </p>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Wallet</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Send and receive payments in ETH and stablecoins directly inside the platform.
                </p>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Governance</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Create and vote on proposals that shape the community and treasury.
                </p>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Marketplace</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Buy & sell digital + physical goods with crypto and NFT-based trust certificates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Connected user experience - Main Social Dashboard/Feed
  return (
    <Layout title="LinkDAO - Home">
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Left Sidebar - Navigation */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <NavigationSidebar className="h-full" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top User Overview Section */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="max-w-4xl mx-auto">
              {/* User Profile Summary */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                      {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Welcome back, {(profile as any)?.handle || (profile as any)?.ens || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {balance} ETH • Reputation: {(profile as any)?.reputationScore || 0}
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex space-x-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">42</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">128</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">89</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">NFTs</div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </button>
                <button
                  onClick={() => setIsWalletSheetOpen(true)}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Tokens
                </button>
                <Link
                  href="/governance"
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Vote className="w-4 h-4 mr-2" />
                  Create Proposal
                </Link>
              </div>
            </div>
          </div>

          {/* Main Feed Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Center Feed */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto py-6 px-4">
                {/* Post Composer */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex-1 text-left px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      What's on your mind?
                    </button>
                  </div>
                </div>

                {/* Feed Tabs */}
                <div className="flex space-x-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
                  {(['hot', 'new', 'top', 'rising'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Feed Content */}
                {navigationState.activeView === 'community' && navigationState.activeCommunity ? (
                  <CommunityView communityId={navigationState.activeCommunity} />
                ) : (
                  <div className="space-y-6">
                    {isFeedLoading ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <p className="text-gray-600 dark:text-gray-300">Loading feed...</p>
                      </div>
                    ) : displayPosts.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
                        <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Be the first to share something with the community!
                        </p>
                      </div>
                    ) : (
                      displayPosts.map((post) => {
                        const authorProfile = profiles[post.author] || { 
                          handle: 'Unknown', 
                          ens: '', 
                          avatarCid: 'https://placehold.co/40' 
                        };
                        
                        return (
                          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <div className="p-6">
                              {/* Post Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {authorProfile.handle.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {authorProfile.handle}
                                      </span>
                                      {authorProfile.verified && (
                                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                      <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {authorProfile.ens}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                                      <span>{(post as any).dao || 'general'}</span>
                                      <span>•</span>
                                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Rep: {authorProfile.reputationScore}
                                  </span>
                                </div>
                              </div>

                              {/* Post Content */}
                              <div className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {(post as any).title || 'Untitled Post'}
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                  {post.contentCid}
                                </p>
                                
                                {/* Media */}
                                {post.mediaCids && post.mediaCids.length > 0 && (
                                  <div className="mt-4">
                                    <img 
                                      src={post.mediaCids[0]} 
                                      alt="Post media" 
                                      className="rounded-lg max-w-full h-auto"
                                    />
                                  </div>
                                )}

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {post.tags.map((tag, index) => (
                                      <span 
                                        key={index}
                                        className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 text-xs rounded-full"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Post Actions */}
                              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-6">
                                  <button 
                                    onClick={() => handleVote(post.id, 'up', 1)}
                                    className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors"
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">Upvote</span>
                                  </button>
                                  <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-sm">{(post as any).commentCount || 0}</span>
                                  </button>
                                  <button 
                                    onClick={() => handleTip(post.id, '0.01', 'ETH')}
                                    className="flex items-center space-x-2 text-gray-500 hover:text-yellow-600 transition-colors"
                                  >
                                    <Heart className="w-4 h-4" />
                                    <span className="text-sm">Tip</span>
                                  </button>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {(post as any).stakedValue || 0} tokens staked
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Activity & Notifications */}
            <div className="hidden xl:flex xl:flex-shrink-0">
              <div className="flex flex-col w-80">
                <DashboardRightSidebar />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostCreationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (postData: CreatePostInput) => {
          try {
            await createPost(postData);
            setIsModalOpen(false);
            addToast('Post created successfully!', 'success');
          } catch (error) {
            console.error('Error creating post:', error);
            addToast('Failed to create post', 'error');
          }
        }}
        isLoading={isCreatingPost}
      />

      <BottomSheet
        isOpen={isWalletSheetOpen}
        onClose={() => setIsWalletSheetOpen(false)}
        title="Send Tokens"
      >
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Wallet-to-wallet token sending feature coming soon!
          </p>
          <button
            onClick={() => setIsWalletSheetOpen(false)}
            className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </BottomSheet>
    </Layout>
  );
}