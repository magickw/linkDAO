import React, { useState, useEffect } from 'react';
import { EnhancedWalletData, TokenBalance, Transaction, QuickAction } from '../../types/wallet';

interface WalletDashboardProps {
  walletData: EnhancedWalletData | null;
  onQuickAction: (action: QuickAction) => void;
  onPortfolioClick: () => void;
  className?: string;
}

const WalletDashboard = React.memo(function WalletDashboard({ 
  walletData, 
  onQuickAction, 
  onPortfolioClick,
  className = '' 
}: WalletDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [animateChange, setAnimateChange] = useState(false);
  
  // Handle case where walletData is null
  const displayWalletData = walletData || {
    address: '0x0000000000000000000000000000000000000000',
    balances: [],
    recentTransactions: [],
    portfolioValue: 0,
    portfolioChange: 0,
    quickActions: []
  };
  
  const pricesLoading = false;
  const pricesError = null;
  const lastUpdated = new Date();

  // Animate portfolio value changes - but throttle to prevent excessive animations
  const [lastPortfolioValue, setLastPortfolioValue] = useState(displayWalletData.portfolioValue);
  
  useEffect(() => {
    const currentValue = displayWalletData.portfolioValue;
    const valueChanged = Math.abs(currentValue - lastPortfolioValue) > 0.01; // Only animate if change > $0.01
    
    if (valueChanged) {
      setAnimateChange(true);
      setLastPortfolioValue(currentValue);
      const timer = setTimeout(() => setAnimateChange(false), 500);
      return () => clearTimeout(timer);
    }
  }, [displayWalletData.portfolioValue, lastPortfolioValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 4) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(decimals);
  };

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return '0x0000...0000';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const isPositive = displayWalletData.portfolioChange >= 0;
  // Removed price data stale check since we're using static data

  // Handle case where there are no balances
  const topHoldings = displayWalletData.balances && displayWalletData.balances.length > 0 
    ? displayWalletData.balances.slice(0, 3) 
    : [];

  // Handle case where there are no quick actions
  const quickActions = displayWalletData.quickActions || [];

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Wallet Dashboard
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatAddress(displayWalletData.address)}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-semibold text-gray-900 dark:text-white transition-all duration-500 ${
              animateChange ? 'scale-110 text-primary-600 dark:text-primary-400' : ''
            }`}>
              {formatCurrency(displayWalletData.portfolioValue)}
              {pricesLoading && (
                <span className="ml-2 inline-block w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              )}
            </p>
            <p className={`text-sm flex items-center justify-end ${
              isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              <svg 
                className={`w-3 h-3 mr-1 transition-transform duration-300 ${
                  isPositive ? 'rotate-0' : 'rotate-180'
                }`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {isPositive ? '+' : ''}{displayWalletData.portfolioChange.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="p-4">
        {/* Top Holdings */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Top Holdings
          </h4>
          <div className="space-y-2">
            {topHoldings.map((token, index) => {
              const percentage = displayWalletData.portfolioValue > 0 
                ? (token.valueUSD / displayWalletData.portfolioValue) * 100 
                : 0;
              const tokenIsPositive = token.change24h >= 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold">
                      {token.symbol ? token.symbol.substring(0, 2) : 'TK'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {token.symbol || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatNumber(token.balance || 0)} {token.symbol || ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {formatCurrency(token.valueUSD || 0)}
                    </p>
                    <p className={`text-xs ${tokenIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                      {tokenIsPositive ? '+' : ''}{(token.change24h || 0).toFixed(2)}%
                    </p>
                  </div>
                  
                  <div className="w-12 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ml-2">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {topHoldings.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No holdings found</p>
                <p className="text-xs mt-1">Connect your wallet to see your assets</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action, index) => (
              <button
                key={action.id || index}
                onClick={() => onQuickAction(action)}
                disabled={action.disabled || isLoading}
                className={`
                  bg-gray-100/80 dark:bg-gray-700/50 hover:bg-gray-200/80 dark:hover:bg-gray-600/50 
                  rounded-lg p-3 text-center transition-all duration-200 group
                  ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
                `}
                title={action.tooltip}
              >
                <div className="text-xl mb-1 group-hover:scale-110 transition-transform duration-200">
                  {action.icon || '⚡'}
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {action.label || 'Action'}
                </span>
              </button>
            ))}
            
            {quickActions.length === 0 && (
              <div className="col-span-2 text-center py-2 text-gray-500 dark:text-gray-400">
                <p>No quick actions available</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Details Button */}
        <button
          onClick={onPortfolioClick}
          className="w-full py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200 border border-primary-200 dark:border-primary-800 hover:border-primary-300 dark:hover:border-primary-700"
        >
          View Full Portfolio & Analytics
        </button>
      </div>

      {/* Real-time Status Indicator */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-2 bg-blue-500" />
            Static wallet data (refresh disabled)
          </div>
          
          {lastUpdated && (
            <div className="flex items-center space-x-2">
              <span>
                Updated {new Date(lastUpdated).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              <div className="p-1">
                <svg 
                  className="w-3 h-3 text-green-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {pricesError && (
          <div className="mt-2 text-xs text-red-500 dark:text-red-400">
            {pricesError}
          </div>
        )}
      </div>
    </div>
  );
});

export default WalletDashboard;