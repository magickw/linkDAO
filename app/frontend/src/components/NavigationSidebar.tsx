import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { CommunityCreationModal, CommunityDiscovery } from '@/components/CommunityManagement';
import {
  CommunityIconList,
  EnhancedUserCard,
  NavigationBreadcrumbs,
  ActivityIndicators
} from '@/components/Navigation';
import { useEnhancedNavigation } from '@/hooks/useEnhancedNavigation';
import TrendingContentWidget from '@/components/SmartRightSidebar/TrendingContentWidget';
import { AICommunityRecommendations } from '@/components/Community'; // Add this import
import type { Community as CommunityModel } from '@/models/Community';
import type { CommunityMembership, CommunityRole } from '@/models/CommunityMembership';
import { useQuery } from '@tanstack/react-query';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useWalletData } from '@/hooks/useWalletData';
import { QuickAction } from '@/types/wallet';
import { SearchService } from '@/services/searchService';

// Local sidebar community view model (separate from domain model)
interface SidebarCommunity {
  id: string;
  name: string;
  displayName: string;
  memberCount: number;
  avatar?: string;
  isJoined: boolean;
  unreadCount?: number;
  icon?: string;
  growthMetrics?: {
    trendingScore: number;
    memberGrowthPercentage: number;
  };
}

// Add AI recommendation interface
interface AIRecommendation extends SidebarCommunity {
  reason?: string;
  confidence?: number;
}

import { CommunityService } from '../services/communityService';
import { CommunityMembershipService } from '../services/communityMembershipService';

interface NavigationSidebarProps {
  className?: string;
}

