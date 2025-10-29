import React, { useState } from 'react';
import { TokenBalance } from '../../types/wallet';
import { useToast } from '@/context/ToastContext';

interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: number;
  minStake: number;
  lockPeriod: string;
  risk: 'low' | 'medium' | 'high';
}

interface StakeTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: TokenBalance[];
  onStake: (poolId: string, token: string, amount: number) => Promise<void>;
}

const STAKING_POOLS: StakingPool[] = [
  {
    id: 'eth-staking',
    name: 'Ethereum 2.0 Staking',
    token: 'ETH',
    apy: 4.2,
    tvl: 15000000,
    minStake: 0.01,
    lockPeriod: 'Flexible',
    risk: 'low'
  },
  {
    id: 'usdc-lending',
    name: 'USDC Lending Pool',
    token: 'USDC',
    apy: 8.5,
    tvl: 5000000,
    minStake: 100,
    lockPeriod: '30 days',
    risk: 'medium'
  },
  {
    id: 'uni-farming',
    name: 'UNI Liquidity Farming',
    token: 'UNI',
    apy: 15.3,
    tvl: 2000000,
    minStake: 10,
    lockPeriod: '90 days',
    risk: 'high'
  },
  {
    id: 'link-staking',
    name: 'Chainlink Staking',
    token: 'LINK',
    apy: 6.8,
    tvl: 8000000,
    minStake: 1,
    lockPeriod: '60 days',
    risk: 'medium'
  }
];

export default function StakeTokenModal({ isOpen, onClose, tokens, onStake }: StakeTokenModalProps) {
  const { addToast } = useToast();
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedTokenData = selectedPool ? tokens.find(t => t.symbol === selectedPool.token) : null;
  const maxAmount = selectedTokenData?.balance || 0;
  const estimatedRewards = selectedPool && amount ? 
    (parseFloat(amount) * selectedPool.apy / 100) : 0;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`;
    }
    return `$${(tvl / 1000).toFixed(0)}K`;
  };

  const handleStake = async () => {
    if (!selectedPool || !amount) {
      setError('Please select a pool and enter an amount');
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      setError('Insufficient balance');
      return;
    }

    if (parseFloat(amount) < selectedPool.minStake) {
      setError(`Minimum stake is ${selectedPool.minStake} ${selectedPool.token}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onStake(selectedPool.id, selectedPool.token, parseFloat(amount));
      onClose();
      setAmount('');
      setSelectedPool(null);
      addToast('Staking transaction submitted successfully!', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Staking failed');
      addToast('Staking failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stake Tokens</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!selectedPool ? (
            /* Pool Selection */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Choose a Staking Pool
              </h3>
              
              {STAKING_POOLS.map((pool) => {
                const tokenData = tokens.find(t => t.symbol === pool.token);
                const hasBalance = tokenData && tokenData.balance >= pool.minStake;
                
                return (
                  <div
                    key={pool.id}
                    onClick={() => hasBalance && setSelectedPool(pool)}
                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      hasBalance 
                        ? 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                        : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{pool.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{pool.token} Staking</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {pool.apy}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">APY</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">TVL: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatTVL(pool.tvl)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Min Stake: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {pool.minStake} {pool.token}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Lock Period: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {pool.lockPeriod}
                        </span>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(pool.risk)}`}>
                          {pool.risk.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Amount Selection */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedPool(null)}
                  className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to pools
                </button>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Stake {selectedPool.token}
                </h3>
              </div>

              <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Selected Pool</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedPool.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">APY</span>
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">{selectedPool.apy}%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Stake
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                    <span className="text-gray-500 dark:text-gray-400">{selectedPool.token}</span>
                    <button
                      onClick={() => setAmount(maxAmount.toString())}
                      className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Available: {maxAmount.toFixed(4)} {selectedPool.token}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Min: {selectedPool.minStake} {selectedPool.token}
                  </span>
                </div>
              </div>

              {amount && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Estimated Rewards</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Annual:</span>
                      <span className="block font-semibold text-blue-900 dark:text-blue-200">
                        {estimatedRewards.toFixed(4)} {selectedPool.token}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-300">Monthly:</span>
                      <span className="block font-semibold text-blue-900 dark:text-blue-200">
                        {(estimatedRewards / 12).toFixed(4)} {selectedPool.token}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                  ⚠️ Important Notice
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Your tokens will be locked for {selectedPool.lockPeriod}</li>
                  <li>• Rewards are distributed automatically</li>
                  <li>• Early withdrawal may incur penalties</li>
                  <li>• APY rates may fluctuate based on market conditions</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedPool && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setSelectedPool(null)}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStake}
              disabled={isLoading || !amount || parseFloat(amount) < selectedPool.minStake}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Stake Tokens'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}