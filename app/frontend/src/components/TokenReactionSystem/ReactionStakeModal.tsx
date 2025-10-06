/**
 * ReactionStakeModal Component
 * Modal for staking tokens on reactions with different costs
 */

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import {
  ReactionStakeModalProps,
  REACTION_TYPES
} from '../../types/tokenReaction';
import tokenReactionService from '../../services/tokenReactionService';

const ReactionStakeModal: React.FC<ReactionStakeModalProps> = ({
  isOpen,
  reactionType,
  postId,
  currentUserStake,
  onStake,
  onClose,
  isLoading = false
}) => {
  const { address } = useWeb3();
  const [stakeAmount, setStakeAmount] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const config = REACTION_TYPES[reactionType];
  const theme = tokenReactionService.getReactionTheme(reactionType);

  useEffect(() => {
    if (isOpen) {
      // Set default stake amount to minimum
      setStakeAmount(config.tokenCost.toString());
      // Set default user balance
      setUserBalance(1000); // Default balance in token units
      setErrors([]);
    }
  }, [isOpen, config.tokenCost]);

  const handleAmountChange = (value: string) => {
    setStakeAmount(value);
    
    // Validate input
    const amount = parseFloat(value);
    const validation = tokenReactionService.validateReactionInput(reactionType, amount);
    setErrors(validation.errors);
  };

  const handleStake = async () => {
    const amount = parseFloat(stakeAmount);
    
    // Final validation
    const validation = tokenReactionService.validateReactionInput(reactionType, amount);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    // Check balance
    if (amount > userBalance) {
      setErrors(['Insufficient balance']);
      return;
    }

    try {
      await onStake(amount);
    } catch (error) {
      console.error('Stake failed:', error);
    }
  };

  const getPresetAmounts = () => {
    const base = config.tokenCost;
    return [base, base * 5, base * 10, base * 25];
  };

  const calculateRewards = (amount: number) => {
    return amount * config.multiplier * 0.1;
  };

  const calculateInfluence = (amount: number) => {
    return amount * config.multiplier;
  };

  if (!isOpen) return null;

  const presetAmounts = getPresetAmounts();
  const currentAmount = parseFloat(stakeAmount) || 0;
  const estimatedRewards = calculateRewards(currentAmount);
  const estimatedInfluence = calculateInfluence(currentAmount);
  const hasErrors = errors.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Stake on Reaction
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Reaction Display */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-gradient-to-r ${theme.gradient} text-white mb-3`}>
            <span className="text-3xl">{config.emoji}</span>
            <div className="text-left">
              <div className="font-semibold text-lg">{config.name}</div>
              <div className="text-sm opacity-90">{config.description}</div>
            </div>
          </div>
          
          {currentUserStake > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current stake: {currentUserStake} tokens
            </p>
          )}
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stake Amount (LDAO Tokens)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min={config.tokenCost}
              value={stakeAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className={`
                w-full px-4 py-3 border rounded-lg text-lg font-semibold
                dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent
                ${hasErrors 
                  ? 'border-red-300 dark:border-red-600' 
                  : 'border-gray-300 dark:border-gray-600'
                }
              `}
              placeholder={`Minimum ${config.tokenCost} tokens`}
              disabled={isLoading}
            />
            <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
              LDAO
            </div>
          </div>
          
          {/* Error Messages */}
          {hasErrors && (
            <div className="mt-2 space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Preset Amounts */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick amounts:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map(amount => (
              <button
                key={amount}
                onClick={() => handleAmountChange(amount.toString())}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg transition-colors
                  ${parseFloat(stakeAmount) === amount
                    ? `bg-gradient-to-r ${theme.gradient} text-white`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                disabled={isLoading}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Estimates */}
        {currentAmount > 0 && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Estimates</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rewards earned:</span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  +{estimatedRewards.toFixed(2)} LDAO
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Influence multiplier:</span>
                <span className="font-semibold text-primary-600">
                  {config.multiplier}x
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total influence:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {estimatedInfluence.toFixed(1)} points
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Balance Info */}
        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Your balance:</span>
            <span className="font-medium">{userBalance.toFixed(2)} LDAO</span>
          </div>
          <div className="flex justify-between">
            <span>After stake:</span>
            <span className={`font-medium ${currentAmount > userBalance ? 'text-red-600' : ''}`}>
              {(userBalance - currentAmount).toFixed(2)} LDAO
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={handleStake}
            disabled={isLoading || hasErrors || currentAmount <= 0 || currentAmount > userBalance}
            className={`
              flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200
              ${isLoading || hasErrors || currentAmount <= 0 || currentAmount > userBalance
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : `bg-gradient-to-r ${theme.gradient} text-white hover:shadow-lg ${theme.glow} transform hover:scale-105`
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Staking...</span>
              </div>
            ) : (
              `Stake ${currentAmount || 0} Tokens`
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 Higher stakes earn more rewards and have greater influence on content visibility. 
            Rewards are distributed based on post engagement.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReactionStakeModal;