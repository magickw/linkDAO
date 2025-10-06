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
import { useEnhancedNavigation } from '@/hooks/useEnhancedNavigation';

// Mock community data - will be replaced with real data in future tasks
interface Community {
  id: string;
  name: string;
  displayName: string;
  memberCount: number;
  avatar?: string;
  isJoined: boolean;
  unreadCount?: number;
}

// Mock communities data
const mockCommunities: Community[] = [
  {
    id: 'ethereum-builders',
    name: 'ethereum-builders',
    displayName: 'Ethereum Builders',
    memberCount: 1240,
    avatar: '🔷',
    isJoined: true,
    unreadCount: 3
  },
  {
    id: 'defi-traders',
    name: 'defi-traders', 
    displayName: 'DeFi Traders',
    memberCount: 890,
    avatar: '💰',
    isJoined: true,
    unreadCount: 0
  },
  {
    id: 'nft-collectors',
    name: 'nft-collectors',
    displayName: 'NFT Collectors', 
    memberCount: 2100,
    avatar: '🎨',
    isJoined: true,
    unreadCount: 1
  },
  {
    id: 'dao-governance',
    name: 'dao-governance',
    displayName: 'DAO Governance',
    memberCount: 567,
    avatar: '🏛️',
    isJoined: false,
    unreadCount: 0
  }
];

interface NavigationSidebarProps {
  className?: string;
}

export default function NavigationSidebar({ className = '' }: NavigationSidebarProps) {
  const { address } = useAccount();

  const { data: profile } = useProfile(address);
  const { getCommunityUnreadCount } = useNotifications();
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
    communities,
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
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {(profile as any)?.handle || (profile as any)?.ens || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    0.00 ETH
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
              </div>
            </div>
          )
        )}
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
              <QuickFilterPanel 
                activeFilters={quickFilters.filter(f => f.active).map(f => f.id)}
                onFilterChange={(filters) => {
                  quickFilters.forEach(filter => {
                    if (filters.includes(filter.id) !== filter.active) {
                      handleFilterChange(filter.id);
                    }
                  });
                }}
                className="mb-6"
              />

              {/* Navigation Header */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Navigation
              </div>

              {/* Search */}
              <Link
                href="/search"
                className="flex items-center px-3 py-3 md:py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors touch-target"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search & Discovery
              </Link>

              {/* Communities */}
              <button
                onClick={() => setShowDiscoveryModal(true)}
                className="w-full flex items-center px-3 py-3 md:py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors touch-target"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Discover Communities
              </button>
              
              {/* Wallet-to-Wallet Messaging */}
              <Link
                href="/messaging"
                className="flex items-center px-3 py-3 md:py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors touch-target"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Messages
                <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              </Link>

              {/* Governance */}
              <Link
                href="/governance"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Governance
              </Link>

              {/* Marketplace */}
              <Link
                href="/marketplace"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Marketplace
              </Link>

              {/* Enhanced Communities Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
                    title="Create Community"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create
                  </button>
                </div>
                
                <CommunityIconList
                  communities={communities as any}
                  onCommunitySelect={handleCommunitySelectWithContext}
                />
              </div>
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
              {communities.filter(c => c.isJoined).slice(0, 3).map((community) => (
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

      {/* Footer Actions */}
      {!navigationState.sidebarCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full flex items-center justify-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </button>
        </div>
      )}

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