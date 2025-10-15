import React from 'react';
import { StakingInfo } from '@/types/tokenActivity';

interface StakingProgressBarProps {
  stakingInfo: StakingInfo;
  maxStake?: number;
  showLabels?: boolean;
  height?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const StakingProgressBar: React.FC<StakingProgressBarProps> = ({
  stakingInfo,
  maxStake,
  showLabels = true,
  height = 'md',
  animated = true,
  className = ''
}) => {
  // Calculate progress percentage
  const calculateProgress = () => {
    if (!maxStake) {
      // Auto-calculate based on tier thresholds
      const tierThresholds = {
        bronze: 10,
        silver: 100,
        gold: 1000
      };
      
      const currentTier = stakingInfo.stakingTier;
      if (currentTier === 'none') return 0;
      
      const threshold = tierThresholds[currentTier as keyof typeof tierThresholds];
      return Math.min((stakingInfo.totalStaked / threshold) * 100, 100);
    }
    
    return Math.min((stakingInfo.totalStaked / maxStake) * 100, 100);
  };

  const progress = calculateProgress();

  const getHeightClasses = () => {
    switch (height) {
      case 'sm':
        return 'h-1';
      case 'lg':
        return 'h-4';
      default:
        return 'h-2';
    }
  };

  const getTierGradient = () => {
    switch (stakingInfo.stakingTier) {
      case 'gold':
        return 'from-yellow-400 via-yellow-500 to-yellow-600';
      case 'silver':
        return 'from-gray-300 via-gray-400 to-gray-500';
      case 'bronze':
        return 'from-orange-400 via-orange-500 to-orange-600';
      default:
        return 'from-gray-300 to-gray-400';
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(1);
  };

  const getNextTierInfo = () => {
    const tierThresholds = [
      { name: 'Bronze', min: 1, max: 10 },
      { name: 'Silver', min: 10, max: 100 },
      { name: 'Gold', min: 100, max: 1000 }
    ];

    const currentStake = stakingInfo.totalStaked;
    
    for (const tier of tierThresholds) {
      if (currentStake < tier.max) {
        const remaining = tier.max - currentStake;
        return {
          nextTier: tier.name,
          remaining: remaining,
          progress: ((currentStake - (tier.min - 1)) / (tier.max - (tier.min - 1))) * 100
        };
      }
    }
    
    return null;
  };

  const nextTierInfo = getNextTierInfo();

  return (
    <div className={`w-full ${className}`}>
      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Staked: {formatAmount(stakingInfo.totalStaked)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stakingInfo.stakingTier === 'gold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
              stakingInfo.stakingTier === 'silver' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' :
              stakingInfo.stakingTier === 'bronze' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
              'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
            }`}>
              {stakingInfo.stakingTier.charAt(0).toUpperCase() + stakingInfo.stakingTier.slice(1)}
            </span>
          </div>
          
          {nextTierInfo && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatAmount(nextTierInfo.remaining)} to {nextTierInfo.nextTier}
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${getHeightClasses()}`}>
        {/* Progress fill */}
        <div
          className={`
            ${getHeightClasses()} bg-gradient-to-r ${getTierGradient()}
            transition-all duration-500 ease-out
            ${animated ? 'animate-pulse' : ''}
            relative overflow-hidden
          `}
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect for animated bars */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          )}
        </div>
      </div>

      {/* Staker count and additional info */}
      {showLabels && (
        <div className="flex justify-between items-center mt-1">
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
            <span>{stakingInfo.stakerCount} staker{stakingInfo.stakerCount !== 1 ? 's' : ''}</span>
          </div>
          
          {stakingInfo.userStake && stakingInfo.userStake > 0 && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              You: {formatAmount(stakingInfo.userStake)}
            </span>
          )}
        </div>
      )}

      {/* Tier milestones (for larger bars) */}
      {height === 'lg' && (
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>0</span>
          <span>10</span>
          <span>100</span>
          <span>1K+</span>
        </div>
      )}
    </div>
  );
};

export default StakingProgressBar;