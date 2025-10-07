import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNavigation } from '@/context/NavigationContext';
import { mockCommunities } from '@/mocks/communityMockData';
import WalletSnapshotEmbed from './WalletSnapshotEmbed';
import DeFiChartEmbed from './DeFiChartEmbed';
import DAOGovernanceEmbed from './DAOGovernanceEmbed';
import { SmartRightSidebar } from './SmartRightSidebar';
import enhancedUserService, { SuggestedUser } from '../services/enhancedUserService';

// Mock DAO data - TODO: Replace with real DAO service
const trendingDAOs = [
  { id: '1', name: 'Ethereum Builders', members: 12400, treasuryValue: 2500000 },
  { id: '2', name: 'DeFi Traders', members: 8900, treasuryValue: 1800000 },
  { id: '3', name: 'NFT Collectors', members: 15600, treasuryValue: 3200000 },
  { id: '4', name: 'DAO Governance', members: 7800, treasuryValue: 1500000 },
  { id: '5', name: 'Web3 Developers', members: 5400, treasuryValue: 950000 },
];

// Mock marketplace data
const activeAuctions = [
  { id: '1', name: 'Rare CryptoPunk', currentBid: 45.2, endTime: new Date(Date.now() + 3600000) },
  { id: '2', name: 'DeFi Art Collection', currentBid: 12.8, endTime: new Date(Date.now() + 7200000) },
  { id: '3', name: 'ENS Domain Premium', currentBid: 8.5, endTime: new Date(Date.now() + 10800000) },
];

// Mock governance proposals
const governanceProposals = [
  { id: '1', title: 'Upgrade Governance Contract', dao: 'Ethereum Builders', votesFor: 1240, votesAgainst: 320, endTime: new Date(Date.now() + 86400000) },
  { id: '2', title: 'New Treasury Allocation', dao: 'DeFi Traders', votesFor: 890, votesAgainst: 150, endTime: new Date(Date.now() + 172800000) },
  { id: '3', title: 'Community Grant Program', dao: 'NFT Collectors', votesFor: 2100, votesAgainst: 450, endTime: new Date(Date.now() + 259200000) },
];

