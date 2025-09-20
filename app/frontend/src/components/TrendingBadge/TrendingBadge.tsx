import React from 'react';

export type TrendingLevel = 'hot' | 'rising' | 'viral' | 'breaking';

interface TrendingBadgeProps {
  level: TrendingLevel;
  score?: number;
  className?: string;
  showScore?: boolean;
  animated?: boolean;
}

export default function TrendingBadge({
  level,
  score,
  className = '',
  showScore = false,
  animated = true
}: TrendingBadgeProps) {
  const getTrendingConfig = (level: TrendingLevel) => {
    switch (level) {
      case 'hot':
        return {
          icon: '🔥',
          label: 'Hot',
          bgColor: 'bg-gradient-to-r from-orange-500 to-red-500',
          textColor: 'text-white',
          borderColor: 'border-orange-300',
          glowColor: 'shadow-orange-500/50',
          animation: animated ? 'animate-pulse' : ''
        };
      case 'rising':
        return {
          icon: '📈',
          label: 'Rising',
          bgColor: 'bg-gradient-to-r from-green-500 to-emerald-500',
          textColor: 'text-white',
          borderColor: 'border-green-300',
          glowColor: 'shadow-green-500/50',
          animation: animated ? 'animate-bounce' : ''
        };
      case 'viral':
        return {
          icon: '🚀',
          label: 'Viral',
          bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500',
          textColor: 'text-white',
          borderColor: 'border-purple-300',
          glowColor: 'shadow-purple-500/50',
          animation: animated ? 'animate-ping' : ''
        };
      case 'breaking':
        return {
          icon: '⚡',
          label: 'Breaking',
          bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          textColor: 'text-white',
          borderColor: 'border-yellow-300',
          glowColor: 'shadow-yellow-500/50',
          animation: animated ? 'animate-pulse' : ''
        };
      default:
        return {
          icon: '🔥',
          label: 'Trending',
          bgColor: 'bg-gradient-to-r from-gray-500 to-slate-500',
          textColor: 'text-white',
          borderColor: 'border-gray-300',
          glowColor: 'shadow-gray-500/50',
          animation: ''
        };
    }
  };

  const config = getTrendingConfig(level);

  return (
    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold border ${config.bgColor} ${config.textColor} ${config.borderColor} shadow-lg ${config.glowColor} transition-all duration-300 hover:scale-105 ${className}`}>
      {/* Animated Icon */}
      <span className={`${config.animation}`} style={{ animationDuration: '2s' }}>
        {config.icon}
      </span>
      
      {/* Label */}
      <span className="uppercase tracking-wide">
        {config.label}
      </span>
      
      {/* Score */}
      {showScore && score && (
        <>
          <span className="opacity-75">•</span>
          <span className="font-mono">
            {score >= 1000 ? `${(score / 1000).toFixed(1)}K` : score}
          </span>
        </>
      )}
      
      {/* Sparkle Effect for Viral */}
      {level === 'viral' && animated && (
        <div className="relative">
          <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
          <span className="absolute -bottom-1 -left-1 text-xs animate-ping" style={{ animationDelay: '1s' }}>✨</span>
        </div>
      )}
    </div>
  );
}

// Utility function to determine trending level based on engagement metrics
export const calculateTrendingLevel = (
  engagementScore: number,
  timePosted: Date,
  totalReactions: number,
  totalComments: number,
  totalShares: number
): TrendingLevel | null => {
  const hoursAgo = (Date.now() - timePosted.getTime()) / (1000 * 60 * 60);
  const totalEngagement = totalReactions + totalComments + totalShares;
  
  // Breaking: Very high engagement in very short time
  if (hoursAgo <= 1 && engagementScore >= 1000) {
    return 'breaking';
  }
  
  // Viral: Extremely high engagement
  if (engagementScore >= 5000 || totalEngagement >= 500) {
    return 'viral';
  }
  
  // Hot: High engagement recently
  if (hoursAgo <= 6 && engagementScore >= 500) {
    return 'hot';
  }
  
  // Rising: Growing engagement
  if (hoursAgo <= 24 && engagementScore >= 100) {
    return 'rising';
  }
  
  return null;
};

// Component for displaying multiple trending indicators
interface TrendingIndicatorsProps {
  level: TrendingLevel;
  score?: number;
  timePosted: Date;
  className?: string;
}

export function TrendingIndicators({ level, score, timePosted, className = '' }: TrendingIndicatorsProps) {
  const hoursAgo = Math.floor((Date.now() - timePosted.getTime()) / (1000 * 60 * 60));
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <TrendingBadge level={level} score={score} showScore />
      
      {/* Time indicator for recent trending content */}
      {hoursAgo <= 24 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          {hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`}
        </span>
      )}
    </div>
  );
}