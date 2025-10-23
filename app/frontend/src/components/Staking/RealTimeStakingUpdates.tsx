import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Coins } from 'lucide-react';

interface StakingUpdate {
  communityId: string;
  communityName: string;
  totalStaked: number;
  stakerCount: number;
  recentChange: number;
  changePercentage: number;
  timestamp: Date;
}

interface RealTimeStakingUpdatesProps {
  communityIds: string[];
  className?: string;
  showAnimations?: boolean;
  maxUpdates?: number;
}

export const RealTimeStakingUpdates: React.FC<RealTimeStakingUpdatesProps> = ({
  communityIds,
  className = '',
  showAnimations = true,
  maxUpdates = 5
}) => {
  const [stakingUpdates, setStakingUpdates] = useState<StakingUpdate[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);

  // TODO: Replace with real API calls to fetch staking data
  useEffect(() => {
    const fetchStakingUpdates = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would fetch actual staking data
        // For now, we'll use an empty array
        setStakingUpdates([]);
      } catch (error) {
        console.error('Error fetching staking updates:', error);
        setStakingUpdates([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStakingUpdates();
    
    // In a real implementation, this would update periodically
    // For now, we'll just fetch once
  }, [communityIds, maxUpdates, showAnimations]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-3 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if there are no staking updates
  if (stakingUpdates.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Real-Time Staking</h3>
          {isAnimating && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-xs text-blue-600">Live</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {stakingUpdates.map((update) => (
            <div 
              key={update.communityId}
              className={`p-3 bg-gray-50 rounded-lg transition-all duration-500 ${
                isAnimating ? 'animate-pulse scale-105' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {update.communityName}
                </div>
                <div className="flex items-center space-x-1">
                  {getChangeIcon(update.recentChange)}
                  <span className={`text-xs font-medium ${getChangeColor(update.recentChange)}`}>
                    {update.changePercentage >= 0 ? '+' : ''}{update.changePercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-1">
                  <Coins className="w-3 h-3 text-yellow-500" />
                  <span className="text-gray-600">Staked:</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(update.totalStaked)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-600">Stakers:</span>
                  <span className="font-medium text-gray-900">
                    {update.stakerCount}
                  </span>
                </div>
              </div>

              {Math.abs(update.recentChange) > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Recent change: {update.recentChange >= 0 ? '+' : ''}{formatNumber(Math.abs(update.recentChange))} tokens
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          Updates every 30 seconds
        </div>
      </div>
    </div>
  );
};

export default RealTimeStakingUpdates;