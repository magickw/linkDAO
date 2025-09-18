import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useNavigation } from '@/context/NavigationContext';
import { useWeb3 } from '@/context/Web3Context';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { CommunityCreationModal, CommunityDiscovery } from '@/components/CommunityManagement';

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
  const { balance } = useWeb3();
  const { data: profile } = useProfile(address);
  const { getCommunityUnreadCount } = useNotifications();
  const { 
    navigationState, 
    navigateToFeed,
    navigateToCommunity,
    toggleSidebar 
  } = useNavigation();

  const [communities, setCommunities] = useState<Community[]>(mockCommunities);
  const [showAllCommunities, setShowAllCommunities] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);

  // Update community unread counts from notifications
  useEffect(() => {
    setCommunities(prev => prev.map(community => ({
      ...community,
      unreadCount: getCommunityUnreadCount(community.id)
    })));
  }, [getCommunityUnreadCount]);

  // Handle community join/leave
  const handleCommunityToggle = (communityId: string) => {
    setCommunities(prev => prev.map(community => 
      community.id === communityId 
        ? { ...community, isJoined: !community.isJoined }
        : community
    ));
  };

  // Handle community selection
  const handleCommunitySelect = (communityId: string) => {
    navigateToCommunity(communityId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  // Filter joined communities
  const joinedCommunities = communities.filter(c => c.isJoined);
  const availableCommunities = communities.filter(c => !c.isJoined);

  // Display limited communities or all based on state
  const displayedJoinedCommunities = showAllCommunities 
    ? joinedCommunities 
    : joinedCommunities.slice(0, 5);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`} data-tour="navigation">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {!navigationState.sidebarCollapsed ? (
          <div className="space-y-3">
            {/* User Avatar and Info */}
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
                  {balance} ETH
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex space-x-4 text-xs">
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">42</div>
                <div className="text-gray-500 dark:text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">128</div>
                <div className="text-gray-500 dark:text-gray-400">Following</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 dark:text-white">89</div>
                <div className="text-gray-500 dark:text-gray-400">Followers</div>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Profile */
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {(profile as any)?.handle ? (profile as any).handle.charAt(0).toUpperCase() : address?.slice(2, 4).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {!navigationState.sidebarCollapsed ? (
            <>
              {/* Navigation Header */}
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Navigation
              </div>

              {/* Feed */}
              <button
                onClick={navigateToFeed}
                className={`w-full flex items-center px-3 py-3 md:py-2 text-sm font-medium rounded-lg transition-colors touch-target ${
                  navigationState.activeView === 'feed'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                Home Feed
              </button>

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

              {/* Joined Communities Section */}
              <div className="flex items-center justify-between mt-6 mb-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  My Communities
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    title="Create Community"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {joinedCommunities.length > 5 && (
                    <button
                      onClick={() => setShowAllCommunities(!showAllCommunities)}
                      className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {showAllCommunities ? 'Show Less' : `+${joinedCommunities.length - 5} more`}
                    </button>
                  )}
                </div>
              </div>

              {joinedCommunities.length > 0 ? (

                  <div className="space-y-1">
                    {displayedJoinedCommunities.map((community) => (
                      <button
                        key={community.id}
                        onClick={() => handleCommunitySelect(community.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                          navigationState.activeCommunity === community.id
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="text-lg mr-3">{community.avatar}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{community.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {community.memberCount.toLocaleString()} members
                          </div>
                        </div>
                        {community.unreadCount && community.unreadCount > 0 && (
                          <span className="ml-2 px-2 py-1 text-xs bg-primary-500 text-white rounded-full">
                            {community.unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    No communities joined yet
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    Create your first community
                  </button>
                </div>
              )}

              {/* Discover Communities Section */}
              {availableCommunities.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6 mb-3">
                    Discover
                  </div>
                  <div className="space-y-1">
                    {availableCommunities.slice(0, 3).map((community) => (
                      <div
                        key={community.id}
                        className="flex items-center px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="text-lg mr-3">{community.avatar}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{community.displayName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {community.memberCount.toLocaleString()} members
                          </div>
                        </div>
                        <button
                          onClick={() => handleCommunityToggle(community.id)}
                          className="ml-2 px-3 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Collapsed Navigation */
            <div className="space-y-2">
              <button
                onClick={navigateToFeed}
                className={`w-full p-2 rounded-lg transition-colors ${
                  navigationState.activeView === 'feed'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
                title="Home Feed"
              >
                <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </button>

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
              {joinedCommunities.slice(0, 3).map((community) => (
                <button
                  key={community.id}
                  onClick={() => handleCommunitySelect(community.id)}
                  className={`w-full p-2 rounded-lg transition-colors relative ${
                    navigationState.activeCommunity === community.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                  }`}
                  title={community.displayName}
                >
                  <span className="text-lg">{community.avatar}</span>
                  {community.unreadCount && community.unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
                  )}
                </button>
              ))}
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
          // Add the new community to the joined list
          setCommunities(prev => [...prev, {
            id: community.id,
            name: community.name,
            displayName: community.displayName,
            memberCount: community.memberCount,
            avatar: community.avatar || '🏛️',
            isJoined: true,
            unreadCount: 0
          }]);
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