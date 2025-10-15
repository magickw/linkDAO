import React, { useState, useEffect } from 'react';
import { EnhancedCommunityData } from '../../../types/communityEnhancements';
import { MicroInteractionLayer } from '../SharedComponents/MicroInteractionLayer';

interface TopContributor {
  id: string;
  username: string;
  avatar: string;
  reputation: number;
  weeklyContributions: number;
  badges: string[];
  isFollowing: boolean;
}

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  icon: string;
}

interface TreasuryToken {
  symbol: string;
  amount: number;
  valueUSD: number;
  percentage: number;
}

interface GovernanceTokenInfo {
  symbol: string;
  totalSupply: number;
  circulatingSupply: number;
  currentPrice: number;
  marketCap: number;
  holders: number;
  stakingRatio: number;
}

// Tabs for this widget
type TabId = 'overview' | 'contributors' | 'rules' | 'treasury';

interface CommunityInfoWidgetProps {
  community: EnhancedCommunityData;
  topContributors: TopContributor[];
  rules: CommunityRule[];
  treasuryTokens?: TreasuryToken[];
  governanceToken?: GovernanceTokenInfo;
  onFollowContributor: (contributorId: string) => Promise<void>;
  onViewFullRules: () => void;
  onViewTreasury: () => void;
}

const TopContributorCard: React.FC<{
  contributor: TopContributor;
  onFollow: (id: string) => Promise<void>;
}> = ({ contributor, onFollow }) => {
  const [isFollowing, setIsFollowing] = useState(contributor.isFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleFollow = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await onFollow(contributor.id);
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to follow contributor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MicroInteractionLayer interactionType="hover">
      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <img
          src={contributor.avatar}
          alt={contributor.username}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {contributor.username}
            </h4>
            {contributor.badges.length > 0 && (
              <div className="flex space-x-1">
                {contributor.badges.slice(0, 2).map((badge, index) => (
                  <span key={index} className="text-xs">
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{contributor.reputation} reputation</span>
            <span>•</span>
            <span>{contributor.weeklyContributions} posts this week</span>
          </div>
        </div>
        <button
          onClick={handleFollow}
          disabled={isLoading}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            isFollowing
              ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50`}
        >
          {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </MicroInteractionLayer>
  );
};

const RuleItem: React.FC<{ rule: CommunityRule }> = ({ rule }) => {
  const getSeverityColor = () => {
    switch (rule.severity) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
    }
  };

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <span className={`text-lg ${getSeverityColor()}`}>
        {rule.icon}
      </span>
      <div className="flex-1">
        <h5 className="font-medium text-gray-900 dark:text-white text-sm">
          {rule.title}
        </h5>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {rule.description}
        </p>
      </div>
    </div>
  );
};

const TreasuryDisplay: React.FC<{
  tokens: TreasuryToken[];
  totalValue: number;
  onViewFull: () => void;
}> = ({ tokens, totalValue, onViewFull }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Treasury Balance
        </h4>
        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
          ${(totalValue / 1000000).toFixed(1)}M
        </span>
      </div>
      
      <div className="space-y-2">
        {tokens.slice(0, 3).map((token, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                {token.symbol.slice(0, 2)}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {token.symbol}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                ${(token.valueUSD / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {token.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {tokens.length > 3 && (
        <button
          onClick={onViewFull}
          className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          View Full Treasury →
        </button>
      )}
    </div>
  );
};

const GovernanceTokenDisplay: React.FC<{
  token: GovernanceTokenInfo;
}> = ({ token }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Governance Token
        </h4>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {token.symbol}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Price</div>
          <div className="font-medium text-gray-900 dark:text-white">
            ${token.currentPrice.toFixed(4)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Market Cap</div>
          <div className="font-medium text-gray-900 dark:text-white">
            ${(token.marketCap / 1000000).toFixed(1)}M
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Holders</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {token.holders.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-gray-400 text-xs">Staked</div>
          <div className="font-medium text-green-600 dark:text-green-400">
            {(token.stakingRatio * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export const CommunityInfoWidget: React.FC<CommunityInfoWidgetProps> = ({
  community,
  topContributors,
  rules,
  treasuryTokens,
  governanceToken,
  onFollowContributor,
  onViewFullRules,
  onViewTreasury
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'contributors', label: 'Top Contributors', icon: '👥' },
    { id: 'rules', label: 'Rules', icon: '📋' },
    ...(treasuryTokens ? [{ id: 'treasury' as TabId, label: 'Treasury', icon: '💰' }] : [])
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <img
          src={community.icon}
          alt={community.name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {community.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {community.memberCount.toLocaleString()} members
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Community Description */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                About
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {community.description}
              </p>
            </div>

            {/* Governance Token Info */}
            {governanceToken && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <GovernanceTokenDisplay token={governanceToken} />
              </div>
            )}

            {/* Activity Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {community.activityMetrics.postsToday}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Posts Today
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {community.governance.activeProposals}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Active Proposals
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contributors' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Top Contributors This Week
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {topContributors.length} contributors
              </span>
            </div>
            
            {topContributors.length > 0 ? (
              <div className="space-y-1">
                {topContributors.map((contributor) => (
                  <TopContributorCard
                    key={contributor.id}
                    contributor={contributor}
                    onFollow={onFollowContributor}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">👥</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No contributors this week
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Community Guidelines
              </h4>
              <button
                onClick={onViewFullRules}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                View All →
              </button>
            </div>
            
            {rules.length > 0 ? (
              <div className="space-y-1">
                {rules.slice(0, 4).map((rule) => (
                  <RuleItem key={rule.id} rule={rule} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">📋</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No rules defined
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treasury' && treasuryTokens && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <TreasuryDisplay
              tokens={treasuryTokens}
              totalValue={treasuryTokens.reduce((sum, token) => sum + token.valueUSD, 0)}
              onViewFull={onViewTreasury}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityInfoWidget;