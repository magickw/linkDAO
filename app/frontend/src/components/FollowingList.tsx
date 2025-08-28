import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { useWeb3 } from '@/context/Web3Context';
import { useFollowing } from '@/hooks/useFollow';

interface FollowingListProps {
  userAddress: string;
  className?: string;
}

export default function FollowingList({ userAddress, className = '' }: FollowingListProps) {
  const { address: currentUserAddress } = useWeb3();
  const { following, isLoading, error } = useFollowing(userAddress);

  if (isLoading) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Following</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p>Loading following...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Following</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading following: {error}</p>
        </div>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className={className}>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Following</h2>
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">Not following anyone yet</p>
        </div>
      </div>
    );
  }

  // In a real implementation, we would fetch profile data for each following
  // For now, we'll use mock data
  const mockProfiles: Record<string, any> = {
    '0x1234567890123456789012345678901234567890': {
      handle: 'alexj',
      ens: 'alex.eth',
      avatarCid: 'https://via.placeholder.com/48',
    },
    '0x2345678901234567890123456789012345678901': {
      handle: 'samc',
      ens: 'sam.eth',
      avatarCid: 'https://via.placeholder.com/48',
    },
    '0x3456789012345678901234567890123456789012': {
      handle: 'taylorr',
      ens: 'taylor.eth',
      avatarCid: 'https://via.placeholder.com/48',
    },
  };

  const followingProfiles = following.map(address => ({
    address,
    ...(mockProfiles[address] || { handle: 'Unknown', ens: '', avatarCid: 'https://via.placeholder.com/48' })
  }));

  return (
    <div className={className}>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Following ({following.length})</h2>
      <div className="space-y-4">
        {followingProfiles.map((profile) => (
          <ProfileCard 
            key={profile.address} 
            profile={profile} 
            currentUserAddress={currentUserAddress}
          />
        ))}
      </div>
    </div>
  );
}