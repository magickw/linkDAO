import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { CommunityCreationModal, CommunityDiscovery } from '@/components/CommunityManagement';
import { 
  QuickFilterPanel, 
  CommunityIconList, 
  EnhancedUserCard, 
  NavigationBreadcrumbs, 
  ActivityIndicators 
} from '@/components/Navigation';
import { GlassPanel } from '@/design-system';
import { useEnhancedNavigation } from '@/hooks/useEnhancedNavigation';
import TrendingContentWidget from '@/components/SmartRightSidebar/TrendingContentWidget';
import type { Community as CommunityModel } from '@/models/Community';

// Local sidebar community view model (separate from domain model)
interface SidebarCommunity {
  id: string;
  name: string;
  displayName: string;
  memberCount: number;
  avatar?: string;
  isJoined: boolean;
  unreadCount?: number;
}

import { CommunityService } from '../services/communityService';
import { CommunityMembershipService } from '../services/communityMembershipService';

interface NavigationSidebarProps {
  className?: string;
}

export default function NavigationSidebar({ className = '' }: NavigationSidebarProps) {
  const { address } = useAccount();
const [communities, setCommunities] = useState<SidebarCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useProfile(address);
  const { getCommunityUnreadCount } = useNotifications();
  // Load user's communities on component mount
  useEffect(() => {
    const loadUserCommunities = async () => {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get user's memberships
        const rawMemberships = await CommunityMembershipService.getUserMemberships(address, {
          isActive: true,
          limit: 20
        });
        
        // Defensive: ensure array
        const memberships = Array.isArray(rawMemberships) ? rawMemberships : [];
        const roleByCommunityId = new Map(memberships.map(m => [m.communityId, m.role]));
        
        // Get community details for each membership
        const communityPromises = memberships.map(membership => 
          CommunityService.getCommunityById(membership.communityId)
        );
        
        const communityResults = await Promise.allSettled(communityPromises);
        const validCommunities = (communityResults as any[])
          .filter((r: any) => r.status === 'fulfilled' && r.value)
          .map((r: any) => r.value) as CommunityModel[];
        
        // Transform to expected format with membership info
const communitiesWithMembership = validCommunities.map((community) => ({
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          memberCount: community.memberCount,
          avatar: community.avatar,
          isJoined: true,
          unreadCount: 0, // Would be calculated from notifications
          // keep role info out of the view model for now
        }));
        
        setCommunities(communitiesWithMembership);
      } catch (err) {
        console.error('Error loading user communities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load communities');
      } finally {
        setLoading(false);
      }
    };

    loadUserCommunities();
  }, [address]);

  const { 
    navigationState, 
    navigateToFeed,
    navigateToCommunity,
    toggleSidebar 
  } = useNavigation();

  // Enhanced navigation hook
  const {
    quickFilters,
    handleFilterChange,
    communities: enhancedCommunities,
    showAllCommunities,
    toggleShowAllCommunities,
    handleCommunitySelect,
    handleCommunityToggle,
    enhancedUser,
    breadcrumbs,
    activityIndicators,
    handleActivityIndicatorClick,
    isLoading
  } = useEnhancedNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  // Handle community selection with navigation context
  const handleCommunitySelectWithContext = (communityId: string) => {
    handleCommunitySelect(communityId);
    navigateToCommunity(communityId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`} data-tour="navigation">
      {/* Enhanced User Profile Section */}
      <div className="px-4 pt-4">
        <GlassPanel variant="primary" padding={navigationState.sidebarCollapsed ? '0.5rem' : '0.75rem'} className="w-full">
          {enhancedUser ? (
            <EnhancedUserCard
              user={enhancedUser as any}
              onClick={() => {/* Handle profile click */}}
            />
          ) : (
            /* Fallback to original profile display */
            !navigationState.sidebarCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {/* XP Progress Ring */}
                    <svg className="absolute -inset-1 w-12 h-12" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="22"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="2"
                        strokeDasharray={`${(68 / 100) * 138.23} 138.23`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                        transform="rotate(-90 24 24)"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" className="text-primary-500" stopColor="currentColor" />
                          <stop offset="100%" className="text-secondary-500" stopColor="currentColor" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                      {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {(profile as any)?.handle || (profile as any)?.ens || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                      </p>
                      {/* Badges */}
                      <span className="text-sm" title="Builder Badge">🏆</span>
                      <span className="text-sm" title="Active Voter">🗳️</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        0.00 ETH
                      </p>
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Lvl 5</span>
                    </div>
                  </div>
                </div>
                {/* XP Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>XP Progress</span>
                    <span>680 / 1000</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                      style={{ width: '68%' }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="relative">
                  {/* XP Progress Ring for collapsed state */}
                  <svg className="absolute -inset-1 w-10 h-10" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="url(#gradient-collapsed)"
                      strokeWidth="2"
                      strokeDasharray={`${(68 / 100) * 113} 113`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                      transform="rotate(-90 20 20)"
                    />
                    <defs>
                      <linearGradient id="gradient-collapsed" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" className="text-primary-500" stopColor="currentColor" />
                        <stop offset="100%" className="text-secondary-500" stopColor="currentColor" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                </div>
              </div>
            )
          )}
        </GlassPanel>
      </div>

      {/* Navigation Breadcrumbs */}
      {!navigationState.sidebarCollapsed && breadcrumbs.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} />
        </div>
      )}

      {/* Activity Indicators */}
      {!navigationState.sidebarCollapsed && activityIndicators.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Activity
            </span>
            <ActivityIndicators />
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {!navigationState.sidebarCollapsed ? (
            <>
              {/* Quick Filters Panel */}
              <GlassPanel variant="secondary" padding={'0.5rem'} className="mb-3">
                <QuickFilterPanel 
                  activeFilters={quickFilters.filter(f => f.active).map(f => f.id)}
                  onFilterChange={(filters) => {
                    quickFilters.forEach(filter => {
                      if (filters.includes(filter.id) !== filter.active) {
                        handleFilterChange(filter.id);
                      }
                    });
                  }}
                  className="space-y-1"
                />
              </GlassPanel>


              {/* Card: Navigation */}
              <GlassPanel variant="secondary" padding={'0.5rem'}>
                {/* Navigation Header */}
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  Navigation
                </div>

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
                <Link
                  href="/messaging"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-primary-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-blue-900/30 dark:hover:to-primary-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm relative"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Messages</span>
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-bold animate-pulse">3</span>
                </Link>

                {/* Governance */}
                <Link
                  href="/governance"
                  className="group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gradient-to-r dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm relative"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span>Governance</span>
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-white text-xs font-bold">2</span>
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

                {/* Enhanced Communities Section */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full shadow-sm border border-white/20 dark:border-white/10 hover:from-primary-600 hover:to-secondary-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary-400/50 transition-all"
                      title="Create Community"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Community</span>
                    </button>
                  </div>
                  
                  <CommunityIconList
                    communities={enhancedCommunities as any}
                    onCommunitySelect={handleCommunitySelectWithContext}
                  />

                  {/* Create Post action moved up from footer to reduce whitespace */}
                  <div className="mt-4">
                    <button className="w-full flex items-center justify-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Post
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </>
          ) : (
            /* Collapsed Navigation */
            <div className="space-y-2">

              <Link
                href="/dao"
                className="block w-full p-2 rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700"
                title="Communities"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </Link>
              
              <Link
                href="/messaging"
                className="block w-full p-2 rounded-lg transition-colors text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 relative"
                title="Messages"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              </Link>

              {/* Collapsed joined communities */}
              {enhancedCommunities.filter((c: any) => c.isJoined).slice(0, 3).map((community: any) => (
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
          )}
        </nav>
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