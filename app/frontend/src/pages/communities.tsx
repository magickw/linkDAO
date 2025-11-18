import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useWeb3 } from '@/context/Web3Context';

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
import CreateCommunityModal from '@/components/CommunityEnhancements/Modals/CreateCommunityModal';
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
  Trophy
} from 'lucide-react';
import CommunityCardEnhanced from '@/components/Community/CommunityCardEnhanced';
import MyCommunitiesCard from '@/components/Community/MyCommunitiesCard';
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
  const { address, isConnected } = useWeb3();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<FeedSortType>(FeedSortType.HOT);
  const [timeFilter, setTimeFilter] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [userAdminRoles, setUserAdminRoles] = useState<Record<string, string>>({});
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
        const communitiesData = await CommunityService.getAllCommunities({
          isPublic: true,
          limit: 50
        });
        
        setCommunities(communitiesData);

        // Load user's community memberships if wallet is connected
        if (address && isConnected) {
          const userMemberships = await CommunityService.getUserCommunityMemberships();
          setJoinedCommunities(userMemberships);
          
          // Set admin roles for communities where user is admin
          const adminRoles: Record<string, string> = {};
          communitiesData.forEach(community => {
            // Check if user is an admin/moderator of this community (based on moderators field)
            if (community.moderators && Array.isArray(community.moderators) && 
                address && community.moderators.includes(address)) {
              adminRoles[community.id] = 'admin';
            }
          });
          setUserAdminRoles(adminRoles);
        }

        // Load enhanced Web3 data
        await loadWeb3EnhancedData(communitiesData);
        
      } catch (err) {
        console.error('Error loading communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
        // Show empty array instead of crashing
        setCommunities([]);
        await loadWeb3EnhancedData([]);
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedCommunities();
  }, [address, isConnected]);

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
      
      // Handle the case where response is not properly structured
      const newPosts = Array.isArray(response) ? response : (response?.posts || []);
      
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
      // Only set loading to false if this was the initial load
      if (pageNum === 1) {
        setLoading(false);
      }
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
      const userAdminRoles: Record<string, string> = {};
      const tokenBalances: Record<string, number> = {};
      const liveTokenPrices: Record<string, number> = {};
      const stakingData: Record<string, any> = {};

      communitiesData.forEach(community => {
        userRoles[community.id] = 'visitor';
        // Check if user is an admin/moderator of this community (based on moderators field)
        if (community.moderators && Array.isArray(community.moderators) && 
            address && community.moderators.includes(address)) {
          userRoles[community.id] = 'admin';
          userAdminRoles[community.id] = 'admin'; // Track admin roles separately for MyCommunitiesCard
        }
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
      setUserAdminRoles(userAdminRoles);
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
      setUserAdminRoles({});
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
    router.push(`/communities/${community.slug || community.name || community.id}`);
  };

  const handleFiltersChange = (filters: string[]) => {
    setSelectedFilters(filters);
  };

  const handleCreatePost = () => {
    // Redirect to the global create post page
    router.push('/create-post');
  };

  const handleCreateCommunity = async (communityData: any) => {
    setIsCreatingCommunity(true);
    try {
      console.log('Creating community:', communityData);

      // Create community via API
      const newCommunity = await CommunityService.createCommunity(communityData);

      // Add the new community to the list
      setCommunities(prev => [newCommunity, ...prev]);

      // Add to joined communities
      setJoinedCommunities(prev => [...prev, newCommunity.id]);
      setUserRoles(prev => ({ ...prev, [newCommunity.id]: 'admin' }));
      setUserAdminRoles(prev => ({ ...prev, [newCommunity.id]: 'admin' }));

      setShowCreateCommunityModal(false);

      // Navigate to the new community using the slug or name
      router.push(`/communities/${newCommunity.slug || newCommunity.name || newCommunity.id}`);
    } catch (err) {
      console.error('Error creating community:', err);
      throw err;
    } finally {
      setIsCreatingCommunity(false);
    }
  };

  const handleCreateCommunityClick = () => {
    setShowCreateCommunityModal(true);
  };

  const handleCloseCreateCommunityModal = () => {
    setShowCreateCommunityModal(false);
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
    const post = posts.find(p => p.id === postId);
    if (post) {
      const community = communityList.find(c => c.id === post.communityId);
      router.push(`/communities/${community?.slug || community?.name || post.communityId}?post=${postId}`);
    }
  };
  const handleShare = (postId: string) => {
    console.log('Sharing post:', postId);
    if (isMobile) triggerHapticFeedback('light');
  };
  const handleViewPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const community = communityList.find(c => c.id === post.communityId);
      router.push(`/communities/${community?.slug || community?.name || post.communityId}?post=${postId}`);
    }
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



  // Show posts from followed communities and recently visited communities
  // Defensive programming to handle cases where post data might be malformed
  const filteredPosts = posts.filter(post => {
    // Ensure post is a valid object
    if (!post || typeof post !== 'object') return false;
    
    // Posts from joined communities
    if (joinedCommunities.includes(post.communityId)) return true;
    
    // Popular posts (suggested) - ensure upvotes property exists
    if (typeof post.upvotes === 'number' && post.upvotes > 100) return true;
    
    // Interest-based suggestions - ensure tags property exists and is an array
    if (Array.isArray(post.tags) && post.tags.some(tag => ['ethereum', 'defi', 'nft'].includes(tag))) return true;
    
    return false;
  });

  // Defensive: normalize communities to array for rendering and filter out invalid entries
  const communityList: Community[] = Array.isArray(communities) 
    ? communities
        .filter(community => community && typeof community === 'object' && community.id)
        .map(community => ({
          ...community,
          tags: Array.isArray(community.tags) ? community.tags : []
        }))
    : [];

  // Mobile Web3 community data with defensive checks
  const communityData = communityList.map(community => ({
    id: community.id || `community-${Math.random()}`,
    name: community.displayName || community.name || 'Unnamed Community',
    avatar: community.avatar || '🏛️',
    memberCount: typeof community.memberCount === 'number' ? community.memberCount : 0,
    isActive: joinedCommunities.includes(community.id),
    userRole: 'member' as const,
    tokenBalance: Math.floor(Math.random() * 100),
    governanceNotifications: Math.floor(Math.random() * 5),
    stakingRewards: Math.floor(Math.random() * 20)
  })).filter(community => community.id); // Filter out any communities without valid IDs

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

            

            {/* Collapsible Sidebar */}
            <div className="px-4 mb-4">
              <CollapsibleWeb3Sidebar
                communities={communityData}
                currentCommunity={undefined}
                onCommunitySelect={(id) => {
                  const community = communityList.find(c => c.id === id);
                  if (community) {
                    router.push(`/communities/${community.slug || community.name}`);
                  }
                }}
                onCreateCommunity={handleCreateCommunityClick}
                walletConnected={walletConnected}
                totalStakingRewards={stakingRewards}
                governanceNotifications={governanceNotifications}
              />
            </div>

            {/* Enhanced Mobile Posts Feed */}
            <div className="px-0 pb-24 space-y-0">
              {/* Mobile Loading State */}
              {loading && (
                <div className="space-y-0">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
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
                    No posts yet
                  </h3>
                  <p className="text-gray-500 mb-6 px-4">
                    {joinedCommunities.length === 0 
                      ? "Join communities to see posts"
                      : "Be the first to post!"
                    }
                  </p>
                  <button
                    onClick={handleCreatePost}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Post
                  </button>
                </div>
              )}

              {filteredPosts.map(post => {
                // Defensive checks for post data
                if (!post || typeof post !== 'object') return null;
                
                const community = communityList.find(c => c.id === post.communityId);
                
                // Ensure required post properties exist
                const postId = post.id || `post-${Math.random()}`;
                const postTitle = post.title || 'Untitled Post';
                const postContent = post.content || '';
                const postAuthorName = post.authorName || 'Unknown Author';
                const postAuthor = post.author || '';
                const postUpvotes = typeof post.upvotes === 'number' ? post.upvotes : 0;
                const postCommentCount = typeof post.commentCount === 'number' ? post.commentCount : 0;
                const postStakedTokens = typeof post.stakedTokens === 'number' ? post.stakedTokens : 0;
                const postCreatedAt = post.createdAt || new Date().toISOString();
                const postType = post.type || 'text';
                const postIsStaked = !!post.isStaked;
                
                return (
                  <CompactWeb3PostCard
                    key={postId}
                    post={{
                      id: postId,
                      title: postTitle,
                      content: postContent,
                      author: {
                        name: postAuthorName,
                        avatar: '👤',
                        address: postAuthor
                      },
                      community: {
                        name: community?.displayName || 'Unknown',
                        avatar: community?.avatar || '🏛️'
                      },
                      metrics: {
                        upvotes: postUpvotes,
                        comments: postCommentCount,
                        views: Math.floor(Math.random() * 1000),
                        stakingAmount: postStakedTokens,
                        stakerCount: Math.floor(Math.random() * 50)
                      },
                      timestamp: new Date(postCreatedAt).toLocaleDateString(),
                      isUpvoted: false,
                      isSaved: false,
                      postType: postType as any,
                      onChainProof: postIsStaked
                    }}
                    onUpvote={() => handleUpvote(postId)}
                    onComment={() => handleComment(postId)}
                    onShare={() => handleShare(postId)}
                    onSave={() => handleSave(postId)}
                    onTip={(amount?: number) => handleTip(postId, amount)}
                    onStake={() => handleStake(postId)}
                    onViewPost={() => handleViewPost(postId)}
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
        <Layout title="Communities - LinkDAO" fullWidth={true}>
          <Head>
            <title>Communities - LinkDAO</title>
            <meta name="description" content="Discover and join decentralized communities on LinkDAO. Connect with like-minded individuals, share knowledge, and participate in governance." />
            <meta property="og:title" content="Communities - LinkDAO" />
            <meta property="og:description" content="Discover and join decentralized communities on LinkDAO. Connect with like-minded individuals, share knowledge, and participate in governance." />
            <meta property="og:url" content="https://linkdao.io/communities" />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Communities - LinkDAO" />
            <meta name="twitter:description" content="Discover and join decentralized communities on LinkDAO. Connect with like-minded individuals, share knowledge, and participate in governance." />
            <link rel="canonical" href="https://linkdao.io/communities" />
            <meta name="keywords" content="DAO communities, decentralized communities, Web3, blockchain, governance, LinkDAO" />
          </Head>

          <div className="grid grid-cols-12 gap-6 w-full px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl pt-6">
            {/* Reddit-style Left Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                

                {/* My Communities Card */}
                <MyCommunitiesCard
                  communities={communityList.filter(c => joinedCommunities.includes(c.id) || userAdminRoles[c.id])}
                  maxDisplay={10}
                  onManageClick={() => router.push('/communities/manage')}
                />

                {/* Popular Communities - Reddit Style */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Popular Communities
                    </h2>
                  </div>
                  <div className="p-2">
                    {communityList.slice(0, 8).map(community => (
                      <button
                        key={community.id}
                        onClick={() => handleCommunitySelect(community)}
                        className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-lg">{community.avatar || '🏛️'}</span>
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {community.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {community.memberCount?.toLocaleString() || 0} members
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Footer - Reddit Style */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-500 dark:text-gray-400">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Help</span>
                      <span>LDAO Tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span>LinkDAO Premium</span>
                      <span>About</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Careers</span>
                      <span>Advertise</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p>Content Policy • Privacy Policy</p>
                    <p className="mt-1">© 2025 LinkDAO</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reddit-style Center Feed */}
            <div className="col-span-12 lg:col-span-6">
              {/* Sort Tabs - Reddit Style */}
              <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-sm border border-gray-200 dark:border-gray-700 border-b-0">
                <div className="flex items-center justify-between p-3">
                  <div className="flex space-x-1">
                    {(['hot', 'new', 'top', 'rising'] as FeedSortType[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSortBy(tab)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          sortBy === tab
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                      >
                        {tab === 'hot' && <Flame className="w-3.5 h-3.5" />}
                        {tab === 'new' && <Clock className="w-3.5 h-3.5" />}
                        {tab === 'top' && <TrendingUp className="w-3.5 h-3.5" />}
                        {tab === 'rising' && <Star className="w-3.5 h-3.5" />}
                        <span className="capitalize">{tab}</span>
                      </button>
                    ))}
                  </div>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className={`text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white ${
                      sortBy !== 'top' ? 'hidden' : ''
                    }`}
                  >
                    <option value="hour">Past Hour</option>
                    <option value="day">Past Day</option>
                    <option value="week">Past Week</option>
                    <option value="month">Past Month</option>
                    <option value="year">Past Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              
              {/* Create Post Card - Reddit Style */}
              <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm border border-t-0 border-gray-200 dark:border-gray-700 mb-4">
                <div className="p-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {walletConnected ? 'U' : '+'}
                    </div>
                    <div className="flex-1">
                      <button
                        onClick={handleCreatePost}
                        className="w-full text-left text-gray-500 dark:text-gray-400 text-sm placeholder-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Create Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show user's recently visited communities */}
              {!loading && joinedCommunities.length > 0 && (
                <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
                  <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Top Communities
                  </h2>
                  <div className="flex flex-wrap gap-1">
                    {communityList.filter(c => joinedCommunities.includes(c.id)).slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCommunitySelect(c)}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
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
              {!loading && filteredPosts.length === 0 && (
                <EmptyStates
                  type={error ? 'no-posts' : joinedCommunities.length === 0 ? 'not-joined' : activeQuickFilters.length > 0 ? 'no-filter-results' : 'no-posts'}
                  onAction={error ? () => { setError(null); fetchPosts(1, false); } : handleCreatePost}
                  actionLabel={error ? 'Try Again' : undefined}
                  activeFilters={activeQuickFilters}
                />
              )}

              <div className="space-y-0">
                {filteredPosts.map(post => {
                  // Defensive checks for post data
                  if (!post || typeof post !== 'object') return null;
                  
                  const community = communityList.find(c => c.id === post.communityId);
                  const stakingInfo = stakingData[post.communityId];
                  
                  // Ensure required post properties exist
                  const postId = post.id || `post-${Math.random()}`;
                  const postTitle = post.title || 'Untitled Post';
                  const postContent = post.content || '';
                  const postAuthor = post.authorName || 'Unknown Author';
                  const postUpvotes = typeof post.upvotes === 'number' ? post.upvotes : 0;
                  const postDownvotes = typeof post.downvotes === 'number' ? post.downvotes : 0;
                  const postComments = typeof post.commentCount === 'number' ? post.commentCount : 0;
                  const postTags = Array.isArray(post.tags) ? post.tags : [];
                  const postCreatedAt = post.createdAt || new Date().toISOString();
                  const postIsStaked = !!post.isStaked;
                  const postStakedTokens = typeof post.stakedTokens === 'number' ? post.stakedTokens : 0;
                  
                  return (
                    <Web3SwipeGestureHandler
                      key={postId}
                      postId={postId}
                      onUpvote={() => handleUpvote(postId)}
                      onSave={() => handleSave(postId)}
                      onTip={() => handleTip(postId)}
                      onStake={() => handleStake(postId)}
                      walletConnected={walletConnected}
                      userBalance={userBalance}
                    >
                      <div 
                        onClick={() => {
                          const communityId = community?.slug || community?.name || post.communityId || 'unknown';
                          router.push(`/communities/${communityId}?post=${postId}`);
                        }}
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
                          if (hoveredPost?.id === postId) {
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }
                        }}
                        className="bg-white dark:bg-gray-800 rounded-none border-x border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer first:rounded-t-lg last:rounded-b-lg first:border-t last:border-b group"
                      >
                        <div className="flex">
                          {/* Reddit-style Vote Section */}
                          <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 min-w-[48px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(postId, 'up', 1);
                              }}
                              className="p-1 text-gray-400 hover:text-orange-500 rounded transition-colors"
                            >
                              <ArrowUp className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-bold text-gray-900 dark:text-white py-0.5">
                              {postUpvotes - postDownvotes}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(postId, 'down', 1);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors"
                            >
                              <ArrowDown className="w-5 h-5" />
                            </button>
                            
                            {/* Staking Indicator */}
                            {postIsStaked && (
                              <div className="mt-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full" title="On-chain verified" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 p-3">
                            {/* Post Header - Reddit Style */}
                            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {community?.name || post.communityId || 'Unknown Community'}
                              </span>
                              <span>•</span>
                              <span>Posted by u/{postAuthor}</span>
                              <span>•</span>
                              <span>{new Date(postCreatedAt).toLocaleDateString()}</span>
                              {postIsStaked && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 dark:text-green-400">
                                    {postStakedTokens} 🪙
                                  </span>
                                </>
                              )}
                            </div>

                            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1 hover:text-blue-600 dark:hover:text-blue-400">
                              {postTitle}
                            </h3>

                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                              {postContent}
                            </p>

                            {/* Tags - Reddit Style */}
                            <div className="flex flex-wrap gap-1 mb-2">
                              {postTags.slice(0, 4).map(tag => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Action Bar - Reddit Style */}
                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <button 
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center space-x-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span>{postComments}</span>
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
                                <span>Save</span>
                              </button>
                              {walletConnected && (
                                <button 
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full hover:from-blue-600 hover:to-purple-700 transition-all"
                                >
                                  <Coins className="w-3 h-3" />
                                  <span>Web3</span>
                                </button>
                              )}
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

            {/* Reddit-style Right Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                {/* Community Info Card - Reddit Style */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-sm p-4 text-white">
                  <h3 className="font-semibold text-sm mb-1">Join LinkDAO Communities</h3>
                  <p className="text-xs opacity-90 mb-3">
                    Connect with like-minded individuals and participate in governance
                  </p>
                  <button
                    onClick={handleCreateCommunityClick}
                    className="w-full py-2 bg-white text-blue-600 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    Create Community
                  </button>
                </div>
                
                {/* Trending Today */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Trending Today
                    </h3>
                  </div>
                  <div className="p-2">
                    {[
                      { id: '1', title: 'Ethereum Merge Anniversary', community: 'ethereum' },
                      { id: '2', title: 'New DeFi Protocols', community: 'defi' },
                      { id: '3', title: 'NFT Market Update', community: 'nft' },
                      { id: '4', title: 'Web3 Development Tips', community: 'development' }
                    ].map((item, index) => (
                      <div key={item.id} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                        <div className="flex items-start space-x-2">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white font-medium">
                              {item.title}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.community}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Governance Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      Governance Activity
                    </h3>
                  </div>
                  <div className="p-2">
                    <GovernanceActivityPulse 
                      activeProposals={governanceProposals.length}
                      showLabel={true}
                    />
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
            onSubmit={handleCreateCommunity}
            isLoading={isCreatingCommunity}
          />
        </Layout>
      </VisualPolishIntegration>
    </ErrorBoundary>
  );
};

export default CommunitiesPage;