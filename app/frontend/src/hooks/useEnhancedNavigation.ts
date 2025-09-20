import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
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
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(defaultQuickFilters);
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

  // Mock communities data - replace with real API call
  useEffect(() => {
    const mockCommunities: CommunityWithIcons[] = [
      {
        id: 'ethereum-builders',
        name: 'ethereum-builders',
        displayName: 'Ethereum Builders',
        memberCount: 1240,
        avatar: '🔷',
        icon: '🔷',
        unreadCount: 3,
        lastActivity: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        userRole: { type: 'member', permissions: ['read', 'write'] },
        isJoined: true,
        activityLevel: 'high'
      },
      {
        id: 'defi-traders',
        name: 'defi-traders',
        displayName: 'DeFi Traders',
        memberCount: 890,
        avatar: '💰',
        icon: '💰',
        unreadCount: 0,
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        userRole: { type: 'moderator', permissions: ['read', 'write', 'moderate'] },
        isJoined: true,
        activityLevel: 'medium'
      },
      {
        id: 'nft-collectors',
        name: 'nft-collectors',
        displayName: 'NFT Collectors',
        memberCount: 2100,
        avatar: '🎨',
        icon: '🎨',
        unreadCount: 1,
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        userRole: { type: 'member', permissions: ['read', 'write'] },
        isJoined: true,
        activityLevel: 'low'
      },
      {
        id: 'dao-governance',
        name: 'dao-governance',
        displayName: 'DAO Governance',
        memberCount: 567,
        avatar: '🏛️',
        icon: '🏛️',
        unreadCount: 0,
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        userRole: { type: 'member', permissions: ['read', 'write'] },
        isJoined: false,
        activityLevel: 'medium'
      }
    ];
    
    setCommunities(mockCommunities);
    setIsLoading(false);
  }, []);

  // Mock activity indicators - replace with real data
  useEffect(() => {
    const indicators = [
      createActivityIndicator('notifications', 'notification', 5, 'medium'),
      createActivityIndicator('transactions', 'transaction', 2, 'low'),
      createActivityIndicator('community', 'community', 8, 'low'),
      createActivityIndicator('governance', 'governance', 1, 'high')
    ];
    
    setActivityIndicators(indicators);
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