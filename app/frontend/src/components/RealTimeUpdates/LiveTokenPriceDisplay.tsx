/**
 * Live token price display component with real-time updates and smooth animations
 */

import React, { useState, useEffect } from 'react';
import { useRealTimeTokenPrices } from '../../hooks/useRealTimeBlockchain';

interface LiveTokenPriceDisplayProps {
  tokenAddress: string;
  displayFormat?: 'compact' | 'detailed';
  showChange?: boolean;
  updateInterval?: number;
  className?: string;
}

interface PriceAnimationState {
  currentPrice: number;
  previousPrice: number;
  isAnimating: boolean;
  direction: 'up' | 'down' | 'neutral';
}

export const LiveTokenPriceDisplay: React.FC<LiveTokenPriceDisplayProps> = ({
  tokenAddress,
  displayFormat = 'compact',
  showChange = true,
  updateInterval = 10000,
  className = ''
}) => {
  const { tokenPrices, getTokenPrice, forceUpdate } = useRealTimeTokenPrices([tokenAddress]);
  
  const [animationState, setAnimationState] = useState<PriceAnimationState>({
    currentPrice: 0,
    previousPrice: 0,
    isAnimating: false,
    direction: 'neutral'
  });

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Get current token price data
  const tokenData = getTokenPrice(tokenAddress);

  // Handle price updates with animation
  useEffect(() => {
    if (tokenData && tokenData.price !== animationState.currentPrice) {
      const direction = tokenData.price > animationState.currentPrice ? 'up' : 
                       tokenData.price < animationData.currentPrice ? 'down' : 'neutral';
      
      setAnimationState(prev => ({
        currentPrice: tokenData.price,
        previousPrice: prev.currentPrice,
        isAnimating: true,
        direction
      }));

      setLastUpdateTime(tokenData.timestamp);

      // Reset animation after duration
      const animationTimeout = setTimeout(() => {
        setAnimationState(prev => ({ ...prev, isAnimating: false }));
      }, 1000);

      return () => clearTimeout(animationTimeout);
    }
  }, [tokenData]); // Removed animationState.currentPrice from dependencies

  // Force update on interval
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(tokenAddress);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [tokenAddress, updateInterval]); // Removed forceUpdate from dependencies

  // Format price for display
  const formatPrice = (price: number): string => {
    if (price === 0) return '$0.00';
    
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Format percentage change
  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  // Get animation classes
  const getAnimationClasses = (): string => {
    if (!animationState.isAnimating) return '';
    
    const baseClasses = 'transition-all duration-1000 ease-out';
    
    switch (animationState.direction) {
      case 'up':
        return `${baseClasses} animate-pulse text-green-500 scale-105`;
      case 'down':
        return `${baseClasses} animate-pulse text-red-500 scale-105`;
      default:
        return baseClasses;
    }
  };

  // Get change color classes
  const getChangeColorClasses = (change: number): string => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  // Loading state
  if (!tokenData) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        {showChange && displayFormat === 'detailed' && (
          <div className="h-4 bg-gray-200 rounded w-16 mt-1"></div>
        )}
      </div>
    );
  }

  // Compact format
  if (displayFormat === 'compact') {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        <span className={`font-semibold ${getAnimationClasses()}`}>
          {formatPrice(animationState.currentPrice)}
        </span>
        {showChange && (
          <span className={`text-sm ${getChangeColorClasses(tokenData.change24h)}`}>
            {formatChange(tokenData.change24h)}
          </span>
        )}
        {animationState.isAnimating && (
          <div className="flex items-center">
            {animationState.direction === 'up' && (
              <svg className="w-4 h-4 text-green-500 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {animationState.direction === 'down' && (
              <svg className="w-4 h-4 text-red-500 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed format
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold ${getAnimationClasses()}`}>
          {formatPrice(animationState.currentPrice)}
        </span>
        {animationState.isAnimating && (
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        )}
      </div>
      
      {showChange && (
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getChangeColorClasses(tokenData.change24h)}`}>
            {formatChange(tokenData.change24h)}
          </span>
          <span className="text-xs text-gray-500">24h</span>
        </div>
      )}
      
      {lastUpdateTime && (
        <div className="text-xs text-gray-400">
          Updated {lastUpdateTime.toLocaleTimeString()}
        </div>
      )}
      
      {/* Price change indicator */}
      {animationState.isAnimating && (
        <div className="flex items-center space-x-2">
          <div className={`w-full h-1 rounded-full overflow-hidden bg-gray-200`}>
            <div 
              className={`h-full transition-all duration-1000 ease-out ${
                animationState.direction === 'up' ? 'bg-green-500' : 
                animationState.direction === 'down' ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTokenPriceDisplay;