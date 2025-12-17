import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { useNavigation } from '@/context/NavigationContext';
import { CommunityService } from '../services/communityService';
import { Community } from '../models/Community';
import WalletSnapshotEmbed from './WalletSnapshotEmbed';
import DeFiChartEmbed from './DeFiChartEmbed';
import DAOGovernanceEmbed from './DAOGovernanceEmbed';
import { SmartRightSidebar } from './SmartRightSidebar';
import enhancedUserService, { SuggestedUser } from '../services/enhancedUserService';

interface TrendingDAO {
  id: string;
  name: string;
  members: number;
  treasuryValue: number;
}

// Import marketplace service - using dynamic import for now due to potential file issues
// import { marketplaceService, Auction } from '../services/marketplaceService';

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  minimumBid: number;
  currency: string;
  endTime: string;
  bidCount: number;
  seller: {
    id: string;
    displayName?: string;
    storeName?: string;
    rating: number;
    reputation: number;
    verified: boolean;
    daoApproved: boolean;
    walletAddress: string;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
  images: string[];
}

import { governanceService } from '../services/governanceService';
import { Proposal } from '../types/governance';

// Cache for component-level data
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  USERS: 5 * 60 * 1000, // 5 minutes
  COMMUNITIES: 10 * 60 * 1000, // 10 minutes
  GOVERNANCE: 2 * 60 * 1000, // 2 minutes
  AUCTIONS: 1 * 60 * 1000, // 1 minute
  DAOS: 15 * 60 * 1000, // 15 minutes
};

// Helper function to get cached data
function getCachedData<T>(key: string): T | null {
  const cached = dataCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > cached.ttl) {
    dataCache.delete(key);
    return null;
  }

  return cached.data as T;
}

// Helper function to set cached data
function setCachedData<T>(key: string, data: T, ttl: number): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

