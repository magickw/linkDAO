import React from 'react';
import { Coins, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TokenBalanceDisplayProps {
  balance: number;
  symbol?: string;
  showSymbol?: boolean;
  showIcon?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  change24h?: number;
  stakingStatus?: 'staked' | 'unstaked' | 'pending';
  className?: string;
}

/**
 * TokenBalanceDisplay Component
 * 
 * Displays token balance with formatting, optional symbol, and staking status.
 * Supports different sizes and variants for various use cases.
 * 
 * Requirements: 1.2, 1.4 (token balance and staking status indicators)
 */
export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({
  balance,
  symbol = 'TOKENS',
  showSymbol = true,
  showIcon = true,
  size = 'sm',
  variant = 'default',
  change24h,
  stakingStatus,
  className = ''
}) => {
  const formatBalance = (balance: number): string => {
    if (balance >= 1000000000) {
      // Billion or more: format as X.XXB
      return `${(balance / 1000000000).toFixed(2)}B`;
    }
    if (balance >= 1000000) {
      // Million or more: format as X.XXM
      return `${(balance / 1000000).toFixed(2)}M`;
    }
    if (balance >= 1000) {
      // Thousand or more: format as X.XXK
      return `${(balance / 1000).toFixed(2)}K`;
    }
    if (balance >= 1) {
      // 1 or more: show with 2 decimal places
      return balance.toFixed(2);
    }
    if (balance > 0) {
      // Less than 1: show with up to 6 decimal places, but trim trailing zeros
      return balance.toFixed(6).replace(/\.?0+$/, '');
    }
    return '0';
  };

  const getSizeConfig = (size: 'xs' | 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'xs':
        return {
          container: 'px-1.5 py-0.5',
          icon: 'w-3 h-3',
          text: 'text-xs',
          spacing: 'space-x-1'
        };
      case 'sm':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs',
          spacing: 'space-x-1'
        };
      case 'md':
        return {
          container: 'px-3 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-sm',
          spacing: 'space-x-1.5'
        };
      case 'lg':
        return {
          container: 'px-4 py-2',
          icon: 'w-5 h-5',
          text: 'text-base',
          spacing: 'space-x-2'
        };
      default:
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs',
          spacing: 'space-x-1'
        };
    }
  };

  const getStakingStatusConfig = (status?: 'staked' | 'unstaked' | 'pending') => {
    switch (status) {
      case 'staked':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          textColor: 'text-green-800 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400'
        };
      case 'pending':
        return {
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'unstaked':
      default:
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          textColor: 'text-blue-800 dark:text-blue-200',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400'
        };
    }
  };

  const sizeConfig = getSizeConfig(size);
  const statusConfig = getStakingStatusConfig(stakingStatus);
  const formattedBalance = formatBalance(balance);

  if (variant === 'compact') {
    return (
      <div
        className={`
          inline-flex items-center rounded-full font-medium
          ${statusConfig.bgColor} ${statusConfig.textColor} ${sizeConfig.container}
          ${className}
        `}
        title={`${balance.toLocaleString()} ${symbol}${stakingStatus ? ` (${stakingStatus})` : ''}`}
      >
        {showIcon && <Coins className={`${sizeConfig.icon} ${statusConfig.iconColor} mr-1`} />}
        <span className={sizeConfig.text}>
          {formattedBalance}
          {showSymbol && size !== 'xs' && (
            <span className="ml-1 opacity-75">{symbol}</span>
          )}
        </span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`
          inline-flex flex-col items-start rounded-lg border
          ${statusConfig.bgColor} ${statusConfig.borderColor} ${sizeConfig.container}
          ${className}
        `}
      >
        <div className={`flex items-center ${sizeConfig.spacing}`}>
          {showIcon && <Coins className={`${sizeConfig.icon} ${statusConfig.iconColor}`} />}
          <span className={`${sizeConfig.text} font-medium ${statusConfig.textColor}`}>
            {formattedBalance}
            {showSymbol && <span className="ml-1 opacity-75">{symbol}</span>}
          </span>
        </div>
        
        {change24h !== undefined && (
          <div className="flex items-center mt-1 space-x-1">
            {change24h > 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : change24h < 0 ? (
              <TrendingDown className="w-3 h-3 text-red-500" />
            ) : (
              <Minus className="w-3 h-3 text-gray-400" />
            )}
            <span className={`text-xs ${
              change24h > 0 ? 'text-green-600' : 
              change24h < 0 ? 'text-red-600' : 'text-gray-500'
            }`}>
              {change24h > 0 ? '+' : ''}{change24h?.toFixed(2)}%
            </span>
          </div>
        )}
        
        {stakingStatus && (
          <div className="mt-1">
            <span className={`text-xs ${statusConfig.textColor} opacity-75 capitalize`}>
              {stakingStatus}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`
        inline-flex items-center rounded-full border font-medium
        ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}
        ${sizeConfig.container} ${sizeConfig.spacing}
        ${className}
      `}
      title={`${balance.toLocaleString()} ${symbol}${stakingStatus ? ` (${stakingStatus})` : ''}`}
    >
      {showIcon && <Coins className={`${sizeConfig.icon} ${statusConfig.iconColor}`} />}
      <span className={sizeConfig.text}>
        {formattedBalance}
        {showSymbol && <span className="ml-1 opacity-75">{symbol}</span>}
      </span>
    </div>
  );
};

export default TokenBalanceDisplay;