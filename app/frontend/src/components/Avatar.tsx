import React, { useState, useEffect } from 'react';
import avatarService from '../services/avatarService';

interface AvatarProps {
  userId?: string;
  userHandle?: string;
  walletAddress?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xlarge' | number;
  className?: string;
  alt?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  lazy?: boolean;
  onClick?: () => void;
}

export default function Avatar({
  userId,
  userHandle,
  walletAddress,
  avatarUrl,
  size = 'md',
  className = '',
  alt,
  showOnlineStatus = false,
  isOnline = false,
  lazy = true,
  onClick,
}: AvatarProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine identifier for fallback avatar
  const identifier = userId || userHandle || walletAddress || 'unknown';

  // Size mapping
  const sizeMap = {
    sm: 40,
    md: 80,
    lg: 160,
    xlarge: 320,
  };

  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  const sizeClass = `w-${Math.floor(pixelSize / 4)} h-${Math.floor(pixelSize / 4)}`;

  useEffect(() => {
    const loadAvatar = async () => {
      setIsLoading(true);
      setImageError(false);

      try {
        let url = avatarUrl;

        // If no direct URL provided, try to fetch from service
        if (!url && userId) {
          const sizeKey = typeof size === 'string' ? size : 'md';
          url = await avatarService.getUserAvatarUrl(userId, sizeKey);
        }

        // Fallback to default avatar
        if (!url) {
          url = avatarService.generateDefaultAvatar(identifier, typeof size === 'string' ? size : 'md');
        }

        setImageUrl(url);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setImageUrl(avatarService.generateDefaultAvatar(identifier, typeof size === 'string' ? size : 'md'));
        setImageError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, [userId, userHandle, walletAddress, avatarUrl, size, identifier]);

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      setImageUrl(avatarService.generateDefaultAvatar(identifier, typeof size === 'string' ? size : 'md'));
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div
      className={`relative inline-block ${sizeClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
          style={{ width: pixelSize, height: pixelSize }}
        />
      )}

      {/* Avatar image */}
      <img
        src={imageUrl}
        alt={alt || `Avatar for ${userHandle || identifier}`}
        className={`
          rounded-full 
          object-cover 
          transition-opacity 
          duration-200
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        style={{ width: pixelSize, height: pixelSize }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading={lazy ? 'lazy' : 'eager'}
      />

      {/* Online status indicator */}
      {showOnlineStatus && (
        <div
          className={`
            absolute 
            bottom-0 
            right-0 
            rounded-full 
            border-2 
            border-white 
            dark:border-gray-800
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
          style={{
            width: Math.max(8, pixelSize * 0.2),
            height: Math.max(8, pixelSize * 0.2),
          }}
        />
      )}

      {/* Hover effect */}
      {onClick && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-full" />
      )}
    </div>
  );
}

// Avatar group component for displaying multiple avatars
interface AvatarGroupProps {
  users: Array<{
    userId?: string;
    userHandle?: string;
    walletAddress?: string;
    avatarUrl?: string;
  }>;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onOverflowClick?: () => void;
}

export function AvatarGroup({
  users,
  maxVisible = 3,
  size = 'sm',
  className = '',
  onOverflowClick,
}: AvatarGroupProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const overflowCount = users.length - maxVisible;

  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const pixelSize = sizeMap[size];
  const overlap = pixelSize * 0.25; // 25% overlap

  return (
    <div className={`flex items-center ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.userId || user.userHandle || user.walletAddress || index}
          className="relative"
          style={{
            marginLeft: index > 0 ? -overlap : 0,
            zIndex: visibleUsers.length - index,
          }}
        >
          <Avatar
            {...user}
            size={pixelSize}
            className="border-2 border-white dark:border-gray-800"
          />
        </div>
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <div
          className={`
            relative
            bg-gray-200 
            dark:bg-gray-700 
            rounded-full 
            border-2 
            border-white 
            dark:border-gray-800
            flex 
            items-center 
            justify-center
            text-xs 
            font-medium 
            text-gray-600 
            dark:text-gray-300
            ${onOverflowClick ? 'cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600' : ''}
          `}
          style={{
            width: pixelSize,
            height: pixelSize,
            marginLeft: -overlap,
            zIndex: 0,
          }}
          onClick={onOverflowClick}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}

// Avatar with badge component
interface AvatarWithBadgeProps extends AvatarProps {
  badge?: {
    content: string | number;
    color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple';
    position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  };
}

export function AvatarWithBadge({ badge, ...avatarProps }: AvatarWithBadgeProps) {
  const badgeColors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  const badgePositions = {
    'top-right': 'top-0 right-0',
    'bottom-right': 'bottom-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-left': 'bottom-0 left-0',
  };

  return (
    <div className="relative inline-block">
      <Avatar {...avatarProps} />

      {badge && (
        <div
          className={`
            absolute 
            ${badgePositions[badge.position || 'top-right']}
            ${badgeColors[badge.color || 'red']}
            text-white 
            text-xs 
            font-bold 
            rounded-full 
            min-w-[1.25rem] 
            h-5 
            flex 
            items-center 
            justify-center 
            px-1
            border-2 
            border-white 
            dark:border-gray-800
          `}
        >
          {badge.content}
        </div>
      )}
    </div>
  );
}