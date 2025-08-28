import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useWeb3 } from '@/context/Web3Context';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet, { PostActions } from '@/components/BottomSheet';
import Link from 'next/link';
import { useRouter } from 'next/router';

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

// Enhanced mock posts data with different content types - only used as fallback
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
    stakedValue: 120,
    postType: 'defi' // Added post type for visual styling
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
    stakedValue: 85,
    postType: 'nft' // Added post type for visual styling
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
    stakedValue: 210,
    postType: 'governance' // Added post type for visual styling
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
    stakedValue: 165,
    postType: 'defi' // Added post type for visual styling
  },
  {
    id: '5',
    author: '0x3456789012345678901234567890123456789012',
    dao: 'marketplace',
    title: 'Rare CryptoPunk Auction Ending Soon',
    contentCid: 'This Rare CryptoPunk is ending in 2 hours! Current bid is 45.2 ETH. Don\'t miss out on this opportunity!',
    mediaCids: ['https://placehold.co/300'],
    tags: ['marketplace', 'auction', 'nft'],
    createdAt: new Date(Date.now() - 1800000),
    onchainRef: '0x5678...9012',
    reputationScore: 890,
    commentCount: 12,
    stakedValue: 95,
    postType: 'marketplace' // Added post type for visual styling
  }
];

// Mock DAO data
const trendingDAOs = [
  { id: '1', name: 'Ethereum Builders', members: 12400, treasuryValue: 2500000 },
  { id: '2', name: 'DeFi Traders', members: 8900, treasuryValue: 1800000 },
  { id: '3', name: 'NFT Collectors', members: 15600, treasuryValue: 3200000 },
  { id: '4', name: 'DAO Governance', members: 7800, treasuryValue: 1500000 },
  { id: '5', name: 'Web3 Developers', members: 5400, treasuryValue: 950000 },
];

// Mock suggested users
const suggestedUsers = [
  { id: '1', handle: 'web3dev', ens: 'dev.web3.eth', avatarCid: 'https://placehold.co/40', followers: 1200, reputationScore: 650 },
  { id: '2', handle: 'defiwhale', ens: 'whale.defi.eth', avatarCid: 'https://placehold.co/40', followers: 8900, reputationScore: 920 },
  { id: '3', handle: 'nftartist', ens: 'artist.nft.eth', avatarCid: 'https://placehold.co/40', followers: 5600, reputationScore: 780 },
];

// Mock marketplace data
const activeAuctions = [
  { id: '1', name: 'Rare CryptoPunk', currentBid: 45.2, endTime: new Date(Date.now() + 3600000) },
  { id: '2', name: 'DeFi Art Collection', currentBid: 12.8, endTime: new Date(Date.now() + 7200000) },
  { id: '3', name: 'ENS Domain Premium', currentBid: 8.5, endTime: new Date(Date.now() + 10800000) },
];

// Mock governance proposals
const governanceProposals = [
  { id: '1', title: 'Upgrade Governance Contract', dao: 'Ethereum Builders', votesFor: 1240, votesAgainst: 320, endTime: new Date(Date.now() + 86400000) },
  { id: '2', title: 'New Treasury Allocation', dao: 'DeFi Traders', votesFor: 890, votesAgainst: 150, endTime: new Date(Date.now() + 172800000) },
  { id: '3', title: 'Community Grant Program', dao: 'NFT Collectors', votesFor: 2100, votesAgainst: 450, endTime: new Date(Date.now() + 259200000) },
];

