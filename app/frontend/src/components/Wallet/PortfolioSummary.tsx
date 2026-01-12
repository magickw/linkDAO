/**
 * Portfolio Summary Component
 * Displays portfolio overview with total value, changes, and asset allocation
 */

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { TokenBalance } from '@/services/walletService';

interface PortfolioSummaryProps {
  totalValue: number;
  change24h: number;
  change24hPercent: number;
  tokens: TokenBalance[];
  timeframe?: '1d' | '1w' | '1m' | '1y';
  onTimeframeChange?: (timeframe: '1d' | '1w' | '1m' | '1y') => void;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  change24h,
  change24hPercent,
  tokens,
  timeframe = '1d',
  onTimeframeChange,
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const formatted = Math.abs(value).toFixed(2);
    return `${value >= 0 ? '+' : '-'}${formatted}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-5 h-5" />;
    if (change < 0) return <TrendingDown className="w-5 h-5" />;
    return null;
  };

  // Calculate asset allocation
  const assetAllocation = tokens.slice(0, 5).map((token) => ({
    symbol: token.symbol,
    value: token.valueUSD,
    percentage: totalValue > 0 ? (token.valueUSD / totalValue) * 100 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Total Portfolio Value */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100 mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold">{formatCurrency(totalValue)}</p>
            <div className="flex items-center mt-2 space-x-2">
              {getChangeIcon(change24hPercent)}
              <p className={`text-sm ${getChangeColor(change24hPercent)}`}>
                {formatPercentage(change24hPercent)} ({timeframe})
              </p>
              <span className="text-blue-200">
                {formatCurrency(Math.abs(change24h))}
              </span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <PieChart className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>

      {/* Timeframe Selector */}
      {onTimeframeChange && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance
          </h3>
          <div className="flex space-x-2">
            {(['1d', '1w', '1m', '1y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Asset Allocation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Asset Allocation
        </h3>
        <div className="space-y-3">
          {assetAllocation.map((asset) => (
            <div key={asset.symbol} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {asset.symbol}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(asset.value)} ({asset.percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${asset.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {tokens.length > 5 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            +{tokens.length - 5} more assets
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokens.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Top Performer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokens.length > 0
                  ? tokens.reduce((best, token) =>
                      token.change24h > best.change24h ? token : best
                    ).symbol
                  : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Largest Asset</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {tokens.length > 0
                  ? tokens.reduce((largest, token) =>
                      token.valueUSD > largest.valueUSD ? token : largest
                    ).symbol
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};