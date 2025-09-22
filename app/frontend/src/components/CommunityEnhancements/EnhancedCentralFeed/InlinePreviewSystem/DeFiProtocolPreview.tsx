/**
 * DeFiProtocolPreview Component
 * 
 * Displays yield farming charts with APY and risk indicators, shows TVL, current yields,
 * and protocol health metrics. Includes quick action buttons for protocol interaction
 * and real-time price and yield updates.
 * 
 * Requirements: 2.4, 5.5
 */

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { DeFiPreview } from '../../../../types/communityEnhancements';

interface DeFiProtocolPreviewProps {
  defi: DeFiPreview;
  onInteract?: (protocol: string, action: 'stake' | 'unstake' | 'claim' | 'view') => void;
  onExpand?: (defi: DeFiPreview) => void;
  userStaked?: number;
  userRewards?: number;
  isLoading?: boolean;
  showQuickActions?: boolean;
  compact?: boolean;
  className?: string;
}

interface RiskConfig {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
  description: string;
}

const RISK_CONFIG: Record<string, RiskConfig> = {
  low: {
    label: 'Low Risk',
    color: '#10B981',
    backgroundColor: '#ECFDF5',
    icon: '🟢',
    description: 'Established protocol with strong security record'
  },
  medium: {
    label: 'Medium Risk',
    color: '#F59E0B',
    backgroundColor: '#FFFBEB',
    icon: '🟡',
    description: 'Moderate risk with good track record'
  },
  high: {
    label: 'High Risk',
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    icon: '🔴',
    description: 'Higher risk, newer protocol or experimental features'
  }
};

