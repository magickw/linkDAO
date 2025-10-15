/**
 * BoostingSystem Component
 * Provides post boosting functionality with staking tokens to increase visibility
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface BoostTier {
  name: string;
  minAmount: number;
  multiplier: number;
  duration: number; // in hours
  color: string;
  icon: string;
  description: string;
}

interface GasFeeEstimate {
  slow: number;
  standard: number;
  fast: number;
  currency: string;
}

interface BoostingSystemProps {
  postId: string;
  currentBoostLevel: number;
  totalBoosted: number;
  onBoost: (postId: string, amount: number, duration: number) => Promise<void>;
  supportedTokens?: Array<{
    symbol: string;
    address: string;
    decimals: number;
    balance?: number;
    usdPrice?: number;
  }>;
  className?: string;
  compact?: boolean;
}

const BOOST_TIERS: BoostTier[] = [
  {
    name: 'Basic Boost',
    minAmount: 10,
    multiplier: 1.5,
    duration: 6,
    color: 'from-blue-500 to-cyan-500',
    icon: '🚀',
    description: '1.5x visibility for 6 hours'
  },
  {
    name: 'Super Boost',
    minAmount: 50,
    multiplier: 2.5,
    duration: 12,
    color: 'from-purple-500 to-pink-500',
    icon: '⚡',
    description: '2.5x visibility for 12 hours'
  },
  {
    name: 'Mega Boost',
    minAmount: 100,
    multiplier: 4.0,
    duration: 24,
    color: 'from-orange-500 to-red-500',
    icon: '🔥',
    description: '4x visibility for 24 hours'
  },
  {
    name: 'Ultra Boost',
    minAmount: 250,
    multiplier: 6.0,
    duration: 48,
    color: 'from-yellow-400 to-orange-500',
    icon: '💎',
    description: '6x visibility for 48 hours'
  }
];

const BoostingSystem: React.FC<BoostingSystemProps> = ({
  postId,
  currentBoostLevel,
  totalBoosted,
  onBoost,
  supportedTokens = [
    { symbol: 'LNK', address: '0x...', decimals: 18, balance: 1000, usdPrice: 0.1 },
    { symbol: 'USDC', address: '0x...', decimals: 6, balance: 100, usdPrice: 1 },
    { symbol: 'ETH', address: '0x...', decimals: 18, balance: 0.5, usdPrice: 2000 }
  ],
  className = '',
  compact = false
}) => {
  const { isConnected, address } = useWeb3();
  const { addToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(supportedTokens[0]);
  const [selectedTier, setSelectedTier] = useState<BoostTier | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [gasOption, setGasOption] = useState<'slow' | 'standard' | 'fast'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [gasFees, setGasFees] = useState<GasFeeEstimate | null>(null);
  const [isLoadingGas, setIsLoadingGas] = useState(false);

  // Calculate current boost tier
  const currentTier = useMemo(() => {
    return BOOST_TIERS.find(tier => currentBoostLevel >= tier.multiplier) || null;
  }, [currentBoostLevel]);

  // Calculate next tier
  const nextTier = useMemo(() => {
    const currentTierIndex = BOOST_TIERS.findIndex(tier => tier.multiplier === currentTier?.multiplier);
    return currentTierIndex >= 0 && currentTierIndex < BOOST_TIERS.length - 1 
      ? BOOST_TIERS[currentTierIndex + 1] 
      : null;
  }, [currentTier]);

  // Calculate USD value for display
  const calculateUsdValue = useCallback((amount: number): string => {
    const usdValue = amount * (selectedToken.usdPrice || 0);
    return usdValue.toFixed(2);
  }, [selectedToken]);

  // Fetch gas fee estimates
  const fetchGasFees = useCallback(async () => {
    setIsLoadingGas(true);
    try {
      // Mock gas fee estimation - in real app, this would call a gas estimation service
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGasFees({
        slow: 20,
        standard: 35,
        fast: 55,
        currency: 'gwei'
      });
    } catch (error) {
      console.error('Failed to fetch gas fees:', error);
      addToast('Failed to estimate gas fees', 'warning');
    } finally {
      setIsLoadingGas(false);
    }
  }, [addToast]);

  // Load gas fees when modal opens
  useEffect(() => {
    if (isOpen && !gasFees) {
      fetchGasFees();
    }
  }, [isOpen, gasFees, fetchGasFees]);

  // Handle boost submission
  const handleBoost = useCallback(async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to boost', 'error');
      return;
    }

    const amount = selectedTier ? selectedTier.minAmount : parseFloat(customAmount);
    if (!amount || amount <= 0) {
      addToast('Please select a boost tier or enter a valid amount', 'error');
      return;
    }

    if (amount > (selectedToken.balance || 0)) {
      addToast(`Insufficient ${selectedToken.symbol} balance`, 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const duration = selectedTier ? selectedTier.duration : 6; // Default 6 hours for custom
      await onBoost(postId, amount, duration);
      
      addToast(
        `Successfully boosted post with ${amount} ${selectedToken.symbol}!`,
        'success'
      );
      
      setIsOpen(false);
      setSelectedTier(null);
      setCustomAmount('');
    } catch (error) {
      console.error('Boost failed:', error);
      addToast('Failed to boost post. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [
    isConnected,
    selectedTier,
    customAmount,
    selectedToken,
    onBoost,
    postId,
    addToast
  ]);

  // Handle tier selection
  const handleTierSelect = useCallback((tier: BoostTier) => {
    setSelectedTier(tier);
    setCustomAmount('');
  }, []);

  // Handle custom amount input
  const handleCustomAmountChange = useCallback((value: string) => {
    setCustomAmount(value);
    setSelectedTier(null);
  }, []);

  const currentAmount = selectedTier ? selectedTier.minAmount : parseFloat(customAmount) || 0;

  return (
    <>
      {/* Boost Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-full font-medium
          bg-gradient-to-r from-purple-500 to-pink-600 text-white
          hover:from-purple-600 hover:to-pink-700 transition-all duration-200
          shadow-lg hover:shadow-xl transform hover:scale-105
          ${compact ? 'px-3 py-1.5 text-sm' : ''}
          ${className}
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>Boost</span>
        {totalBoosted > 0 && (
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
            {totalBoosted}
          </span>
        )}
      </motion.button>

      {/* Current Boost Status */}
      {currentTier && (
        <div className={`flex items-center space-x-2 ${compact ? 'text-xs' : 'text-sm'}`}>
          <span className="text-2xl">{currentTier.icon}</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {currentTier.multiplier}x boosted
          </span>
        </div>
      )}

      {/* Boosting Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Boost Post
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Stake tokens to increase your post's visibility and reach more users
                </p>
              </div>

              {/* Current Status */}
              {currentTier && (
                <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{currentTier.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Currently: {currentTier.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {currentTier.multiplier}x visibility • {totalBoosted} tokens staked
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Token Selection */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Token
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {supportedTokens.map((token) => (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token)}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        ${selectedToken.symbol === token.symbol
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }
                      `}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {token.symbol}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Balance: {token.balance?.toFixed(2) || '0'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Boost Tiers */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Choose Boost Level
                </label>
                
                <div className="space-y-3">
                  {BOOST_TIERS.map((tier) => {
                    const isAffordable = tier.minAmount <= (selectedToken.balance || 0);
                    const isSelected = selectedTier?.name === tier.name;
                    
                    return (
                      <motion.button
                        key={tier.name}
                        onClick={() => isAffordable && handleTierSelect(tier)}
                        disabled={!isAffordable}
                        className={`
                          w-full p-4 rounded-lg border-2 transition-all duration-200 text-left
                          ${isSelected
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : isAffordable
                            ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            : 'border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          }
                        `}
                        whileHover={isAffordable ? { scale: 1.02 } : {}}
                        whileTap={isAffordable ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{tier.icon}</span>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {tier.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {tier.description}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {tier.minAmount} {selectedToken.symbol}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ${calculateUsdValue(tier.minAmount)}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Amount */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Or enter custom amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder={`Min 1 ${selectedToken.symbol}`}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      step="any"
                      min="1"
                      max={selectedToken.balance}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
                      {selectedToken.symbol}
                    </div>
                  </div>
                  {customAmount && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      ≈ ${calculateUsdValue(parseFloat(customAmount) || 0)} • 6 hours duration
                    </div>
                  )}
                </div>
              </div>

              {/* Gas Fee Selection */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Transaction Speed
                  </label>
                  {isLoadingGas && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading fees...</span>
                    </div>
                  )}
                </div>

                {gasFees && (
                  <div className="space-y-2">
                    {(['slow', 'standard', 'fast'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setGasOption(option)}
                        className={`
                          w-full p-3 rounded-lg border-2 transition-all duration-200 text-left
                          ${gasOption === option
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white capitalize">
                              {option}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {option === 'slow' && '~5 minutes'}
                              {option === 'standard' && '~2 minutes'}
                              {option === 'fast' && '~30 seconds'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {gasFees[option]} {gasFees.currency}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ~${(gasFees[option] * 0.05).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary and Action */}
              <div className="p-6">
                {currentAmount > 0 && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Boost Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {currentAmount} {selectedToken.symbol}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">USD Value:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          ${calculateUsdValue(currentAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedTier ? selectedTier.duration : 6} hours
                        </span>
                      </div>
                      {gasFees && (
                        <div className="flex justify-between text-gray-500 dark:text-gray-400">
                          <span>Est. Gas Fee:</span>
                          <span>
                            {gasFees[gasOption]} {gasFees.currency} (~${(gasFees[gasOption] * 0.05).toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <motion.button
                  onClick={handleBoost}
                  disabled={!currentAmount || isProcessing || currentAmount > (selectedToken.balance || 0)}
                  className={`
                    w-full py-4 rounded-lg font-medium transition-all duration-200
                    ${currentAmount && currentAmount <= (selectedToken.balance || 0) && !isProcessing
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }
                  `}
                  whileHover={currentAmount && !isProcessing ? { scale: 1.02 } : {}}
                  whileTap={currentAmount && !isProcessing ? { scale: 0.98 } : {}}
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Boost...</span>
                    </div>
                  ) : !currentAmount ? (
                    'Select Boost Amount'
                  ) : currentAmount > (selectedToken.balance || 0) ? (
                    'Insufficient Balance'
                  ) : (
                    `Boost Post (${currentAmount} ${selectedToken.symbol})`
                  )}
                </motion.button>

                {/* Info */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">How boosting works:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Higher boost levels increase your post's visibility</li>
                        <li>• Tokens are staked for the duration period</li>
                        <li>• You earn rewards based on engagement during boost</li>
                        <li>• Unused tokens are returned after the boost expires</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BoostingSystem;