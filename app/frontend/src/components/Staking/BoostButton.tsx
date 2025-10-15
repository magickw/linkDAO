import React, { useState } from 'react';
import { TokenInfo } from '@/types/web3Community';

interface BoostButtonProps {
  postId: string;
  currentStake?: number;
  userBalance?: number;
  token?: TokenInfo;
  onBoost: (postId: string, amount: number) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const BoostButton: React.FC<BoostButtonProps> = ({
  postId,
  currentStake = 0,
  userBalance = 0,
  token,
  onBoost,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickAmounts, setShowQuickAmounts] = useState(false);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600';
      case 'outline':
        return 'bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-600 dark:hover:bg-blue-900/20 dark:text-blue-400 dark:border-blue-400';
      default:
        return 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border border-transparent shadow-lg hover:shadow-xl';
    }
  };

  const quickAmounts = [1, 5, 10, 25];

  const handleQuickBoost = async (amount: number) => {
    if (disabled || isLoading || amount > userBalance) return;

    setIsLoading(true);
    try {
      await onBoost(postId, amount);
      setShowQuickAmounts(false);
    } catch (error) {
      console.error('Error boosting post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  return (
    <div className="relative">
      {/* Main boost button */}
      <button
        onClick={() => setShowQuickAmounts(!showQuickAmounts)}
        disabled={disabled || isLoading || userBalance === 0}
        className={`
          inline-flex items-center space-x-2 font-semibold rounded-lg
          transition-all duration-300 transform hover:scale-105
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          ${getSizeClasses()} ${getVariantClasses()} ${className}
        `}
      >
        {/* Boost icon */}
        <svg 
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} ${isLoading ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isLoading ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          )}
        </svg>

        <span>
          {isLoading ? 'Boosting...' : 'Boost'}
        </span>

        {/* Current stake indicator */}
        {currentStake > 0 && (
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {formatAmount(currentStake)}
          </span>
        )}

        {/* Dropdown arrow */}
        <svg 
          className={`w-3 h-3 transition-transform duration-200 ${showQuickAmounts ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Quick amount dropdown */}
      {showQuickAmounts && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 min-w-full">
          <div className="p-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Quick Boost Amounts
            </div>
            
            {/* Balance display */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Balance: {formatAmount(userBalance)} {token?.symbol || 'tokens'}
            </div>

            {/* Quick amount buttons */}
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickBoost(amount)}
                  disabled={amount > userBalance || isLoading}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-md
                    transition-all duration-200 hover:scale-105
                    ${amount <= userBalance 
                      ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                    }
                  `}
                >
                  {formatAmount(amount)} {token?.symbol || ''}
                </button>
              ))}
            </div>

            {/* Custom amount option */}
            <button
              onClick={() => {
                // This would open a custom amount modal
                setShowQuickAmounts(false);
              }}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Custom Amount...
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showQuickAmounts && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowQuickAmounts(false)}
        />
      )}
    </div>
  );
};

export default BoostButton;