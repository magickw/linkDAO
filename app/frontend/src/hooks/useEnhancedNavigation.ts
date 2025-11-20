import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import { CommunityService } from '../services/communityService';
import { ProfileService } from '../services/profileService';
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
import { UserProfile } from '@/models/UserProfile';

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
  enhancedUser: UserProfile | null;
  
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
  const [enhancedUser, setEnhancedUser] = useState<UserProfile | null>(null);
  const [activityIndicators, setActivityIndicators] = useState<ActivityIndicator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (address) {
        try {
          const profile = await ProfileService.getProfileByAddress(address);
          setEnhancedUser(profile);
        } catch (error) {
          console.error('Error loading user profile:', error);
          setEnhancedUser(null);
        }
      } else {
        setEnhancedUser(null);
      }
    };

    loadUserProfile();
  }, [address]);

  // Load real communities data
  useEffect(() => {
    const loadCommunities = async () => {
      try {
        setIsLoading(true);
        
        // Get trending communities for discovery
        const trending = await CommunityService.getTrendingCommunities(10).catch(() => []);

        // Ensure we always have an array before mapping
        const trendingList = Array.isArray(trending) ? trending : [];
        
        // Transform to expected format with runtime validation
        const communitiesWithIcons: CommunityWithIcons[] = trendingList.map((community) => {
          // Validate community data structure
          if (!community || typeof community !== 'object') {
            console.warn('Invalid community data:', community);
            return {
              id: '',
              name: 'Unknown Community',
              displayName: 'Unknown Community',
              memberCount: 0,
              avatar: '🏛️',
              icon: '🏛️',
              unreadCount: 0,
              lastActivity: new Date(),
              userRole: { type: 'member' as const, permissions: ['read', 'write'] as const },
              isJoined: false,
              activityLevel: 'medium' as const
            };
          }
          
          const communityData = community as {
            id?: string;
            name?: string;
            displayName?: string;
            memberCount?: number;
            avatar?: string;
            updatedAt?: Date;
          };
          
          return {
            id: communityData.id || '',
            name: communityData.name || '',
            displayName: communityData.displayName || communityData.name || '',
            memberCount: communityData.memberCount || 0,
            avatar: communityData.avatar || '🏛️',
            icon: communityData.avatar || '🏛️',
            unreadCount: 0,
            lastActivity: communityData.updatedAt || new Date(),
            userRole: { type: 'member' as const, permissions: ['read', 'write'] as const },
            isJoined: false,
            activityLevel: 'medium' as const
          };
        });
        
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
    // Set empty activity indicators to remove mock data
    setActivityIndicators([]);
  }, []);

  // Update filter counts based on real data
  useEffect(() => {
    setQuickFilters(prev => prev.map(filter => {
      let count = 0;
      switch (filter.id) {
        case 'my-posts':
          // This would need to be fetched from a real posts service
          count = 0;
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
    communities.find(c => router.query.community === c.id)?.displayName || undefined
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
    router.push(`/communities/${communityId}`);
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