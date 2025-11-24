import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { useWeb3 } from '@/context/Web3Context';
import { useFollowing } from '@/hooks/useFollow';
import { useProfiles } from '@/hooks/useProfiles';

interface FollowingListProps {
  userAddress: string;
  className?: string;
  isOwnProfile?: boolean;
  isPublicProfile?: boolean;
}

export default function FollowingList({ userAddress, className = '', isOwnProfile = false, isPublicProfile = false }: FollowingListProps) {
  const { address: currentUserAddress } = useWeb3();
  const { data: following, isLoading, error } = useFollowing(userAddress);
  const { data: followingProfiles, isLoading: isProfilesLoading } = useProfiles(following as string[] | undefined);

  // Debug logging
  console.log('[FollowingList] Debug:', {
    userAddress,
    following,
    followingLength: following?.length,
    followingProfiles,
    followingProfilesLength: followingProfiles?.length,
    isLoading,
    isProfilesLoading,
    error
  });

  if (isLoading || isProfilesLoading) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following</h2>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-gray-600 dark:text-gray-300">Loading following...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following</h2>
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          <p>Error loading following: {errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!following || (following as string[]).length === 0) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following</h2>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">Not following anyone yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Following ({(following as string[]).length})</h2>
      <div className="space-y-4">
        {followingProfiles?.map((profile) => (
          <ProfileCard
            key={profile.walletAddress}
            profile={profile}
            currentUserAddress={currentUserAddress}
          />
        ))}
      </div>
    </div>
  );
}