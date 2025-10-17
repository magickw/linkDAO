import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

// Enhanced Components from Tasks 1-8
import EnhancedSearchInterface from '@/components/EnhancedSearchInterface';
import RealTimeNotificationSystem from '@/components/RealTimeNotifications/RealTimeNotificationSystem';
import AdvancedFeedSystem from '@/components/Feed/AdvancedFeedSystem';
import AdvancedNavigationSidebar from '@/components/Navigation/AdvancedNavigationSidebar';
import SmartRightSidebar from '@/components/SmartRightSidebar/SmartRightSidebar';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import VisualPolishIntegration from '@/components/VisualPolish/VisualPolishIntegration';
import TrendingSidebar from '@/components/TrendingSidebar';

// Mobile Web3 Components (preserve existing functionality)
import {
  CollapsibleWeb3Sidebar,
  CompactWeb3PostCard,
  Web3SwipeGestureHandler,
  MobileWeb3DataDisplay
} from '@/components/Mobile/Web3';

// Services and Types
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';

// Enhanced Communities Page Component
const EnhancedCommunitiesPage: React.FC = () => {
  const router = useRouter();
  const { isMobile, triggerHapticFeedback } = useMobileOptimization();
  
  // Enhanced State Management
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    type: 'all', // all, communities, posts, users
    timeRange: 'week',
    sortBy: 'relevance'
  });
  
  // Enhanced Feed State
  const [feedSorting, setFeedSorting] = useState<'hot' | 'new' | 'top' | 'rising' | 'following'>('hot');
  const [feedFilters, setFeedFilters] = useState({
    postType: 'all', // all, governance, discussion, showcase
    tags: [] as string[],
    minReputation: 0
  });
  
  // Enhanced Navigation State
  const [quickFilter, setQuickFilter] = useState<'all' | 'my-posts' | 'tipped-posts' | 'governance'>('all');
  const [activityIndicators, setActivityIndicators] = useState({
    notifications: 3,
    transactions: 1,
    governance: 2,
    community: 5
  });
  
  // Web3 Mobile State (preserve existing)
  const [walletConnected, setWalletConnected] = useState(false);
  const [userBalance, setUserBalance] = useState(1250);
  const [stakingRewards, setStakingRewards] = useState(45);
  const [governanceNotifications, setGovernanceNotifications] = useState(3);

  // Load communities and enhanced data
  useEffect(() => {
    const loadEnhancedData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load communities (existing functionality)
        const communitiesData = await CommunityService.getAllCommunities({
          isPublic: true,
          limit: 50
        });
        setCommunities(communitiesData);
        
        // Load enhanced data (mock for now - replace with real APIs)
        // TODO: Replace with real API calls when backend is ready
        
      } catch (err) {
        console.error('Error loading enhanced communities data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setLoading(false);
      }
    };

    loadEnhancedData();
  }, []);

  // Enhanced Handlers
  const handleEnhancedSearch = (query: string, filters: string[]) => {
    setSearchQuery(query);
    setSearchFilters({ ...searchFilters, type: filters[0] || 'all' });
    // TODO: Implement enhanced search logic
  };

  const handleSearchSuggestionClick = (suggestion: any) => {
    console.log('Search suggestion clicked:', suggestion);
    // Navigate to suggestion result
  };

  const handleFeedSortingChange = (sorting: typeof feedSorting) => {
    setFeedSorting(sorting);
    if (isMobile) triggerHapticFeedback('light');
  };

  const handleFeedFiltersChange = (filters: any) => {
    setFeedFilters({ ...feedFilters, ...filters });
  };

  const handleQuickFilterChange = (filter: typeof quickFilter) => {
    setQuickFilter(filter);
    if (isMobile) triggerHapticFeedback('medium');
  };

  const handleJoinCommunity = async (communityId: string) => {
    try {
      if (joinedCommunities.includes(communityId)) {
        setJoinedCommunities(prev => prev.filter(id => id !== communityId));
      } else {
        setJoinedCommunities(prev => [...prev, communityId]);
      }
      if (isMobile) triggerHapticFeedback('success');
    } catch (err) {
      console.error('Error joining/leaving community:', err);
    }
  };

  // Mobile Enhanced Experience
  if (isMobile) {
    return (
      <ErrorBoundary>
        <VisualPolishIntegration>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Head>
              <title>Communities - LinkDAO Enhanced</title>
              <meta name="description" content="Discover and join decentralized communities with enhanced features" />
            </Head>

            {/* Enhanced Mobile Header with Search & Notifications */}
            <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Communities</h1>
                  <RealTimeNotificationSystem 
                    userId="user123"
                    token="token123"
                    communityIds={joinedCommunities}
                    onNotificationClick={(notification) => {
                      console.log('Notification clicked:', notification);
                    }}
                    className="w-8 h-8"
                  />
                </div>
                
                <EnhancedSearchInterface
                  onSearch={handleEnhancedSearch}
                  onSuggestionClick={handleSearchSuggestionClick}
                  placeholder="Search communities, posts, users..."
                  className="w-full"
                  autoFocus={false}
                />
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

            {/* Enhanced Mobile Feed */}
            <div className="px-4 pb-24">
              <AdvancedFeedSystem
                posts={posts}
                onFilterChange={handleFeedFiltersChange}
                onPostsUpdate={setPosts}
                showAdvancedMetrics={true}
                className="space-y-4"
              />
            </div>

            {/* Mobile Bottom Navigation removed as per mobile tab bar removal task */}
          </div>
        </VisualPolishIntegration>
      </ErrorBoundary>
    );
  }

  // Desktop Enhanced Experience
  return (
    <ErrorBoundary>
      <VisualPolishIntegration>
        <Layout title="Communities - LinkDAO Enhanced" fullWidth={true}>
          <Head>
            <meta name="description" content="Discover and join decentralized communities with enhanced features" />
          </Head>

          {/* Enhanced Header with Search & Notifications */}
          <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Communities</h1>
                
                <div className="flex items-center space-x-4">
                  <EnhancedSearchInterface
                    onSearch={handleEnhancedSearch}
                    onSuggestionClick={handleSearchSuggestionClick}
                    placeholder="Search communities, posts, users..."
                    className="w-96"
                    showFilters={true}
                    autoFocus={false}
                  />
                  
                  <RealTimeNotificationSystem 
                    userId="user123"
                    token="token123"
                    communityIds={joinedCommunities}
                    onNotificationClick={(notification) => {
                      console.log('Notification clicked:', notification);
                    }}
                    className="w-80 max-h-96"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Three-Column Layout */}
          <div className="grid grid-cols-12 gap-6 w-full px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
            
            {/* Enhanced Left Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <AdvancedNavigationSidebar />
              </div>
            </div>

            {/* Enhanced Center Feed */}
            <div className="col-span-12 lg:col-span-6">
              <AdvancedFeedSystem
                posts={posts}
                onFilterChange={handleFeedFiltersChange}
                onPostsUpdate={setPosts}
                showAdvancedMetrics={true}
                className="space-y-6"
              />
            </div>

            {/* Enhanced Right Sidebar */}
            <div className="col-span-12 lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <SmartRightSidebar
                  context="community"
                  className="space-y-6"
                />
                
                {/* Trending Sidebar */}
                <TrendingSidebar />
              </div>
            </div>
          </div>

          {/* User Feedback System - TODO: Add when component is available */}
        </Layout>
      </VisualPolishIntegration>
    </ErrorBoundary>
  );
};

export default EnhancedCommunitiesPage;