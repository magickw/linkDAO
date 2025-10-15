import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Activity, Zap, X } from 'lucide-react';
import { TrendingCommunityData } from '../../services/communityRankingService';

interface CommunityComparisonToolProps {
  communities: TrendingCommunityData[];
  onClose?: () => void;
  maxComparisons?: number;
}

export const CommunityComparisonTool: React.FC<CommunityComparisonToolProps> = ({
  communities,
  onClose,
  maxComparisons = 3
}) => {
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  const toggleCommunitySelection = (communityId: string) => {
    setSelectedCommunities(prev => {
      if (prev.includes(communityId)) {
        return prev.filter(id => id !== communityId);
      } else if (prev.length < maxComparisons) {
        return [...prev, communityId];
      }
      return prev;
    });
  };

  const selectedCommunityData = communities.filter(c => 
    selectedCommunities.includes(c.id)
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getMetricColor = (value: number, max: number, min: number) => {
    const normalized = (value - min) / (max - min);
    if (normalized > 0.7) return 'text-green-600 bg-green-50';
    if (normalized > 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Community Comparison
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Select up to {maxComparisons} communities to compare their metrics
        </p>
      </div>

      {/* Community Selection */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Select Communities ({selectedCommunities.length}/{maxComparisons})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {communities.slice(0, 6).map(community => (
            <button
              key={community.id}
              onClick={() => toggleCommunitySelection(community.id)}
              disabled={!selectedCommunities.includes(community.id) && 
                       selectedCommunities.length >= maxComparisons}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedCommunities.includes(community.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              } ${
                !selectedCommunities.includes(community.id) && 
                selectedCommunities.length >= maxComparisons
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: community.brandColors.primary + '20' }}
                >
                  {community.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {community.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatNumber(community.memberCount)} members
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div> 
     {/* Comparison Results */}
      {selectedCommunityData.length > 1 && (
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Comparison Results</h3>
          
          {/* Metrics Comparison */}
          <div className="space-y-6">
            {/* Member Count */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Member Count</span>
              </div>
              <div className="space-y-2">
                {selectedCommunityData.map(community => {
                  const maxMembers = Math.max(...selectedCommunityData.map(c => c.memberCount));
                  const percentage = (community.memberCount / maxMembers) * 100;
                  
                  return (
                    <div key={community.id} className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-gray-600 truncate">
                        {community.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: community.brandColors.primary 
                          }}
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 text-right">
                        {formatNumber(community.memberCount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Score */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Activity Score</span>
              </div>
              <div className="space-y-2">
                {selectedCommunityData.map(community => {
                  const score = community.rankingMetrics.activityScore;
                  
                  return (
                    <div key={community.id} className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-gray-600 truncate">
                        {community.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${score}%`,
                            backgroundColor: community.brandColors.primary 
                          }}
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 text-right">
                        {score.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trending Score */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Trending Score</span>
              </div>
              <div className="space-y-2">
                {selectedCommunityData.map(community => {
                  const score = community.growthMetrics.trendingScore;
                  
                  return (
                    <div key={community.id} className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-gray-600 truncate">
                        {community.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${score}%`,
                            backgroundColor: community.brandColors.primary 
                          }}
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 text-right">
                        {score.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Rate */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Engagement Rate</span>
              </div>
              <div className="space-y-2">
                {selectedCommunityData.map(community => {
                  const rate = community.activityMetrics.engagementRate * 100;
                  
                  return (
                    <div key={community.id} className="flex items-center space-x-3">
                      <div className="w-20 text-sm text-gray-600 truncate">
                        {community.name}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${rate}%`,
                            backgroundColor: community.brandColors.primary 
                          }}
                        />
                      </div>
                      <div className="w-16 text-sm font-medium text-gray-900 text-right">
                        {rate.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {selectedCommunityData.length > 0 && (
                <>
                  <p>
                    <strong>{selectedCommunityData[0].name}</strong> leads in overall trending score 
                    with {selectedCommunityData[0].growthMetrics.trendingScore.toFixed(0)} points.
                  </p>
                  <p>
                    Highest engagement rate: <strong>
                      {Math.max(...selectedCommunityData.map(c => c.activityMetrics.engagementRate * 100)).toFixed(1)}%
                    </strong>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedCommunityData.length <= 1 && (
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select Communities to Compare
          </h3>
          <p className="text-gray-600">
            Choose at least 2 communities to see detailed comparisons of their metrics.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommunityComparisonTool;