import React, { useState } from 'react';
import { StakingInfo, StakingEvent } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

interface StakerInfo {
  address: string;
  amount: number;
  percentage: number;
  joinedAt: Date;
  avatar?: string;
  ensName?: string;
  isTopStaker?: boolean;
}

interface MultiStakerDisplayProps {
  stakingInfo: StakingInfo;
  token?: TokenInfo;
  maxDisplayStakers?: number;
  showPercentages?: boolean;
  showAvatars?: boolean;
  onStakerClick?: (address: string) => void;
  className?: string;
}

export const MultiStakerDisplay: React.FC<MultiStakerDisplayProps> = ({
  stakingInfo,
  token,
  maxDisplayStakers = 5,
  showPercentages = true,
  showAvatars = true,
  onStakerClick,
  className = ''
}) => {
  const [showAllStakers, setShowAllStakers] = useState(false);

  // Generate mock staker data based on staking info
  const generateStakers = (): StakerInfo[] => {
    const stakers: StakerInfo[] = [];
    const totalStaked = stakingInfo.totalStaked;
    
    // Generate realistic staker distribution
    for (let i = 0; i < stakingInfo.stakerCount; i++) {
      const isTopStaker = i < 3; // Top 3 are considered top stakers
      
      // Generate stake amounts with realistic distribution
      let amount: number;
      if (i === 0) {
        amount = totalStaked * (0.3 + Math.random() * 0.2); // 30-50% for top staker
      } else if (i < 3) {
        amount = totalStaked * (0.1 + Math.random() * 0.15); // 10-25% for top 3
      } else {
        amount = totalStaked * (0.01 + Math.random() * 0.05); // 1-6% for others
      }
      
      const percentage = (amount / totalStaked) * 100;
      
      stakers.push({
        address: `0x${Math.random().toString(16).substr(2, 40)}`,
        amount,
        percentage,
        joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        ensName: Math.random() > 0.7 ? `user${i + 1}.eth` : undefined,
        isTopStaker,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
      });
    }
    
    return stakers.sort((a, b) => b.amount - a.amount);
  };

  const stakers = generateStakers();
  const displayStakers = showAllStakers ? stakers : stakers.slice(0, maxDisplayStakers);
  const remainingCount = stakers.length - maxDisplayStakers;

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  };

  const formatAddress = (address: string, ensName?: string) => {
    if (ensName) return ensName;
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  const getStakerBadge = (staker: StakerInfo, index: number) => {
    if (index === 0) return { emoji: '🥇', label: 'Top Staker', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' };
    if (index === 1) return { emoji: '🥈', label: '2nd Place', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300' };
    if (index === 2) return { emoji: '🥉', label: '3rd Place', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' };
    if (staker.isTopStaker) return { emoji: '⭐', label: 'Top Staker', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' };
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Stakers ({stakingInfo.stakerCount})
        </h3>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>Total: {formatAmount(stakingInfo.totalStaked)} {token?.symbol || 'tokens'}</span>
        </div>
      </div>

      {/* Stakers list */}
      <div className="space-y-3">
        {displayStakers.map((staker, index) => {
          const badge = getStakerBadge(staker, index);
          
          return (
            <div
              key={staker.address}
              onClick={() => onStakerClick?.(staker.address)}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
                hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                ${onStakerClick ? 'cursor-pointer' : ''}
              `}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* Avatar */}
                {showAvatars && (
                  <div className="relative">
                    <img
                      src={staker.avatar}
                      alt={formatAddress(staker.address, staker.ensName)}
                      className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
                    />
                    {badge && (
                      <div className="absolute -top-1 -right-1 text-xs">
                        {badge.emoji}
                      </div>
                    )}
                  </div>
                )}

                {/* Staker info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {formatAddress(staker.address, staker.ensName)}
                    </span>
                    
                    {badge && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Joined {staker.joinedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Stake amount and percentage */}
              <div className="text-right">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatAmount(staker.amount)} {token?.symbol || ''}
                </div>
                
                {showPercentages && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {staker.percentage.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more/less button */}
      {stakers.length > maxDisplayStakers && (
        <button
          onClick={() => setShowAllStakers(!showAllStakers)}
          className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {showAllStakers 
            ? 'Show Less' 
            : `Show ${remainingCount} More Staker${remainingCount !== 1 ? 's' : ''}`
          }
        </button>
      )}

      {/* Staking distribution chart */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Staking Distribution
        </h4>
        
        <div className="space-y-2">
          {stakers.slice(0, 5).map((staker, index) => (
            <div key={staker.address} className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-500 dark:text-gray-400 truncate">
                {formatAddress(staker.address, staker.ensName)}
              </div>
              
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-blue-400 to-blue-600'
                  }`}
                  style={{ width: `${staker.percentage}%` }}
                />
              </div>
              
              <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                {staker.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
          
          {stakers.length > 5 && (
            <div className="flex items-center space-x-3">
              <div className="w-16 text-xs text-gray-500 dark:text-gray-400">
                Others
              </div>
              
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 transition-all duration-500"
                  style={{ 
                    width: `${stakers.slice(5).reduce((sum, s) => sum + s.percentage, 0)}%` 
                  }}
                />
              </div>
              
              <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                {stakers.slice(5).reduce((sum, s) => sum + s.percentage, 0).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAmount(stakers[0]?.amount || 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Top Stake
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAmount(stakingInfo.totalStaked / stakingInfo.stakerCount)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Avg Stake
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            {((stakers.slice(0, 3).reduce((sum, s) => sum + s.amount, 0) / stakingInfo.totalStaked) * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Top 3 Share
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiStakerDisplay;