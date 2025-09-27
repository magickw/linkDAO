import React, { useState } from 'react';
import { Badge, BadgeRarity } from '../../types/reputation';

interface BadgeCollectionProps {
  badges: Badge[];
  onBadgeClick?: (badge: Badge) => void;
  maxDisplay?: number;
  showAll?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const BadgeCollection: React.FC<BadgeCollectionProps> = ({
  badges,
  onBadgeClick,
  maxDisplay = 6,
  showAll = false,
  size = 'medium'
}) => {
  const [showAllBadges, setShowAllBadges] = useState(showAll);
  
  const displayedBadges = showAllBadges ? badges : badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  const getRarityStyles = (rarity: BadgeRarity) => {
    const styles = {
      common: {
        border: 'border-gray-300',
        bg: 'bg-gray-50',
        glow: 'shadow-sm',
        text: 'text-gray-700'
      },
      rare: {
        border: 'border-blue-400',
        bg: 'bg-blue-50',
        glow: 'shadow-blue-200 shadow-md',
        text: 'text-blue-700'
      },
      epic: {
        border: 'border-purple-400',
        bg: 'bg-purple-50',
        glow: 'shadow-purple-200 shadow-lg',
        text: 'text-purple-700'
      },
      legendary: {
        border: 'border-yellow-400',
        bg: 'bg-yellow-50',
        glow: 'shadow-yellow-200 shadow-xl',
        text: 'text-yellow-700'
      }
    };
    return styles[rarity];
  };

  const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
    const styles = {
      small: {
        container: 'w-8 h-8',
        icon: 'text-sm',
        tooltip: 'text-xs'
      },
      medium: {
        container: 'w-12 h-12',
        icon: 'text-lg',
        tooltip: 'text-sm'
      },
      large: {
        container: 'w-16 h-16',
        icon: 'text-2xl',
        tooltip: 'text-base'
      }
    };
    return styles[size];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="badge-collection">
      <div className="flex flex-wrap gap-2">
        {displayedBadges.map((badge) => {
          const rarityStyles = getRarityStyles(badge.rarity);
          const sizeStyles = getSizeStyles(size);
          
          return (
            <div
              key={badge.id}
              className={`
                relative group cursor-pointer transition-all duration-200
                ${sizeStyles.container}
                ${rarityStyles.bg}
                ${rarityStyles.border}
                ${rarityStyles.glow}
                border-2 rounded-full flex items-center justify-center
                hover:scale-110 hover:z-10
              `}
              onClick={() => onBadgeClick?.(badge)}
            >
              {/* Badge Icon */}
              <span className={`${sizeStyles.icon}`}>
                {badge.icon}
              </span>

              {/* Rarity Indicator */}
              <div className={`
                absolute -top-1 -right-1 w-3 h-3 rounded-full
                ${badge.rarity === 'legendary' ? 'bg-yellow-400' : ''}
                ${badge.rarity === 'epic' ? 'bg-purple-400' : ''}
                ${badge.rarity === 'rare' ? 'bg-blue-400' : ''}
                ${badge.rarity === 'common' ? 'bg-gray-400' : ''}
              `} />

              {/* Tooltip */}
              <div className={`
                absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                bg-gray-900 text-white rounded-lg px-3 py-2 whitespace-nowrap
                ${sizeStyles.tooltip} z-20 pointer-events-none
              `}>
                <div className="font-semibold">{badge.name}</div>
                <div className="text-gray-300">{badge.description}</div>
                <div className="text-gray-400 text-xs mt-1">
                  Earned {formatDate(badge.earnedAt)}
                </div>
                <div className={`
                  text-xs px-2 py-1 rounded-full mt-1 inline-block
                  ${badge.rarity === 'legendary' ? 'bg-yellow-600' : ''}
                  ${badge.rarity === 'epic' ? 'bg-purple-600' : ''}
                  ${badge.rarity === 'rare' ? 'bg-blue-600' : ''}
                  ${badge.rarity === 'common' ? 'bg-gray-600' : ''}
                `}>
                  {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
                </div>
                
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          );
        })}

        {/* Show More Button */}
        {!showAllBadges && remainingCount > 0 && (
          (() => {
            const btnSize = getSizeStyles(size);
            return (
              <button
                onClick={() => setShowAllBadges(true)}
                className={`
                  ${btnSize.container}
                  bg-gray-100 border-2 border-gray-300 rounded-full
                  flex items-center justify-center text-gray-600
                  hover:bg-gray-200 transition-colors duration-200
                  ${btnSize.icon}
                `}
              >
                +{remainingCount}
              </button>
            );
          })()
        )}

        {/* Show Less Button */}
        {showAllBadges && badges.length > maxDisplay && (
          (() => {
            const btnSize = getSizeStyles(size);
            return (
              <button
                onClick={() => setShowAllBadges(false)}
                className={`
                  ${btnSize.container}
                  bg-gray-100 border-2 border-gray-300 rounded-full
                  flex items-center justify-center text-gray-600
                  hover:bg-gray-200 transition-colors duration-200
                  ${btnSize.icon}
                `}
              >
                −
              </button>
            );
          })()
        )}
      </div>

      {/* Badge Categories Legend (for large collections) */}
      {badges.length > 10 && showAllBadges && (
        <div className="mt-4 text-xs text-gray-500">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span>Common</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>Rare</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full" />
              <span>Epic</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Legendary</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeCollection;