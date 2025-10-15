import React, { useState } from 'react';
import { StakingInfo, StakingEvent } from '@/types/tokenActivity';
import { TokenInfo } from '@/types/web3Community';

interface UserStakingStatusProps {
  stakingInfo: StakingInfo;
  userAddress?: string;
  token?: TokenInfo;
  showRewards?: boolean;
  showHistory?: boolean;
  onUnstake?: (amount: number) => Promise<void>;
  onClaimRewards?: () => Promise<void>;
  className?: string;
}

interface UserStakeDetails {
  totalStaked: number;
  stakingRank: number;
  stakingPercentage: number;
  potentialRewards: number;
  claimableRewards: number;
  nextRewardDate?: Date;
  stakingDuration: number; // in days
  averageAPY: number;
}

export const UserStakingStatus: React.FC<UserStakingStatusProps> = ({
  stakingInfo,
  userAddress,
  token,
  showRewards = true,
  showHistory = true,
  onUnstake,
  onClaimRewards,
  className = ''
}) => {
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate user stake details
  const getUserStakeDetails = (): UserStakeDetails => {
    const userStake = stakingInfo.userStake || 0;
    const totalStaked = stakingInfo.totalStaked;
    
    // Mock calculations - in real app these would come from backend
    const stakingPercentage = totalStaked > 0 ? (userStake / totalStaked) * 100 : 0;
    const stakingRank = Math.floor(Math.random() * stakingInfo.stakerCount) + 1;
    const stakingDuration = Math.floor(Math.random() * 365) + 1; // Random 1-365 days
    const averageAPY = 12 + Math.random() * 8; // 12-20% APY
    
    const potentialRewards = userStake * (averageAPY / 100) * (stakingDuration / 365);
    const claimableRewards = potentialRewards * 0.3; // 30% of potential rewards are claimable
    
    return {
      totalStaked: userStake,
      stakingRank,
      stakingPercentage,
      potentialRewards,
      claimableRewards,
      nextRewardDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      stakingDuration,
      averageAPY
    };
  };

  const userDetails = getUserStakeDetails();
  const hasStake = (stakingInfo.userStake || 0) > 0;

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(4);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const handleUnstake = async () => {
    if (!onUnstake || !unstakeAmount) return;

    const amount = parseFloat(unstakeAmount);
    if (isNaN(amount) || amount <= 0 || amount > (stakingInfo.userStake || 0)) {
      return;
    }

    setIsLoading(true);
    try {
      await onUnstake(amount);
      setShowUnstakeModal(false);
      setUnstakeAmount('');
    } catch (error) {
      console.error('Error unstaking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!onClaimRewards) return;

    setIsLoading(true);
    try {
      await onClaimRewards();
    } catch (error) {
      console.error('Error claiming rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300' };
    if (rank === 3) return { emoji: '🥉', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300' };
    if (rank <= 10) return { emoji: '⭐', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' };
    return { emoji: '👤', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300' };
  };

  const rankBadge = getRankBadge(userDetails.stakingRank);

  if (!hasStake) {
    return (
      <div className={`p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-center ${className}`}>
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Active Stakes
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You haven't staked any tokens on this post yet.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Stake tokens to boost post visibility and earn rewards!
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main status card */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Staking Status
          </h3>
          
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${rankBadge.color}`}>
            <span>{rankBadge.emoji}</span>
            <span>Rank #{userDetails.stakingRank}</span>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Staked</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatAmount(userDetails.totalStaked)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {token?.symbol || 'tokens'} ({userDetails.stakingPercentage.toFixed(2)}% of total)
            </div>
            {token?.priceUSD && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ≈ {formatCurrency(userDetails.totalStaked * token.priceUSD)}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Staking Duration</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {userDetails.stakingDuration}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              days • {userDetails.averageAPY.toFixed(1)}% APY
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowUnstakeModal(true)}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Unstake
          </button>
          
          {showRewards && userDetails.claimableRewards > 0 && (
            <button
              onClick={handleClaimRewards}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Claim Rewards
            </button>
          )}
        </div>
      </div>

      {/* Rewards section */}
      {showRewards && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
            Staking Rewards
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">Claimable Now</div>
              <div className="text-lg font-bold text-green-800 dark:text-green-200">
                {formatAmount(userDetails.claimableRewards)} {token?.symbol || 'tokens'}
              </div>
              {token?.priceUSD && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  ≈ {formatCurrency(userDetails.claimableRewards * token.priceUSD)}
                </div>
              )}
            </div>
            
            <div>
              <div className="text-sm text-green-600 dark:text-green-400 mb-1">Potential Total</div>
              <div className="text-lg font-bold text-green-800 dark:text-green-200">
                {formatAmount(userDetails.potentialRewards)} {token?.symbol || 'tokens'}
              </div>
              {userDetails.nextRewardDate && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  Next: {userDetails.nextRewardDate.toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staking history */}
      {showHistory && stakingInfo.stakingHistory && stakingInfo.stakingHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stakingInfo.stakingHistory.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    event.type === 'stake' ? 'bg-green-500' :
                    event.type === 'unstake' ? 'bg-red-500' :
                    event.type === 'reward' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {event.type} {formatAmount(event.amount)} {token?.symbol || 'tokens'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {event.timestamp.toLocaleDateString()} at {event.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                {event.transactionHash && (
                  <button
                    onClick={() => window.open(`https://etherscan.io/tx/${event.transactionHash}`, '_blank')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm"
                  >
                    View Tx
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unstake modal */}
      {showUnstakeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Unstake Tokens
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Unstake
                </label>
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="0.0"
                  max={userDetails.totalStaked}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Available: {formatAmount(userDetails.totalStaked)} {token?.symbol || 'tokens'}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUnstakeModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnstake}
                  disabled={isLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Unstaking...' : 'Unstake'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStakingStatus;