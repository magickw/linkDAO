import React, { useState } from 'react';
import { StakingInfo } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

interface StakingTooltipProps {
  stakingInfo: StakingInfo;
  token?: TokenInfo;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showMechanics?: boolean;
  className?: string;
}

export const StakingTooltip: React.FC<StakingTooltipProps> = ({
  stakingInfo,
  token,
  children,
  position = 'top',
  showMechanics = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return {
          container: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
          arrow: 'bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900'
        };
      case 'left':
        return {
          container: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
          arrow: 'left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900'
        };
      case 'right':
        return {
          container: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
          arrow: 'right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900'
        };
      default: // top
        return {
          container: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
          arrow: 'top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900'
        };
    }
  };

  const positionClasses = getPositionClasses();

  const getTierDescription = () => {
    switch (stakingInfo.stakingTier) {
      case 'gold':
        return 'High-value staking tier with maximum visibility boost';
      case 'silver':
        return 'Medium staking tier with good visibility boost';
      case 'bronze':
        return 'Entry-level staking tier with basic visibility boost';
      default:
        return 'No staking - post has standard visibility';
    }
  };

  const getStakingMechanics = () => {
    if (!showMechanics) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-300 font-semibold mb-2">How Staking Works:</div>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• Users stake tokens to boost post visibility</div>
          <div>• Higher stakes = better ranking in feeds</div>
          <div>• Stakers earn rewards from engagement</div>
          <div>• Tokens can be unstaked anytime</div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div className={`absolute ${positionClasses.container} z-30`}>
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 max-w-xs">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-sm">Staking Information</span>
            </div>

            {/* Main stats */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Total Staked:</span>
                <span className="font-semibold text-sm">
                  {formatAmount(stakingInfo.totalStaked)} {token?.symbol || 'tokens'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Stakers:</span>
                <span className="font-semibold text-sm">{stakingInfo.stakerCount}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-xs">Tier:</span>
                <span className={`font-semibold text-sm capitalize ${
                  stakingInfo.stakingTier === 'gold' ? 'text-yellow-400' :
                  stakingInfo.stakingTier === 'silver' ? 'text-gray-300' :
                  stakingInfo.stakingTier === 'bronze' ? 'text-orange-400' :
                  'text-gray-400'
                }`}>
                  {stakingInfo.stakingTier}
                </span>
              </div>

              {stakingInfo.userStake && stakingInfo.userStake > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <span className="text-blue-300 text-xs">Your Stake:</span>
                  <span className="font-semibold text-sm text-blue-300">
                    {formatAmount(stakingInfo.userStake)} {token?.symbol || 'tokens'}
                  </span>
                </div>
              )}

              {stakingInfo.potentialRewards && stakingInfo.potentialRewards > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-green-300 text-xs">Potential Rewards:</span>
                  <span className="font-semibold text-sm text-green-300">
                    {formatAmount(stakingInfo.potentialRewards)} {token?.symbol || 'tokens'}
                  </span>
                </div>
              )}
            </div>

            {/* Tier description */}
            <div className="text-xs text-gray-400 mb-2">
              {getTierDescription()}
            </div>

            {/* Staking mechanics explanation */}
            {getStakingMechanics()}

            {/* Arrow */}
            <div className={`absolute ${positionClasses.arrow}`}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakingTooltip;