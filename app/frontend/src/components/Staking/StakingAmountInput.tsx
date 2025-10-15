import React, { useState, useEffect } from 'react';
import { TokenInfo } from '@/types/web3Community';

interface StakingAmountInputProps {
  token?: TokenInfo;
  userBalance?: number;
  currentStake?: number;
  minAmount?: number;
  maxAmount?: number;
  onAmountChange: (amount: number) => void;
  onGasFeeEstimate?: (amount: number) => Promise<number>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const StakingAmountInput: React.FC<StakingAmountInputProps> = ({
  token,
  userBalance = 0,
  currentStake = 0,
  minAmount = 0.1,
  maxAmount,
  onAmountChange,
  onGasFeeEstimate,
  placeholder = "Enter amount to stake",
  disabled = false,
  className = ''
}) => {
  const [amount, setAmount] = useState<string>('');
  const [gasFee, setGasFee] = useState<number | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [error, setError] = useState<string>('');

  const effectiveMaxAmount = maxAmount || userBalance;

  // Validate amount
  const validateAmount = (value: number): string => {
    if (value <= 0) return 'Amount must be greater than 0';
    if (value < minAmount) return `Minimum amount is ${minAmount} ${token?.symbol || 'tokens'}`;
    if (value > effectiveMaxAmount) return `Maximum amount is ${effectiveMaxAmount} ${token?.symbol || 'tokens'}`;
    if (value > userBalance) return 'Insufficient balance';
    return '';
  };

  // Handle amount change
  const handleAmountChange = (value: string) => {
    setAmount(value);
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('');
      onAmountChange(0);
      return;
    }

    const validationError = validateAmount(numValue);
    setError(validationError);
    
    if (!validationError) {
      onAmountChange(numValue);
      
      // Estimate gas fee if function provided
      if (onGasFeeEstimate) {
        estimateGasFee(numValue);
      }
    } else {
      onAmountChange(0);
    }
  };

  // Estimate gas fee
  const estimateGasFee = async (amount: number) => {
    if (!onGasFeeEstimate || amount <= 0) return;

    setIsEstimatingGas(true);
    try {
      const fee = await onGasFeeEstimate(amount);
      setGasFee(fee);
    } catch (error) {
      console.error('Error estimating gas fee:', error);
      setGasFee(null);
    } finally {
      setIsEstimatingGas(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: '25%', value: userBalance * 0.25 },
    { label: '50%', value: userBalance * 0.5 },
    { label: '75%', value: userBalance * 0.75 },
    { label: 'Max', value: userBalance }
  ].filter(item => item.value >= minAmount && item.value <= effectiveMaxAmount);

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
      maximumFractionDigits: 6
    }).format(amount);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Token info header */}
      {token && (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center space-x-3">
            {token.logoUrl && (
              <img 
                src={token.logoUrl} 
                alt={token.symbol} 
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {token.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {token.symbol}
              </div>
            </div>
          </div>
          
          {token.priceUSD && (
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(token.priceUSD)}
              </div>
              {token.priceChange24h && (
                <div className={`text-sm ${
                  token.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Amount input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Staking Amount
        </label>
        
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            min={minAmount}
            max={effectiveMaxAmount}
            step="0.0001"
            className={`
              w-full px-4 py-3 pr-20 text-lg font-medium
              border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error 
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-400' 
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
              }
              text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
            `}
          />
          
          {/* Token symbol */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
            {token?.symbol || 'TOKEN'}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Quick amount buttons */}
      {quickAmounts.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Select
          </label>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((item, index) => (
              <button
                key={index}
                onClick={() => handleAmountChange(item.value.toString())}
                disabled={disabled}
                className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Balance and stake info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Available Balance</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatAmount(userBalance)} {token?.symbol || 'tokens'}
          </div>
          {token?.priceUSD && (
            <div className="text-gray-500 dark:text-gray-400">
              {formatCurrency(userBalance * token.priceUSD)}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Current Stake</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatAmount(currentStake)} {token?.symbol || 'tokens'}
          </div>
          {token?.priceUSD && (
            <div className="text-gray-500 dark:text-gray-400">
              {formatCurrency(currentStake * token.priceUSD)}
            </div>
          )}
        </div>
      </div>

      {/* Gas fee estimation */}
      {onGasFeeEstimate && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Estimated Gas Fee
            </div>
            <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              {isEstimatingGas ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Estimating...</span>
                </div>
              ) : gasFee !== null ? (
                formatCurrency(gasFee)
              ) : (
                'Enter amount to estimate'
              )}
            </div>
          </div>
        </div>
      )}

      {/* USD value preview */}
      {token?.priceUSD && amount && !error && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              USD Value
            </div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(parseFloat(amount) * token.priceUSD)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakingAmountInput;