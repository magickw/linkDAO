/**
 * GasFeeEstimator - Real-time gas fee estimation
 */

import React, { useState, useEffect } from 'react';
import { Fuel, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GasFeeEstimatorProps {
  onFeeUpdate?: (fee: string) => void;
}

export const GasFeeEstimator: React.FC<GasFeeEstimatorProps> = ({ onFeeUpdate }) => {
  const [gasPrice, setGasPrice] = useState<number>(0);
  const [gasTrend, setGasTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock gas price fetching - replace with actual Web3 provider call
    const fetchGasPrice = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock gas price in Gwei
        const mockGasPrice = 25 + Math.random() * 50;
        const previousPrice = gasPrice;
        
        setGasPrice(mockGasPrice);
        
        // Determine trend
        if (previousPrice > 0) {
          if (mockGasPrice > previousPrice * 1.1) {
            setGasTrend('up');
          } else if (mockGasPrice < previousPrice * 0.9) {
            setGasTrend('down');
          } else {
            setGasTrend('stable');
          }
        }

        // Estimate total gas fee (assuming 21000 gas limit for simple transfer)
        const estimatedFee = (mockGasPrice * 21000) / 1e9; // Convert to ETH
        onFeeUpdate?.(estimatedFee.toFixed(6));
      } catch (error) {
        console.error('Failed to fetch gas price:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGasPrice();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchGasPrice, 30000);
    
    return () => clearInterval(interval);
  }, [onFeeUpdate]);

  const getTrendIcon = () => {
    switch (gasTrend) {
      case 'up':
        return <TrendingUp size={14} className="text-red-500" />;
      case 'down':
        return <TrendingDown size={14} className="text-green-500" />;
      default:
        return <Minus size={14} className="text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (gasTrend) {
      case 'up':
        return 'text-red-600 dark:text-red-400';
      case 'down':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Fuel size={16} className="text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Estimated Gas Fee
          </span>
        </div>
        {!loading && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-xs font-medium ${getTrendColor()}`}>
              {gasTrend === 'up' && 'High'}
              {gasTrend === 'down' && 'Low'}
              {gasTrend === 'stable' && 'Normal'}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Calculating...</span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {gasPrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Gwei</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            ≈ {((gasPrice * 21000) / 1e9).toFixed(6)} ETH for this transaction
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Gas fees fluctuate based on network congestion. We'll use the current rate when you confirm.
        </p>
      </div>
    </div>
  );
};
