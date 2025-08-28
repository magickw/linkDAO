import React from 'react';
import { useFollow, useFollowStatus } from '@/hooks/useFollow';
import { useWeb3 } from '@/context/Web3Context';

interface FollowButtonProps {
  targetUserAddress: string;
  className?: string;
}

export default function FollowButton({ targetUserAddress, className = '' }: FollowButtonProps) {
  const { address: currentUserAddress, isConnected } = useWeb3();
  const { isFollowing, isLoading: isStatusLoading } = useFollowStatus(currentUserAddress, targetUserAddress);
  const { follow, unfollow, isLoading: isActionLoading } = useFollow();

  const handleFollowToggle = async () => {
    if (!isConnected || !currentUserAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      if (isFollowing) {
        await unfollow(currentUserAddress, targetUserAddress);
      } else {
        await follow(currentUserAddress, targetUserAddress);
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      alert('Failed to update follow status. Please try again.');
    }
  };

  const isLoading = isStatusLoading || isActionLoading;

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading || !isConnected}
      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
        isFollowing
          ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          : 'bg-primary-600 text-white hover:bg-primary-700'
      } ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        'Loading...'
      ) : isFollowing ? (
        <>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Following
        </>
      ) : (
        <>
          <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Follow
        </>
      )}
    </button>
  );
}