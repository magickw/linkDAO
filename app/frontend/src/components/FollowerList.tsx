import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { useWeb3 } from '@/context/Web3Context';
import { useFollowers } from '@/hooks/useFollow';
import { useProfiles } from '@/hooks/useProfiles';

interface FollowerListProps {
  userAddress: string;
  className?: string;
  isOwnProfile?: boolean;
  isPublicProfile?: boolean;
}

export default function FollowerList({ userAddress, className = '', isOwnProfile = false, isPublicProfile = false }: FollowerListProps) {
  const { address: currentUserAddress } = useWeb3();
  const { data: followers, isLoading, error } = useFollowers(userAddress);
  const { data: followerProfiles, isLoading: isProfilesLoading } = useProfiles(followers as string[] | undefined);

  if (isLoading || isProfilesLoading) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers</h2>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-gray-600 dark:text-gray-300">Loading followers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers</h2>
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          <p>Error loading followers: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!followers || (followers as string[]).length === 0) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers</h2>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No followers yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Followers ({(followers as string[]).length})</h2>
      <div className="space-y-4">
        {followerProfiles?.map((profile) => (
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