import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

// Web3-Native Community Enhancement Components
import { LivePostUpdates } from '@/components/RealTimeUpdates/LivePostUpdates';
import { StakingIndicator } from '@/components/Staking/StakingIndicator';
import { BoostButton } from '@/components/Staking/BoostButton';
import { RealTimeStakingUpdates } from '@/components/Staking/RealTimeStakingUpdates';
import { EnhancedLeftSidebar } from '@/components/CommunityEnhancements/EnhancedLeftSidebar/EnhancedLeftSidebar';
import CommunityRightSidebar from '@/components/Community/CommunityRightSidebar';
import { CreateCommunityModal } from '@/components/CommunityEnhancements/Modals/CreateCommunityModal';
import TokenReactionSystem from '@/components/TokenReactionSystem/TokenReactionSystem';
import { EnhancedTipButton } from '@/components/Web3PostInteractions/EnhancedTipButton';
import { OnChainVerificationBadge } from '@/components/OnChainVerification/OnChainVerificationBadge';
import { ExplorerLinkButton } from '@/components/OnChainVerification/ExplorerLinkButton';
import { AdvancedSearchInterface } from '@/components/CommunityDiscovery/AdvancedSearchInterface';
import PostHoverPreview from '@/components/Community/PostHoverPreview';

// Mobile Web3 Components (preserve existing functionality)
import {
  CollapsibleWeb3Sidebar,
  CompactWeb3PostCard,
  Web3SwipeGestureHandler,
  MobileWeb3DataDisplay
} from '@/components/Mobile/Web3';

// Enhanced Components
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import VisualPolishIntegration from '@/components/VisualPolish/VisualPolishIntegration';
import QuickFilterChips from '@/components/Community/QuickFilterChips';
import EmptyStates from '@/components/Community/EmptyStates';
import TokenPriceSparkline, { generateMockPriceHistory } from '@/components/Community/TokenPriceSparkline';
import GovernanceActivityPulse from '@/components/Community/GovernanceActivityPulse';
import KeyboardShortcutsModal from '@/components/Community/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import {
  TrendingUp,
  Clock,
  Star,
  Flame,
  Users,
  Plus,
  Search,
  Filter,
  ChevronDown,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  Share,
  Bookmark,
  Coins,
  Shield,
  Vote,
  Trophy,
  X
} from 'lucide-react';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';
import { FeedSortType } from '@/types/feed';

// Mock data for demonstration - will be removed
const mockCommunities = [
  {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    description: 'Building the future of Ethereum ecosystem',
    memberCount: 12400,
    avatar: '🔷',
    banner: 'https://placehold.co/800x200/667eea/ffffff?text=Ethereum+Builders',
    category: 'Development',
    tags: ['ethereum', 'development', 'smart-contracts'],
    isPublic: true,
    rules: ['Be respectful', 'No spam', 'Share quality content'],
    moderators: ['0x1234...5678'],
    treasuryAddress: '0x1234567890123456789012345678901234567890',
    governanceToken: 'ETH-BUILD',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date(),
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  },
  {
    id: 'defi-traders',
    name: 'defi-traders',
    displayName: 'DeFi Traders',
    description: 'Decentralized Finance trading strategies and insights',
    memberCount: 8900,
    avatar: '💰',
    banner: 'https://placehold.co/800x200/10b981/ffffff?text=DeFi+Traders',
    category: 'Finance',
    tags: ['defi', 'trading', 'yield-farming'],
    isPublic: true,
    rules: ['No financial advice', 'Share research', 'Verify claims'],
    moderators: ['0x2345...6789'],
    treasuryAddress: '0x2345678901234567890123456789012345678901',
    governanceToken: 'DEFI-TRD',
    createdAt: new Date('2023-02-20'),
    updatedAt: new Date(),
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 100,
      stakingRequirements: []
    }
  },
  {
    id: 'nft-collectors',
    name: 'nft-collectors',
    displayName: 'NFT Collectors',
    description: 'Discover, trade, and showcase NFT collections',
    memberCount: 21000,
    avatar: '🎨',
    banner: 'https://placehold.co/800x200/8b5cf6/ffffff?text=NFT+Collectors',
    category: 'Art',
    tags: ['nft', 'art', 'collectibles'],
    isPublic: true,
    rules: ['Original content only', 'No price manipulation', 'Respect artists'],
    moderators: ['0x3456...7890'],
    treasuryAddress: '0x3456789012345678901234567890123456789012',
    governanceToken: 'NFT-COL',
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date(),
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 50,
      stakingRequirements: []
    }
  }
];