const DeFiProtocolPreview: React.FC<DeFiProtocolPreviewProps> = memo(({
  defi,
  onInteract,
  onExpand,
  userStaked = 0,
  userRewards = 0,
  isLoading = false,
  showQuickActions = true,
  compact = false,
  className = ''
}) => {
  const [currentYield, setCurrentYield] = useState(defi.yields.current);
  const [isInteracting, setIsInteracting] = useState(false);
  const [chartData, setChartData] = useState(defi.yields.historical);

  // Simulate real-time yield updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate small yield fluctuations (±0.1%)
      const fluctuation = (Math.random() - 0.5) * 0.2;
      setCurrentYield(prev => Math.max(0, prev + fluctuation));
      
      // Update historical data
      setChartData(prev => {
        const newData = [...prev.slice(1), currentYield];
        return newData;
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [currentYield]);

  // Handle protocol interaction
  const handleInteraction = useCallback(async (action: 'stake' | 'unstake' | 'claim' | 'view') => {
    if (!onInteract || isLoading || isInteracting) return;

    setIsInteracting(true);
    try {
      await onInteract(defi.protocol, action);
    } finally {
      setIsInteracting(false);
    }
  }, [onInteract, defi.protocol, isLoading, isInteracting]);

  // Handle expand click
  const handleExpandClick = useCallback(() => {
    if (onExpand && !isLoading) {
      onExpand(defi);
    }
  }, [onExpand, defi, isLoading]);

  // Format large numbers
  const formatLargeNumber = useCallback((num: number) => {
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(1)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(2)}`;
  }, []);

  // Format percentage
  const formatPercentage = useCallback((num: number) => {
    return `${num.toFixed(2)}%`;
  }, []);

  // Get risk configuration
  const riskConfig = useMemo(() => {
    return RISK_CONFIG[defi.riskLevel] || RISK_CONFIG.medium;
  }, [defi.riskLevel]);

  // Calculate yield trend
  const yieldTrend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';
    const recent = chartData.slice(-3);
    const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const current = chartData[chartData.length - 1];
    
    if (current > average * 1.02) return 'up';
    if (current < average * 0.98) return 'down';
    return 'neutral';
  }, [chartData]);

  // Generate mini chart path
  const chartPath = useMemo(() => {
    if (chartData.length < 2) return '';
    
    const width = 100;
    const height = 30;
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const range = max - min || 1;
    
    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  }, [chartData]);

  const cardClasses = useMemo(() => {
    const baseClasses = [
      'ce-defi-protocol-preview',
      'bg-white dark:bg-gray-800',
      'border border-gray-200 dark:border-gray-700',
      'rounded-lg overflow-hidden',
      'transition-all duration-200 ease-in-out',
      'hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600',
      'group'
    ];

    if (compact) {
      baseClasses.push('max-w-xs');
    } else {
      baseClasses.push('max-w-sm');
    }

    if (onExpand && !isLoading) {
      baseClasses.push('cursor-pointer', 'hover:transform', 'hover:scale-105');
    }

    if (isLoading) {
      baseClasses.push('opacity-75', 'cursor-wait');
    }

    if (className) {
      baseClasses.push(className);
    }

    return baseClasses.join(' ');
  }, [compact, onExpand, isLoading, className]);

  return (
    <div 
      className={cardClasses}
      onClick={onExpand ? handleExpandClick : undefined}
      role={onExpand ? 'button' : 'article'}
      tabIndex={onExpand ? 0 : -1}
      onKeyDown={(e) => {
        if (onExpand && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleExpandClick();
        }
      }}
      aria-label={`DeFi protocol: ${defi.protocol}, APY: ${formatPercentage(defi.apy)}, TVL: ${formatLargeNumber(defi.tvl)}, Risk: ${riskConfig.label}`}
    >
      {/* Header */}
      <div className={`p-4 ${compact ? 'pb-2' : 'pb-3'}`}>
        <div className="flex items-start justify-between gap-3">
          {/* Protocol Name */}
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {defi.protocol}
          </h3>

          {/* Risk Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              color: riskConfig.color,
              backgroundColor: riskConfig.backgroundColor
            }}
            title={riskConfig.description}
          >
            <span aria-hidden="true">{riskConfig.icon}</span>
            <span>{riskConfig.label}</span>
          </div>
        </div>

        {/* APY Display */}
        <div className="mt-2 flex items-center gap-2">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPercentage(defi.apy)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">APY</div>
          
          {/* Yield Trend Indicator */}
          <div className={`flex items-center text-xs ${
            yieldTrend === 'up' 
              ? 'text-green-600 dark:text-green-400' 
              : yieldTrend === 'down'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {yieldTrend === 'up' && '↗️'}
            {yieldTrend === 'down' && '↘️'}
            {yieldTrend === 'neutral' && '➡️'}
            <span className="ml-1">
              {yieldTrend === 'up' ? 'Rising' : yieldTrend === 'down' ? 'Falling' : 'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      {!compact && chartPath && (
        <div className="px-4 pb-3">
          <div className="relative h-8 bg-gray-50 dark:bg-gray-700 rounded overflow-hidden">
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 30"
              preserveAspectRatio="none"
            >
              <path
                d={chartPath}
                fill="none"
                stroke={yieldTrend === 'up' ? '#10B981' : yieldTrend === 'down' ? '#EF4444' : '#6B7280'}
                strokeWidth="2"
                className="transition-all duration-500"
              />
              {/* Fill area under curve */}
              <path
                d={`${chartPath} L 100,30 L 0,30 Z`}
                fill={yieldTrend === 'up' ? '#10B981' : yieldTrend === 'down' ? '#EF4444' : '#6B7280'}
                fillOpacity="0.1"
                className="transition-all duration-500"
              />
            </svg>
            
            {/* Current yield indicator */}
            <div className="absolute top-1 right-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded">
              {formatPercentage(currentYield)}
            </div>
          </div>
        </div>
      )}

      {/* Protocol Metrics */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-3">
          {/* TVL */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Value Locked</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatLargeNumber(defi.tvl)}
            </p>
          </div>
          
          {/* Current Yield */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Current Yield</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatPercentage(currentYield)}
            </p>
          </div>
        </div>
      </div>

      {/* User Position (if applicable) */}
      {(userStaked > 0 || userRewards > 0) && (
        <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {userStaked > 0 && (
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Your Stake</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatLargeNumber(userStaked)}
                </p>
              </div>
            )}
            {userRewards > 0 && (
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">Rewards</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatLargeNumber(userRewards)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {showQuickActions && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction('stake');
              }}
              disabled={isInteracting || isLoading}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Stake in ${defi.protocol}`}
            >
              {isInteracting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                <>💰 Stake</>
              )}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction('view');
              }}
              disabled={isInteracting || isLoading}
              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`View ${defi.protocol} details`}
            >
              📊 Details
            </button>
          </div>
          
          {/* Additional actions for users with positions */}
          {(userStaked > 0 || userRewards > 0) && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {userStaked > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInteraction('unstake');
                  }}
                  disabled={isInteracting || isLoading}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Unstake from ${defi.protocol}`}
                >
                  🔓 Unstake
                </button>
              )}
              
              {userRewards > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInteraction('claim');
                  }}
                  disabled={isInteracting || isLoading}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Claim rewards from ${defi.protocol}`}
                >
                  🎁 Claim
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expand Indicator */}
      {onExpand && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-lg">
            <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Screen reader information */}
      <div className="sr-only">
        DeFi protocol: {defi.protocol}.
        Annual Percentage Yield: {formatPercentage(defi.apy)}.
        Total Value Locked: {formatLargeNumber(defi.tvl)}.
        Current yield: {formatPercentage(currentYield)}.
        Risk level: {riskConfig.description}.
        Yield trend: {yieldTrend === 'up' ? 'Rising' : yieldTrend === 'down' ? 'Falling' : 'Stable'}.
        {userStaked > 0 && `Your staked amount: ${formatLargeNumber(userStaked)}.`}
        {userRewards > 0 && `Available rewards: ${formatLargeNumber(userRewards)}.`}
        {onExpand && 'Click to expand for more details.'}
      </div>
    </div>
  );
});

DeFiProtocolPreview.displayName = 'DeFiProtocolPreview';

export default DeFiProtocolPreview;