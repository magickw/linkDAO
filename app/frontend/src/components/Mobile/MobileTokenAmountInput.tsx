import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CurrencyDollarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface TokenAmountInputProps {
  tokenSymbol: string;
  tokenBalance: number;
  tokenPrice?: number;
  maxAmount?: number;
  minAmount?: number;
  placeholder?: string;
  label?: string;
  helperText?: string;
  gasEstimate?: string;
  onAmountChange: (amount: number) => void;
  onMaxClick?: () => void;
  isLoading?: boolean;
  error?: string;
  disabled?: boolean;
  showUSDValue?: boolean;
  showGasEstimate?: boolean;
  hapticFeedback?: boolean;
  className?: string;
}

export const MobileTokenAmountInput: React.FC<TokenAmountInputProps> = ({
  tokenSymbol,
  tokenBalance,
  tokenPrice,
  maxAmount,
  minAmount = 0,
  placeholder = '0.0',
  label,
  helperText,
  gasEstimate,
  onAmountChange,
  onMaxClick,
  isLoading = false,
  error,
  disabled = false,
  showUSDValue = true,
  showGasEstimate = true,
  hapticFeedback = true,
  className = ''
}) => {
  const { triggerHapticFeedback, touchTargetClasses } = useMobileOptimization();
  const { announceToScreenReader, accessibilityClasses } = useMobileAccessibility();
  
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const numericValue = parseFloat(inputValue) || 0;
  const usdValue = tokenPrice ? numericValue * tokenPrice : 0;
  const effectiveMaxAmount = maxAmount !== undefined ? Math.min(maxAmount, tokenBalance) : tokenBalance;
  
  // Validation
  const isValid = numericValue >= minAmount && numericValue <= effectiveMaxAmount && !error;
  const isOverBalance = numericValue > tokenBalance;
  const isUnderMinimum = numericValue > 0 && numericValue < minAmount;
  const isOverMaximum = maxAmount !== undefined && numericValue > maxAmount;

  const handleInputChange = (value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 6
    if (parts[1] && parts[1].length > 6) {
      parts[1] = parts[1].substring(0, 6);
    }
    
    const finalValue = parts.join('.');
    setInputValue(finalValue);
    
    const numValue = parseFloat(finalValue) || 0;
    onAmountChange(numValue);
    
    if (hapticFeedback && numValue > 0) {
      triggerHapticFeedback('light');
    }
    
    // Show validation after user starts typing
    if (finalValue.length > 0) {
      setShowValidation(true);
    }
  };

  const handleMaxClick = () => {
    const maxValue = effectiveMaxAmount.toString();
    setInputValue(maxValue);
    onAmountChange(effectiveMaxAmount);
    setShowValidation(true);
    
    if (hapticFeedback) {
      triggerHapticFeedback('medium');
    }
    
    if (onMaxClick) {
      onMaxClick();
    }
    
    announceToScreenReader(`Set to maximum amount: ${effectiveMaxAmount} ${tokenSymbol}`);
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (hapticFeedback) {
      triggerHapticFeedback('light');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.length > 0) {
      setShowValidation(true);
    }
  };

  // Format numbers for display
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  // Quick amount buttons (25%, 50%, 75%, 100%)
  const quickAmounts = [0.25, 0.5, 0.75, 1.0].map(percentage => ({
    percentage,
    amount: effectiveMaxAmount * percentage,
    label: `${percentage * 100}%`
  }));

  return (
    <div className={`${className} ${accessibilityClasses}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Main Input Container */}
      <div className={`
        relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200
        ${isFocused 
          ? 'border-blue-500 dark:border-blue-400 shadow-lg' 
          : error 
          ? 'border-red-500 dark:border-red-400'
          : 'border-gray-200 dark:border-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {/* Token Symbol Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900 dark:text-white">
              {tokenSymbol}
            </span>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Balance: {formatNumber(tokenBalance, 4)}
            </p>
            {tokenPrice && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                ${tokenPrice.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled || isLoading}
              className={`
                flex-1 text-2xl font-semibold bg-transparent
                text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none
                ${disabled ? 'cursor-not-allowed' : ''}
              `}
              aria-label={`Enter ${tokenSymbol} amount`}
              aria-describedby={error ? 'amount-error' : helperText ? 'amount-helper' : undefined}
            />
            
            {/* Max Button */}
            <button
              onClick={handleMaxClick}
              disabled={disabled || isLoading}
              className={`
                ${touchTargetClasses}
                px-3 py-1 text-sm font-medium rounded-lg
                bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                hover:bg-blue-200 dark:hover:bg-blue-900/50
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              MAX
            </button>
          </div>

          {/* USD Value */}
          {showUSDValue && tokenPrice && numericValue > 0 && (
            <motion.p
              className="text-lg text-gray-500 dark:text-gray-400 mt-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ≈ ${formatNumber(usdValue)}
            </motion.p>
          )}
        </div>

        {/* Quick Amount Buttons */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((quick) => (
              <button
                key={quick.percentage}
                onClick={() => {
                  const amount = quick.amount.toString();
                  setInputValue(amount);
                  onAmountChange(quick.amount);
                  setShowValidation(true);
                  if (hapticFeedback) {
                    triggerHapticFeedback('light');
                  }
                }}
                disabled={disabled || isLoading}
                className={`
                  ${touchTargetClasses}
                  py-2 text-sm font-medium rounded-lg
                  bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {quick.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Validation Messages */}
      <AnimatePresence>
        {showValidation && (
          <motion.div
            className="mt-2 space-y-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Error Messages */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400" id="amount-error">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            {isOverBalance && !error && (
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">Insufficient balance</span>
              </div>
            )}
            
            {isUnderMinimum && !error && (
              <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">Minimum amount: {minAmount} {tokenSymbol}</span>
              </div>
            )}
            
            {isOverMaximum && !error && (
              <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                <ExclamationTriangleIcon className="w-4 h-4" />
                <span className="text-sm">Maximum amount: {maxAmount} {tokenSymbol}</span>
              </div>
            )}
            
            {/* Success Message */}
            {isValid && numericValue > 0 && (
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="text-sm">Valid amount</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gas Estimate */}
      {showGasEstimate && gasEstimate && numericValue > 0 && (
        <motion.div
          className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Estimated gas fee: {gasEstimate}
            </span>
          </div>
        </motion.div>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400" id="amount-helper">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default MobileTokenAmountInput;