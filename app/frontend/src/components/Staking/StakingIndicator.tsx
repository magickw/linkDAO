import React from 'react';
import { StakingInfo } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

interface StakingIndicatorProps {
  stakingInfo: StakingInfo;
  token?: TokenInfo;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export const StakingIndicator: React.FC<StakingIndicatorProps> = ({
  stakingInfo,
  token,
  size = 'md',
  showTooltip = true,
  className = ''
}) => {
  // Color coding system based on staking tier
  const getTierStyles = () => {
    switch (stakingInfo.stakingTier) {
      case 'gold':
        return {
          bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
          text: 'text-yellow-900',
          border: 'border-yellow-500',
          glow: 'shadow-yellow-500/50',
          icon: '🥇'
        };
      case 'silver':
        return {
          bg: 'bg-gradient-to-r from-gray-300 to-gray-500',
          text: 'text-gray-900',
          border: 'border-gray-400',
          glow: 'shadow-gray-500/50',
          icon: '🥈'
        };
      case 'bronze':
        return {
          bg: 'bg-gradient-to-r from-orange-400 to-orange-600',
          text: 'text-orange-900',
          border: 'border-orange-500',
          glow: 'shadow-orange-500/50',
          icon: '🥉'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-200 to-gray-400',
          text: 'text-gray-700',
          border: 'border-gray-300',
          glow: 'shadow-gray-400/30',
          icon: '💰'
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1 text-xs',
          icon: 'text-sm',
          spacing: 'space-x-1'
        };
      case 'lg':
        return {
          container: 'px-4 py-2 text-base',
          icon: 'text-lg',
          spacing: 'space-x-3'
        };
      default:
        return {
          container: 'px-3 py-1.5 text-sm',
          icon: 'text-base',
          spacing: 'space-x-2'
        };
    }
  };

  const tierStyles = getTierStyles();
  const sizeStyles = getSizeStyles();

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(2);
  };

  const tooltipContent = `
    Total Staked: ${formatAmount(stakingInfo.totalStaked)} ${token?.symbol || 'tokens'}
    Stakers: ${stakingInfo.stakerCount}
    Tier: ${stakingInfo.stakingTier.charAt(0).toUpperCase() + stakingInfo.stakingTier.slice(1)}
    ${stakingInfo.userStake ? `Your Stake: ${formatAmount(stakingInfo.userStake)} ${token?.symbol || 'tokens'}` : ''}
  `;

  return (
    <div className="relative group">
      <div
        className={`
          inline-flex items-center ${sizeStyles.spacing} ${sizeStyles.container}
          ${tierStyles.bg} ${tierStyles.text} ${tierStyles.border}
          border-2 rounded-full font-semibold
          shadow-lg ${tierStyles.glow}
          transition-all duration-300 hover:scale-105 hover:shadow-xl
          ${className}
        `}
      >
        {/* Token icon */}
        {token?.logoUrl ? (
          <img
            src={token.logoUrl}
            alt={token.symbol}
            className={`w-4 h-4 rounded-full ${size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}`}
          />
        ) : (
          <span className={sizeStyles.icon}>{tierStyles.icon}</span>
        )}

        {/* Staked amount */}
        <span className="font-bold">
          {formatAmount(stakingInfo.totalStaked)}
        </span>

        {/* Token symbol */}
        {token?.symbol && (
          <span className="opacity-90">
            {token.symbol}
          </span>
        )}

        {/* Staker count */}
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3 opacity-75" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
          </svg>
          <span className="text-xs opacity-90">{stakingInfo.stakerCount}</span>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-pre-line z-10">
          {tooltipContent}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default StakingIndicator;