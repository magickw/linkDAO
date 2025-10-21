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
import TokenReactionSystem from '@/components/TokenReactionSystem/TokenReactionSystem';
import { EnhancedTipButton } from '@/components/Web3PostInteractions/EnhancedTipButton';
import { OnChainVerificationBadge } from '@/components/OnChainVerification/OnChainVerificationBadge';
import { ExplorerLinkButton } from '@/components/OnChainVerification/ExplorerLinkButton';
import { AdvancedSearchInterface } from '@/components/CommunityDiscovery/AdvancedSearchInterface';

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
  Trophy
} from 'lucide-react';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';

// Mock data for demonstration
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

const mockPosts = [
  {
    id: '1',
    communityId: 'ethereum-builders',
    title: 'New EIP-4844 Implementation Guide',
    author: '0x1234567890123456789012345678901234567890',
    authorName: 'vitalik.eth',
    content: 'Just published a comprehensive guide on implementing EIP-4844 proto-danksharding...',
    type: 'discussion',
    upvotes: 245,
    downvotes: 12,
    commentCount: 67,
    createdAt: new Date(Date.now() - 3600000),
    tags: ['eip-4844', 'scaling', 'ethereum'],
    stakedTokens: 150,
    isStaked: true
  },
  {
    id: '2',
    communityId: 'defi-traders',
    title: 'Arbitrum Yield Farming Strategy - 15% APY',
    author: '0x2345678901234567890123456789012345678901',
    authorName: 'defi_alpha',
    content: 'Found a new yield farming opportunity on Arbitrum with sustainable 15% APY...',
    type: 'analysis',
    upvotes: 189,
    downvotes: 23,
    commentCount: 45,
    createdAt: new Date(Date.now() - 7200000),
    tags: ['arbitrum', 'yield-farming', 'strategy'],
    stakedTokens: 89,
    isStaked: false
  },
  {
    id: '3',
    communityId: 'nft-collectors',
    title: 'My Latest NFT Collection Drop',
    author: '0x3456789012345678901234567890123456789012',
    authorName: 'cryptoartist',
    content: 'Excited to share my latest NFT collection representing different DeFi protocols...',
    type: 'showcase',
    upvotes: 156,
    downvotes: 8,
    commentCount: 34,
    createdAt: new Date(Date.now() - 10800000),
    tags: ['nft', 'art', 'defi'],
    stakedTokens: 67,
    isStaked: true
  }
];

