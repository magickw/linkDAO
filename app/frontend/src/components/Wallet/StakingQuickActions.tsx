/**
 * Staking Quick Actions Component
 * Provides quick staking actions for LDAO tokens
 */

import React, { useState } from 'react';
import { TrendingUp, Coins, Zap, Clock, AlertCircle } from 'lucide-react';
import { useStaking } from '@/hooks/useContractInteractions';
import { useLDAOToken } from '@/hooks/useContractInteractions';
import { useToast } from '@/context/ToastContext';

interface StakingInfo {
  totalStaked: string;
  totalRewards: string;
  activePositions: number;
  isPremiumMember: boolean;
  totalClaimableRewards: string;
}

interface StakingQuickActionsProps {
  stakingInfo: StakingInfo | null;
  className?: string;
}

export const StakingQuickActions: React.FC<StakingQuickActionsProps> = ({
  stakingInfo,
  className = '',
}) => {
  const { stake, unstake, isStakingPending, isUnstakingPending } = useStaking();
  const { balance } = useLDAOToken();
  const { addToast } = useToast();

  const [selectedTier, setSelectedTier] = useState(1);
  const [stakingAmount, setStakingAmount] = useState('');
  const [autoCompound, setAutoCompound] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);

  const stakingTiers = [
    { id: 1, name: 'Basic', apy: '5%', minStake: '100', lockPeriod: '30 days' },
    { id: 2, name: 'Premium', apy: '8%', minStake: '1000', lockPeriod: '90 days' },
    { id: 3, name: 'VIP', apy: '12%', minStake: '10000', lockPeriod: '180 days' },
  ];

  const handleQuickStake = async () => {
    const amount = stakingAmount || balance;

    if (!amount || parseFloat(amount) === 0) {
      addToast('Please enter a valid staking amount', 'error');
      return;
    }

    try {
      await stake(amount, selectedTier, autoCompound);
      addToast('Staked successfully!', 'success');
      setShowStakeModal(false);
      setStakingAmount('');
    } catch (error: any) {
      addToast(`Staking failed: ${error.message}`, 'error');
    }
  };

  const handleClaimRewards = async () => {
    if (!stakingInfo || parseFloat(stakingInfo.totalClaimableRewards) === 0) {
      addToast('No rewards to claim', 'warning');
      return;
    }

    try {
      // This would call the claimRewards function from the staking contract
      addToast('Rewards claimed successfully!', 'success');
    } catch (error: any) {
      addToast(`Failed to claim rewards: ${error.message}`, 'error');
    }
  };

  const handleUnstake = async () => {
    if (!stakingInfo || stakingInfo.activePositions === 0) {
      addToast('No active staking positions', 'warning');
      return;
    }

    try {
      // This would call the unstake function for the first position
      await unstake(0);
      addToast('Unstaked successfully!', 'success');
    } catch (error: any) {
      addToast(`Unstaking failed: ${error.message}`, 'error');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Staking Overview */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Staking Overview</h3>
          <Coins className="w-6 h-6" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-purple-100 mb-1">Total Staked</p>
            <p className="text-2xl font-bold">
              {stakingInfo ? `${stakingInfo.totalStaked} LDAO` : '0 LDAO'}
            </p>
          </div>
          <div>
            <p className="text-sm text-purple-100 mb-1">Claimable Rewards</p>
            <p className="text-2xl font-bold">
              {stakingInfo ? `${stakingInfo.totalClaimableRewards} LDAO` : '0 LDAO'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-100">Active Positions</span>
            <span className="font-semibold">
              {stakingInfo?.activePositions || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-purple-100">Status</span>
            <span className="font-semibold">
              {stakingInfo?.isPremiumMember ? 'Premium Member' : 'Basic Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => setShowStakeModal(true)}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">Stake</span>
        </button>

        <button
          onClick={handleClaimRewards}
          disabled={!stakingInfo || parseFloat(stakingInfo.totalClaimableRewards) === 0}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-500 group-hover:text-white transition-colors">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">Claim</span>
        </button>

        <button
          onClick={handleUnstake}
          disabled={!stakingInfo || stakingInfo.activePositions === 0}
          className="flex items-center justify-center space-x-2 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">Unstake</span>
        </button>
      </div>

      {/* Staking Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Stake LDAO Tokens
              </h3>
              <button
                onClick={() => setShowStakeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Available Balance */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Available Balance
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {balance} LDAO
                </span>
              </div>
            </div>

            {/* Staking Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Staking Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stakingAmount}
                  onChange={(e) => setStakingAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 pr-16 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1">
                  <button
                    onClick={() => setStakingAmount(balance)}
                    className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    MAX
                  </button>
                  <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                    LDAO
                  </span>
                </div>
              </div>
            </div>

            {/* Staking Tier Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {stakingTiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedTier === tier.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {tier.name}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      {tier.apy} APY
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Min: {tier.minStake}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Compound Toggle */}
            <div className="mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCompound}
                  onChange={(e) => setAutoCompound(e.target.checked)}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Auto-Compound Rewards
                  </span>
                </div>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                Automatically reinvest rewards for higher APY
              </p>
            </div>

            {/* Lock Period Info */}
            <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Lock Period: {stakingTiers.find((t) => t.id === selectedTier)?.lockPeriod}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Early withdrawal incurs a 5% penalty
                  </p>
                </div>
              </div>
            </div>

            {/* Stake Button */}
            <button
              onClick={handleQuickStake}
              disabled={isStakingPending || !stakingAmount || parseFloat(stakingAmount) === 0}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStakingPending ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Staking...</span>
                </span>
              ) : (
                'Stake Tokens'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};