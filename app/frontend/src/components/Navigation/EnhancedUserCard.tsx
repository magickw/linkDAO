import React, { useState } from 'react';
import { EnhancedUserProfile } from '@/types/navigation';

interface EnhancedUserCardProps {
  user: EnhancedUserProfile;
  balance?: string;
  isCollapsed?: boolean;
  onProfileClick?: () => void;
  className?: string;
}

export default function EnhancedUserCard({
  user,
  balance = '0.00',
  isCollapsed = false,
  onProfileClick,
  className = ''
}: EnhancedUserCardProps) {
  const [showBadgeTooltip, setShowBadgeTooltip] = useState<string | null>(null);

  const getReputationColor = (level: number) => {
    if (level >= 10) return 'from-purple-500 to-pink-500';
    if (level >= 7) return 'from-blue-500 to-purple-500';
    if (level >= 4) return 'from-green-500 to-blue-500';
    return 'from-gray-400 to-gray-500';
  };

  const getBadgeRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900';
      case 'epic': return 'text-purple-500 bg-purple-100 dark:bg-purple-900';
      case 'rare': return 'text-blue-500 bg-blue-100 dark:bg-blue-900';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-700';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (isCollapsed) {
    return (
      <div className={`flex justify-center ${className}`}>
        <button
          onClick={onProfileClick}
          className="relative group"
        >
          <div className={`w-8 h-8 bg-gradient-to-br ${getReputationColor(user.reputation.level.level)} rounded-full flex items-center justify-center text-white text-sm font-semibold transition-transform group-hover:scale-110`}>
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          
          {/* Online Status */}
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          
          {/* Level Badge */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {user.reputation.level.level}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* User Avatar and Basic Info */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onProfileClick}
          className="relative group"
        >
          <div className={`w-12 h-12 bg-gradient-to-br ${getReputationColor(user.reputation.level.level)} rounded-full flex items-center justify-center text-white font-semibold text-lg transition-transform group-hover:scale-105`}>
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
          </div>
          
          {/* Online Status */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          
          {/* Level Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {user.reputation.level.level}
          </div>
        </button>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {user.displayName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.ensName || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {balance} ETH
          </p>
        </div>
      </div>

      {/* Reputation Level and Progress */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {user.reputation.level.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.reputation.totalScore} pts
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(
              ((user.reputation.totalScore - user.reputation.level.minScore) / 
               (user.reputation.level.maxScore - user.reputation.level.minScore)) * 100
            )}`}
            style={{
              width: `${Math.min(100, ((user.reputation.totalScore - user.reputation.level.minScore) / 
                      (user.reputation.level.maxScore - user.reputation.level.minScore)) * 100)}%`
            }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {user.reputation.level.maxScore - user.reputation.totalScore} pts to next level
        </div>
      </div>

      {/* Badges */}
      {user.badges.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Badges ({user.badges.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {user.badges.slice(0, 6).map((badge) => (
              <div
                key={badge.id}
                className="relative"
                onMouseEnter={() => setShowBadgeTooltip(badge.id)}
                onMouseLeave={() => setShowBadgeTooltip(null)}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${getBadgeRarityColor(badge.rarity)} cursor-help`}>
                  {badge.icon}
                </div>
                
                {/* Badge Tooltip */}
                {showBadgeTooltip === badge.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    <div className="font-semibold">{badge.name}</div>
                    <div className="text-gray-300">{badge.description}</div>
                    <div className="text-gray-400 mt-1">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {user.badges.length > 6 && (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
                +{user.badges.length - 6}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(user.posts)}
          </div>
          <div className="text-gray-500 dark:text-gray-400">Posts</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(user.following)}
          </div>
          <div className="text-gray-500 dark:text-gray-400">Following</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatNumber(user.followers)}
          </div>
          <div className="text-gray-500 dark:text-gray-400">Followers</div>
        </div>
      </div>

      {/* Activity Score */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Activity Score</span>
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
            <div 
              className="h-1 bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, user.activityScore)}%` }}
            ></div>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {user.activityScore}%
          </span>
        </div>
      </div>
    </div>
  );
}