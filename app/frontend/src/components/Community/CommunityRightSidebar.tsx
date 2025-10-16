import React from 'react';
import { TrendingCommunitiesSection } from '@/components/CommunityDiscovery/TrendingCommunitiesSection';
import { LiveGovernanceWidget } from '@/components/RealTimeUpdates/LiveGovernanceWidget';
import { RealTimeStakingUpdates } from '@/components/Staking/RealTimeStakingUpdates';
import { LiveTokenPriceDisplay } from '@/components/RealTimeUpdates/LiveTokenPriceDisplay';
import { Community } from '@/models/Community';
import { EnhancedCommunityData } from '@/types/communityEnhancements';

interface CommunityRightSidebarProps {
  communities?: Community[];
  joinedCommunityIds?: string[];
  onCommunitySelect?: (community: Community) => void;
  className?: string;
}

export default function CommunityRightSidebar({
  communities = [],
  joinedCommunityIds = [],
  onCommunitySelect,
  className = ''
}: CommunityRightSidebarProps) {
  // Adapter function to handle the type conversion
  const handleTrendingCommunitySelect = (enhancedCommunity: EnhancedCommunityData) => {
    if (!onCommunitySelect) return;

    // Find the corresponding Community object
    const community = communities.find(c => c.id === enhancedCommunity.id);
    if (community) {
      onCommunitySelect(community);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Trending Communities Section */}
      <TrendingCommunitiesSection
        onCommunitySelect={handleTrendingCommunitySelect}
        onViewAll={() => {}}
        maxItems={5}
        showComparison={true}
      />

      {/* Live Governance Widget */}
      <LiveGovernanceWidget
        communityId="global"
        className="bg-white rounded-lg shadow-sm border"
        maxProposals={3}
        showVotingProgress={true}
        autoRefresh={true}
      />

      {/* Real-Time Staking Updates */}
      {joinedCommunityIds.length > 0 && (
        <RealTimeStakingUpdates
          communityIds={joinedCommunityIds}
          className="bg-white rounded-lg shadow-sm border"
          showAnimations={true}
        />
      )}

      {/* Enhanced Community Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
          Community Stats
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Total Communities</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {communities.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Joined</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {joinedCommunityIds.length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">Active Members</span>
            <span className="font-medium text-green-600">
              {communities.reduce((sum, c) => sum + c.memberCount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Live Token Prices */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
          Live Token Prices
        </h3>
        <div className="space-y-3">
          <LiveTokenPriceDisplay
            tokenAddress="0x1234567890123456789012345678901234567890"
            displayFormat="detailed"
            showChange={true}
            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
