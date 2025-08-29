import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface RewardClaimProps {
  earnedAmount: string;
  onClaimSuccess?: () => void;
}

const RewardClaim: React.FC<RewardClaimProps> = ({ earnedAmount, onClaimSuccess }) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to claim rewards', 'error');
      return;
    }

    setIsClaiming(true);
    try {
      // In a real implementation, this would call the backend API to process the reward claim
      // and interact with the RewardPool contract
      console.log(`Claiming ${earnedAmount} LDAO rewards`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addToast(`Successfully claimed ${earnedAmount} LDAO!`, 'success');
      if (onClaimSuccess) onClaimSuccess();
    } catch (error) {
      console.error('Error claiming rewards:', error);
      addToast('Failed to claim rewards. Please try again.', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Creator Rewards</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Earned from tips and engagement</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200">
          LDAO
        </span>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Available to claim</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{earnedAmount}</p>
        </div>
        <button
          onClick={handleClaim}
          disabled={isClaiming || parseFloat(earnedAmount) <= 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isClaiming ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Claiming...
            </>
          ) : (
            'Claim Rewards'
          )}
        </button>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <span className="font-medium">How it works:</span> You earn 10% of all tips received on your posts, 
          plus rewards from the community pool based on engagement and reputation.
        </p>
      </div>
    </div>
  );
};

export default RewardClaim;