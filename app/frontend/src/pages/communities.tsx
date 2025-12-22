import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useWeb3 } from '@/context/Web3Context';
import CommunityAvatar from '@/components/Community/CommunityAvatar';

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

// New Enhanced Components
import EnhancedGovernanceCard from '@/components/Community/EnhancedGovernanceCard';
import EnhancedTokenPriceWidget from '@/components/Community/EnhancedTokenPriceWidget';
import OnChainIdentityBadge from '@/components/Community/OnChainIdentityBadge';

import TreasuryWidget from '@/components/Community/TreasuryWidget';
import QuestsWidget from '@/components/Community/QuestsWidget';
import CommunityHealthMetrics from '@/components/Community/CommunityHealthMetrics';
import FloatingActionButton from '@/components/Community/FloatingActionButton';
import PinnedPostsSection from '@/components/Community/PinnedPostsSection';
import AnnouncementBanner from '@/components/Community/AnnouncementBanner';
import AnnouncementManager from '@/components/Community/AnnouncementManager';
import CommunityPostCardEnhanced from '@/components/Community/CommunityPostCardEnhanced';
import { postManagementService } from '@/services/postManagementService';
import CommunityOnboarding from '@/components/Community/CommunityOnboarding';

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
  Pin
} from 'lucide-react';
import CommunityCardEnhanced from '@/components/Community/CommunityCardEnhanced';
import MyCommunitiesCard from '@/components/Community/MyCommunitiesCard';
import { CommunityService } from '@/services/communityService';
import { useAuth } from '@/context/AuthContext';
import { Community } from '@/models/Community';
import { FeedSortType } from '@/types/feed';

// Constants
const DEFAULT_COMMUNITIES_LIMIT = 50;
const DEFAULT_FEED_PAGE_SIZE = 20;
const DEFAULT_USER_COMMUNITIES_PAGE = 1;
const DEFAULT_USER_COMMUNITIES_LIMIT = 100;

// Define proper TypeScript interfaces
interface Post {
  id: string;
  title: string;
  content: string;
  authorName: string;
  communityId: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  createdAt: string;
  tags: string[];
  stakedTokens: number;
  [key: string]: any; // Allow additional properties
}

interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  role: 'admin' | 'member' | 'visitor';
  joinedAt: Date;
  reputation: number;
  contributions: number;
  isActive: boolean;
  lastActivityAt: Date;
}


