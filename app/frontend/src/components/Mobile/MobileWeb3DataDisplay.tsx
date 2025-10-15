import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface TokenData {
  symbol: string;
  balance: number;
  value: number;
  change24h: number;
  price: number;
}

interface StakingData {
  totalStaked: number;
  rewards: number;
  apy: number;
  lockPeriod: string;
}

interface GovernanceData {
  votingPower: number;
  activeProposals: number;
  votesParticipated: number;
  totalProposals: number;
}

interface MobileWeb3DataDisplayProps {
  tokenData?: TokenData;
  stakingData?: StakingData;
  governanceData?: GovernanceData;
  gasPrice?: number;
  networkName?: string;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

export const MobileWeb3DataDisplay: React.FC<MobileWeb3DataDisplayProps> = ({
  tokenData,
  stakingData,
  governanceData,
  gasPrice,
  networkName = 'Ethereum',
  isLoading = false,
  compact = false,
  className = ''
}) => {
  const { touchTargetClasses } = useMobileOptimization();
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState<'tokens' | 'staking' | 'governance'>('tokens');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(decimals)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(decimals)}K`;
    return value.toFixed(decimals);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (compact) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 dark:text-white">Web3 Overview</h3>
          <button
            onClick={() => setShowValues(!showValues)}
            className={`${touchTargetClasses} p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
          >
            {showValues ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {tokenData && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <CurrencyDollarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Balance</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {showValues ? formatCurrency(tokenData.value) : '••••'}
              </p>
            </div>
          )}

          {stakingData && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <ChartBarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Staked</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {showValues ? formatNumber(stakingData.totalStaked) : '••••'}
              </p>
            </div>
          )}

          {governanceData && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <ChartBarIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Voting Power</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {showValues ? formatNumber(governanceData.votingPower) : '••••'}
              </p>
            </div>
          )}

          {gasPrice && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <ClockIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Gas</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {gasPrice} gwei
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Web3 Dashboard</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{networkName}</span>
          <button
            onClick={() => setShowValues(!showValues)}
            className={`${touchTargetClasses} p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300`}
          >
            {showValues ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['tokens', 'staking', 'governance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`
              flex-1 py-3 px-4 text-sm font-medium capitalize
              ${activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
              transition-colors duration-200
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'tokens' && tokenData && (
            <motion.div
              key="tokens"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Token Balance */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {tokenData.symbol} Balance
                  </span>
                  <CurrencyDollarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {showValues ? formatNumber(tokenData.balance, 4) : '••••••'}
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-300">
                    {showValues ? formatCurrency(tokenData.value) : '••••••'}
                  </p>
                </div>
              </div>

              {/* Price & Change */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {showValues ? formatCurrency(tokenData.price) : '••••'}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">24h Change</p>
                  <div className="flex items-center space-x-1">
                    {tokenData.change24h >= 0 ? (
                      <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                    )}
                    <p className={`text-lg font-semibold ${
                      tokenData.change24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {showValues ? formatPercentage(tokenData.change24h) : '••••'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staking' && stakingData && (
            <motion.div
              key="staking"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Total Staked */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total Staked
                  </span>
                  <ChartBarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {showValues ? formatNumber(stakingData.totalStaked) : '••••••'}
                </p>
              </div>

              {/* Rewards & APY */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rewards</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {showValues ? formatNumber(stakingData.rewards) : '••••'}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">APY</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPercentage(stakingData.apy)}
                  </p>
                </div>
              </div>

              {/* Lock Period */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Lock period: {stakingData.lockPeriod}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'governance' && governanceData && (
            <motion.div
              key="governance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Voting Power */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Voting Power
                  </span>
                  <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {showValues ? formatNumber(governanceData.votingPower) : '••••••'}
                </p>
              </div>

              {/* Participation Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Active Proposals</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {governanceData.activeProposals}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Participation</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {governanceData.votesParticipated}/{governanceData.totalProposals}
                  </p>
                </div>
              </div>

              {/* Participation Rate */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Participation Rate
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {((governanceData.votesParticipated / governanceData.totalProposals) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(governanceData.votesParticipated / governanceData.totalProposals) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gas Price Footer */}
      {gasPrice && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-300">Current Gas Price</span>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {gasPrice} gwei
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileWeb3DataDisplay;