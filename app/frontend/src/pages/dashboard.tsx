import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/DashboardLayout';
import DashboardRightSidebar from '@/components/DashboardRightSidebar';
import FeedView from '@/components/FeedView';
import CommunityView from '@/components/CommunityView';
import MigrationNotice from '@/components/MigrationNotice';
import DashboardTour from '@/components/DashboardTour';
import LegacyFunctionalityPreserver from '@/components/LegacyFunctionalityPreserver';
import { useWeb3 } from '@/context/Web3Context';
import { useNavigation } from '@/context/NavigationContext';
import { useFeed, useCreatePost } from '@/hooks/usePosts';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/context/ToastContext';
import { CreatePostInput } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import PostCreationModal from '@/components/PostCreationModal';
import BottomSheet from '@/components/BottomSheet';
import Link from 'next/link';
import { AnimatedCard, AnimatedButton, AnimatedCounter, StaggeredAnimation } from '@/components/animations/MicroInteractions';
import { ViewTransition } from '@/components/animations/TransitionComponents';
import { DashboardHeaderSkeleton, FeedSkeleton } from '@/components/animations/LoadingSkeletons';
import { EnhancedCard, EnhancedButton } from '@/components/ui/EnhancedTheme';

// Helper function to determine post type based on tags
const getPostType = (post: any) => {
  if (post.tags && post.tags.length > 0) {
    if (post.tags.includes('defi')) return 'defi';
    if (post.tags.includes('nft')) return 'nft';
    if (post.tags.includes('governance')) return 'governance';
    if (post.tags.includes('marketplace')) return 'marketplace';
  }
  return 'default';
};

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
    stakedValue: 95
  }
];