export default function Dashboard() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const { profile: userProfile } = useProfile(address);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'daos' | 'marketplace'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', type: 'vote', message: '3 pending governance votes', time: '2 hours ago' },
    { id: '2', type: 'bid', message: 'Auction ending soon: Rare CryptoPunk', time: '5 hours ago' },
    { id: '3', type: 'mention', message: '@alexj mentioned you in a post', time: '1 day ago' },
  ]);

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

  // Load profiles for posts - in a real app, this would fetch from the backend
  useEffect(() => {
    // For now, we'll use mock profiles, but in a real app this would fetch from the backend
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

  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format time remaining
  const formatTimeRemaining = (endTime: Date) => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Ended';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get user's wallet balance
  const getWalletBalance = () => {
    return {
      eth: 2.45,
      usdc: 1250,
      nfts: 8
    };
  };

  // Get user's reputation
  const getUserReputation = () => {
    return {
      score: 750,
      tier: 'Expert'
    };
  };

  if (!isConnected) {
    return (
      <Layout title="Dashboard - LinkDAO">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Personalized Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to access your personalized dashboard.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const walletBalance = getWalletBalance();
  const userReputation = getUserReputation();

  return (
    <Layout title="Dashboard - LinkDAO">
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          {/* Top Section (User Snapshot) */}
          <div className="mb-8">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="relative">
                      <div className="bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-xl w-16 h-16 flex items-center justify-center shadow-md">
                        <span className="text-white font-bold text-xl">
                          {userProfile?.handle?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                        <span className="text-xs">🏆</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {userProfile?.handle || 'User'}
                        </h2>
                        {userProfile?.ens && (
                          <span className="text-gray-500 dark:text-gray-400 text-sm">
                            ({userProfile.ens})
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200">
                          {userReputation.tier}
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Reputation Score: {userReputation.score}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4 md:mb-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {walletBalance.eth} <span className="text-sm font-normal">ETH</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">≈ ${formatNumber(walletBalance.eth * 1700)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {walletBalance.usdc} <span className="text-sm font-normal">USDC</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Stablecoins</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {walletBalance.nfts}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">NFTs</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
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
                      onClick={() => router.push('/wallet')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Tokens
                    </button>
                    <button 
                      onClick={() => router.push('/governance')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-target"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      DAO Proposal
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Notifications / Tasks Widget */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Governance Votes</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">3 pending votes</p>
                  </div>
                  <button className="ml-auto text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                    View
                  </button>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Auction Bids</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2 expiring soon</p>
                  </div>
                  <button className="ml-auto text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                    View
                  </button>
                </div>
              </div>
              
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Social Mentions</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">5 new mentions</p>
                  </div>
                  <button className="ml-auto text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Feed (Personalized Posts) */}
            <div className="lg:w-2/3">
              {/* Mobile Tabs */}
              <div className="md:hidden mb-4">
                <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow border border-white/30 dark:border-gray-700/50 p-1">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${
                      activeTab === 'all'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${
                      activeTab === 'users'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('daos')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${
                      activeTab === 'daos'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    DAOs
                  </button>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${
                      activeTab === 'marketplace'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Marketplace
                  </button>
                </div>
              </div>
              
              {/* Posts Feed */}
              <div className="space-y-6">
                {isFeedLoading ? (
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6">
                    <p className="text-gray-600 dark:text-gray-300">Loading feed...</p>
                  </div>
                ) : feedError ? (
                  <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                    <p>Error loading feed: {feedError}</p>
                    <p className="mt-2 text-sm">Displaying mock data as fallback:</p>
                    <div className="mt-4 space-y-6">
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
                          <div key={post.id} className={`relative rounded-2xl overflow-hidden ${
                            post.postType === 'defi' ? 'border-l-4 border-l-green-500' :
                            post.postType === 'nft' ? 'border-l-4 border-l-purple-500' :
                            post.postType === 'governance' ? 'border-l-4 border-l-blue-500' :
                            post.postType === 'marketplace' ? 'border-l-4 border-l-orange-500' :
                            'border-l-4 border-l-gray-500'
                          }`}>
                            <Web3SocialPostCard 
                              post={post} 
                              profile={authorProfile} 
                              onReaction={handleReaction}
                              onTip={handleTip}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : feed && feed.length > 0 ? (
                  <>
                    {feed.map((post) => {
                      // In a real app, you would fetch the profile for each post author
                      // For now, we'll use mock profiles
                      const authorProfile = profiles[post.author] || { 
                        handle: 'Unknown', 
                        ens: '', 
                        avatarCid: 'https://placehold.co/40',
                        reputationScore: 0,
                        reputationTier: 'Novice',
                        verified: false
                      };
                      
                      return (
                        <div key={post.id} className={`relative rounded-2xl overflow-hidden ${
                          post.postType === 'defi' ? 'border-l-4 border-l-green-500' :
                          post.postType === 'nft' ? 'border-l-4 border-l-purple-500' :
                          post.postType === 'governance' ? 'border-l-4 border-l-blue-500' :
                          post.postType === 'marketplace' ? 'border-l-4 border-l-orange-500' :
                          'border-l-4 border-l-gray-500'
                        }`}>
                          <Web3SocialPostCard 
                            post={post} 
                            profile={authorProfile} 
                            onReaction={handleReaction}
                            onTip={handleTip}
                          />
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No posts yet</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">
                      Be the first to post!
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Sidebar (Smart Recommendations) */}
            <div className="lg:w-1/3">
              <div className="sticky top-6 space-y-6">
                {/* Trending DAOs */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Trending DAOs
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {trendingDAOs.map((dao) => (
                        <Link 
                          key={dao.id} 
                          href={`/dao/${dao.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{dao.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(dao.members)} members</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(dao.treasuryValue)}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Suggested Users */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Suggested Users
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {suggestedUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                            <div className="ml-3">
                              <p className="font-medium text-gray-900 dark:text-white">{user.handle}</p>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <span>{formatNumber(user.followers)} followers</span>
                                <span className="mx-1">•</span>
                                <span className="inline-flex items-center">
                                  <span className="mr-1">🏆</span>
                                  {user.reputationScore}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Active Auctions */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Active Auctions
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {activeAuctions.map((auction) => (
                        <div key={auction.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex justify-between">
                            <p className="font-medium text-gray-900 dark:text-white">{auction.name}</p>
                            <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                              {formatTimeRemaining(auction.endTime)}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Current bid</span>
                            <span className="font-medium text-gray-900 dark:text-white">{auction.currentBid} ETH</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Governance Proposals */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Governance Proposals
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {governanceProposals.map((proposal) => (
                        <div key={proposal.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <div className="flex justify-between">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{proposal.title}</p>
                            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                              {proposal.dao}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="mr-2">👍 {proposal.votesFor}</span>
                              <span>👎 {proposal.votesAgainst}</span>
                            </div>
                            <span className="text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">
                              {formatTimeRemaining(proposal.endTime)}
                            </span>
                          </div>
                          <button className="mt-2 w-full text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-center">
                            Vote Now
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* AI Insights */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
                  <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Insights
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-semibold">You missed 3 hot proposals</span> in DeFi Builders DAO. 
                        One is about yield optimization that could increase your portfolio returns by 12%.
                      </p>
                      <button className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                        View Proposals
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom Section (Quick Wallet & Governance) - Mobile Only */}
          <div className="md:hidden mt-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <h3 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">📤</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Send</span>
                  </button>
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">📥</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Receive</span>
                  </button>
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">🔄</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Swap</span>
                  </button>
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">🗳️</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Vote</span>
                  </button>
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">🏪</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Sell</span>
                  </button>
                  <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                    <div className="text-2xl mb-1">👀</div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Bids</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Post Creation Modal */}
      <PostCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handlePostSubmit}
        isLoading={isCreatingPost}
      />
      
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