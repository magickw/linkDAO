import React from 'react';

interface CommunityAvatarProps {
  avatar?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Helper function to determine if a string is a URL
 */
function isUrl(str: string): boolean {
  if (!str) return false;
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
}

/**
 * CommunityAvatar component that handles both URL images and emoji avatars
 * Falls back to a gradient with the first letter of the community name
 */
const CommunityAvatar: React.FC<CommunityAvatarProps> = ({
  avatar,
  name,
  size = 'md',
  className = ''
}) => {
  // Size classes mapping
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  const sizeClass = sizeClasses[size];

  // If avatar is a URL, render as image
  if (avatar && isUrl(avatar)) {
    return (
      <img
        src={avatar}
        alt={`${name} avatar`}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
        onError={(e) => {
          // On error, replace with fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  // If avatar is an emoji (short string, not a URL), render as text
  if (avatar && avatar.length <= 4 && !isUrl(avatar)) {
    return (
      <span className={`${sizeClass} flex items-center justify-center flex-shrink-0 ${className}`}>
        {avatar}
      </span>
    );
  }

  // Fallback: gradient with first letter
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 ${className}`}>
      <span className="text-white font-semibold">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

export default CommunityAvatar;
