import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { communityWeb3Service } from '@/services/communityWeb3Service';

interface StakingVoteButtonProps {
  postId: string;
  communityId: string;
  voteType: 'upvote' | 'downvote';
  currentVote?: 'upvote' | 'downvote' | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function StakingVoteButton({
  postId,
  communityId,
  voteType,
  currentVote,
  onVote,
  disabled = false,
  className = ''
}: StakingVoteButtonProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [showStakeInput, setShowStakeInput] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('1');
  const [isStaking, setIsStaking] = useState(false);
  const [canStake, setCanStake] = useState(false);
  const [requiredStake, setRequiredStake] = useState<string>('0');
  const [userStake, setUserStake] = useState<string>('0');

  // Check staking requirements when component mounts
  useEffect(() => {
    if (address && communityId) {
      checkStakingRequirements();
    }
  }, [address, communityId]);

  const checkStakingRequirements = async () => {
    try {
      const result = await communityWeb3Service.checkStakingRequirement(
        communityId,
        address!,
        'vote'
      );
      
      setCanStake(result.canPerform);
      setRequiredStake(result.requiredStake || '0');
      setUserStake(result.currentStake || '0');
    } catch (error) {
      console.error('Error checking staking requirements:', error);
    }
  };

  const handleVoteClick = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (!canStake) {
      addToast(`You need to stake at least ${requiredStake} tokens to vote`, 'error');
      return;
    }

    // If it's a simple vote (no staking), call onVote directly
    if (parseFloat(requiredStake) === 0) {
      onVote(postId, voteType);
      return;
    }

    // Show staking input for communities that require staking
    setShowStakeInput(true);
  };

  const handleStakeAndVote = async () => {
    if (!address || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      addToast('Please enter a valid stake amount', 'error');
      return;
    }

    try {
      setIsStaking(true);

      // Stake tokens on the vote
      const txHash = await communityWeb3Service.stakeOnVote({
        postId,
        voteType,
        stakeAmount,
        tokenAddress: '0x...' // This would be the community's governance token
      });

      addToast(`Successfully staked ${stakeAmount} tokens on ${voteType}!`, 'success');
      
      // Call the parent vote handler with stake amount
      onVote(postId, voteType, stakeAmount);
      
      setShowStakeInput(false);
      setStakeAmount('1');
    } catch (error) {
      console.error('Error staking on vote:', error);
      addToast('Failed to stake tokens. Please try again.', 'error');
    } finally {
      setIsStaking(false);
    }
  };

  const isActive = currentVote === voteType;
  const isUpvote = voteType === 'upvote';

  return (
    <div className="relative">
      {/* Vote Button */}
      <button
        onClick={handleVoteClick}
        disabled={disabled || isStaking}
        className={`p-2 rounded-lg transition-all duration-200 ${
          isActive
            ? isUpvote
              ? 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
              : 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
            : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400'
        } ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'
        } ${className}`}
        title={`${voteType} (${canStake ? 'Stake to vote' : 'Vote'})`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          {isUpvote ? (
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          )}
        </svg>
        
        {/* Staking indicator */}
        {parseFloat(requiredStake) > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white dark:border-gray-800 animate-pulse" />
        )}
      </button>

      {/* Staking Input Modal */}
      {showStakeInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stake to {voteType === 'upvote' ? 'Upvote' : 'Downvote'}
            </h4>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Stake tokens to cast your vote. Higher stakes have more influence and earn more rewards.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Required minimum:</span>
                  <span className="font-medium">{requiredStake} LDAO</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Your current stake:</span>
                  <span className="font-medium">{userStake} LDAO</span>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stake Amount (LDAO)
              </label>
              <input
                type="number"
                step="0.1"
                min={requiredStake}
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter amount to stake"
                disabled={isStaking}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Staked tokens will be locked until the voting period ends
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleStakeAndVote}
                disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < parseFloat(requiredStake)}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStaking ? 'Staking...' : `Stake & ${voteType === 'upvote' ? 'Upvote' : 'Downvote'}`}
              </button>
              <button
                onClick={() => setShowStakeInput(false)}
                disabled={isStaking}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}