const DashboardRightSidebar = memo(() => {
  const { navigationState } = useNavigation();
  const { activeView, activeCommunity } = navigationState;
  
  // State for real user data
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // State for real governance data
  const [governanceProposals, setGovernanceProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  
  // State for real DAO data
  const [trendingDAOs, setTrendingDAOs] = useState<TrendingDAO[]>([]);
  const [loadingDAOs, setLoadingDAOs] = useState(false);

  // State for real marketplace data
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [loadingAuctions, setLoadingAuctions] = useState(false);

  // State for real community data
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null);

  // Error states for graceful degradation
  const [errors, setErrors] = useState<{
    users?: string;
    governance?: string;
    daos?: string;
    auctions?: string;
    communities?: string;
  }>({});

  // Memoized helper functions
  const getContextualSuggestionReason = useCallback((type: string): string => {
    switch (type) {
      case 'community-based':
        return 'Active in similar communities';
      case 'marketplace-based':
        return 'Similar trading interests';
      case 'governance-based':
        return 'Active in governance';
      default:
        return 'Trending user';
    }
  }, []);

  const getPersonalizedFilters = useCallback((type: string, communityId?: string) => {
    const baseFilters = {
      maxResults: 3,
      excludeFollowed: true,
    };

    switch (type) {
      case 'community-based':
        return {
          ...baseFilters,
          communityId,
          minReputationScore: 50,
        };
      case 'marketplace-based':
        return {
          ...baseFilters,
          minReputationScore: 100,
        };
      case 'governance-based':
        return {
          ...baseFilters,
          minReputationScore: 200,
        };
      default:
        return {
          ...baseFilters,
          minReputationScore: 100,
        };
    }
  }, []);

  // Helper function to sort proposals based on context
  const sortProposalsByContext = (proposals: Proposal[], type: string): Proposal[] => {
    switch (type) {
      case 'community-based':
        // Sort by community relevance and participation
        return proposals.sort((a, b) => (b.participationRate || 0) - (a.participationRate || 0));
      case 'governance-based':
        // Sort by voting activity and importance
        return proposals.sort((a, b) => {
          const aVotes = parseInt(a.forVotes) + parseInt(a.againstVotes);
          const bVotes = parseInt(b.forVotes) + parseInt(b.againstVotes);
          return bVotes - aVotes;
        });
      default:
        // Sort by recency and participation
        return proposals.sort((a, b) => {
          const aScore = (b.participationRate || 0) * 0.7 + (new Date(b.startTime).getTime() * 0.3);
          const bScore = (a.participationRate || 0) * 0.7 + (new Date(a.startTime).getTime() * 0.3);
          return aScore - bScore;
        });
    }
  };

  // Memoized contextual content calculation - MOVED TO FIX REFERENCE ERROR
  const contextualContent = useMemo(() => {
    const userId = getCurrentUserId();
    const isLoggedIn = !!userId;
    
    if (activeView === 'community' && currentCommunity) {
      return {
        showCommunityInfo: true,
        showRelatedCommunities: true,
        showCommunityGovernance: !!currentCommunity.governanceToken,
        showTrendingInCategory: currentCommunity.category,
        showPersonalizedContent: isLoggedIn,
        showUserSpecificActions: isLoggedIn,
        contextTitle: `${currentCommunity.displayName} Community`,
        recommendationType: 'community-based' as const,
        primaryActions: ['join', 'post', 'vote'] as const,
      };
    }
    
    // Marketplace view removed as it's not supported in NavigationContext
    
    // Governance view removed as it's not supported in NavigationContext
    
    // Default feed view
    return {
      showCommunityInfo: false,
      showRelatedCommunities: false,
      showCommunityGovernance: false,
      showTrendingInCategory: null,
      showPersonalizedContent: isLoggedIn,
      showUserSpecificActions: isLoggedIn,
      contextTitle: isLoggedIn ? 'Your Feed' : 'Discover',
      recommendationType: 'general' as const,
      primaryActions: isLoggedIn ? ['post', 'follow', 'tip'] as const : ['explore', 'connect'] as const,
    };
  }, [activeView, currentCommunity]);

  // Cached personalized user suggestions loading - UPDATED DEPENDENCIES
  const loadPersonalizedSuggestionsWithCache = useCallback(async () => {
    try {
      setLoadingSuggestions(true);
      setErrors(prev => ({ ...prev, users: undefined }));
      
      const userId = getCurrentUserId();
      
      if (!userId) {
        // Show contextual trending users for non-logged-in users
        const cacheKey = `trending-users-${contextualContent.recommendationType}`;
        let trending = getCachedData<SuggestedUser[]>(cacheKey);
        
        if (!trending) {
          const trendingUsers = await enhancedUserService.getTrendingUsers(3);
          trending = trendingUsers.map(user => ({
            id: user.id,
            handle: user.handle,
            ens: user.ens,
            avatarCid: user.avatarCid,
            followers: user.followers,
            reputationScore: user.reputationScore,
            mutualConnections: 0,
            reasonForSuggestion: getContextualSuggestionReason(contextualContent.recommendationType),
          }));
          setCachedData(cacheKey, trending, CACHE_TTL.USERS);
        }
        
        setSuggestedUsers(trending);
        return;
      }

      if (userId === currentUserId) {
        return; // Already loaded for this user
      }

      setCurrentUserId(userId);
      
      // Get personalized suggestions with caching
      const cacheKey = `suggestions-${userId}-${contextualContent.recommendationType}-${activeCommunity || 'none'}`;
      let suggestions = getCachedData<SuggestedUser[]>(cacheKey);
      
      if (!suggestions) {
        const suggestionFilters = getPersonalizedFilters(contextualContent.recommendationType, activeCommunity);
        suggestions = await enhancedUserService.getSuggestedUsers(userId, suggestionFilters);
        setCachedData(cacheKey, suggestions, CACHE_TTL.USERS);
      }
      
      setSuggestedUsers(suggestions);
    } catch (error) {
      console.error('Error loading personalized suggestions:', error);
      setErrors(prev => ({ ...prev, users: 'Failed to load user suggestions' }));
      setSuggestedUsers([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [currentUserId, activeCommunity, contextualContent, getContextualSuggestionReason, getPersonalizedFilters]);

  useEffect(() => {
    loadPersonalizedSuggestionsWithCache();
  }, [loadPersonalizedSuggestionsWithCache]);

  // Load contextual governance proposals
  useEffect(() => {
    const loadContextualGovernanceProposals = async () => {
      try {
        setLoadingProposals(true);
        setErrors(prev => ({ ...prev, governance: undefined }));
        
        let proposals: Proposal[] = [];
        const userId = getCurrentUserId();
        
        if (activeView === 'community' && activeCommunity) {
          // Load community-specific proposals
          proposals = await governanceService.getCommunityProposals(activeCommunity);
        } else if (activeView === 'community') {
          // In community view, show all active proposals
          proposals = await governanceService.getAllActiveProposals();
        } else if (userId && contextualContent.showPersonalizedContent) {
          // For logged-in users in feed view, show personalized governance content
          // This could include proposals from communities they're members of
          proposals = await governanceService.getAllActiveProposals();
          // TODO: Filter by user's community memberships when that data is available
        } else {
          // For non-logged-in users, show most popular/trending proposals
          proposals = await governanceService.getAllActiveProposals();
        }
        
        // Sort and limit based on context
        const sortedProposals = sortProposalsByContext(proposals, contextualContent.recommendationType);
        setGovernanceProposals(sortedProposals.slice(0, 3));
      } catch (error) {
        console.error('Error loading contextual governance proposals:', error);
        setErrors(prev => ({ ...prev, governance: 'Failed to load governance proposals' }));
        setGovernanceProposals([]);
      } finally {
        setLoadingProposals(false);
      }
    };

    loadContextualGovernanceProposals();
  }, [activeView, activeCommunity, contextualContent]);

  // Cached communities data loading
  const loadCommunitiesWithCache = useCallback(async () => {
    try {
      setLoadingCommunities(true);
      setErrors(prev => ({ ...prev, communities: undefined }));
      
      // Check cache for trending communities
      const cacheKey = 'trending-communities';
      let trendingCommunities = getCachedData<Community[]>(cacheKey);
      
      if (!trendingCommunities) {
        trendingCommunities = await CommunityService.getTrendingCommunities(10);
        setCachedData(cacheKey, trendingCommunities, CACHE_TTL.COMMUNITIES);
      }
      
      setCommunities(trendingCommunities);
      
      // Load current community if viewing one
      if (activeCommunity) {
        const communityCacheKey = `community-${activeCommunity}`;
        let community = getCachedData<Community>(communityCacheKey);
        
        if (!community) {
          community = await CommunityService.getCommunityById(activeCommunity);
          if (community) {
            setCachedData(communityCacheKey, community, CACHE_TTL.COMMUNITIES);
          }
        }
        
        setCurrentCommunity(community);
      } else {
        setCurrentCommunity(null);
      }
    } catch (error) {
      console.error('Error loading communities:', error);
      setErrors(prev => ({ ...prev, communities: 'Failed to load communities' }));
      setCommunities([]);
      setCurrentCommunity(null);
    } finally {
      setLoadingCommunities(false);
    }
  }, [activeCommunity]);

  useEffect(() => {
    loadCommunitiesWithCache();
  }, [loadCommunitiesWithCache]);

  // Load trending DAOs with treasury data
  useEffect(() => {
    const loadTrendingDAOs = async () => {
      try {
        setLoadingDAOs(true);
        setErrors(prev => ({ ...prev, daos: undefined }));
        
        // Get communities with governance tokens (DAOs)
        const allCommunities = await CommunityService.getAllCommunities({
          limit: 20
        });
        
        const daoCommunitiesWithTreasury = await Promise.all(
          allCommunities
            .filter(c => c.governanceToken) // Only DAOs with governance tokens
            .slice(0, 5)
            .map(async (community) => {
              try {
                const treasuryData = await governanceService.getDAOTreasuryData(community.id);
                return {
                  id: community.id,
                  name: community.displayName,
                  members: community.memberCount,
                  treasuryValue: treasuryData?.totalValue || 0
                };
              } catch (error) {
                // If treasury data fails, still include the DAO but with 0 treasury
                return {
                  id: community.id,
                  name: community.displayName,
                  members: community.memberCount,
                  treasuryValue: 0
                };
              }
            })
        );
        
        setTrendingDAOs(daoCommunitiesWithTreasury);
      } catch (error) {
        console.error('Error loading trending DAOs:', error);
        setErrors(prev => ({ ...prev, daos: 'Failed to load DAO data' }));
        setTrendingDAOs([]);
      } finally {
        setLoadingDAOs(false);
      }
    };

    loadTrendingDAOs();
  }, []);

  // Load active auctions from real marketplace service
  useEffect(() => {
    const loadActiveAuctions = async () => {
      try {
        setLoadingAuctions(true);
        setErrors(prev => ({ ...prev, auctions: undefined }));
        
        // TODO: Replace with real marketplace service when import is fixed
        // For now, simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock auctions data - this will be replaced with real service call
        const mockAuctions: Auction[] = [
          {
            id: 'auction_1',
            title: 'Premium NFT Collection',
            description: 'Rare digital artwork',
            currentBid: 2.5,
            minimumBid: 1.0,
            currency: 'ETH',
            endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            bidCount: 12,
            seller: {
              id: 'seller_1',
              displayName: 'CryptoArtist',
              rating: 4.8,
              reputation: 95,
              verified: true,
              daoApproved: true,
              walletAddress: '0x1234...5678'
            },
            trust: {
              verified: true,
              escrowProtected: true,
              onChainCertified: true,
              safetyScore: 98
            },
            images: ['https://placehold.co/300x200']
          }
        ];
        
        setActiveAuctions(mockAuctions);
      } catch (error) {
        console.error('Error loading active auctions:', error);
        setErrors(prev => ({ ...prev, auctions: 'Failed to load auctions' }));
        setActiveAuctions([]);
      } finally {
        setLoadingAuctions(false);
      }
    };

    loadActiveAuctions();
  }, []);

  // Helper function to get current user ID - this would come from auth context
  const getCurrentUserId = (): string | null => {
    // TODO: Replace with actual authentication context
    // For now, return null to show trending users
    return null;
  };

  // Handle following a user
  const handleFollowUser = async (targetUserId: string) => {
    const userId = getCurrentUserId();
    if (!userId) {
      // TODO: Show login modal or redirect to login
      console.log('User must be logged in to follow others');
      return;
    }

    try {
      const success = await enhancedUserService.followUser(userId, targetUserId);
      if (success) {
        // Remove the followed user from suggestions
        setSuggestedUsers(prev => prev.filter(user => user.id !== targetUserId));
        // TODO: Show success toast
        console.log('Successfully followed user');
      } else {
        // TODO: Show error toast
        console.log('Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      // TODO: Show error toast
    }
  };

  // Optimized retry function with cache invalidation
  const retryLoad = useCallback((type: 'users' | 'governance' | 'daos' | 'auctions' | 'communities') => {
    // Clear relevant cache entries
    switch (type) {
      case 'users':
        // Clear user-related cache
        const userId = getCurrentUserId();
        if (userId) {
          dataCache.delete(`suggestions-${userId}-${contextualContent.recommendationType}-${activeCommunity || 'none'}`);
        }
        dataCache.delete(`trending-users-${contextualContent.recommendationType}`);
        setCurrentUserId(null);
        break;
      case 'governance':
        // Clear governance cache
        dataCache.delete('governance-proposals');
        dataCache.delete(`community-proposals-${activeCommunity}`);
        setLoadingProposals(false);
        break;
      case 'daos':
        // Clear DAO cache
        dataCache.delete('trending-daos');
        setLoadingDAOs(false);
        break;
      case 'auctions':
        // Clear auction cache
        dataCache.delete('active-auctions');
        setLoadingAuctions(false);
        break;
      case 'communities':
        // Clear community cache
        dataCache.delete('trending-communities');
        if (activeCommunity) {
          dataCache.delete(`community-${activeCommunity}`);
        }
        loadCommunitiesWithCache();
        break;
    }
  }, [activeCommunity, loadCommunitiesWithCache, contextualContent]);

  // Prefetch data for likely next views
  const prefetchData = useCallback(async () => {
    try {
      // Prefetch trending communities if not in community view
      if (activeView !== 'community' && !getCachedData('trending-communities')) {
        CommunityService.getTrendingCommunities(10).then(communities => {
          setCachedData('trending-communities', communities, CACHE_TTL.COMMUNITIES);
        }).catch(() => {
          // Silently fail prefetch
        });
      }

      // Prefetch governance proposals if not in governance view
      if (activeView !== 'community' && !getCachedData('governance-proposals')) {
        governanceService.getAllActiveProposals().then(proposals => {
          setCachedData('governance-proposals', proposals, CACHE_TTL.GOVERNANCE);
        }).catch(() => {
          // Silently fail prefetch
        });
      }

      // Prefetch trending users for different contexts
      const userId = getCurrentUserId();
      if (!userId) {
        const contexts = ['general', 'community-based', 'marketplace-based'];
        contexts.forEach(context => {
          const cacheKey = `trending-users-${context}`;
          if (!getCachedData(cacheKey)) {
            enhancedUserService.getTrendingUsers(3).then(users => {
              const suggestions = users.map(user => ({
                id: user.id,
                handle: user.handle,
                ens: user.ens,
                avatarCid: user.avatarCid,
                followers: user.followers,
                reputationScore: user.reputationScore,
                mutualConnections: 0,
                reasonForSuggestion: getContextualSuggestionReason(context),
              }));
              setCachedData(cacheKey, suggestions, CACHE_TTL.USERS);
            }).catch(() => {
              // Silently fail prefetch
            });
          }
        });
      }
    } catch (error) {
      // Silently fail prefetch
      console.debug('Prefetch failed:', error);
    }
  }, [activeView, getContextualSuggestionReason]);

  // Trigger prefetch after initial load
  useEffect(() => {
    const prefetchTimer = setTimeout(prefetchData, 2000); // Prefetch after 2 seconds
    return () => clearTimeout(prefetchTimer);
  }, [prefetchData]);

  // Current community is loaded in useEffect above

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

  // Render widget based on adaptive configuration
  const renderWidget = (widgetType: string) => {
    switch (widgetType) {
      case 'community-info':
        return renderCommunityInfoWidget();
      case 'wallet':
        return renderWalletWidget();
      case 'suggested-users':
        return renderSuggestedUsersWidget();
      case 'active-auctions':
        return renderActiveAuctionsWidget();
      case 'governance':
        return renderGovernanceWidget();
      case 'related-communities':
        return renderRelatedCommunitiesWidget();
      case 'trending-content':
        return renderTrendingContentWidget();
      case 'defi-markets':
        return renderDeFiMarketsWidget();
      case 'trending-hashtags':
        return renderTrendingHashtagsWidget();
      default:
        return null;
    }
  };

  // Memoized adaptive widget configuration
  const activeWidgets = useMemo(() => {
    const widgets = [];
    
    // Always show wallet widget if user has connected wallet
    widgets.push('wallet');
    
    // Context-specific widgets
    if (contextualContent.showCommunityInfo) {
      widgets.push('community-info');
    }
    
    if (contextualContent.showCommunityGovernance) {
      widgets.push('governance');
    }
    
    if (contextualContent.showRelatedCommunities) {
      widgets.push('related-communities');
    }
    
    // Show user suggestions in feed view
    if (activeView === 'feed') {
      widgets.push('suggested-users');
    }
    
    // Show auctions in marketplace or general feed
    if (activeView === 'feed') {
      widgets.push('active-auctions');
    }
    
    // Always show trending content but adapt the type
    widgets.push('trending-content');
    
    // Show DeFi markets for general engagement
    widgets.push('defi-markets');
    
    // Show trending hashtags for content discovery
    widgets.push('trending-hashtags');
    
    return widgets;
  }, [activeView, contextualContent]);

  // Memoized widget rendering functions
  const renderCommunityInfoWidget = useCallback(() => {
    if (!contextualContent.showCommunityInfo || !currentCommunity) return null;

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Community Info
            </h3>
          </div>
          <div className="p-4">
            <div className="flex items-center mb-4">
              <img 
                src={currentCommunity.avatar} 
                alt={currentCommunity.displayName}
                className="w-12 h-12 rounded-lg"
              />
              <div className="ml-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{currentCommunity.displayName}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatNumber(currentCommunity.memberCount)} members</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{currentCommunity.description}</p>
            <div className="flex flex-wrap gap-2">
              {currentCommunity.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
    );
  }, [contextualContent.showCommunityInfo, currentCommunity, formatNumber]);

  const renderWalletWidget = useCallback(() => {
    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Wallet Overview
            </h3>
          </div>
          <div className="p-4">
            <WalletSnapshotEmbed 
              walletAddress="0x1234...5678" 
              className="mb-4"
            />
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                <div className="text-2xl mb-1">💸</div>
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
            </div>
          </div>
        </div>
    );
  }, []);

  const renderSuggestedUsersWidget = useCallback(() => {
    if (!contextualContent.showPersonalizedContent) return null;

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Suggested Users
          </h3>
        </div>
        <div className="p-4">
          {loadingSuggestions ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : errors.users ? (
            <div className="text-center py-4 text-sm text-red-500">
              <p>{errors.users}</p>
              <button 
                onClick={() => retryLoad('users')}
                className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs"
              >
                Retry
              </button>
            </div>
          ) : suggestedUsers.length > 0 ? (
            <div className="space-y-3">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img 
                        src={user.avatarCid ? `https://ipfs.io/ipfs/${user.avatarCid}` : '/default-avatar.png'} 
                        alt={user.handle}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {user.ens || user.handle}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user.reasonForSuggestion}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleFollowUser(user.id)}
                    className="text-xs bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-800/50 text-primary-800 dark:text-primary-200 px-3 py-1 rounded-full transition-colors"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No suggestions available
            </div>
          )}
          <Link 
            href="/discover" 
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Discover More →
          </Link>
        </div>
      </div>
    );
  }, [contextualContent.showPersonalizedContent, loadingSuggestions, errors.users, suggestedUsers, handleFollowUser, retryLoad]);

  const renderActiveAuctionsWidget = useCallback(() => {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            Active Auctions
          </h3>
        </div>
        <div className="p-4">
          {loadingAuctions ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : errors.auctions ? (
            <div className="text-center py-4 text-sm text-red-500">
              <p>{errors.auctions}</p>
              <button 
                onClick={() => retryLoad('auctions')}
                className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs"
              >
                Retry
              </button>
            </div>
          ) : activeAuctions.length > 0 ? (
            <div className="space-y-4">
              {activeAuctions.map((auction) => (
                <div key={auction.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="relative">
                    <img 
                      src={auction.images[0]} 
                      alt={auction.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      {formatTimeRemaining(new Date(auction.endTime))}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {auction.title}
                    </h4>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <div className="text-sm font-bold text-primary-600 dark:text-primary-400">
                          {auction.currentBid} {auction.currency}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {auction.bidCount} bids
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {auction.trust.verified && (
                          <span className="text-green-500" title="Verified">
                            ✓
                          </span>
                        )}
                        {auction.trust.escrowProtected && (
                          <span className="text-blue-500" title="Escrow Protected">
                            ⚖️
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No active auctions
            </div>
          )}
          <Link 
            href="/marketplace/auctions" 
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View All Auctions →
          </Link>
        </div>
      </div>
    );
  }, [loadingAuctions, errors.auctions, activeAuctions, formatTimeRemaining, retryLoad]);

  const renderGovernanceWidget = useCallback(() => {
    if (!contextualContent.showCommunityGovernance) return null;

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Governance
          </h3>
        </div>
        <div className="p-4">
          {loadingProposals ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : errors.governance ? (
            <div className="text-center py-4 text-sm text-red-500">
              <p>{errors.governance}</p>
              <button 
                onClick={() => retryLoad('governance')}
                className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs"
              >
                Retry
              </button>
            </div>
          ) : governanceProposals.length > 0 ? (
            <div className="space-y-3">
              {governanceProposals.slice(0, 3).map((proposal) => (
                <Link 
                  key={proposal.id}
                  href={`/governance/${proposal.id}`}
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                      {proposal.title}
                    </h4>
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 whitespace-nowrap">
                      {proposal.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
                    <span>
                      <span className="font-medium">{proposal.forVotes}</span> For
                    </span>
                    <span>
                      <span className="font-medium">{proposal.againstVotes}</span> Against
                    </span>
                    <span>
                      Ends {formatTimeRemaining(new Date(proposal.endTime))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No active proposals
            </div>
          )}
          <Link 
            href="/governance" 
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View All Proposals →
          </Link>
        </div>
      </div>
    );
  }, [contextualContent.showCommunityGovernance, loadingProposals, errors.governance, governanceProposals, formatTimeRemaining, retryLoad]);

  const renderRelatedCommunitiesWidget = useCallback(() => {
    if (!contextualContent.showRelatedCommunities || !currentCommunity) return null;

    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Related Communities
          </h3>
        </div>
        <div className="p-4">
          {loadingCommunities ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : errors.communities ? (
            <div className="text-center py-4 text-sm text-red-500">
              <p>{errors.communities}</p>
              <button 
                onClick={() => retryLoad('communities')}
                className="mt-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs"
              >
                Retry
              </button>
            </div>
          ) : communities.length > 0 ? (
            <div className="space-y-3">
              {communities
                .filter(c => c.id !== currentCommunity.id)
                .slice(0, 3)
                .map((community) => (
                  <Link 
                    key={community.id}
                    href={`/communities/${community.id}`}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <img 
                      src={community.avatar} 
                      alt={community.displayName}
                      className="w-10 h-10 rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {community.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatNumber(community.memberCount)} members
                      </div>
                    </div>
                    <button className="text-xs bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-800/50 text-primary-800 dark:text-primary-200 px-2 py-1 rounded-full transition-colors">
                      Join
                    </button>
                  </Link>
                ))
              }
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No related communities
            </div>
          )}
          <Link 
            href="/communities" 
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Explore All →
          </Link>
        </div>
      </div>
    );
  }, [contextualContent.showRelatedCommunities, currentCommunity, loadingCommunities, errors.communities, communities, formatNumber, retryLoad]);

  const renderTrendingContentWidget = useCallback(() => {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Trending Content
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer">
                <div className="text-xs font-bold text-gray-400 mt-1">{item}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-2">
                    Trending content item {item} - This is a sample trending content title that would be fetched from the API
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                    <span>Community Name</span>
                    <span>•</span>
                    <span>1.2k views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link 
            href="/trending" 
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            See More Trends →
          </Link>
        </div>
      </div>
    );
  }, []);

  const renderDeFiMarketsWidget = useCallback(() => {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              DeFi Markets
            </h3>
          </div>
          <div className="p-4">
              <DeFiChartEmbed 
                tokenSymbol="ETH" 
                tokenName="Ethereum"
                className="mb-4"
              />
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">📈</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Trade</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">🏦</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Lend</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">🔐</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Stake</span>
                </button>
                <button className="bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 rounded-lg p-3 text-center transition-colors">
                  <div className="text-2xl mb-1">📊</div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Analyze</span>
                </button>
              </div>
            </div>
      </div>
    );
  }, []);

  const renderTrendingHashtagsWidget = useCallback(() => {
    return (
      <div className="bg-white/80 dark:bg-gray-880/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <span className="mr-2 text-lg">#️⃣</span>
            Trending Now
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {[
              { tag: 'defi', count: 1240, growth: 15 },
              { tag: 'nft', count: 890, growth: 8 },
              { tag: 'web3', count: 2100, growth: 22 },
              { tag: 'dao', count: 567, growth: 12 },
              { tag: 'ethereum', count: 3400, growth: 5 }
            ].map((hashtag, index) => (
              <Link
                key={hashtag.tag}
                href={`/hashtags/${hashtag.tag}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-4">
                    {index + 1}
                  </span>
                  <span className="text-primary-600 dark:text-primary-400 font-medium group-hover:text-primary-700 dark:group-hover:text-primary-300">
                    #{hashtag.tag}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatNumber(hashtag.count)}</span>
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {hashtag.growth}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/search?tab=trending"
            className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            View All Trending →
          </Link>
        </div>
      </div>
    );
  }, [formatNumber]);

  return (
    <div className="space-y-6">
      {/* Enhanced Smart Right Sidebar */}
      <SmartRightSidebar 
        context={activeView === 'community' ? 'community' : 'feed'}
        communityId={activeCommunity || undefined}
      />

      {/* Contextual Header */}
      {contextualContent.contextTitle && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {contextualContent.contextTitle}
            </h2>
            {contextualContent.showUserSpecificActions && (
              <div className="mt-2 flex justify-center space-x-2">
                {contextualContent.primaryActions.map((action) => (
                  <button
                    key={action}
                    className="px-3 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors"
                  >
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adaptive Widgets */}
      {activeWidgets.map((widgetType) => (
        <div key={widgetType}>
          {renderWidget(widgetType)}
        </div>
      ))}
    </div>
  );
});

DashboardRightSidebar.displayName = 'DashboardRightSidebar';

export default DashboardRightSidebar;