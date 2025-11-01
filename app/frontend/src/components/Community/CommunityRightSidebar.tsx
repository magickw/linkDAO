import React, { useState, useEffect } from 'react';
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
  // Add state for AI insights
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAiInsights, setLoadingAiInsights] = useState(false);
  
  // Adapter function to handle the type conversion
  const handleTrendingCommunitySelect = (enhancedCommunity: EnhancedCommunityData) => {
    if (!onCommunitySelect) return;

    // Find the corresponding Community object
    const community = communities.find(c => c.id === enhancedCommunity.id);
    if (community) {
      onCommunitySelect(community);
    }
  };

  // Fetch AI insights
  useEffect(() => {
    const fetchAIInsights = async () => {
      if (communities.length === 0) return;
      
      setLoadingAiInsights(true);
      try {
        const response = await fetch('/api/admin/ai/insights/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'community_engagement',
            context: {
              communities: communities,
              joinedCount: joinedCommunityIds.length,
              totalMembers: communities.reduce((sum, c) => sum + c.memberCount, 0)
            }
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiInsights(data.data?.insights || 'No insights available at this time.');
        }
      } catch (error) {
        console.error('Failed to fetch AI insights:', error);
        setAiInsights('Unable to load insights at this time.');
      } finally {
        setLoadingAiInsights(false);
      }
    };
    
    if (communities.length > 0) {
      fetchAIInsights();
    }
  }, [communities, joinedCommunityIds]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Insights Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Community Insights
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {loadingAiInsights ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span>Analyzing your community data...</span>
            </div>
          ) : aiInsights ? (
            <p>{aiInsights}</p>
          ) : (
            <p>Join communities to get personalized insights.</p>
          )}
        </div>
      </div>

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