const CommunitiesPage: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHapticFeedback } = useMobileOptimization();
  const { address, isConnected } = useWeb3();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Memory leak prevention: Track component mount status
  const isMounted = useRef(true);

  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
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
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Quick filter chips state
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);

  // Keyboard shortcuts state
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Create community modal state
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [createCommunityError, setCreateCommunityError] = useState<string | null>(null);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clear any pending hover timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Load communities and enhanced Web3 data on component mount
  useEffect(() => {
    const loadEnhancedCommunities = async () => {
      try {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);

        // Load communities with fallback for 503 errors
        const communitiesData = await CommunityService.getAllCommunities({
          isPublic: true,
          limit: DEFAULT_COMMUNITIES_LIMIT
        });

        if (!isMounted.current) return;
        setCommunities(communitiesData);


        // Load user's community memberships if wallet is connected AND authenticated with backend
        // Check both wallet connection and backend authentication to avoid 401 errors
        if (address && isConnected && isAuthenticated) {
          try {
            // Fetch user's communities (both created and joined)
            const myCommunitiesResponse = await CommunityService.getMyCommunities(DEFAULT_USER_COMMUNITIES_PAGE, DEFAULT_USER_COMMUNITIES_LIMIT).catch(() => ({ communities: [], pagination: null }));

            if (!isMounted.current) return;

            // Set community IDs
            const allUserCommunityIds = new Set<string>();
            myCommunitiesResponse.communities.forEach(c => {
              if (c && c.id) {
                allUserCommunityIds.add(c.id);
              }
            });

            setJoinedCommunities(Array.from(allUserCommunityIds));

            // Merge user communities into the main list so they appear in the sidebar
            // The sidebar filters 'communities' based on 'joinedCommunities', so we need to ensure
            // all joined/created communities are actually present in the 'communities' array.
            const allUserCommunities = myCommunitiesResponse.communities;
            setCommunities(prev => {
              const existingIds = new Set(prev.map(c => c.id));
              const newCommunities = [...prev];

              allUserCommunities.forEach(c => {
                if (c && c.id && !existingIds.has(c.id)) {
                  newCommunities.push(c);
                  existingIds.add(c.id);
                }
              });

              return newCommunities;
            });

            // Set admin roles for communities where user is admin (case-insensitive)
            // Check both the initial communitiesData and the user's communities
            const adminRoles: Record<string, string> = {};
            const allCommunitiesToCheck = [...communitiesData, ...allUserCommunities];

            // Use Set to deduplicate communities before processing
            const uniqueCommunities = Array.from(new Set(allCommunitiesToCheck.map(c => c.id)))
              .map(id => allCommunitiesToCheck.find(c => c.id === id))
              .filter((c): c is Community => c !== undefined);

            // Check all communities for admin/moderator status
            uniqueCommunities.forEach(community => {
              if (!community || !community.id) return;

              // Check if user is the creator (case-insensitive) - creators are always admins
              if (community.creatorAddress && address &&
                community.creatorAddress.toLowerCase() === address.toLowerCase()) {
                adminRoles[community.id] = 'admin';
                return; // Skip further checks for creators
              }

              // Skip if already marked as admin
              if (adminRoles[community.id]) return;

              // Check if user is an admin/moderator of this community (based on moderators field)
              if (community.moderators && Array.isArray(community.moderators) &&
                address && community.moderators.some(mod => mod.toLowerCase() === address.toLowerCase())) {
                adminRoles[community.id] = 'admin';
              }
            });
            if (!isMounted.current) return;
            setUserAdminRoles(adminRoles);
          } catch (error) {
            console.error('Error loading user communities:', error);
            // Continue with empty arrays on error
            setJoinedCommunities([]);
            setUserAdminRoles({});
          }
        }

        // Load enhanced Web3 data
        await loadWeb3EnhancedData(communitiesData);
      } catch (err) {
        console.error('Error loading communities:', err);
        if (!isMounted.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load communities');
        // Show empty array instead of crashing
        setCommunities([]);
        await loadWeb3EnhancedData([]);
      } finally {
        if (!isMounted.current) return;
        setLoading(false);
      }
    };

    loadEnhancedCommunities();
  }, [address, isConnected, isAuthenticated]);

  // Load posts from backend API with pagination
  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    // Early return if not mounted
    if (!isMounted.current) return;
    
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      console.log('[CommunitiesPage] fetchPosts called:', { pageNum, append, sortBy, timeFilter, address, joinedCommunities });

      // Use the enhanced feed service to show community posts
      const { FeedService } = await import('../services/feedService');
      
      const filter = {
        feedSource: 'all',
        sortBy: sortBy as any,
        timeRange: timeFilter,
        userAddress: address || undefined,
        postTypes: ['posts'],
        communities: joinedCommunities.length > 0 ? joinedCommunities : undefined
      };
      
      console.log('[CommunitiesPage] Calling FeedService.getEnhancedFeed with filter:', filter);
      
      const result = await FeedService.getEnhancedFeed(filter, pageNum, DEFAULT_FEED_PAGE_SIZE);

      // Check if component is still mounted
      if (!isMounted.current) return;

      const newPosts = result?.posts || [];

      console.log('[CommunitiesPage] FeedService returned:', {
        result,
        postsCount: newPosts.length,
        hasMore: result?.hasMore,
        pageNum,
        append,
        newPosts: newPosts.slice(0, 2) // Log first 2 posts
      });

      if (append) {
        setPosts(prev => {
          console.log('[CommunitiesPage] Appending posts. Previous count:', prev.length, 'New posts:', newPosts.length);
          return [...prev, ...newPosts];
        });
      } else {
        console.log('[CommunitiesPage] Setting posts. Count:', newPosts.length);
        setPosts(newPosts);
        console.log('[CommunitiesPage] Posts state after setPosts:', newPosts);
      }

      setHasMore(result?.hasMore || false);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch community posts:', error);
      if (!isMounted.current) return;
      
      if (!append && posts.length === 0) {
        setPosts([]);
      }
    } finally {
      if (!isMounted.current) return;
      if (pageNum === 1) {
        setLoading(false);
      }
      setLoadingMore(false);
    }
  }, [isMounted, joinedCommunities, address, sortBy, timeFilter, posts.length]);

  useEffect(() => {
    // Wait for auth loading to complete to avoid race conditions
    if (isAuthLoading) return;

    // Always fetch posts, even if not authenticated
    // The feed service will handle authentication internally
    console.log('[CommunitiesPage] useEffect triggered, fetching posts...');
    fetchPosts(1, false);
  }, [sortBy, timeFilter, address, isAuthLoading, joinedCommunities.length]);

  // Store fetchPosts in a ref to avoid dependency issues
  const fetchPostsRef = useRef(fetchPosts);
  fetchPostsRef.current = fetchPosts;

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loadingMore || !hasMore) {
        return;
      }
      fetchPostsRef.current(page + 1, true);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, loadingMore, hasMore]);

  // Route change handlers to prevent blocking navigation
  useEffect(() => {
    const handleRouteChangeStart = () => {
      // Cancel any ongoing operations to prevent blocking navigation
      if (loading || loadingMore) {
        console.log('[CommunitiesPage] Route change detected, cancelling ongoing operations');
      }
    };

    const handleRouteChangeComplete = () => {
      // Resume operations after navigation if needed
      console.log('[CommunitiesPage] Route change completed');
    };

    // Since we can't directly access Next.js router events in pages, we'll listen for
    // beforeunload events as a proxy for navigation
    const handleBeforeUnload = () => {
      // Cleanup operations before page unload/navigation
      console.log('[CommunitiesPage] Page unloading, cleaning up');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [loading, loadingMore]);

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
    setCreateCommunityError(null);
    try {
      // Creating community

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to create community';
      setCreateCommunityError(errorMessage);
      // Don't throw error to allow modal to display error message
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
      // Boosting post
      if (isMobile) triggerHapticFeedback('success');
    } catch (err) {
      console.error('Error boosting post:', err);
    }
  };

  const handleTokenReaction = async (postId: string, reactionType: string, amount?: number) => {
    try {
      // TODO: Implement token reactions
      // Token reaction
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
    // Saving post
    if (isMobile) triggerHapticFeedback('light');
  };
  const handleTip = async (postId: string, amount?: number) => {
    // Tipping post
    if (isMobile) triggerHapticFeedback('success');
  };
  const handleStake = (postId: string) => {
    // Staking on post
    if (isMobile) triggerHapticFeedback('heavy');
  };
  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const community = communityList.find(c => c.id === post.communityId);
      router.push(`/communities/${community?.slug || community?.name || post.communityId}/posts/${postId}`);
    }
  };
  const handleShare = (postId: string) => {
    // Sharing post
    if (isMobile) triggerHapticFeedback('light');
  };
  const handleViewPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const community = communityList.find(c => c.id === post.communityId);
      router.push(`/communities/${community?.slug || community?.name || post.communityId}/posts/${postId}`);
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



  // Show only community posts (posts with communityId), not quick posts
  const filteredPosts = useMemo(() => {
    console.log('[CommunitiesPage] posts array length:', posts.length);
    console.log('[CommunitiesPage] posts:', posts);
    
    const communityPosts = posts.filter(post => {
      if (!post || typeof post !== 'object') return false;
      // Only show posts that have a communityId (community posts)
      // Exclude quick posts which have communityId: null
      return post.communityId !== null && post.communityId !== undefined;
    });
    
    console.log('[CommunitiesPage] community posts count:', communityPosts.length);
    return communityPosts;
  }, [posts]);

  // Defensive: normalize communities to array for rendering and filter out invalid entries
  const communityList = useMemo<Community[]>(() => {
    if (!Array.isArray(communities)) return [];
    return communities
      .filter(community => community && typeof community === 'object' && community.id)
      .map(community => ({
        ...community,
        tags: Array.isArray(community.tags) ? community.tags : []
      }));
  }, [communities]);



  // Mobile and desktop now use the same Layout component for consistency

  // Show loading state while auth is initializing to prevent navigation issues
  if (isAuthLoading) {
    return (
      <Layout title="Communities - LinkDAO" fullWidth={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ErrorBoundary 
      fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2><p className="text-gray-600 dark:text-gray-400 mb-4">Please refresh the page to try again</p><button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Refresh Page</button></div></div>}
      onError={(error, errorInfo) => {
        console.error('Error boundary caught:', error, errorInfo);
      }}
    >
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

          {/* Background gradient for visual polish */}
          <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full px-0 sm:px-2 lg:px-4 mx-auto max-w-screen-2xl pt-0 lg:pt-6">
            {/* Reddit-style Left Sidebar - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                {/* Community Info Card */}
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

                {/* My Communities Card */}
                <MyCommunitiesCard
                  communities={communityList.filter(c => {
                    if (!c || !c.id) return false;
                    // Include if: in joinedCommunities, has admin role, or is creator
                    return joinedCommunities.includes(c.id) ||
                      userAdminRoles[c.id] ||
                      (address && c.creatorAddress && c.creatorAddress.toLowerCase() === address.toLowerCase());
                  })}
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
                        aria-label={`View ${community.displayName || community.name} community`}
                        className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <CommunityAvatar
                          avatar={community.avatar}
                          name={community.displayName || community.name}
                          size="sm"
                        />
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {community.displayName || community.name}
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

            {/* Reddit-style Center Feed - Full width on mobile */}
            <div className="col-span-1 lg:col-span-6">
              {/* Announcement Banner */}
              {joinedCommunities.length > 0 && (
                <AnnouncementBanner communityId={joinedCommunities[0]} />
              )}

              {/* Announcement Manager (Admin Only) */}
              {joinedCommunities.length > 0 && userAdminRoles[joinedCommunities[0]] === 'admin' && (
                <div className="mb-4">
                  <AnnouncementManager communityId={joinedCommunities[0]} />
                </div>
              )}

              {/* Sort Tabs - Reddit Style */}
              <div className="bg-white dark:bg-gray-800 rounded-none lg:rounded-t-lg shadow-sm border-x-0 lg:border-x border-t-0 lg:border-t border-gray-200 dark:border-gray-700 border-b-0">
                <div className="flex items-center justify-between p-3">
                  <div className="flex space-x-1">
                    {(['hot', 'new', 'top', 'rising'] as FeedSortType[]).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSortBy(tab)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${sortBy === tab
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                          }`}
                        aria-label={`Sort by ${tab}`}
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
                    aria-label="Select time filter for top posts"
                    className={`text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white ${sortBy !== 'top' ? 'hidden' : ''
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

              {/* Pinned Posts Section */}
              {joinedCommunities.length > 0 && communityList.length > 0 && (
                <PinnedPostsSection
                  communityId={joinedCommunities[0]} // Show pinned posts for the first joined community (simplified for now)
                  community={communityList.find(c => c.id === joinedCommunities[0]) || communityList[0]}
                  userMembership={{
                    id: `membership-${address}-${joinedCommunities[0]}`,
                    communityId: joinedCommunities[0],
                    userId: address || '',
                    role: userAdminRoles[joinedCommunities[0]] ? 'admin' : 'member',
                    joinedAt: new Date(),
                    reputation: 0,
                    contributions: 0,
                    isActive: true,
                    lastActivityAt: new Date()
                  }}
                  onVote={(postId, voteType, stakeAmount) => {
                    const type = voteType === 'upvote' ? 'up' : 'down';
                    const amount = stakeAmount ? parseFloat(stakeAmount) : 1;
                    handleVote(postId, type, amount);
                  }}
                  onReaction={handleTokenReaction}
                  onTip={async (postId, amount) => handleTip(postId, parseFloat(amount))}
                />
              )}

              {/* Create Post Card - Reddit Style */}
              <div className="bg-white dark:bg-gray-800 rounded-none lg:rounded-b-lg shadow-sm border-x-0 lg:border-x border-t-0 border-gray-200 dark:border-gray-700 mb-0 lg:mb-4">
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
                  type={error ? 'no-posts' :
                    joinedCommunities.length === 0 ? 'not-joined' :
                      activeQuickFilters.length > 0 ? 'no-filter-results' :
                        'no-posts'}
                  onAction={error ? () => { setError(null); fetchPosts(1, false); } :
                    joinedCommunities.length === 0 ? () => router.push('/communities') :
                      handleCreatePost}
                  actionLabel={error ? 'Try Again' :
                    joinedCommunities.length === 0 ? 'Explore Communities' :
                      'Create Post'}
                  activeFilters={activeQuickFilters}
                />
              )}

              <div className="space-y-0">
                {filteredPosts.map(post => {
                  // Defensive checks for post data
                  if (!post || typeof post !== 'object') return null;

                  const postCommunityId = post.communityId || post.dao || '';

                  // Use embedded community data from the post (returned by getFollowedCommunitiesFeed)
                  // Falls back to looking up from communityList if not embedded
                  const embeddedCommunity = post.community;
                  const foundCommunity = communityList.find(c => c.id === postCommunityId);

                  // Create a properly typed community object with all required fields
                  const community: Community = foundCommunity || {
                    id: embeddedCommunity?.id || postCommunityId || 'unknown',
                    name: embeddedCommunity?.name || postCommunityId || 'Unknown Community',
                    displayName: embeddedCommunity?.displayName || embeddedCommunity?.name || postCommunityId || 'Unknown Community',
                    slug: embeddedCommunity?.slug || postCommunityId || 'unknown',
                    avatar: embeddedCommunity?.avatar || undefined,
                    description: '',
                    rules: [],
                    memberCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isPublic: true,
                    moderators: [],
                    tags: [],
                    category: 'General',
                    settings: {
                      allowedPostTypes: [],
                      requireApproval: false,
                      minimumReputation: 0,
                      stakingRequirements: []
                    }
                  };

                  const postId = post.id || `post-${Math.random()}`;

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
                        onMouseEnter={(e) => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          const timeout = setTimeout(() => {
                            // Look up current post data to avoid stale closure
                            const currentPost = posts.find(p => p.id === postId);
                            if (currentPost) {
                              setHoveredPost(currentPost);
                              setHoverPosition({ x: e.clientX, y: e.clientY });
                            }
                          }, 500);
                          hoverTimeoutRef.current = timeout;
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          setHoveredPost(null);
                        }}
                        onMouseMove={(e) => {
                          // Look up current post data to avoid stale closure
                          const currentPost = posts.find(p => p.id === postId);
                          if (currentPost) {
                            setHoverPosition({ x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        <CommunityPostCardEnhanced
                          post={post}
                          community={community}
                          userMembership={joinedCommunities.includes(postCommunityId) ? {
                            id: `membership-${address}-${postCommunityId}`,
                            communityId: postCommunityId,
                            userId: address || '',
                            role: userAdminRoles[postCommunityId] ? 'admin' : 'member',
                            joinedAt: new Date(),
                            reputation: 0,
                            contributions: 0,
                            isActive: true,
                            lastActivityAt: new Date()
                          } : null}
                          onVote={(postId, voteType, stakeAmount) => handleVote(postId, voteType === 'upvote' ? 'up' : 'down', stakeAmount ? parseInt(stakeAmount) : 1)}
                          onReaction={async (postId, reactionType, amount) => {
                            // Handle reaction logic here
                            // Reaction
                          }}
                          onTip={async (postId, amount, token) => {
                            // Handle tip logic here
                            // Tip
                          }}
                        />
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

            {/* Enhanced Right Sidebar - Hidden on mobile */}
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                {/* Token Price Widget */}
                <EnhancedTokenPriceWidget
                  tokenAddress="0xc9F690B45e33ca909bB9ab97836091673232611B"
                  showBuySellButtons={true}
                  compact={false}
                />

                {/* Quests Widget */}
                <QuestsWidget
                  userAddress={address}
                  compact={false}
                />

                

                {/* Community Health Metrics */}
                <CommunityHealthMetrics
                  communityId="global"
                  timeRange="week"
                  compact={false}
                />

                {/* Treasury Widget */}
                <TreasuryWidget
                  treasuryAddress="0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5"
                  compact={false}
                />


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
            error={createCommunityError}
          />

          {/* Floating Action Button - Desktop and Mobile */}
          <FloatingActionButton
            onCreatePost={handleCreatePost}
            onCreateProposal={() => router.push('/governance/create-proposal')}
            onStakeTokens={() => router.push('/wallet?tab=stake')}
          />
        </Layout>
      </VisualPolishIntegration>
      
      {/* Community Onboarding Modal */}
      <CommunityOnboarding />
    </ErrorBoundary>
  );
};

export default CommunitiesPage;