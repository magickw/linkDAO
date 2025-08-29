import React from 'react';
import Link from 'next/link';
import { useNavigation } from '@/context/NavigationContext';
import { mockCommunities } from '@/mocks/communityMockData';
import WalletSnapshotEmbed from './WalletSnapshotEmbed';
import DeFiChartEmbed from './DeFiChartEmbed';
import DAOGovernanceEmbed from './DAOGovernanceEmbed';

// Mock DAO data
const trendingDAOs = [
  { id: '1', name: 'Ethereum Builders', members: 12400, treasuryValue: 2500000 },
  { id: '2', name: 'DeFi Traders', members: 8900, treasuryValue: 1800000 },
  { id: '3', name: 'NFT Collectors', members: 15600, treasuryValue: 3200000 },
  { id: '4', name: 'DAO Governance', members: 7800, treasuryValue: 1500000 },
  { id: '5', name: 'Web3 Developers', members: 5400, treasuryValue: 950000 },
];

// Mock suggested users
const suggestedUsers = [
  { id: '1', handle: 'web3dev', ens: 'dev.web3.eth', avatarCid: 'https://placehold.co/40', followers: 1200, reputationScore: 650 },
  { id: '2', handle: 'defiwhale', ens: 'whale.defi.eth', avatarCid: 'https://placehold.co/40', followers: 8900, reputationScore: 920 },
  { id: '3', handle: 'nftartist', ens: 'artist.nft.eth', avatarCid: 'https://placehold.co/40', followers: 5600, reputationScore: 780 },
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
              Suggested Users
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900 dark:text-white">{user.handle}</p>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatNumber(user.followers)} followers</span>
                        <span className="mx-1">•</span>
                        <span className="inline-flex items-center">
                          <span className="mr-1">🏆</span>
                          {user.reputationScore}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                    Follow
                  </button>
                </div>
              ))}
            </div>
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