import React from 'react';
import { UserProfile } from '@/models/UserProfile';

interface EnhancedUserCardProps {
  user: UserProfile | null;
  address: string | undefined;
  profile: UserProfile | null;
  onClick?: () => void;
  className?: string;
}

export const EnhancedUserCard: React.FC<EnhancedUserCardProps> = ({
  user,
  address,
  profile,
  onClick,
  className = ''
}) => {
  // Use profile data if available, otherwise fall back to wallet address
  const displayName = profile?.handle || profile?.ens || (address ? `User ${address.slice(0, 6)}...${address.slice(-4)}` : 'Anonymous');
  const username = profile?.handle ? `@${profile.handle}` : profile?.ens || (address ? address.slice(0, 10) : '');
  const avatar = profile?.avatarCid || '';

  // Get reputation score from profile if available
  const reputationScore = (profile as any)?.reputationScore || null;

  return (
    <div
      className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={displayName}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {username}
        </div>
        {reputationScore !== null && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Reputation: {reputationScore}
          </div>
        )}
      </div>
    </div>
  );
};