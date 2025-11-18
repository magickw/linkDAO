import React from 'react';
import { useFollow, useFollowStatus } from '@/hooks/useFollow';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface FollowButtonProps {
  targetUserAddress: string;
  className?: string;
}

export default function FollowButton({ targetUserAddress, className = '' }: FollowButtonProps) {
  const { address: currentUserAddress, isConnected } = useWeb3();
  const { addToast } = useToast();
  const { data: isFollowing, isLoading: isStatusLoading } = useFollowStatus(currentUserAddress, targetUserAddress);
  const { follow, unfollow, isLoading: isActionLoading } = useFollow();
  
  // Add a safety check for the toast function
  const safeAddToast = (...args: Parameters<typeof addToast>) => {
    if (typeof addToast === 'function') {
      return addToast(...args);
    } else {
      // Fallback to console logging
      console.log(`[Toast Fallback] ${args[1]}: ${args[0]}`);
    }
  };

  const handleFollowToggle = async () => {
    if (!isConnected || !currentUserAddress) {
      safeAddToast('Please connect your wallet first', 'error');
      return;
    }

    try {
      if (isFollowing) {
        await unfollow({ follower: currentUserAddress, following: targetUserAddress });
        safeAddToast('Unfollowed user successfully', 'success');
      } else {
        await follow({ follower: currentUserAddress, following: targetUserAddress });
        safeAddToast('Followed user successfully', 'success');
      }
    } catch (error) {
      console.error('Error toggling follow status:', error);
      safeAddToast('Failed to update follow status. Please try again.', 'error');
    }
  };

  const isLoading = isStatusLoading || isActionLoading;

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading || !isConnected}
      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 ${
        isFollowing
          ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
          : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
      } ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center">
          <span className="h-2 w-2 rounded-full bg-current animate-ping mr-1"></span>
          Loading...
        </span>
      ) : isFollowing ? (
        'Unfollow'
      ) : (
        'Follow'
      )}
    </button>
  );
}