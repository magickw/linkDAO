/**
 * UserStakingStatusWidget Component
 * Enhanced user staking status display with quick actions and estimated costs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface StakingPosition {
  postId: string;
  amount: number;
  token: string;
  timestamp: Date;
  currentValue: number;
  rewards: number;
  multiplier: number;
}

interface UserStakingData {
  totalStaked: number;
  totalRewards: number;
  activePositions: StakingPosition[];
  stakingTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  stakingRank: number;
  totalStakers: number;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  estimatedCost?: number;
  estimatedGas?: number;
  disabled?: boolean;
  description: string;
}

interface UserStakingStatusWidgetProps {
  userStakingData: UserStakingData;
  onQuickTip?: (amount: number) => Promise<void>;
  onQuickBoost?: (amount: number) => Promise<void>;
  onBatchAction?: (action: string, posts: string[]) => Promise<void>;
  supportedTokens?: Array<{
    symbol: string;
    balance: number;
    usdPrice: number;
  }>;
  className?: string;
  compact?: boolean;
}

const TIER_CONFIGS = {
  bronze: {
    color: 'from-orange-400 to-orange-600',
    textColor: 'text-orange-800 dark:text-orange-200',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-700',
    icon: '🥉',
    name: 'Bronze Staker'
  },
  silver: {
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-800 dark:text-gray-200',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-700',
    icon: '🥈',
    name: 'Silver Staker'
  },
  gold: {
    color: 'from-yellow-400 to-yellow-600',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-700',
    icon: '🥇',
    name: 'Gold Staker'
  },
  platinum: {
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-800 dark:text-purple-200',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-700',
    icon: '💎',
    name: 'Platinum Staker'
  }
};

const UserStakingStatusWidget: React.FC<UserStakingStatusWidgetProps> = ({
  userStakingData,
  onQuickTip,
  onQuickBoost,
  onBatchAction,
  supportedTokens = [
    { symbol: 'LNK', balance: 1000, usdPrice: 0.1 },
    { symbol: 'USDC', balance: 100, usdPrice: 1 }
  ],
  className = '',
  compact = false
}) => {
  const { isConnected } = useWeb3();
  const { addToast } = useToast();

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const tierConfig = TIER_CONFIGS[userStakingData.stakingTier];

  // Calculate quick action estimates
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'quick-tip-1',
      label: 'Tip 1 LNK',
      icon: '💰',
      action: () => onQuickTip && onQuickTip(1),
      estimatedCost: 1 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: 0.002,
      description: 'Send a quick 1 LNK tip to creator'
    },
    {
      id: 'quick-tip-5',
      label: 'Tip 5 LNK',
      icon: '💰',
      action: () => onQuickTip && onQuickTip(5),
      estimatedCost: 5 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: 0.002,
      description: 'Send a generous 5 LNK tip to creator'
    },
    {
      id: 'quick-boost-10',
      label: 'Boost 10 LNK',
      icon: '🚀',
      action: () => onQuickBoost && onQuickBoost(10),
      estimatedCost: 10 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: 0.003,
      description: 'Boost post visibility with 10 LNK stake'
    },
    {
      id: 'quick-boost-25',
      label: 'Boost 25 LNK',
      icon: '🚀',
      action: () => onQuickBoost && onQuickBoost(25),
      estimatedCost: 25 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: 0.003,
      description: 'Major boost with 25 LNK stake'
    },
    {
      id: 'batch-tip',
      label: 'Batch Tip',
      icon: '📦',
      action: () => onBatchAction && onBatchAction('tip', selectedPosts),
      estimatedCost: selectedPosts.length * 1 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: selectedPosts.length * 0.002,
      disabled: selectedPosts.length === 0,
      description: `Tip multiple posts (${selectedPosts.length} selected)`
    },
    {
      id: 'batch-boost',
      label: 'Batch Boost',
      icon: '📦',
      action: () => onBatchAction && onBatchAction('boost', selectedPosts),
      estimatedCost: selectedPosts.length * 5 * (supportedTokens.find(t => t.symbol === 'LNK')?.usdPrice || 0.1),
      estimatedGas: selectedPosts.length * 0.003,
      disabled: selectedPosts.length === 0,
      description: `Boost multiple posts (${selectedPosts.length} selected)`
    }
  ], [onQuickTip, onQuickBoost, onBatchAction, selectedPosts, supportedTokens]);

  // Format numbers for display
  const formatNumber = useCallback((num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(2);
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  }, []);

  // Handle quick action execution
  const handleQuickAction = useCallback(async (action: QuickAction) => {
    if (!isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (action.disabled) {
      addToast('Action not available', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      await action.action();
      addToast(`${action.label} completed successfully!`, 'success');
    } catch (error) {
      console.error('Quick action failed:', error);
      addToast(`Failed to ${action.label.toLowerCase()}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, addToast]);

  if (!isConnected) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect wallet to view staking status
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Compact tier badge */}
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r ${tierConfig.color} text-white text-sm font-medium`}>
          <span>{tierConfig.icon}</span>
          <span>#{userStakingData.stakingRank}</span>
        </div>

        {/* Compact stats */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatNumber(userStakingData.totalStaked)} staked • {formatCurrency(userStakingData.totalRewards)} rewards
        </div>

        {/* Quick actions toggle */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main status card */}
      <div className={`p-6 rounded-lg border ${tierConfig.bgColor} ${tierConfig.borderColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${tierConfig.color} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
              {tierConfig.icon}
            </div>
            <div>
              <h3 className={`font-semibold ${tierConfig.textColor}`}>
                {tierConfig.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rank #{userStakingData.stakingRank} of {userStakingData.totalStakers}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${tierConfig.textColor} hover:bg-white/50 dark:hover:bg-black/20`}
          >
            Quick Actions
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Staked</div>
            <div className={`text-xl font-bold ${tierConfig.textColor}`}>
              {formatNumber(userStakingData.totalStaked)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              LNK tokens
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Rewards</div>
            <div className={`text-xl font-bold ${tierConfig.textColor}`}>
              {formatCurrency(userStakingData.totalRewards)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Earned
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Positions</div>
            <div className={`text-xl font-bold ${tierConfig.textColor}`}>
              {userStakingData.activePositions.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Posts
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Multiplier</div>
            <div className={`text-xl font-bold ${tierConfig.textColor}`}>
              {(userStakingData.activePositions.reduce((sum, pos) => sum + pos.multiplier, 0) / Math.max(userStakingData.activePositions.length, 1)).toFixed(1)}x
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Boost
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h4>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Estimated costs include gas fees
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <motion.button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={action.disabled || isProcessing}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200 text-left
                    ${action.disabled 
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }
                  `}
                  whileHover={!action.disabled ? { scale: 1.02 } : {}}
                  whileTap={!action.disabled ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{action.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {action.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                      Cost: {formatCurrency(action.estimatedCost || 0)}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Gas: ~{formatCurrency((action.estimatedGas || 0) * 2000)} {/* Assuming $2000 ETH */}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Batch actions info */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Batch Actions:</p>
                  <p>Select multiple posts to perform batch tipping or boosting. This saves on gas fees and time.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent positions */}
      {userStakingData.activePositions.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Recent Positions
          </h4>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userStakingData.activePositions.slice(0, 5).map((position, index) => (
              <div
                key={position.postId}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {formatNumber(position.amount)} {position.token}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {position.multiplier}x boost • {formatCurrency(position.rewards)} rewards
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(position.currentValue)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {position.timestamp.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStakingStatusWidget;