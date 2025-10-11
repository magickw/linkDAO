import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { CommunityService } from '../services/communityService';
import { 
  QuickFilter, 
  CommunityWithIcons, 
  EnhancedUserProfile, 
  NavigationBreadcrumb, 
  ActivityIndicator,
  FilterQuery 
} from '@/types/navigation';
import { 
  defaultQuickFilters, 
  generateBreadcrumbs, 
  createActivityIndicator 
} from '@/components/Navigation';

interface UseEnhancedNavigationReturn {
  // Quick Filters
  quickFilters: QuickFilter[];
  activeFilter: QuickFilter | null;
  handleFilterChange: (filterId: string) => void;
  
  // Communities
  communities: CommunityWithIcons[];
  showAllCommunities: boolean;
  toggleShowAllCommunities: () => void;
  handleCommunitySelect: (communityId: string) => void;
  handleCommunityToggle: (communityId: string) => void;
  
  // User Profile
  enhancedUser: EnhancedUserProfile | null;
  
  // Breadcrumbs
  breadcrumbs: NavigationBreadcrumb[];
  
  // Activity Indicators
  activityIndicators: ActivityIndicator[];
  handleActivityIndicatorClick: (indicator: ActivityIndicator) => void;
  
  // State
  isLoading: boolean;
  error: string | null;
}

export function useEnhancedNavigation(): UseEnhancedNavigationReturn {
  const router = useRouter();
  const { address } = useAccount();
  
  // State
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(defaultQuickFilters as any);
  const [communities, setCommunities] = useState<CommunityWithIcons[]>([]);
  const [showAllCommunities, setShowAllCommunities] = useState(false);
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUserProfile | null>(null);
  const [activityIndicators, setActivityIndicators] = useState<ActivityIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock enhanced user data - replace with real API call
  useEffect(() => {
    if (address) {
      const mockUser: EnhancedUserProfile = {
        id: address,
        walletAddress: address,
        username: `user_${address.slice(2, 8)}`,
        displayName: `User ${address.slice(2, 6)}`,
        avatar: '',
        bio: 'Web3 enthusiast and community builder',
        reputation: {
          totalScore: 1250,
          level: {
            level: 5,
            name: 'Community Builder',
            minScore: 1000,
            maxScore: 2000,
            privileges: ['enhanced_posting', 'community_creation']
          },
          breakdown: {
            posting: 400,
            governance: 300,
            community: 350,
            trading: 150,
            moderation: 50
          },
          progress: [
            {
              category: 'posting',
              current: 400,
              target: 500,
              reward: 'Enhanced Post Features',
              progress: 80
            }
          ],
          history: []
        },
        badges: [
          {
            id: 'early-adopter',
            name: 'Early Adopter',
            description: 'Joined in the first month',
            icon: '🚀',
            rarity: 'rare',
            earnedAt: new Date('2024-01-15'),
            requirements: []
          },
          {
            id: 'community-leader',
            name: 'Community Leader',
            description: 'Created and managed a successful community',
            icon: '👑',
            rarity: 'epic',
            earnedAt: new Date('2024-02-20'),
            requirements: []
          }
        ],
        achievements: [],
        level: {
          level: 5,
          name: 'Community Builder',
          minScore: 1000,
          maxScore: 2000,
          privileges: ['enhanced_posting', 'community_creation']
        },
        followers: 89,
        following: 128,
        posts: 42,
        communities: [],
        lastActive: new Date(),
        joinedAt: new Date('2024-01-15'),
        activityScore: 85,
        engagementRate: 12.5
      };
      
      setEnhancedUser(mockUser);
    }
  }, [address]);

  // Load real communities data
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setIsLoading(true);
        
        // Get trending communities for discovery
        const trending = await CommunityService.getTrendingCommunities(10).catch(() => [] as any);

        // Ensure we always have an array before mapping
        const trendingList = Array.isArray(trending) ? trending : [];
        
        // Transform to expected format
        const communitiesWithIcons: CommunityWithIcons[] = trendingList.map(community => ({
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          memberCount: community.memberCount,
          avatar: community.avatar || '🏛️', // Default avatar if none provided
          icon: community.avatar || '🏛️',
          unreadCount: 0, // Would be calculated from notifications
          lastActivity: community.updatedAt || new Date(),
          userRole: { type: 'member', permissions: ['read', 'write'] },
          isJoined: false, // Would need to check user membership
          activityLevel: 'medium' as const
        }));
        
        setCommunities(communitiesWithIcons);
      } catch (error) {
        console.error('Error loading communities:', error);
        // Fallback to empty array on error
        setCommunities([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommunities();
  }, []);

  // Mock activity indicators - replace with real data
  useEffect(() => {
    const indicators = [
      createActivityIndicator('notification', 5, 'bg-blue-500'),
      createActivityIndicator('transaction', 2, 'bg-green-500'),
      createActivityIndicator('community', 8, 'bg-purple-500'),
      createActivityIndicator('governance', 1, 'bg-red-500')
    ];
    
    setActivityIndicators(indicators as any);
  }, []);

  // Update filter counts based on mock data
  useEffect(() => {
    setQuickFilters(prev => prev.map(filter => {
      let count = 0;
      switch (filter.id) {
        case 'my-posts':
          count = enhancedUser?.posts || 0;
          break;
        case 'tipped-posts':
          count = 15; // Mock count
          break;
        case 'governance-posts':
          count = 3; // Mock count
          break;
      }
      return { ...filter, count };
    }));
  }, [enhancedUser]);

  // Generate breadcrumbs based on current route
  const breadcrumbs = generateBreadcrumbs(
    router.pathname,
    communities.find(c => router.query.community === c.id)?.displayName
  );

  // Handlers
  const handleFilterChange = useCallback((filterId: string) => {
    setQuickFilters(prev => prev.map(filter => ({
      ...filter,
      active: filter.id === filterId ? !filter.active : false
    })));
  }, []);

  const toggleShowAllCommunities = useCallback(() => {
    setShowAllCommunities(prev => !prev);
  }, []);

  const handleCommunitySelect = useCallback((communityId: string) => {
    router.push(`/dao/${communityId}`);
  }, [router]);

  const handleCommunityToggle = useCallback((communityId: string) => {
    setCommunities(prev => prev.map(community => 
      community.id === communityId 
        ? { ...community, isJoined: !community.isJoined }
        : community
    ));
  }, []);

  const handleActivityIndicatorClick = useCallback((indicator: ActivityIndicator) => {
    // Handle different indicator types
    switch (indicator.type) {
      case 'notification':
        router.push('/notifications');
        break;
      case 'transaction':
        router.push('/wallet/transactions');
        break;
      case 'community':
        router.push('/communities');
        break;
      case 'governance':
        router.push('/governance');
        break;
      default:
        // No-op for unknown indicator types
        break;
    }
  }, [router]);

  const activeFilter = quickFilters.find(f => f.active) || null;

  return {
    quickFilters,
    activeFilter,
    handleFilterChange,
    communities,
    showAllCommunities,
    toggleShowAllCommunities,
    handleCommunitySelect,
    handleCommunityToggle,
    enhancedUser,
    breadcrumbs,
    activityIndicators,
    handleActivityIndicatorClick,
    isLoading,
    error
  };
}