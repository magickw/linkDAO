import React, { useState } from 'react';
import { TokenPreview as TokenPreviewData } from '@/types/contentPreview';

interface TokenPreviewProps {
  data: TokenPreviewData;
  className?: string;
}

export default function TokenPreview({ data, className = '' }: TokenPreviewProps) {
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(6);
  };

  const formatUsdValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '➡️';
  };

  const getBorderColor = (change: number) => {
    if (change > 0) return 'border-green-200 dark:border-green-700/50';
    if (change < 0) return 'border-red-200 dark:border-red-700/50';
    return 'border-gray-200 dark:border-gray-700/50';
  };

  const getGradientColor = (change: number) => {
    if (change > 0) return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
    if (change < 0) return 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20';
    return 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20';
  };

  return (
    <div className={`bg-gradient-to-br ${getGradientColor(data.change24h)} rounded-xl border ${getBorderColor(data.change24h)} overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">💰</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Token Transaction
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs">{getChangeIcon(data.change24h)}</span>
            <span className={`text-xs font-semibold ${getChangeColor(data.change24h)}`}>
              {data.change24h > 0 ? '+' : ''}{data.change24h.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center space-x-4">
          {/* Token Logo */}
          <div className="flex-shrink-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-600 shadow-sm">
              {!logoError ? (
                <>
                  {!logoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <img
                    src={data.logo}
                    alt={`${data.symbol} logo`}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLogoLoaded(true)}
                    onError={() => setLogoError(true)}
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-sm">
                  {data.symbol.substring(0, 2)}
                </div>
              )}
            </div>
          </div>

          {/* Token Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                {data.symbol}
              </h4>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {data.name}
              </span>
            </div>

            {/* Amount and USD Value */}
            <div className="space-y-1">
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatAmount(data.amount)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {data.symbol}
                </span>
              </div>
              
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatUsdValue(data.usdValue)}
              </div>
            </div>
          </div>

          {/* 24h Change Indicator */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-lg font-bold ${getChangeColor(data.change24h)}`}>
              {data.change24h > 0 ? '+' : ''}{data.change24h.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              24h change
            </div>
          </div>
        </div>

        {/* Contract Address */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Contract:</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              {data.contractAddress.substring(0, 6)}...{data.contractAddress.substring(38)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mt-4">
          <button className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-800/70 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors duration-200 border border-gray-200 dark:border-gray-600">
            View on Explorer
          </button>
          <button className="px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}