// Mock posts removed - now fetching from backend API

const CommunitiesPage: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHapticFeedback } = useMobileOptimization();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<FeedSortType>(FeedSortType.HOT);
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // Web3 mobile state
  const [walletConnected, setWalletConnected] = useState(false);
  const [userBalance, setUserBalance] = useState(1250);
  const [stakingRewards, setStakingRewards] = useState(45);
  const [governanceNotifications, setGovernanceNotifications] = useState(3);

  // Enhanced Web3 state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    tags: [] as string[],
    memberCountRange: [0, 1000000] as [number, number],
    activityLevel: [] as string[],
    tokenRequirements: null as boolean | null,
    governanceActive: null as boolean | null
  });
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});
  const [liveTokenPrices, setLiveTokenPrices] = useState<Record<string, number>>({});
  const [stakingData, setStakingData] = useState<Record<string, any>>({});
  const [governanceProposals, setGovernanceProposals] = useState<any[]>([]);
  const [walletActivities, setWalletActivities] = useState<any[]>([]);
  
  // Hover preview state with debouncing
  const [hoveredPost, setHoveredPost] = useState<any>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Quick filter chips state
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  
  // Keyboard shortcuts state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Create community modal state
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);


  // Load communities and enhanced Web3 data on component mount
  useEffect(() => {
    const loadEnhancedCommunities = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load communities with fallback for 503 errors
        let communitiesData = [];
        try {
          communitiesData = await CommunityService.getAllCommunities({
            isPublic: true,
            limit: 50
          });
        } catch (err) {
          console.error('Backend unavailable:', err);
          // Instead of using mock data, show empty array
          communitiesData = [];
        }
        setCommunities(communitiesData);

        // Load enhanced Web3 data
        await loadWeb3EnhancedData(communitiesData);
        
      } catch (err) {
        console.error('Error loading communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
        // Instead of using mock data, show empty array
        setCommunities([]);
        await loadWeb3EnhancedData([]);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedCommunities();
  }, []);

  // Load posts from backend API with pagination
  const fetchPosts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      
      // Import FeedService dynamically to avoid circular dependencies
      const { FeedService } = await import('../services/feedService');
      
      const response = await FeedService.getEnhancedFeed({
        sortBy: sortBy,
        timeRange: timeFilter,
        feedSource: 'all'
      }, pageNum, 20);
      
      const newPosts = response.posts || [];
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      setHasMore(newPosts.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      if (!append) setPosts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, false);
  }, [sortBy, timeFilter]);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore || !hasMore) {
        return;
      }
      fetchPosts(page + 1, true);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore]);

  // Load Web3 enhanced data
  const loadWeb3EnhancedData = async (communitiesData: Community[]) => {
    try {
      // Initialize with empty data instead of mock data
      const userRoles: Record<string, string> = {};
      const tokenBalances: Record<string, number> = {};
      const liveTokenPrices: Record<string, number> = {};
      const stakingData: Record<string, any> = {};

      communitiesData.forEach(community => {
        userRoles[community.id] = 'visitor';
        tokenBalances[community.id] = 0;
        liveTokenPrices[community.id] = 0;
        stakingData[community.id] = {
          totalStaked: 0,
          stakerCount: 0,
          stakingTier: 'bronze',
          userStake: 0
        };
      });

      setUserRoles(userRoles);
      setTokenBalances(tokenBalances);
      setLiveTokenPrices(liveTokenPrices);
      setStakingData(stakingData);

      // Initialize with empty arrays instead of mock data
      setGovernanceProposals([]);
      setWalletActivities([]);

    } catch (err) {
      console.error('Error loading Web3 enhanced data:', err);
      // Provide empty data as fallback
      setUserRoles({});
      setTokenBalances({});
      setLiveTokenPrices({});
      setStakingData({});
      setGovernanceProposals([]);
      setWalletActivities([]);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      if (joinedCommunities.includes(communityId)) {
        // Leave community - would need user address from wallet context
        setJoinedCommunities(prev => prev.filter(id => id !== communityId));
        setUserRoles(prev => ({ ...prev, [communityId]: 'visitor' }));
      } else {
        // Join community - would need user address from wallet context
        setJoinedCommunities(prev => [...prev, communityId]);
        setUserRoles(prev => ({ ...prev, [communityId]: 'member' }));
      }
      if (isMobile) triggerHapticFeedback('success');
    } catch (err) {
      console.error('Error joining/leaving community:', err);
    }
  };

  // Enhanced Web3 handlers
  const handleEnhancedSearch = (query: string, filters: typeof searchFilters) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    // TODO: Implement enhanced search logic with Web3 filters
  };

  const handleCommunitySelect = (community: any) => {
    router.push(`/dao/${community.name || community.id}`);
  };

  const handleFiltersChange = (filters: string[]) => {
    setSelectedFilters(filters);
  };

  const handleQuickAction = (action: string, communityId?: string) => {
    switch (action) {
      case 'view-governance-notifications':
        router.push('/governance');
        break;
      case 'create-post':
        router.push('/create-post');
        break;
      default:
        console.log('Quick action:', action, communityId);
    }
  };

  const handleCreateCommunity = async (communityData: any) => {
    try {
      // TODO: Implement community creation with Web3 features
      console.log('Creating community:', communityData);
    } catch (err) {
      console.error('Error creating community:', err);
      throw err;
    }
  };

  const handleCreateCommunityClick = async (_communityData: any): Promise<void> => {
    setShowCreateCommunityModal(true);
  };

  const handleCloseCreateCommunityModal = () => {
    setShowCreateCommunityModal(false);
  };

  const handleCreateCommunitySubmit = async (communityData: any) => {
    setIsCreatingCommunity(true);
    try {
      await handleCreateCommunity(communityData);
      setShowCreateCommunityModal(false);
    } catch (error) {
      console.error('Failed to create community:', error);
      throw error;
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleBoost = async (postId: string, amount: number) => {
    try {
      // TODO: Implement token boosting
      console.log('Boosting post:', postId, 'with amount:', amount);
      if (isMobile) triggerHapticFeedback('success');
    } catch (err) {
      console.error('Error boosting post:', err);
    }
  };

  const handleTokenReaction = async (postId: string, reactionType: string, amount?: number) => {
    try {
      // TODO: Implement token reactions
      console.log('Token reaction:', postId, reactionType, amount);
      if (isMobile) triggerHapticFeedback('medium');
    } catch (err) {
      console.error('Error with token reaction:', err);
    }
  };

  const handleVoteClick = (proposalId: string) => {
    router.push(`/governance/proposal/${proposalId}`);
  };

  const handleViewTransaction = (txHash: string) => {
    window.open(`https://etherscan.io/tx/${txHash}`, '_blank');
  };

  const handleVote = (postId: string, type: 'up' | 'down', amount: number) => {
    if (isMobile) {
      triggerHapticFeedback('medium');
    }
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          upvotes: type === 'up' ? post.upvotes + amount : post.upvotes,
          downvotes: type === 'down' ? post.downvotes + amount : post.downvotes,
          stakedTokens: post.stakedTokens + amount
        };
      }
      return post;
    }));
  };

  // Web3 mobile handlers
  const handleUpvote = (postId: string) => handleVote(postId, 'up', 1);
  const handleSave = (postId: string) => {
    console.log('Saving post:', postId);
    if (isMobile) triggerHapticFeedback('light');
  };
  const handleTip = async (postId: string, amount?: number) => {
    console.log('Tipping post:', postId, 'amount:', amount);
    if (isMobile) triggerHapticFeedback('success');
  };
  const handleStake = (postId: string) => {
    console.log('Staking on post:', postId);
    if (isMobile) triggerHapticFeedback('heavy');
  };
  const handleComment = (postId: string) => {
    router.push(`/dao/${posts.find(p => p.id === postId)?.communityId}/posts/${postId}`);
  };
  const handleShare = (postId: string) => {
    console.log('Sharing post:', postId);
    if (isMobile) triggerHapticFeedback('light');
  };
  const handleViewPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const community = communityList.find(c => c.id === post.communityId);
      router.push(`/dao/${community?.name || post.communityId}/posts/${postId}`);
    }
  };

  const handleCreatePost = () => {
    router.push('/create-post');
  };

  const handleNavigate = (path: string) => {
    router.push(path);
  };
  
  const handleQuickFilterToggle = (filterId: string) => {
    setActiveQuickFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    );
  };
  
  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    onScrollDown: () => window.scrollBy({ top: 150, behavior: 'smooth' }),
    onScrollUp: () => window.scrollBy({ top: -150, behavior: 'smooth' }),
    onGoToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    onGoToBottom: () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }),
    onCreatePost: handleCreatePost,
    onRefresh: () => fetchPosts(1, false),
    onShowHelp: () => setShowKeyboardHelp(true),
    onEscape: () => setShowKeyboardHelp(false),
    enabled: !isMobile
  });



  // Show posts from followed communities and suggested posts for home feed
  const filteredPosts = posts.filter(post => 
    joinedCommunities.includes(post.communityId) || // Posts from joined communities
    post.upvotes > 100 || // Popular posts (suggested)
    post.tags.some(tag => ['ethereum', 'defi', 'nft'].includes(tag)) // Interest-based suggestions
  );

  // Defensive: normalize communities to array for rendering
  const communityList: Community[] = Array.isArray(communities) ? communities : [];

  // Mobile Web3 community data
  const communityData = communityList.map(community => ({
    id: community.id,
    name: community.displayName,
    avatar: community.avatar || '🏛️',
    memberCount: community.memberCount,
    isActive: joinedCommunities.includes(community.id),
    userRole: 'member' as const,
    tokenBalance: Math.floor(Math.random() * 100),
    governanceNotifications: Math.floor(Math.random() * 5),
    stakingRewards: Math.floor(Math.random() * 20)
  }));

  if (isMobile) {
    return (
      <ErrorBoundary>
        <VisualPolishIntegration>
          <style jsx>{`
            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Head>
              <title>Communities - LinkDAO Enhanced</title>
              <meta name="description" content="Discover and join decentralized communities with Web3 enhancements" />
            </Head>

            {/* Enhanced Mobile Header */}
            <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Communities</h1>
                  <div className="flex items-center space-x-2">
                    {/* Governance Notifications */}
                    {governanceNotifications > 0 && (
                      <div className="relative">
                        <button className={`p-2 text-gray-600 hover:text-gray-900 ${isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''}`}>
                          <Vote className="w-5 h-5" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {governanceNotifications}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Navigation Bar - Added for user navigation */}
            <div className="sticky top-16 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto py-2 px-2 hide-scrollbar">
                {[
                  { name: 'Home', href: '/', icon: '🏠' },
                  { name: 'Messages', href: '/messaging', icon: '💬' },
                  { name: 'Governance', href: '/governance', icon: '🗳️' },
                  { name: 'Marketplace', href: '/marketplace', icon: '🛒' },
                  { name: 'Profile', href: '/profile', icon: '👤' }
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className="flex flex-col items-center px-3 py-2 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors min-w-[60px] min-h-[44px]"
                  >
                    <span className="text-lg mb-1">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Web3 Data Display */}
            <div className="p-4">
              <MobileWeb3DataDisplay
                tokenData={{
                  symbol: 'LDAO',
                  balance: userBalance,
                  value: userBalance * 0.5,
                  change24h: 2.5,
                  price: 0.5
                }}
                stakingData={{
                  totalStaked: 500,
                  rewards: stakingRewards,
                  apy: 12.5,
                  lockPeriod: '30 days'
                }}
                governanceData={{
                  votingPower: 150,
                  activeProposals: governanceNotifications,
                  votesParticipated: 8,
                  totalProposals: 12
                }}
                gasPrice={25}
                networkName="Ethereum"
                compact={true}
              />
            </div>

            {/* Real-Time Staking Updates */}
            <div className="px-4 mb-4">
              <RealTimeStakingUpdates
                communityIds={joinedCommunities}
                className="bg-white rounded-lg shadow-sm border p-3"
                showAnimations={true}
              />
            </div>

            {/* Collapsible Sidebar */}
            <div className="px-4 mb-4">
              <CollapsibleWeb3Sidebar
                communities={communityData}
                currentCommunity={undefined}
                onCommunitySelect={(id) => {
                  const community = communityList.find(c => c.id === id);
                  if (community) {
                    router.push(`/dao/${community.name}`);
                  }
                }}
                onCreateCommunity={() => setShowCreateCommunityModal(true)}
                walletConnected={walletConnected}
                totalStakingRewards={stakingRewards}
                governanceNotifications={governanceNotifications}
              />
            </div>

            {/* Mobile Gamified Progress Tracker */}
            <div className="px-4 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Progress</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={joinedCommunities.length > 0 ? 'text-green-500' : 'text-gray-400'}>✓</span>
                    <span className="text-sm">Joined first DAO</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">⬜</span>
                    <span className="text-sm">Voted in proposal</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">⬜</span>
                    <span className="text-sm">Created post</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Mobile Posts Feed */}
            <div className="px-4 pb-24 space-y-4">
              {/* Mobile Loading State */}
              {loading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border-l-4 border-gray-200 shadow-sm p-4 animate-pulse">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-200 rounded w-1/3" />
                          <div className="h-2 bg-gray-200 rounded w-1/4" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-12 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mobile Empty State */}
              {!loading && filteredPosts.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Welcome to LinkDAO
                  </h3>
                  <p className="text-gray-500 mb-6 px-4">
                    Start your DAO journey — explore, vote, and connect.
                  </p>
                  <button
                    onClick={() => router.push('/communities?sort=trending')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Explore Communities
                  </button>
                </div>
              )}

              {filteredPosts.map(post => {
                const community = communityList.find(c => c.id === post.communityId);
                const stakingInfo = stakingData[post.communityId];
                
                return (
                  <CompactWeb3PostCard
                    key={post.id}
                    post={{
                      id: post.id,
                      title: post.title,
                      content: post.content,
                      author: {
                        name: post.authorName,
                        avatar: '👤',
                        address: post.author
                      },
                      community: {
                        name: community?.displayName || 'Unknown',
                        avatar: community?.avatar || '🏛️'
                      },
                      metrics: {
                        upvotes: post.upvotes,
                        comments: post.commentCount,
                        views: Math.floor(Math.random() * 1000),
                        stakingAmount: post.stakedTokens,
                        stakerCount: Math.floor(Math.random() * 50)
                      },
                      timestamp: new Date(post.createdAt).toLocaleDateString(),
                      isUpvoted: false,
                      isSaved: false,
                      postType: post.type as any,
                      onChainProof: post.isStaked
                    }}
                    onUpvote={() => handleUpvote(post.id)}
                    onComment={() => handleComment(post.id)}
                    onShare={() => handleShare(post.id)}
                    onSave={() => handleSave(post.id)}
                    onTip={(amount?: number) => handleTip(post.id, amount)}
                    onStake={() => handleStake(post.id)}
                    onViewPost={() => handleViewPost(post.id)}
                    walletConnected={walletConnected}
                  />
                );
              })}

              {/* Mobile Load More */}
              {loadingMore && (
                <div className="flex justify-center py-6">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    <span className="text-sm">Loading...</span>
                  </div>
                </div>
              )}

              {/* Mobile End of Feed */}
              {!loading && !loadingMore && !hasMore && filteredPosts.length > 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">
                    You've reached the end! 🎉
                  </p>
                </div>
              )}
            </div>

            {/* Mobile Floating Action Button */}
            <div className="fixed bottom-20 right-4 z-50">
              <button
                onClick={handleCreateCommunityClick}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[44px] min-h-[44px]"
                aria-label="Create Community"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </VisualPolishIntegration>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <VisualPolishIntegration>
        <Layout title="Communities - LinkDAO Enhanced" fullWidth={true}>
          <Head>
            <meta name="description" content="Discover and join decentralized communities with Web3 enhancements" />
          </Head>

          <div className="grid grid-cols-12 gap-6 w-full px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl pt-6">
            {/* Enhanced Left Sidebar - Discovery + Actions */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                {/* Your Communities Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Your Communities</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Joined: {joinedCommunities.length}</span>
                  </div>
                  
                  <button 
                    onClick={handleCreateCommunityClick}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded mb-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Community</span>
                  </button>
                  
                  <Link 
                    href="/communities?sort=trending" 
                    className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
                  >
                    <span>✨</span>
                    <span>Discover Trending Communities</span>
                  </Link>
                </div>

                {/* Shortcuts Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleCreatePost}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title="New Post"
                    >
                      <span className="text-lg">✏️</span>
                      <span className="text-xs mt-1">New Post</span>
                    </button>
                    
                    <button 
                      onClick={handleCreateCommunityClick}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title="New Community"
                    >
                      <span className="text-lg">🏗️</span>
                      <span className="text-xs mt-1">New Community</span>
                    </button>
                    
                    <button 
                      onClick={() => router.push('/notifications')}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title="Notifications"
                    >
                      <span className="text-lg">🔔</span>
                      <span className="text-xs mt-1">Notifications</span>
                    </button>
                    
                    <button 
                      onClick={() => router.push('/bookmarks')}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title="Bookmarks"
                    >
                      <span className="text-lg">⭐</span>
                      <span className="text-xs mt-1">Bookmarks</span>
                    </button>
                    
                    <button 
                      onClick={() => router.push('/activity')}
                      className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors col-span-2"
                      title="Activity Feed"
                    >
                      <span className="text-lg">📈</span>
                      <span className="text-xs mt-1">Activity Feed</span>
                    </button>
                  </div>
                </div>

                {/* Optional: Gamified Progress Tracker */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Progress</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={joinedCommunities.length > 0 ? 'text-green-500' : 'text-gray-400'}>✓</span>
                      <span className="text-sm">Joined first DAO</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">⬜</span>
                      <span className="text-sm">Voted in proposal</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">⬜</span>
                      <span className="text-sm">Created post</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Center Feed */}
            <div className="col-span-12 lg:col-span-6">
              {/* Quick Filter Chips - Sticky */}
              <div className="sticky top-20 z-10 bg-white dark:bg-gray-900 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                <QuickFilterChips
                  activeFilters={activeQuickFilters}
                  onFilterToggle={handleQuickFilterToggle}
                  className="py-2"
                />
              </div>
              
              {/* Dynamic, Contextual Onboarding */}
              {joinedCommunities.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl mb-4">👋</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to LinkDAO</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Join communities that match your interests and start earning rewards.
                    </p>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🪐</span>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900 dark:text-white">Step 1: Select Interests</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Choose what you're passionate about</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🗳</span>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900 dark:text-white">Step 2: Join or Create a DAO</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Connect with like-minded people</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">💬</span>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900 dark:text-white">Step 3: Post or Vote</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Share ideas and participate in governance</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => router.push('/communities?sort=trending')}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                    >
                      Explore Communities
                    </button>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                      Start your DAO journey — explore, vote, and connect.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show feed when user has joined communities */}
              {joinedCommunities.length > 0 && (
                <>
                  {/* Live Post Updates */}
                  <div className="mb-6">
                    <LivePostUpdates
                      postIds={filteredPosts.map(p => p.id)}
                      className="bg-white rounded-lg shadow-sm border"
                      showAnimations={true}
                      maxUpdatesPerPost={3}
                    />
                  </div>
                </>
              )}

              {/* Enhanced Loading State */}
              {loading && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enhanced Empty State with Error Handling */}
              {!loading && joinedCommunities.length > 0 && filteredPosts.length === 0 && (
                <EmptyStates
                  type={error ? 'no-posts' : activeQuickFilters.length > 0 ? 'no-filter-results' : 'no-posts'}
                  onAction={error ? () => { setError(null); fetchPosts(1, false); } : handleCreatePost}
                  actionLabel={error ? 'Try Again' : undefined}
                  activeFilters={activeQuickFilters}
                />
              )}

              <div className="space-y-4">
                {filteredPosts.map(post => {
                  const community = communityList.find(c => c.id === post.communityId);
                  const stakingInfo = stakingData[post.communityId];
                  
                  return (
                    <Web3SwipeGestureHandler
                      key={post.id}
                      postId={post.id}
                      onUpvote={() => handleUpvote(post.id)}
                      onSave={() => handleSave(post.id)}
                      onTip={() => handleTip(post.id)}
                      onStake={() => handleStake(post.id)}
                      walletConnected={walletConnected}
                      userBalance={userBalance}
                    >
                      <div 
                        onClick={() => router.push(`/dao/${community?.name || post.communityId}/posts/${post.id}`)}
                        onMouseEnter={(e) => {
                          if (hoverTimeout) clearTimeout(hoverTimeout);
                          const timeout = setTimeout(() => {
                            setHoveredPost(post);
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }, 500);
                          setHoverTimeout(timeout);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeout) clearTimeout(hoverTimeout);
                          setHoveredPost(null);
                        }}
                        onMouseMove={(e) => {
                          if (hoveredPost?.id === post.id) {
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                      >
                        <div className="flex">
                          {/* Enhanced Voting Section */}
                          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-l-lg">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(post.id, 'up', 1);
                              }}
                              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                            >
                              <ArrowUp className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-bold text-gray-900 dark:text-white py-1">
                              {post.upvotes - post.downvotes}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(post.id, 'down', 1);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            >
                              <ArrowDown className="w-5 h-5" />
                            </button>
                            
                            {/* Staking Indicator */}
                            {stakingInfo && (
                              <div className="mt-2">
                                <StakingIndicator
                                  stakingInfo={stakingInfo}
                                  token={{ 
                                    symbol: 'LDAO',
                                    address: '0x1234567890123456789012345678901234567890',
                                    decimals: 18,
                                    name: 'LinkDAO Token'
                                  }}
                                  size="sm"
                                  showTooltip={true}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 p-4">
                            {/* Simplified Post Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                  r/{community?.name || post.communityId}
                                </span>
                                <span>•</span>
                                <span>u/{post.authorName}</span>
                                <span>•</span>
                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                              
                              {/* Consolidated Web3 Status */}
                              {post.isStaked && (
                                <div className="flex items-center space-x-1 text-xs">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" title="On-chain verified" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {post.stakedTokens} staked
                                  </span>
                                </div>
                              )}
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                              {post.title}
                            </h3>

                            <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm line-clamp-3">
                              {post.content}
                            </p>

                            {/* Simplified Tags - Show only first 3 */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  +{post.tags.length - 3} more
                                </span>
                              )}
                            </div>

                            {/* Streamlined Interaction Bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.commentCount}</span>
                                </button>
                                
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                >
                                  <Share className="w-4 h-4" />
                                  <span>Share</span>
                                </button>
                                
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                >
                                  <Bookmark className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Consolidated Web3 Actions */}
                              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                {walletConnected && (
                                  <div className="relative group">
                                    <button className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full hover:from-blue-600 hover:to-purple-700 transition-all">
                                      <Coins className="w-3 h-3" />
                                      <span>Web3</span>
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                      <button
                                        onClick={() => handleTip(post.id)}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                                      >
                                        💰 Tip Author
                                      </button>
                                      <button
                                        onClick={() => handleBoost(post.id, 10)}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      >
                                        🚀 Boost Post
                                      </button>
                                      {post.isStaked && (
                                        <button
                                          onClick={() => handleViewTransaction(`0x${Math.random().toString(16).substr(2, 64)}`)}
                                          className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                                        >
                                          🔗 View TX
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Web3SwipeGestureHandler>
                  );
                })}
              </div>

              {/* Load More Indicator */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    <span>Loading more posts...</span>
                  </div>
                </div>
              )}

              {/* End of Feed Indicator */}
              {!loading && !loadingMore && !hasMore && filteredPosts.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    You've reached the end! 🎉
                  </p>
                </div>
              )}
            </div>

            {/* Community-Focused Right Sidebar with Tabs */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24">
                {/* Tabbed Interface for Data Widgets */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Tab Headers */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button className="flex-1 py-3 px-4 text-center text-sm font-medium text-primary-600 dark:text-primary-400 border-b-2 border-primary-500">
                      Live Governance
                    </button>
                    <button className="flex-1 py-3 px-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      Token Prices
                    </button>
                    <button className="flex-1 py-3 px-4 text-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                      Stats
                    </button>
                    <button className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 relative group">
                      <span className="text-xs">?</span>
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 w-48 z-10">
                        <p>Proposal = A vote to decide community actions</p>
                        <p>APR = Annual Percentage Rate of returns</p>
                      </div>
                    </button>
                  </div>
                  
                  {/* Tab Content - Live Governance */}
                  <div className="p-4">
                    {/* Auto-refresh toggle */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">Active Proposals</h3>
                        <div className="group relative">
                          <span className="text-xs text-gray-400 cursor-help">?</span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 w-48 z-10">
                            <p>Proposal = A vote to decide community actions</p>
                          </div>
                        </div>
                      </div>
                      <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        Auto-refresh
                      </button>
                    </div>
                    
                    {/* Sample Proposal */}
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm">Proposal #5nbzms</h4>
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">Active</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">Increase community treasury allocation for Q2 development initiatives</p>
                        <div className="flex space-x-2">
                          <button className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                            Vote now
                          </button>
                          <button className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                            View details
                          </button>
                        </div>
                      </div>
                      
                      {/* More proposals would be listed here */}
                      <div className="text-center py-2">
                        <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                          View all proposals
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Community Recommendations */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recommended for You</h3>
                  <div className="space-y-3">
                    {communityList.slice(0, 3).map(community => (
                      <div 
                        key={community.id} 
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                        onClick={() => router.push(`/dao/${community.name}`)}
                      >
                        <div className="text-xl">{community.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{community.displayName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{community.memberCount.toLocaleString()} members</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinCommunity(community.id);
                          }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded transition-colors"
                        >
                          {joinedCommunities.includes(community.id) ? 'Joined' : 'Join'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hover Preview */}
          {hoveredPost && (
            <PostHoverPreview
              post={{
                id: hoveredPost.id,
                title: hoveredPost.title,
                content: hoveredPost.content,
                authorName: hoveredPost.authorName,
                communityName: communityList.find(c => c.id === hoveredPost.communityId)?.displayName || 'Unknown',
                upvotes: hoveredPost.upvotes,
                commentCount: hoveredPost.commentCount,
                createdAt: hoveredPost.createdAt,
                tags: hoveredPost.tags
              }}
              isVisible={true}
              position={hoverPosition}
            />
          )}
          
          {/* Keyboard Shortcuts Modal */}
          <KeyboardShortcutsModal
            isOpen={showKeyboardHelp}
            onClose={() => setShowKeyboardHelp(false)}
          />
          
          {/* Create Community Modal */}
          <CreateCommunityModal
            isOpen={showCreateCommunityModal}
            onClose={handleCloseCreateCommunityModal}
            onSubmit={handleCreateCommunitySubmit}
            isLoading={isCreatingCommunity}
          />
        </Layout>
      </VisualPolishIntegration>
    </ErrorBoundary>
  );
};

export default CommunitiesPage;