export default function Dashboard() {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const router = useRouter();
  const { navigationState, openModal, closeModal } = useNavigation();

  // Redirect to home page (conditional routing handles dashboard display)
  useEffect(() => {
    router.replace({
      pathname: '/',
      query: router.query
    });
  }, [router]);
  const { feed, isLoading: isFeedLoading, error: feedError } = useFeed(address);
  const { createPost, isLoading: isCreatingPost, error: createPostError, success: createPostSuccess } = useCreatePost();
  const { profile: userProfile } = useProfile(address);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'daos' | 'marketplace'>('all');
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);
  const [notifications] = useState([
    { id: '1', type: 'vote', message: '3 pending governance votes', time: '2 hours ago' },
    { id: '2', type: 'bid', message: 'Auction ending soon: Rare CryptoPunk', time: '5 hours ago' },
    { id: '3', type: 'mention', message: '@alexj mentioned you in a post', time: '1 day ago' },
  ]);

  // Check if this is the first time visiting the updated dashboard
  useEffect(() => {
    const hasSeenMigration = localStorage.getItem('dashboard-migration-seen');
    if (!hasSeenMigration) {
      setShowMigrationNotice(true);
      localStorage.setItem('dashboard-migration-seen', 'true');
    }
  }, []);

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
      closeModal('postCreation');
    } catch (error) {
      console.error('Error creating post:', error);
      addToast('Failed to create post. Please try again.', 'error');
    }
  };

  // Handle token staking for reactions
  const handleReaction = async (postId: string, reactionType: string, amount?: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    try {
      // In a real implementation, this would call the backend API to process the reaction
      // and handle the staking of tokens
      const stakeAmount = amount || 1;
      console.log(`Staking ${stakeAmount} $LNK on ${reactionType} reaction for post ${postId}`);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      addToast(`Successfully staked ${stakeAmount} $LNK on ${reactionType} reaction!`, 'success');
    } catch (error) {
      console.error('Error reacting:', error);
      addToast('Failed to react. Please try again.', 'error');
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

  // Handle post action
  const handlePostAction = (action: string) => {
    setIsPostSheetOpen(false);
    if (action === 'standard' || action === 'proposal' || action === 'defi' || action === 'nft' || action === 'question') {
      openModal('postCreation');
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
      <DashboardLayout title="Dashboard - LinkDAO" activeView="feed">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Personalized Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Please connect your wallet to access your personalized dashboard.</p>
        </div>
      </DashboardLayout>
    );
  }

  const walletBalance = getWalletBalance();
  const userReputation = getUserReputation();

  const handleCreatePost = () => {
    openModal('postCreation');
  };

  return (
    <>
      {/* Legacy Functionality Preserver */}
      <LegacyFunctionalityPreserver />
      
      {/* Migration Notice */}
      {showMigrationNotice && (
        <MigrationNotice 
          type="dashboard" 
          onDismiss={() => setShowMigrationNotice(false)}
        />
      )}
      
      {/* Dashboard Tour */}
      <DashboardTour />
      
      <DashboardLayout
        title="Dashboard - LinkDAO"
        activeView={navigationState.activeView}
        rightSidebar={<DashboardRightSidebar />}
        onCreatePost={handleCreatePost}
      >
      <div className="space-y-6">
        {/* Top Section (User Snapshot) */}
        <div className="mb-8">
          <AnimatedCard animation="lift" className="overflow-hidden" delay={0}>
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center space-x-4 mb-4 md:mb-0 animate-fadeInLeft" data-tour="user-profile">
                  <div className="relative group">
                    <div className="bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 rounded-xl w-16 h-16 flex items-center justify-center shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                      <span className="text-white font-bold text-xl">
                        {userProfile?.handle?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm animate-pulse">
                      <span className="text-xs">🏆</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {userProfile?.handle || 'User'}
                      </h2>
                      {userProfile?.ens && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm animate-fadeIn">
                          ({userProfile.ens})
                        </span>
                      )}
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200 animate-scaleIn">
                        {userReputation.tier}
                      </span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      Reputation Score: <AnimatedCounter value={userReputation.score} />
                    </p>
                  </div>
                </div>

                <StaggeredAnimation delay={100} animation="fadeInUp" className="grid grid-cols-3 gap-4 mb-4 md:mb-0">
                  {[
                    { value: walletBalance.eth, label: 'ETH', sublabel: `≈ $${formatNumber(walletBalance.eth * 1700)}` },
                    { value: walletBalance.usdc, label: 'USDC', sublabel: 'Stablecoins' },
                    { value: walletBalance.nfts, label: '', sublabel: 'NFTs' }
                  ].map((item, index) => (
                    <div key={index} className="text-center group hover:scale-105 transition-transform duration-200">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        <AnimatedCounter value={item.value} /> <span className="text-sm font-normal">{item.label}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.sublabel}</p>
                    </div>
                  ))}
                </StaggeredAnimation>

                <div className="flex space-x-2 animate-fadeInRight" data-tour="create-post">
                  <AnimatedButton
                    onClick={() => openModal('postCreation')}
                    variant="gradient"
                    animation="scale"
                    className="inline-flex items-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Post
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => router.push('/wallet')}
                    variant="outline"
                    animation="scale"
                    className="inline-flex items-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Tokens
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => router.push('/governance')}
                    variant="outline"
                    animation="scale"
                    className="inline-flex items-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    DAO Proposal
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </AnimatedCard>

          {/* Notifications / Tasks Widget */}
          <StaggeredAnimation delay={150} animation="fadeInUp" className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="quick-actions">
            {[
              {
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
                title: 'Governance Votes',
                count: 3,
                description: 'pending votes',
                color: 'red',
                bgColor: 'bg-red-100 dark:bg-red-900/30',
                textColor: 'text-red-600 dark:text-red-400'
              },
              {
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                title: 'Auction Bids',
                count: 2,
                description: 'expiring soon',
                color: 'yellow',
                bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
                textColor: 'text-yellow-600 dark:text-yellow-400'
              },
              {
                icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                title: 'Social Mentions',
                count: 5,
                description: 'new mentions',
                color: 'blue',
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                textColor: 'text-blue-600 dark:text-blue-400'
              }
            ].map((item, index) => (
              <AnimatedCard key={index} animation="lift" delay={index * 100} className="p-4 group cursor-pointer">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`flex items-center justify-center h-8 w-8 rounded-md ${item.bgColor} ${item.textColor} group-hover:scale-110 transition-transform duration-200`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <AnimatedCounter value={item.count} /> {item.description}
                    </p>
                  </div>
                  <AnimatedButton
                    variant="ghost"
                    size="small"
                    animation="scale"
                    className="ml-auto text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300"
                  >
                    View
                  </AnimatedButton>
                </div>
              </AnimatedCard>
            ))}
          </StaggeredAnimation>
        </div>

        {/* Main Content - Conditional Rendering Based on Active View */}
        <div className="w-full" data-tour="feed-view">
          <ViewTransition
            currentView={navigationState.activeView}
            views={{
              feed: <FeedView />,
              community: navigationState.activeCommunity ? <CommunityView communitySlug={navigationState.activeCommunity} /> : <div>Select a community</div>,
              fallback: (
            /* Fallback to legacy dashboard content */
            <div>
              {/* Mobile Tabs */}
              <div className="md:hidden mb-4">
                <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow border border-white/30 dark:border-gray-700/50 p-1">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${activeTab === 'all'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${activeTab === 'users'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('daos')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${activeTab === 'daos'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    DAOs
                  </button>
                  <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-xl ${activeTab === 'marketplace'
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Marketplace
                  </button>
                </div>
              </div>

              {/* Legacy Posts Feed */}
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
                          <div key={post.id} className={`relative rounded-2xl overflow-hidden ${getPostType(post) === 'defi' ? 'border-l-4 border-l-green-500' :
                            getPostType(post) === 'nft' ? 'border-l-4 border-l-purple-500' :
                              getPostType(post) === 'governance' ? 'border-l-4 border-l-blue-500' :
                                getPostType(post) === 'marketplace' ? 'border-l-4 border-l-orange-500' :
                                  'border-l-4 border-l-gray-500'
                            }`}>
                            <Web3SocialPostCard
                              post={post}
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
                        <div key={post.id} className={`relative rounded-2xl overflow-hidden ${getPostType(post) === 'defi' ? 'border-l-4 border-l-green-500' :
                          getPostType(post) === 'nft' ? 'border-l-4 border-l-purple-500' :
                            getPostType(post) === 'governance' ? 'border-l-4 border-l-blue-500' :
                              getPostType(post) === 'marketplace' ? 'border-l-4 border-l-orange-500' :
                                'border-l-4 border-l-gray-500'
                          }`}>
                          <Web3SocialPostCard
                            post={post}
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
              )
            }}
            animation="fade"
          />
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

      {/* Post Creation Modal - Only show when not in feed view (FeedView handles its own modal) */}
      {navigationState.activeView !== 'feed' && (
        <PostCreationModal
          isOpen={navigationState.modalState.postCreation}
          onClose={() => closeModal('postCreation')}
          onSubmit={handlePostSubmit}
          isLoading={isCreatingPost}
        />
      )}

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
    </DashboardLayout>
    </>
  );
}