const CommunitiesPage: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHapticFeedback } = useMobileOptimization();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState(mockPosts);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top' | 'rising'>('hot');
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
          console.error('Backend unavailable, using mock data:', err);
          // Fallback to mock data when backend is unavailable
          communitiesData = mockCommunities;
        }
        setCommunities(communitiesData);

        // Load enhanced Web3 data
        await loadWeb3EnhancedData(communitiesData);
        
      } catch (err) {
        console.error('Error loading communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
        // Even on error, show mock data
        setCommunities(mockCommunities);
        await loadWeb3EnhancedData(mockCommunities);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedCommunities();
  }, []);

  // Load Web3 enhanced data
  const loadWeb3EnhancedData = async (communitiesData: Community[]) => {
    try {
      // Mock enhanced data - replace with real API calls
      const mockUserRoles: Record<string, string> = {};
      const mockTokenBalances: Record<string, number> = {};
      const mockLiveTokenPrices: Record<string, number> = {};
      const mockStakingData: Record<string, any> = {};

      communitiesData.forEach(community => {
        mockUserRoles[community.id] = joinedCommunities.includes(community.id) ? 'member' : 'visitor';
        mockTokenBalances[community.id] = Math.floor(Math.random() * 1000);
        mockLiveTokenPrices[community.id] = Math.random() * 100;
        mockStakingData[community.id] = {
          totalStaked: Math.floor(Math.random() * 10000),
          stakerCount: Math.floor(Math.random() * 100),
          stakingTier: ['bronze', 'silver', 'gold'][Math.floor(Math.random() * 3)],
          userStake: Math.floor(Math.random() * 500)
        };
      });

      setUserRoles(mockUserRoles);
      setTokenBalances(mockTokenBalances);
      setLiveTokenPrices(mockLiveTokenPrices);
      setStakingData(mockStakingData);

      // Mock governance proposals with fallback
      try {
        // In a real app, this would call an API
        setGovernanceProposals([
          {
            id: '1',
            title: 'Increase staking rewards',
            status: 'active',
            votingProgress: { for: 1250, against: 340, abstain: 120 },
            timestamp: new Date()
          },
          {
            id: '2', 
            title: 'New community guidelines',
            status: 'pending',
            votingProgress: { for: 890, against: 210, abstain: 80 },
            timestamp: new Date()
          }
        ]);
      } catch (err) {
        console.error('Failed to load governance proposals, using mock data:', err);
        // Fallback to mock data
        setGovernanceProposals([
          {
            id: '1',
            title: 'Increase staking rewards',
            status: 'active',
            votingProgress: { for: 1250, against: 340, abstain: 120 },
            timestamp: new Date()
          }
        ]);
      }

      // Mock wallet activities with fallback
      try {
        // In a real app, this would call an API
        setWalletActivities([
          {
            id: '1',
            type: 'stake',
            amount: 100,
            timestamp: new Date(),
            communityId: 'ethereum-builders'
          },
          {
            id: '2',
            type: 'tip',
            amount: 25,
            timestamp: new Date(),
            communityId: 'defi-traders'
          }
        ]);
      } catch (err) {
        console.error('Failed to load wallet activities, using mock data:', err);
        // Fallback to mock data
        setWalletActivities([
          {
            id: '1',
            type: 'stake',
            amount: 100,
            timestamp: new Date(),
            communityId: 'ethereum-builders'
          }
        ]);
      }

    } catch (err) {
      console.error('Error loading Web3 enhanced data:', err);
      // Provide basic mock data as fallback
      const mockUserRoles: Record<string, string> = {};
      const mockTokenBalances: Record<string, number> = {};
      
      communitiesData.forEach(community => {
        mockUserRoles[community.id] = 'visitor';
        mockTokenBalances[community.id] = 0;
      });
      
      setUserRoles(mockUserRoles);
      setTokenBalances(mockTokenBalances);
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
                onCreateCommunity={() => router.push('/create-community')}
                walletConnected={walletConnected}
                totalStakingRewards={stakingRewards}
                governanceNotifications={governanceNotifications}
              />
            </div>

            {/* Enhanced Mobile Posts Feed */}
            <div className="px-4 pb-24 space-y-4">
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
            </div>

            {/* Mobile Floating Action Button */}
            <div className="fixed bottom-20 right-4 z-50">
              <button
                onClick={handleCreatePost}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg flex items-center justify-center hover:from-blue-600 hover:to-purple-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[44px] min-h-[44px]"
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
            {/* Enhanced Left Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <EnhancedLeftSidebar
                  communities={communityList.map(community => ({
                    ...community,
                    icon: community.avatar || '🏛️',
                    isActive: joinedCommunities.includes(community.id),
                    brandColors: {
                      primary: '#6366f1',
                      secondary: '#8b5cf6',
                      accent: '#06b6d4'
                    },
                    userMembership: {
                      isJoined: joinedCommunities.includes(community.id),
                      joinDate: new Date(),
                      reputation: Math.floor(Math.random() * 1000),
                      tokenBalance: tokenBalances[community.id] || 0
                    },
                    activityMetrics: {
                      postsToday: Math.floor(Math.random() * 50),
                      activeMembers: Math.floor(Math.random() * 1000),
                      trendingScore: Math.floor(Math.random() * 100),
                      engagementRate: Math.random(),
                      activityLevel: 'high' as const
                    },
                    governance: {
                      activeProposals: Math.floor(Math.random() * 5),
                      userVotingPower: Math.floor(Math.random() * 500),
                      participationRate: Math.random()
                    },
                    governanceNotifications: Math.floor(Math.random() * 3)
                  }))}
                  selectedCommunity={undefined}
                  availableFilters={[
                    { id: 'defi', label: 'DeFi' },
                    { id: 'nft', label: 'NFT' },
                    { id: 'governance', label: 'Governance' },
                    { id: 'high-activity', label: 'High Activity' }
                  ]}
                  selectedFilters={selectedFilters}
                  userRoles={userRoles as Record<string, 'member' | 'admin' | 'moderator'>}
                  tokenBalances={tokenBalances}
                  onCommunitySelect={(communityId) => {
                    const community = communityList.find(c => c.id === communityId);
                    if (community) router.push(`/dao/${community.name}`);
                  }}
                  onFiltersChange={handleFiltersChange}
                  onQuickAction={handleQuickAction}
                  onCreateCommunity={handleCreateCommunity}
                />
              </div>
            </div>

            {/* Enhanced Center Feed */}
            <div className="col-span-12 lg:col-span-6">
              {/* Live Post Updates */}
              <div className="mb-6">
                <LivePostUpdates
                  postIds={filteredPosts.map(p => p.id)}
                  className="bg-white rounded-lg shadow-sm border"
                  showAnimations={true}
                  maxUpdatesPerPost={3}
                />
              </div>

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
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer overflow-hidden"
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
                            {/* Enhanced Post Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="text-gray-600 dark:text-gray-300">
                                  r/{community?.name || post.communityId}
                                </span>
                                <span>•</span>
                                <span>Posted by u/{post.authorName}</span>
                                <span>•</span>
                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                                {post.isStaked && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center space-x-1 text-yellow-600">
                                      <Coins className="w-3 h-3" />
                                      <span>{post.stakedTokens} staked</span>
                                    </span>
                                  </>
                                )}
                              </div>
                              
                              {/* On-Chain Verification Badge */}
                              {post.isStaked && (
                                <OnChainVerificationBadge
                                  proof={{
                                    id: `proof-${post.id}`,
                                    proofType: 'staking_action',
                                    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
                                    blockNumber: Math.floor(Math.random() * 1000000),
                                    contractAddress: '0x1234567890123456789012345678901234567890',
                                    status: 'verified',
                                    confirmations: 12,
                                    requiredConfirmations: 12,
                                    timestamp: new Date(post.createdAt),
                                    verified: true,
                                    verificationSource: 'blockchain',
                                    fromAddress: post.author
                                  }}
                                  size="small"
                                  onViewTransaction={handleViewTransaction}
                                />
                              )}
                            </div>

                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                              {post.title}
                            </h3>

                            <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm line-clamp-3">
                              {post.content}
                            </p>

                            <div className="flex flex-wrap gap-1 mb-3">
                              {post.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            {/* Enhanced Interaction Bar */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  <span>{post.commentCount} Comments</span>
                                </button>
                                
                                {/* Token Reaction System */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <TokenReactionSystem
                                    postId={post.id}
                                    initialReactions={[
                                      { type: 'like', totalAmount: post.upvotes },
                                      { type: 'tip', totalAmount: Math.floor(Math.random() * 100) }
                                    ]}
                                    onReaction={handleTokenReaction}
                                    showAnalytics={false}
                                  />
                                </div>
                                
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
                                  <span>Save</span>
                                </button>
                              </div>

                              {/* Enhanced Action Buttons */}
                              <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <EnhancedTipButton
                                  postId={post.id}
                                  authorAddress={post.author}
                                  currentTipAmount={Math.floor(Math.random() * 50)}
                                  userBalance={userBalance}
                                  onTip={handleTip}
                                  size="sm"
                                />
                                
                                <BoostButton
                                  postId={post.id}
                                  currentStake={post.stakedTokens}
                                  userBalance={userBalance}
                                  token={{ 
                                    symbol: 'LDAO',
                                    address: '0x1234567890123456789012345678901234567890',
                                    decimals: 18,
                                    name: 'LinkDAO Token'
                                  }}
                                  onBoost={handleBoost}
                                  size="sm"
                                  variant="outline"
                                />
                                
                                {/* Explorer Link Button */}
                                {post.isStaked && (
                                  <ExplorerLinkButton
                                    transactionHash={`0x${Math.random().toString(16).substr(2, 64)}`}
                                    network="ethereum"
                                    size="sm"
                                  />
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
            </div>

            {/* Community-Focused Right Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24">
                <CommunityRightSidebar
                  communities={communityList}
                  joinedCommunityIds={joinedCommunities}
                  onCommunitySelect={handleCommunitySelect}
                />
              </div>
            </div>
          </div>
        </Layout>
      </VisualPolishIntegration>
    </ErrorBoundary>
  );
};

export default CommunitiesPage;