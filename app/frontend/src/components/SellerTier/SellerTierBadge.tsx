/**
 * SellerTierBadge Component
 * Visual representation of seller tier status with icons and colors
 */

import React from 'react';

export type SellerTier = 'unverified' | 'standard' | 'verified' | 'premium';

interface SellerTierBadgeProps {
  tier: SellerTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  unverified: {
    icon: '🔒',
    name: 'Unverified',
    bgColor: 'bg-gradient-to-br from-gray-400 to-gray-600',
    borderColor: 'border-gray-600',
    textColor: 'text-white',
    shadowColor: 'shadow-gray-400/20'
  },
  standard: {
    icon: '⭐',
    name: 'Standard',
    bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
    borderColor: 'border-blue-600',
    textColor: 'text-white',
    shadowColor: 'shadow-blue-500/20'
  },
  verified: {
    icon: '✅',
    name: 'Verified',
    bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    borderColor: 'border-green-600',
    textColor: 'text-white',
    shadowColor: 'shadow-green-500/20'
  },
  premium: {
    icon: '👑',
    name: 'Premium',
    bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700',
    borderColor: 'border-purple-700',
    textColor: 'text-white',
    shadowColor: 'shadow-purple-500/20'
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