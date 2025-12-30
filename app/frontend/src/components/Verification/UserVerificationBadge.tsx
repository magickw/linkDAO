/**
 * UserVerificationBadge Component
 * Displays industry-standard verification badges (Blue for individuals, Gold for organizations)
 * Inspired by Twitter/X, Facebook, Instagram verification systems
 */

import React from 'react';

export type VerificationBadgeType = 'blue_check' | 'gold_check' | 'grey_check';

export interface UserVerificationBadgeProps {
  badgeType: VerificationBadgeType;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  verifiedSince?: Date;
  className?: string;
}

interface BadgeConfig {
  icon: string;
  name: string;
  description: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
}

const BADGE_CONFIGS: Record<VerificationBadgeType, BadgeConfig> = {
  blue_check: {
    icon: '✓',
    name: 'Verified Individual',
    description: 'This account represents a real, authentic individual who is notable in their field.',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-600',
    shadowColor: 'shadow-blue-500/30'
  },
  gold_check: {
    icon: '✓',
    name: 'Verified Organization',
    description: 'This account represents a real, authentic business or organization.',
    bgColor: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
    borderColor: 'border-yellow-700',
    shadowColor: 'shadow-yellow-500/30'
  },
  grey_check: {
    icon: '✓',
    name: 'Verified Government',
    description: 'This account represents a government or public institution.',
    bgColor: 'bg-gray-500',
    borderColor: 'border-gray-600',
    shadowColor: 'shadow-gray-500/30'
  }
};

const SIZE_CONFIG = {
  sm: {
    container: 'w-4 h-4 text-xs',
    icon: 'text-xs'
  },
  md: {
    container: 'w-5 h-5 text-sm',
    icon: 'text-sm'
  },
  lg: {
    container: 'w-6 h-6 text-base',
    icon: 'text-base'
  }
};

export const UserVerificationBadge: React.FC<UserVerificationBadgeProps> = ({
  badgeType,
  size = 'md',
  showTooltip = true,
  verifiedSince,
  className = ''
}) => {
  const config = BADGE_CONFIGS[badgeType];
  const sizeConfig = SIZE_CONFIG[size];

  if (!config) return null;

  const badgeElement = (
    <div
      className={`
        inline-flex items-center justify-center rounded-full border-2
        ${config.bgColor} ${config.borderColor}
        ${sizeConfig.container} ${config.shadowColor} shadow-lg
        transition-all duration-300 hover:scale-110 cursor-help
        ${className}
      `}
      title={showTooltip ? config.description : undefined}
    >
      <span className={sizeConfig.icon}>{config.icon}</span>
    </div>
  );

  if (!showTooltip) return badgeElement;

  return (
    <div className="relative inline-block group">
      {badgeElement}
      {/* Tooltip */}
      <div className={`
        absolute bottom-full left-1/2 -translate-x-1/2 mb-2
        px-3 py-2 bg-gray-900 text-white text-xs rounded-lg
        whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-200 z-50 shadow-xl
      `}>
        <div className="font-semibold mb-1">{config.name}</div>
        <div className="text-gray-300">{config.description}</div>
        {verifiedSince && (
          <div className="text-gray-400 mt-1 text-[10px]">
            Verified since {new Date(verifiedSince).toLocaleDateString()}
          </div>
        )}
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
};

export default UserVerificationBadge;