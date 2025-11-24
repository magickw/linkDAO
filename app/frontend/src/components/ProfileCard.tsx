import React from 'react';
import Link from 'next/link';
import FollowButton from '@/components/FollowButton';
import { UserProfile } from '@/models/UserProfile';

interface ProfileCardProps {
  profile: UserProfile;
  currentUserAddress?: string;
  className?: string;
}

export default function ProfileCard({ profile, currentUserAddress, className = '' }: ProfileCardProps) {
  // Don't show follow button for current user's own profile
  const showFollowButton = currentUserAddress && profile.walletAddress !== currentUserAddress;

  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 ${className}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <img
            className="h-12 w-12 rounded-full border-2 border-primary-500"
            src={profile.avatarCid || 'https://placehold.co/48'}
            alt={profile.handle}
          />
        </div>
        <div className="ml-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/public-profile/${profile.walletAddress}`} className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400">
                {profile.handle}
              </Link>
              {profile.ens && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{profile.ens}</div>
              )}
            </div>
            {showFollowButton && (
              <FollowButton
                targetUserAddress={profile.walletAddress}
                className="text-xs px-2 py-1"
              />
            )}
          </div>
          {profile.bioCid && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 truncate">
              {profile.bioCid}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}