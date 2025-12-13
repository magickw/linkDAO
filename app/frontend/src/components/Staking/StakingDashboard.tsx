/**
 * Staking Dashboard Component
 * Comprehensive staking interface with tiers, user stakes, and rewards
 */

import React, { useState } from 'react';
import { 
  useStaking, 
  useStakingTiers, 
  useUserStakes, 
  useStakingStats,
  useStakingCalculations 
} from '@/hooks/useStaking';
import { Clock, TrendingUp, Award, Coins, Lock, Unlock } from 'lucide-react';

interface StakingDashboardProps {
  className?: string;
}

export const StakingDashboard: React.FC<StakingDashboardProps> = ({ className = '' }) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');

  const { stake, unstake, claimRewards, claimAllRewards, loading: actionLoading } = useStaking();
  const { tiers, loading: tiersLoading } = useStakingTiers();
  const { stakes, loading: stakesLoading, refetch: refetchStakes } = useUserStakes();
  const { stats, loading: statsLoading, refetch: refetchStats } = useStakingStats();
  const { calculateAPY, formatLockPeriod, getTimeRemaining } = useStakingCalculations();

  const handleStake = async () => {
    if (!selectedTier || !stakeAmount) return;

    try {
      await stake(parseFloat(stakeAmount), selectedTier);
      setStakeAmount('');
      setSelectedTier(null);
      refetchStakes();
      refetchStats();
    } catch (error) {
      console.error('Staking failed:', error);
    }
  };

  const handleUnstake = async (stakeIndex: number, amount: string) => {
    try {
      await unstake(stakeIndex, parseFloat(amount));
      refetchStakes();
      refetchStats();
    } catch (error) {
      console.error('Unstaking failed:', error);
    }
  };

  const handleClaimRewards = async (stakeIndex: number) => {
    try {
      await claimRewards(stakeIndex);
      refetchStakes();
      refetchStats();
    } catch (error) {
      console.error('Claiming rewards failed:', error);
    }
  };

  const handleClaimAllRewards = async () => {
    try {
      await claimAllRewards();
      refetchStakes();
      refetchStats();
    } catch (error) {
      console.error('Claiming all rewards failed:', error);
    }
  };

  const totalPendingRewards = stakes.reduce(
    (sum, stake) => sum + parseFloat(stake.pendingRewards),
    0
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Staking Stats Overview */}
      {(stats || statsLoading) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-medium text-gray-600">Total Staked</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : `${parseFloat(stats?.totalStaked || '0').toFixed(2)} LDAO`}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h3 className="text-sm font-medium text-gray-600">Pending Rewards</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : `${totalPendingRewards.toFixed(4)} LDAO`}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-500" />
              <h3 className="text-sm font-medium text-gray-600">Voting Power</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : `${parseFloat(stats?.votingPower || '0').toFixed(2)}`}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-medium text-gray-600">Active Stakes</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats?.activeStakes || 0}
            </p>
          </div>
        </div>
      )}

      {/* Staking Tiers */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Staking Tiers</h2>
          <p className="text-sm text-gray-600 mt-1">Choose a staking tier based on lock period and rewards</p>
        </div>
        <div className="p-6">
          {tiersLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTier === tier.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">Tier {tier.id}</h3>
                    <span className="text-sm font-medium text-green-600">
                      {calculateAPY(tier.rewardRate).toFixed(1)}% APY
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Lock: {formatLockPeriod(tier.lockPeriod)}</p>
                    <p>Min: {parseFloat(tier.minStakeAmount).toFixed(0)} LDAO</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stake Form */}
          {selectedTier && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Create New Stake</h3>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Amount to stake"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleStake}
                  disabled={actionLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Staking...' : 'Stake'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Stakes */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Stakes</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your active staking positions</p>
          </div>
          {totalPendingRewards > 0 && (
            <button
              onClick={handleClaimAllRewards}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Claim All Rewards ({totalPendingRewards.toFixed(4)} LDAO)
            </button>
          )}
        </div>
        <div className="p-6">
          {stakesLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          ) : stakes.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Stakes</h3>
              <p className="text-gray-600">Start staking to earn rewards and voting power</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stakes.map((stake, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Stake #{stake.index}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {parseFloat(stake.amount).toFixed(2)} LDAO staked
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {parseFloat(stake.pendingRewards).toFixed(4)} LDAO
                      </p>
                      <p className="text-sm text-gray-600">Pending Rewards</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-600">Lock Period</p>
                      <p className="font-medium">{formatLockPeriod(stake.lockPeriod)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Reward Rate</p>
                      <p className="font-medium">{(stake.rewardRate / 100).toFixed(1)}% APY</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Staked Since</p>
                      <p className="font-medium">
                        {new Date(stake.stakingStartTime * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Can Unstake</p>
                      <p className="font-medium">
                        {stake.canUnstake ? 'Now' : getTimeRemaining(stake.stakingStartTime + stake.lockPeriod)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleClaimRewards(stake.index)}
                      disabled={actionLoading || parseFloat(stake.pendingRewards) === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Claim Rewards
                    </button>
                    <button
                      onClick={() => handleUnstake(stake.index, stake.amount)}
                      disabled={actionLoading || !stake.canUnstake}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                    >
                      <Unlock className="w-4 h-4" />
                      Unstake All
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};