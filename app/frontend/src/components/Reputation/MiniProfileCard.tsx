import React, { useState } from 'react';
import { MiniProfileData, REPUTATION_LEVELS } from '../../types/reputation';
import BadgeCollection from './BadgeCollection';

interface MiniProfileCardProps {
  profileData: MiniProfileData;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: React.ReactNode;
  showOnHover?: boolean;
  delay?: number;
}

const MiniProfileCard: React.FC<MiniProfileCardProps> = ({
  profileData,
  onFollow,
  onUnfollow,
  onViewProfile,
  position = 'top',
  trigger,
  showOnHover = true,
  delay = 500
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const { user, reputation, stats, isFollowing, mutualConnections } = profileData;

  const currentLevel = REPUTATION_LEVELS.find(
    level => reputation.totalScore >= level.minScore && reputation.totalScore <= level.maxScore
  ) || REPUTATION_LEVELS[0];

  const handleMouseEnter = () => {
    if (showOnHover) {
      const timeout = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      setHoverTimeout(timeout);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsVisible(false);
  };

  const handleFollowClick = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow?.(user.id);
      } else {
        await onFollow?.(user.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getPositionClasses = () => {
    const positions = {
      top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
    };
    return positions[position];
  };

  const getArrowClasses = () => {
    const arrows = {
      top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent',
      bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent',
      left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent',
      right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent'
    };
    return arrows[position];
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Element */}
      {trigger}

      {/* Mini Profile Card */}
      {isVisible && (
        <div className={`
          absolute z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200
          ${getPositionClasses()}
          animate-in fade-in-0 zoom-in-95 duration-200
        `}>
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`} />

          {/* Card Content */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start space-x-3 mb-3">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {/* Online Status */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {user.displayName}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${currentLevel.color} text-white`}>
                    {currentLevel.icon}
                  </span>
                </div>
                <p className="text-sm text-gray-600">@{user.username}</p>
                <p className="text-xs text-gray-500">
                  {user.ensName || formatAddress(user.walletAddress)}
                </p>
              </div>

              {/* Follow Button */}
              <button
                onClick={handleFollowClick}
                disabled={isLoading}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
                  ${isFollowing 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Reputation Level */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {currentLevel.name}
                </span>
                <span className="text-sm text-gray-500">
                  {reputation.totalScore.toLocaleString()} pts
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300`}
                  style={{ 
                    width: `${Math.min(100, (reputation.totalScore / currentLevel.maxScore) * 100)}%`,
                    backgroundColor: currentLevel.color
                  }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {stats.posts}
                </div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {stats.followers}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {stats.following}
                </div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {stats.communities}
                </div>
                <div className="text-xs text-gray-500">Communities</div>
              </div>
            </div>

            {/* Badges */}
            {reputation.badges.length > 0 && (
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Badges</div>
                <BadgeCollection 
                  badges={reputation.badges} 
                  maxDisplay={4}
                  size="small"
                />
              </div>
            )}

            {/* Mutual Connections */}
            {mutualConnections > 0 && (
              <div className="mb-3 text-xs text-gray-500">
                {mutualConnections} mutual connection{mutualConnections !== 1 ? 's' : ''}
              </div>
            )}

            {/* Reputation Breakdown */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Reputation</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">✍️ Content:</span>
                  <span className="font-medium">{reputation.breakdown.posting}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🏛️ Governance:</span>
                  <span className="font-medium">{reputation.breakdown.governance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">👥 Community:</span>
                  <span className="font-medium">{reputation.breakdown.community}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">💰 Trading:</span>
                  <span className="font-medium">{reputation.breakdown.trading}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => onViewProfile?.(user.id)}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                View Profile
              </button>
              <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200">
                Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniProfileCard;