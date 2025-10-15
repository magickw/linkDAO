import React from 'react';
import { Vote, Zap, Users, Crown } from 'lucide-react';

interface VotingPowerIndicatorProps {
  votingPower: number;
  maxVotingPower?: number;
  participationLevel?: 'low' | 'medium' | 'high' | 'very-high';
  showPercentage?: boolean;
  showLevel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'bar' | 'icon-only';
  className?: string;
}

/**
 * VotingPowerIndicator Component
 * 
 * Displays user's voting power and governance participation level.
 * Supports different visualization modes and sizes.
 * 
 * Requirements: 1.6 (voting power and governance participation level displays)
 */
export const VotingPowerIndicator: React.FC<VotingPowerIndicatorProps> = ({
  votingPower,
  maxVotingPower = 100,
  participationLevel = 'low',
  showPercentage = false,
  showLevel = false,
  size = 'sm',
  variant = 'badge',
  className = ''
}) => {
  const getParticipationConfig = (level: 'low' | 'medium' | 'high' | 'very-high') => {
    switch (level) {
      case 'very-high':
        return {
          icon: Crown,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          borderColor: 'border-purple-200 dark:border-purple-800',
          label: 'Very High',
          barColor: 'bg-purple-500'
        };
      case 'high':
        return {
          icon: Zap,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
          label: 'High',
          barColor: 'bg-green-500'
        };
      case 'medium':
        return {
          icon: Vote,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          label: 'Medium',
          barColor: 'bg-yellow-500'
        };
      case 'low':
      default:
        return {
          icon: Users,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          borderColor: 'border-gray-200 dark:border-gray-800',
          label: 'Low',
          barColor: 'bg-gray-500'
        };
    }
  };

  const getSizeConfig = (size: 'xs' | 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'xs':
        return {
          container: 'px-1.5 py-0.5',
          icon: 'w-3 h-3',
          text: 'text-xs',
          bar: 'h-1'
        };
      case 'sm':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs',
          bar: 'h-1.5'
        };
      case 'md':
        return {
          container: 'px-3 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-sm',
          bar: 'h-2'
        };
      case 'lg':
        return {
          container: 'px-4 py-2',
          icon: 'w-5 h-5',
          text: 'text-base',
          bar: 'h-2.5'
        };
      default:
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs',
          bar: 'h-1.5'
        };
    }
  };

  const participationConfig = getParticipationConfig(participationLevel);
  const sizeConfig = getSizeConfig(size);
  const { icon: ParticipationIcon } = participationConfig;
  
  const percentage = maxVotingPower > 0 ? (votingPower / maxVotingPower) * 100 : 0;
  const formattedPower = votingPower >= 1000 ? `${(votingPower / 1000).toFixed(1)}K` : votingPower.toString();

  if (variant === 'icon-only') {
    return (
      <div
        className={`
          inline-flex items-center justify-center rounded-full
          ${participationConfig.bgColor} ${sizeConfig.container}
          ${className}
        `}
        title={`Voting Power: ${votingPower.toLocaleString()} (${participationConfig.label} participation)`}
      >
        <ParticipationIcon className={`${sizeConfig.icon} ${participationConfig.color}`} />
      </div>
    );
  }

  if (variant === 'bar') {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <ParticipationIcon className={`${sizeConfig.icon} ${participationConfig.color}`} />
            <span className={`${sizeConfig.text} font-medium text-gray-900 dark:text-white`}>
              Voting Power
            </span>
          </div>
          <span className={`${sizeConfig.text} ${participationConfig.color} font-medium`}>
            {formattedPower}
            {showPercentage && ` (${percentage.toFixed(1)}%)`}
          </span>
        </div>
        
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeConfig.bar}`}>
          <div
            className={`${sizeConfig.bar} ${participationConfig.barColor} rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        {showLevel && (
          <div className="flex justify-between items-center">
            <span className={`${sizeConfig.text} text-gray-500 dark:text-gray-400`}>
              Participation: {participationConfig.label}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <div
      className={`
        inline-flex items-center space-x-1.5 rounded-full border font-medium
        ${participationConfig.bgColor} ${participationConfig.borderColor}
        ${participationConfig.color} ${sizeConfig.container}
        ${className}
      `}
      title={`Voting Power: ${votingPower.toLocaleString()} (${participationConfig.label} participation)`}
    >
      <ParticipationIcon className={sizeConfig.icon} />
      <span className={sizeConfig.text}>
        {formattedPower}
        {showPercentage && ` (${percentage.toFixed(1)}%)`}
      </span>
      {showLevel && (
        <span className={`${sizeConfig.text} opacity-75`}>
          {participationConfig.label}
        </span>
      )}
    </div>
  );
};

export default VotingPowerIndicator;