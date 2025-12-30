/**
 * SellerTierBadge Component
 * Visual representation of seller tier status with icons and colors
 */

import React from 'react';

export type SellerTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface SellerTierBadgeProps {
  tier: SellerTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  bronze: {
    icon: '🥉',
    name: 'Bronze',
    bgColor: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600',
    borderColor: 'border-orange-700',
    textColor: 'text-white',
    shadowColor: 'shadow-orange-500/30'
  },
  silver: {
    icon: '🥈',
    name: 'Silver',
    bgColor: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
    borderColor: 'border-gray-600',
    textColor: 'text-gray-900',
    shadowColor: 'shadow-gray-400/30'
  },
  gold: {
    icon: '🥇',
    name: 'Gold',
    bgColor: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
    borderColor: 'border-yellow-700',
    textColor: 'text-gray-900',
    shadowColor: 'shadow-yellow-500/30'
  },
  platinum: {
    icon: '💎',
    name: 'Platinum',
    bgColor: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500',
    borderColor: 'border-slate-600',
    textColor: 'text-white',
    shadowColor: 'shadow-slate-400/30'
  },
  diamond: {
    icon: '👑',
    name: 'Diamond',
    bgColor: 'bg-gradient-to-br from-cyan-300 via-blue-400 to-indigo-500',
    borderColor: 'border-indigo-600',
    textColor: 'text-white',
    shadowColor: 'shadow-cyan-400/40'
  }
};

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'text-base'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'text-lg'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'text-xl'
  }
};

export const SellerTierBadge: React.FC<SellerTierBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div 
      className={`
        inline-flex items-center gap-2 font-semibold rounded-full border-2
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        ${sizeConfig.container} ${config.shadowColor} shadow-lg
        transition-all duration-300 hover:scale-105
        ${className}
      `}
    >
      <span className={sizeConfig.icon}>{config.icon}</span>
      {showLabel && (
        <span>{config.name}</span>
      )}
    </div>
  );
};

export default SellerTierBadge;