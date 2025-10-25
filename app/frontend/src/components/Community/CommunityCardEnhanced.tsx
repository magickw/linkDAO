import React, { useState } from 'react';
import { Community } from '../../models/Community';
import { formatNumber, formatDate } from '../../utils/formatters';
import { motion } from 'framer-motion';

interface TrendingCommunity extends Community {
  trendingScore?: number;
  growthRate?: number;
  activityLevel?: 'low' | 'medium' | 'high';
}

interface CommunityCardProps {
  community: TrendingCommunity;
  onSelect?: (community: Community) => void;
  onJoin?: (communityId: string) => void;
  showTrendingInfo?: boolean;
  compact?: boolean;
  isLoading?: boolean;
}

export const CommunityCardEnhanced: React.FC<CommunityCardProps> = ({
  community,
  onSelect,
  onJoin,
  showTrendingInfo = false,
  compact = false,
  isLoading = false
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onJoin || isJoining) return;

    setIsJoining(true);
    try {
      await onJoin(community.id);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(community);
    }
  };

  const getActivityColor = (level?: string) => {
    switch (level) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getActivityLabel = (level?: string) => {
    switch (level) {
      case 'high': return 'Very Active';
      case 'medium': return 'Active';
      case 'low': return 'Less Active';
      default: return 'Unknown';
    }
  };

  const getTrendingBadge = () => {
    if (!showTrendingInfo || !community.growthRate) return null;

    const isHot = community.growthRate > 50;
    const isRising = community.growthRate > 20;

    if (isHot) {
      return (
        <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center">
          🔥 Hot
        </span>
      );
    } else if (isRising) {
      return (
        <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full flex items-center">
          📈 Rising
        </span>
      );
    }
    return null;
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse ${
          compact ? 'max-w-xs' : ''
        }`}
      >
        <div className={`${compact ? 'h-20' : 'h-32'} bg-gray-200 dark:bg-gray-700`}></div>
        <div className="p-4">
          <div className="flex items-center mb-3">
            <div className={`rounded-full ${compact ? 'w-10 h-10' : 'w-14 h-14'} bg-gray-200 dark:bg-gray-700 -mt-6`}></div>
            <div className="ml-3 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-3"></div>
          <div className="flex flex-wrap gap-1 mb-4">
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="flex justify-between mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-8 flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md ${
        compact ? 'max-w-xs' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
      role="article"
      aria-label={`Community card for ${community.displayName}`}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => e.key === 'Enter' && handleCardClick() : undefined}
    >
      {/* Banner/Header */}
      <div className="relative">
        {community.banner && !imageError ? (
          <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 relative">
            <img
              src={community.banner}
              alt={`${community.displayName} banner`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">{community.avatar || '🏛️'}</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}

        {/* Trending Badge */}
        {getTrendingBadge()}

        {/* Community Avatar */}
        <div className="absolute -bottom-6 left-4">
          <div className="bg-white dark:bg-gray-800 rounded-full p-1">
            <div className={`rounded-full ${compact ? 'w-10 h-10' : 'w-14 h-14'} flex items-center justify-center text-2xl bg-gray-100 dark:bg-gray-700`}>
              {community.avatar ? community.avatar : community.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 pb-4 px-4">
        <div className="mb-3">
          <h3 
            className="text-lg font-bold text-gray-900 dark:text-white truncate"
            aria-label={`Community name: ${community.displayName}`}
          >
            {community.displayName}
          </h3>
          <p 
            className="text-sm text-gray-500 dark:text-gray-400 mb-2"
            aria-label={`Community handle: r/${community.name}`}
          >
            r/{community.name}
          </p>
          
          {!compact && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
              {community.description}
            </p>
          )}

          {/* Tags */}
          {community.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3" aria-label="Community tags">
              {community.tags.slice(0, compact ? 2 : 3).map((tag, index) => (
                <span 
                  key={index} 
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                  aria-label={`Tag: ${tag}`}
                >
                  {tag}
                </span>
              ))}
              {community.tags.length > (compact ? 2 : 3) && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                  +{community.tags.length - (compact ? 2 : 3)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-gray-100 dark:border-gray-700 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatNumber(community.memberCount)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
          </div>
          
          {showTrendingInfo && community.activityLevel && (
            <div className="text-center">
              <div className={`text-lg font-bold ${getActivityColor(community.activityLevel)}`}>
                ●
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getActivityLabel(community.activityLevel)}
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {community.category}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Category</div>
          </div>

          {showTrendingInfo && community.growthRate && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">
                +{community.growthRate}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Growth</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onJoin && (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                isJoining
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
              aria-label={isJoining ? "Joining community..." : "Join community"}
            >
              {isJoining ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join'
              )}
            </button>
          )}

          <button 
            className="flex-1 py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="View community"
          >
            View
          </button>
        </div>

        {/* Footer Info */}
        {!compact && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Created {formatDate(community.createdAt, { format: 'short' })}
            </span>
            
            <div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                community.isPublic 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {community.isPublic ? '🌐 Public' : '🔒 Private'}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CommunityCardEnhanced;