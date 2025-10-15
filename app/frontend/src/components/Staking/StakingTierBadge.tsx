import React from 'react';
import { StakingInfo } from '@/types/tokenActivity';

interface StakingTierBadgeProps {
  stakingInfo: StakingInfo;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StakingTierBadge: React.FC<StakingTierBadgeProps> = ({
  stakingInfo,
  showLabel = true,
  size = 'md',
  className = ''
}) => {
  const getTierConfig = () => {
    switch (stakingInfo.stakingTier) {
      case 'gold':
        return {
          gradient: 'from-yellow-400 via-yellow-500 to-yellow-600',
          textColor: 'text-yellow-900',
          borderColor: 'border-yellow-500',
          shadowColor: 'shadow-yellow-500/50',
          glowColor: 'shadow-yellow-400/75',
          icon: '🥇',
          label: 'Gold Tier',
          description: 'High-value staking (>100 tokens)',
          animation: 'animate-pulse'
        };
      case 'silver':
        return {
          gradient: 'from-gray-300 via-gray-400 to-gray-500',
          textColor: 'text-gray-900',
          borderColor: 'border-gray-400',
          shadowColor: 'shadow-gray-500/50',
          glowColor: 'shadow-gray-400/75',
          icon: '🥈',
          label: 'Silver Tier',
          description: 'Medium staking (10-100 tokens)',
          animation: ''
        };
      case 'bronze':
        return {
          gradient: 'from-orange-400 via-orange-500 to-orange-600',
          textColor: 'text-orange-900',
          borderColor: 'border-orange-500',
          shadowColor: 'shadow-orange-500/50',
          glowColor: 'shadow-orange-400/75',
          icon: '🥉',
          label: 'Bronze Tier',
          description: 'Low staking (1-10 tokens)',
          animation: ''
        };
      default:
        return {
          gradient: 'from-gray-200 via-gray-300 to-gray-400',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-300',
          shadowColor: 'shadow-gray-400/30',
          glowColor: 'shadow-gray-300/50',
          icon: '💰',
          label: 'No Staking',
          description: 'No tokens staked',
          animation: ''
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-6 h-6',
          icon: 'text-xs',
          text: 'text-xs',
          padding: 'p-1'
        };
      case 'lg':
        return {
          container: 'w-12 h-12',
          icon: 'text-xl',
          text: 'text-base',
          padding: 'p-3'
        };
      default:
        return {
          container: 'w-8 h-8',
          icon: 'text-sm',
          text: 'text-sm',
          padding: 'p-2'
        };
    }
  };

  const tierConfig = getTierConfig();
  const sizeConfig = getSizeConfig();

  return (
    <div className="relative group">
      {/* Main badge */}
      <div
        className={`
          inline-flex items-center justify-center
          ${sizeConfig.container} ${sizeConfig.padding}
          bg-gradient-to-br ${tierConfig.gradient}
          ${tierConfig.textColor} ${tierConfig.borderColor}
          border-2 rounded-full font-bold
          shadow-lg ${tierConfig.shadowColor}
          hover:shadow-xl hover:${tierConfig.glowColor}
          transition-all duration-300 hover:scale-110
          ${tierConfig.animation}
          ${className}
        `}
      >
        <span className={sizeConfig.icon}>{tierConfig.icon}</span>
      </div>

      {/* Label (if enabled) */}
      {showLabel && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
          <span className={`${sizeConfig.text} font-medium ${tierConfig.textColor} whitespace-nowrap`}>
            {tierConfig.label}
          </span>
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
        <div className="font-semibold">{tierConfig.label}</div>
        <div className="text-gray-300">{tierConfig.description}</div>
        <div className="text-gray-400 mt-1">
          Total: {stakingInfo.totalStaked.toFixed(2)} tokens
        </div>
        {stakingInfo.userStake && (
          <div className="text-blue-300">
            Your stake: {stakingInfo.userStake.toFixed(2)} tokens
          </div>
        )}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default StakingTierBadge;