export default function DashboardRightSidebar() {
  const { navigationState } = useNavigation();
  const { activeView, activeCommunity } = navigationState;
  
  // State for real user data
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load suggested users when component mounts or user changes
  useEffect(() => {
    const loadSuggestedUsers = async () => {
      // TODO: Get current user ID from authentication context
      // For now, we'll use a placeholder or skip if no user
      const userId = getCurrentUserId(); // This would come from auth context
      
      if (!userId) {
        // If no user is logged in, show empty suggestions or trending users
        try {
          setLoadingSuggestions(true);
          const trending = await enhancedUserService.getTrendingUsers(3);
          // Convert trending users to suggested users format
          const suggestions: SuggestedUser[] = trending.map(user => ({
            id: user.id,
            handle: user.handle,
            ens: user.ens,
            avatarCid: user.avatarCid,
            followers: user.followers,
            reputationScore: user.reputationScore,
            mutualConnections: 0,
            reasonForSuggestion: 'Trending user',
          }));
          setSuggestedUsers(suggestions);
        } catch (error) {
          console.error('Error loading trending users:', error);
          setSuggestedUsers([]);
        } finally {
          setLoadingSuggestions(false);
        }
        return;
      }

      if (userId === currentUserId) {
        return; // Already loaded for this user
      }

      try {
        setLoadingSuggestions(true);
        setCurrentUserId(userId);
        
        const suggestions = await enhancedUserService.getSuggestedUsers(userId, {
          maxResults: 3,
          minReputationScore: 100,
          excludeFollowed: true,
        });
        
        setSuggestedUsers(suggestions);
      } catch (error) {
        console.error('Error loading suggested users:', error);
        setSuggestedUsers([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadSuggestedUsers();
  }, [currentUserId]);

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

  // Get current community data if viewing a community
  const currentCommunity = activeCommunity 
    ? mockCommunities.find(c => c.id === activeCommunity)
    : null;

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

  // Get contextual content based on current view
  const getContextualContent = () => {
    if (activeView === 'community' && currentCommunity) {
      return {
        showCommunityInfo: true,
        showRelatedCommunities: true,
        showCommunityGovernance: currentCommunity.governanceToken,
        showTrendingInCategory: currentCommunity.category,
      };
    }
    
    return {
      showCommunityInfo: false,
      showRelatedCommunities: false,
      showCommunityGovernance: false,
      showTrendingInCategory: null,
    };
  };

  const contextualContent = getContextualContent();

  return (
    <div className="space-y-6">
      {/* Enhanced Smart Right Sidebar */}
      <SmartRightSidebar 
        context={activeView === 'community' ? 'community' : 'feed'}
        communityId={activeCommunity || undefined}
      />

      {/* Legacy widgets - keeping for backward compatibility */}
      {/* Community Info Widget - Only show when viewing a community */}
      {contextualContent.showCommunityInfo && currentCommunity && (
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
      )}

      {/* Wallet Widget - Always show */}
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

      {/* Trending Hashtags Widget */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
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

      {/* DeFi Market Widget - Always show */}
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
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Value Locked</span>
              <span className="font-medium text-gray-900 dark:text-white">$45.2B</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">24h Volume</span>
              <span className="font-medium text-gray-900 dark:text-white">$12.8B</span>
            </div>
          </div>
        </div>
      </div>

      {/* Community Governance - Show when viewing community with governance token */}
      {contextualContent.showCommunityGovernance && currentCommunity && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Community Governance
            </h3>
          </div>
          <div className="p-4">
            <DAOGovernanceEmbed 
              daoName={currentCommunity.displayName}
              daoToken={currentCommunity.governanceToken || 'COMM'}
              className="mb-4"
            />
          </div>
        </div>
      )}

      {/* Related Communities - Show when viewing community */}
      {contextualContent.showRelatedCommunities && currentCommunity && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Related Communities
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {mockCommunities
                .filter(c => c.id !== currentCommunity.id && c.category === currentCommunity.category)
                .slice(0, 3)
                .map((community) => (
                <Link
                  key={community.id}
                  href={`/dao/${community.name}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center">
                    <img 
                      src={community.avatar} 
                      alt={community.displayName}
                      className="w-8 h-8 rounded-lg"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{community.displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(community.memberCount)} members</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                    Join
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trending Content - Show different content based on view */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {activeView === 'community' && contextualContent.showTrendingInCategory 
              ? `Trending in ${contextualContent.showTrendingInCategory}`
              : 'Trending Communities'
            }
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {(activeView === 'community' 
              ? mockCommunities.filter(c => c.category === contextualContent.showTrendingInCategory).slice(0, 4)
              : trendingDAOs
            ).map((item) => (
              <Link
                key={item.id}
                href={activeView === 'community' ? `/dao/${item.name}` : `/dao/${item.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/50 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {activeView === 'community' ? (item as any).displayName || (item as any).name : (item as any).name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(activeView === 'community' ? (item as any).memberCount || (item as any).members : (item as any).members)} members
                  </p>
                </div>
                <div className="text-right">
                  {activeView === 'feed' && (item as any).treasuryValue && (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency((item as any).treasuryValue)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
                    </>
                  )}
                  {activeView === 'community' && (
                    <button className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      Join
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Suggested Users - Show when in feed view */}
      {activeView === 'feed' && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              {currentUserId ? 'Suggested Users' : 'Trending Users'}
            </h3>
          </div>
          <div className="p-4">
            {loadingSuggestions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center">
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl w-10 h-10" />
                      <div className="ml-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-1" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12" />
                  </div>
                ))}
              </div>
            ) : suggestedUsers.length > 0 ? (
              <div className="space-y-3">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={enhancedUserService.getUserAvatarUrl(user)}
                        alt={enhancedUserService.formatUserDisplayName(user)}
                        className="w-10 h-10 rounded-xl object-cover"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`;
                        }}
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {enhancedUserService.formatUserDisplayName(user)}
                        </p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>{enhancedUserService.formatFollowerCount(user.followers)} followers</span>
                          <span className="mx-1">•</span>
                          <span className="inline-flex items-center">
                            <span className="mr-1">🏆</span>
                            {enhancedUserService.formatReputationScore(user.reputationScore)}
                          </span>
                        </div>
                        {user.reasonForSuggestion && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {user.reasonForSuggestion}
                          </p>
                        )}
                      </div>
                    </div>
                    <button 
                      className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 px-3 py-1 rounded-full border border-primary-600 dark:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      onClick={() => handleFollowUser(user.id)}
                    >
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No suggestions available
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Auctions - Show when in feed view */}
      {activeView === 'feed' && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Active Auctions
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {activeAuctions.map((auction) => (
                <div key={auction.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between">
                    <p className="font-medium text-gray-900 dark:text-white">{auction.name}</p>
                    <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                      {formatTimeRemaining(auction.endTime)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Current bid</span>
                    <span className="font-medium text-gray-900 dark:text-white">{auction.currentBid} ETH</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Governance Proposals - Always show but adapt content */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden">
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {activeView === 'community' && currentCommunity 
              ? `${currentCommunity.displayName} Proposals`
              : 'Governance Proposals'
            }
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {governanceProposals
              .filter(proposal => 
                activeView === 'feed' || 
                (activeView === 'community' && currentCommunity && proposal.dao === currentCommunity.displayName)
              )
              .slice(0, 3)
              .map((proposal) => (
              <div key={proposal.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{proposal.title}</p>
                  {activeView === 'feed' && (
                    <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                      {proposal.dao}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="mr-2">👍 {proposal.votesFor}</span>
                    <span>👎 {proposal.votesAgainst}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {formatTimeRemaining(proposal.endTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}