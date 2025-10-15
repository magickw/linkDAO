import React from 'react';
import { ExpandedGovernanceWidget } from './ExpandedGovernanceWidget';
import { WalletActivityFeed } from './WalletActivityFeed';
import { SuggestedCommunitiesWidget } from './SuggestedCommunitiesWidget';
import { CommunityInfoWidget } from './CommunityInfoWidget';
import { 
  GovernanceProposal, 
  WalletActivity, 
  EnhancedCommunityData 
} from '../../../types/communityEnhancements';

interface TokenRequirement {
  tokenAddress: string;
  tokenSymbol: string;
  minimumAmount: number;
  currentPrice?: number;
  userBalance?: number;
  meetsRequirement: boolean;
}

interface TrendingTopic {
  hashtag: string;
  postCount: number;
  growthRate: number;
  category: 'defi' | 'nft' | 'governance' | 'general';
}

interface SuggestedCommunity extends EnhancedCommunityData {
  mutualMemberCount: number;
  trendingScore: number;
  joinReason: 'mutual_connections' | 'similar_interests' | 'trending' | 'recommended';
  previewStats: {
    recentPosts: number;
    activeDiscussions: number;
    weeklyGrowth: number;
  };
  tokenRequirement?: TokenRequirement;
  trendingTopics: TrendingTopic[];
  web3Stats: {
    treasuryValue?: number;
    governanceTokenPrice?: number;
    stakingApy?: number;
    totalValueLocked?: number;
  };
}

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

interface EnhancedRightSidebarProps {
  // Governance data
  activeProposals: GovernanceProposal[];
  userVotingPower: number;
  onVoteClick: (proposalId: string) => void;
  
  // Wallet activity data
  walletActivities: WalletActivity[];
  onActivityClick?: (activity: WalletActivity) => void;
  
  // Suggested communities data
  suggestedCommunities: SuggestedCommunity[];
  onJoinCommunity: (communityId: string) => Promise<boolean>;
  onCommunityClick: (communityId: string) => void;
  
  // Community-specific information
  currentCommunity?: EnhancedCommunityData;
  topContributors?: TopContributor[];
  communityRules?: CommunityRule[];
  treasuryTokens?: TreasuryToken[];
  governanceToken?: GovernanceTokenInfo;
  onFollowContributor?: (contributorId: string) => Promise<void>;
  onViewFullRules?: () => void;
  onViewTreasury?: () => void;
  
  // Configuration
  communityId: string;
  showGovernance?: boolean;
  showWalletActivity?: boolean;
  showSuggestedCommunities?: boolean;
  showCommunityInfo?: boolean;
  maxActivityItems?: number;
  maxSuggestions?: number;
}

export const EnhancedRightSidebar: React.FC<EnhancedRightSidebarProps> = ({
  activeProposals,
  userVotingPower,
  onVoteClick,
  walletActivities,
  onActivityClick,
  suggestedCommunities,
  onJoinCommunity,
  onCommunityClick,
  currentCommunity,
  topContributors = [],
  communityRules = [],
  treasuryTokens,
  governanceToken,
  onFollowContributor,
  onViewFullRules,
  onViewTreasury,
  communityId,
  showGovernance = true,
  showWalletActivity = true,
  showSuggestedCommunities = true,
  showCommunityInfo = true,
  maxActivityItems = 10,
  maxSuggestions = 5
}) => {
  return (
    <div className="space-y-6">
      {/* Community-Specific Information */}
      {showCommunityInfo && currentCommunity && (
        <CommunityInfoWidget
          community={currentCommunity}
          topContributors={topContributors}
          rules={communityRules}
          treasuryTokens={treasuryTokens}
          governanceToken={governanceToken}
          onFollowContributor={onFollowContributor || (async () => {})}
          onViewFullRules={onViewFullRules || (() => {})}
          onViewTreasury={onViewTreasury || (() => {})}
        />
      )}

      {/* Governance Widget */}
      {showGovernance && (
        <ExpandedGovernanceWidget
          activeProposals={activeProposals}
          userVotingPower={userVotingPower}
          onVoteClick={onVoteClick}
          showProgressBars={true}
          communityId={communityId}
        />
      )}

      {/* Wallet Activity Feed */}
      {showWalletActivity && (
        <WalletActivityFeed
          activities={walletActivities}
          maxItems={maxActivityItems}
          showRealTimeUpdates={true}
          onActivityClick={onActivityClick}
          communityId={communityId}
        />
      )}

      {/* Suggested Communities Widget */}
      {showSuggestedCommunities && (
        <SuggestedCommunitiesWidget
          suggestedCommunities={suggestedCommunities}
          onJoinCommunity={onJoinCommunity}
          onCommunityClick={onCommunityClick}
          maxSuggestions={maxSuggestions}
        />
      )}
    </div>
  );
};

export default EnhancedRightSidebar;