export default function NavigationSidebar({ className = '' }: NavigationSidebarProps) {
  const { address } = useAccount();
  const { isMobile } = useMobileOptimization();
  const { profile } = useProfile(address);
  const { 
    walletData,
    isLoading: isWalletLoading
  } = useWalletData({
    autoRefresh: true,
    refreshInterval: 300000 // Refresh every 5 minutes
  });
  const { userPreferences, updateUserPreferences, toggleFavoriteCommunity, setSidebarCollapsed } = useNavigation(); // Add user preferences and setSidebarCollapsed
  
  // Replace direct service calls with React Query
  const { 
    data: communities = [], 
    isLoading: isCommunitiesLoading, 
    error 
  } = useQuery({
    queryKey: ['userCommunities', address],
    queryFn: async () => {
      if (!address) return [];
      
      try {
        // Get user's memberships with fallback for network errors
        let rawMemberships: CommunityMembership[] = [];
        try {
          rawMemberships = await CommunityMembershipService.getUserMemberships(address, {
            isActive: true,
            limit: 20
          });
        } catch (err) {
          // Handle network errors (503, Failed to fetch, ECONNREFUSED, etc.)
          console.warn('Backend service unavailable, using empty memberships:', err);
          // Continue with empty memberships instead of crashing
          rawMemberships = [];
        }
        
        // Defensive: ensure array
        const memberships: CommunityMembership[] = Array.isArray(rawMemberships) ? rawMemberships : [];
        const roleByCommunityId = new Map<string, CommunityRole>(memberships.map(m => [m.communityId, m.role]));
        
        // Get community details for each membership
        const communityPromises = memberships.map(membership => 
          CommunityService.getCommunityById(membership.communityId)
        );
        
        const communityResults = await Promise.allSettled(communityPromises);
        const validCommunities = (communityResults as any[])
          .filter((r: any) => r.status === 'fulfilled' && r.value)
          .map((r: any) => r.value) as CommunityModel[];
        
        // Transform to expected format with membership info
        return validCommunities.map((community) => ({
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          memberCount: community.memberCount,
          avatar: community.avatar,
          isJoined: true,
          unreadCount: 0, // Would be calculated from notifications
          // keep role info out of the view model for now
        }));
      } catch (err) {
        console.error('Error loading user communities:', err);
        // Return empty array on error to prevent UI crashes
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    enabled: !!address, // Only run query when address is available
  });

  // const { getCommunityUnreadCount } = useNotifications();
  
  const { 
    navigationState, 
    navigateToFeed,
    navigateToCommunity,
    toggleSidebar 
  } = useNavigation();

  // Enhanced navigation hook
  const {
    communities: enhancedCommunities,
    handleCommunitySelect,
    enhancedUser,
    breadcrumbs,
    activityIndicators,
    handleActivityIndicatorClick
  } = useEnhancedNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  // Add state for trending communities
  const [trendingCommunities, setTrendingCommunities] = useState<SidebarCommunity[]>([]);

  // Add state for AI recommendations
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingAiRecommendations, setLoadingAiRecommendations] = useState(false);
  
  // Fetch AI-powered community recommendations
  const fetchAIRecommendations = useCallback(async () => {
    if (!address || communities.length === 0) return;
    
    setLoadingAiRecommendations(true);
    try {
      const response = await fetch('/api/admin/ai/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'community_recommendations',
          context: {
            userId: address,
            joinedCommunities: communities.map(c => c.id),
            interests: [], // Would be populated from user profile
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Transform AI recommendations to SidebarCommunity format
        const recommendations = data.data?.insights?.recommendedCommunities || [];
        const aiRecs = recommendations.map((rec: any) => ({
          id: rec.id,
          name: rec.name,
          displayName: rec.displayName,
          memberCount: rec.memberCount,
          avatar: rec.avatar,
          icon: rec.icon,
          isJoined: communities.some(c => c.id === rec.id),
          reason: rec.reason,
          confidence: rec.confidence,
          growthMetrics: {
            trendingScore: rec.trendingScore || 0,
            memberGrowthPercentage: rec.growthRate || 0
          }
        }));
        setAiRecommendations(aiRecs);
      }
    } catch (error) {
      console.error('Failed to fetch AI recommendations:', error);
    } finally {
      setLoadingAiRecommendations(false);
    }
  }, [address, communities]);

  // Fetch trending communities
  useEffect(() => {
    const fetchTrendingCommunities = async () => {
      try {
        const trendingData = await SearchService.getTrendingContent('day', 5);
        // Transform trending communities to SidebarCommunity format
        const sidebarTrending = trendingData.communities.map((community: any) => ({
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          memberCount: community.memberCount,
          avatar: community.avatar,
          icon: community.icon,
          isJoined: communities.some((c: any) => c.id === community.id),
          growthMetrics: {
            trendingScore: Math.floor(Math.random() * 100), // Mock data for now
            memberGrowthPercentage: Math.floor(Math.random() * 20) // Mock data for now
          }
        }));
        setTrendingCommunities(sidebarTrending);
      } catch (error) {
        console.error('Failed to fetch trending communities:', error);
        setTrendingCommunities([]);
      }
    };

    if (communities.length > 0) {
      fetchTrendingCommunities();
      fetchAIRecommendations(); // Also fetch AI recommendations
    }
  }, [communities, fetchAIRecommendations]);

  // Handle community selection with navigation context
  const handleCommunitySelectWithContext = (communityId: string) => {
    handleCommunitySelect(communityId);
    navigateToCommunity(communityId);
    // Close sidebar on mobile after selection
    if (isMobile) {
      toggleSidebar();
    }
  };

  // Use user preferences for sidebar state
  useEffect(() => {
    if (userPreferences.sidebarCollapsed !== navigationState.sidebarCollapsed) {
      setSidebarCollapsed(userPreferences.sidebarCollapsed);
    }
  }, [userPreferences.sidebarCollapsed, navigationState.sidebarCollapsed, setSidebarCollapsed, isMobile]);

  // Handle quick actions
  const handleQuickAction = async (action: QuickAction) => {
    try {
      // Handle different quick actions
      switch (action.id) {
        case 'send':
          // In the navigation sidebar, we might want to redirect to the full wallet page
          window.location.href = '/wallet';
          break;
        case 'receive':
          window.location.href = '/wallet';
          break;
        case 'swap':
          window.location.href = '/wallet';
          break;
        case 'stake':
          window.location.href = '/wallet';
          break;
        default:
          await action.action();
      }
    } catch (error) {
      console.error('Quick action failed:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 overflow-y-auto ${className}`} data-tour="navigation">
      {/* Navigation Breadcrumbs */}
      {!navigationState.sidebarCollapsed && breadcrumbs.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} />
        </div>
      )}

      {/* All cards at the same level with consistent spacing - no padding on container */}
      <div className={!navigationState.sidebarCollapsed ? 'space-y-4' : 'space-y-2'}>
        {!navigationState.sidebarCollapsed ? (
          <>
            {/* Enhanced User Profile Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4">
                {enhancedUser ? (
                  <EnhancedUserCard
                    user={enhancedUser}
                    address={address}
                    profile={enhancedUser}
                    onClick={() => {/* Handle profile click */}}
                  />
                ) : address ? (
                  /* Display connected wallet profile */
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {/* Avatar with gradient background */}
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                          {(profile as any)?.handle
                            ? (profile as any).handle.charAt(0).toUpperCase()
                            : (profile as any)?.ens
                            ? (profile as any).ens.charAt(0).toUpperCase()
                            : address.slice(2, 4).toUpperCase()}
                        </div>
                        {/* Online status indicator */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Handle or ENS name */}
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {(profile as any)?.handle || (profile as any)?.ens || `User ${address.slice(2, 6)}`}
                          </p>
                          {(profile as any)?.verified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {/* Wallet address */}
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                            {address.slice(0, 6)}...{address.slice(-4)}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(address);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Copy address"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reputation & Stats */}
                    {(profile as any)?.reputationScore && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Reputation</span>
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {(profile as any).reputationScore}
                            </span>
                            {(profile as any)?.reputationTier && (
                              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-medium">
                                {(profile as any).reputationTier}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Reputation progress bar */}
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(((profile as any).reputationScore % 1000) / 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Not connected */
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Connect your wallet
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Activity
                </div>
                {activityIndicators.length > 0 ? (
                  <div className="space-y-2">
                    {activityIndicators.slice(0, 4).map((indicator) => (
                      <button
                        key={indicator.id}
                        onClick={() => handleActivityIndicatorClick(indicator)}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            indicator.type === 'notification' ? 'bg-blue-500' :
                            indicator.type === 'transaction' ? 'bg-green-500' :
                            indicator.type === 'community' ? 'bg-purple-500' :
                            'bg-orange-500'
                          }`}></div>
                          <span className="text-sm text-gray-900 dark:text-gray-100 font-medium capitalize">
                            {indicator.type === 'notification' ? 'Notifications' :
                             indicator.type === 'transaction' ? 'Transactions' :
                             indicator.type === 'community' ? 'Community' :
                             indicator.type === 'governance' ? 'Governance' :
                             indicator.type}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {indicator.count}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              {/* Navigation Header */}
              <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Navigation
                </div>
              </div>

              {/* Navigation Items */}
              <div className="p-2 space-y-1">
                {/* Search */}
                <Link
                  href="/search"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search & Discovery</span>
                </Link>

                {/* Communities */}
                <button
                  onClick={() => setShowDiscoveryModal(true)}
                  className="group w-full flex items-center justify-start gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 text-left hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-left">Discover Communities</span>
                </button>
                
                {/* Wallet-to-Wallet Messaging */}
                {/* <Link
                  href="/messaging"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-primary-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-blue-900/30 dark:hover:to-primary-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm relative"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Messages</span>
                  {/* Notification count will be loaded from real data */}
                {/* </Link> */}

                {/* Governance */}
                <Link
                  href="/governance"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm relative"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>Governance</span>
                  {/* Governance notification count will be loaded from real data */}
                </Link>

                {/* Marketplace */}
                <Link
                  href="/marketplace"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Marketplace</span>
                </Link>
              </div>
            </div>

            {/* Enhanced Communities Section Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  {/* User Preferences Controls */}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => updateUserPreferences({ sidebarCollapsed: !userPreferences.sidebarCollapsed })}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={userPreferences.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={userPreferences.sidebarCollapsed ? "M4 6h16M4 12h16m-7 6h7" : "M4 6h16M4 12h16M4 18h16"} />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <CommunityIconList
                  communities={enhancedCommunities as any}
                  onCommunitySelect={handleCommunitySelectWithContext}
                  favoriteCommunities={userPreferences.favoriteCommunities}
                  onToggleFavorite={toggleFavoriteCommunity}
                />

                {/* AI-Powered Community Recommendations */}
                <AICommunityRecommendations
                  joinedCommunities={communities.map(c => c.id)}
                  allCommunities={communities}
                  onJoinCommunity={handleCommunitySelectWithContext}
                  className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                />

                {/* Trending Communities Section */}
                {trendingCommunities.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Trending Communities
                      </h3>
                      <button 
                        onClick={() => setShowDiscoveryModal(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {trendingCommunities.slice(0, 3).map((community, index) => (
                        <div
                          key={community.id}
                          onClick={() => handleCommunitySelectWithContext(community.id)}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold">
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {community.icon} {community.displayName}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{community.memberCount.toLocaleString()} members</span>
                              {community.growthMetrics && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center text-orange-500">
                                    🔥 {Math.round(community.growthMetrics.trendingScore)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Post action removed per user request */}
              </div>
            </div>
          </>
        ) : (
          /* Collapsed Navigation */
          <>
            {/* Sidebar Toggle Button */}
            <div className="flex justify-end p-2">
                <button
                    onClick={() => updateUserPreferences({ sidebarCollapsed: !userPreferences.sidebarCollapsed })}
                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={userPreferences.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={userPreferences.sidebarCollapsed ? "M4 6h16M4 12h16m-7 6h7" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </button>
            </div>
            {/* Collapsed User Profile Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
              <div className="p-3 flex justify-center">
                {address ? (
                  <div className="relative">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg">
                      {(profile as any)?.handle
                        ? (profile as any).handle.charAt(0).toUpperCase()
                        : (profile as any)?.ens
                        ? (profile as any).ens.charAt(0).toUpperCase()
                        : address.slice(2, 4).toUpperCase()}
                    </div>
                    {/* Online status indicator */}
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsed Navigation Items */}
            <div className="space-y-2">
            <Link
              href="/communities"
              className="block w-full p-2 rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
              title="Communities"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
            
            {/* <Link
              href="/messaging"
              className="block w-full p-2 rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 relative"
              title="Messages"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {/* Message notification indicator will be loaded from real data */}
            {/* </Link> */}

            {/* Collapsed joined communities with favorites */}
            {enhancedCommunities.filter((c: any) => c.isJoined).slice(0, 5).map((community: any) => (
              <button
                key={community.id}
                onClick={() => handleCommunitySelectWithContext(community.id)}
                className={`w-full p-2 rounded-lg transition-colors relative ${
                  navigationState.activeCommunity === community.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
                title={community.displayName}
              >
                <span className="text-lg">{community.icon || community.avatar}</span>
                {community.unreadCount && community.unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                )}
                {userPreferences.favoriteCommunities.includes(community.id) && (
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                )}
              </button>
            ))}
            
            {/* Activity Indicators in Collapsed Mode */}
            {activityIndicators.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col space-y-1">
                  {activityIndicators.slice(0, 2).map((indicator) => (
                    <button
                      key={indicator.id}
                      onClick={() => handleActivityIndicatorClick(indicator)}
                      className="w-full p-2 rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 relative"
                      title={`${indicator.type} - ${indicator.count} items`}
                    >
                      <span className="text-lg">
                        {indicator.type === 'notification' && '🔔'}
                        {indicator.type === 'transaction' && '💰'}
                        {indicator.type === 'community' && '👥'}
                        {indicator.type === 'governance' && '🗳️'}
                      </span>
                      {indicator.count > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </>
        )}
      </div>


      {/* Community Creation Modal */}
      <CommunityCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(community) => {
          // This will be handled by the enhanced navigation hook
          // For now, we can trigger a refresh or update
          console.log('Community created:', community);
        }}
      />

      {/* Community Discovery Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Discover Communities
              </h2>
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <CommunityDiscovery
                onCommunitySelect={(community) => {
                  handleCommunitySelect(community.id);
                  setShowDiscoveryModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}