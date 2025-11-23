/**
 * Data Consistency Monitor Component
 * Provides real-time monitoring and validation of marketplace data consistency
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataConsistency } from '@/hooks/useMarketplaceData';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';

interface DataConsistencyMonitorProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onInconsistencyDetected?: (inconsistencies: string[]) => void;
}

interface CacheStats {
  products: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  sellers: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  prices: {
    size: number;
    maxSize: number;
    hitRate: number;
  };
  config: {
    ttl: number;
    maxSize: number;
  };
}

export const DataConsistencyMonitor: React.FC<DataConsistencyMonitorProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  onInconsistencyDetected
}) => {
  const { inconsistencies, validateConsistency, getCacheStats, invalidateAll } = useDataConsistency();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const [isExpanded, setIsExpanded] = useState(showDetails);

  // Auto-refresh validation
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      await performValidation();
    }, refreshInterval);

    // Initial validation
    performValidation();

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Notify parent of inconsistencies
  useEffect(() => {
    if (inconsistencies.length > 0 && onInconsistencyDetected) {
      onInconsistencyDetected(inconsistencies);
    }
  }, [inconsistencies, onInconsistencyDetected]);

  const performValidation = async () => {
    setIsValidating(true);
    try {
      const issues = validateConsistency();
      const stats = getCacheStats();
      setCacheStats(stats);
      setLastValidation(new Date());
    } catch (error) {
      console.error('Error during validation:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleInvalidateAll = () => {
    invalidateAll();
    performValidation();
  };

  const getStatusColor = () => {
    if (inconsistencies.length === 0) return '#10B981'; // Green
    if (inconsistencies.length <= 2) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getStatusText = () => {
    if (inconsistencies.length === 0) return 'Consistent';
    if (inconsistencies.length <= 2) return 'Minor Issues';
    return 'Critical Issues';
  };

  const formatHitRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  const formatCacheUsage = (size: number, maxSize: number) => 
    `${size}/${maxSize} (${((size / maxSize) * 100).toFixed(1)}%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <GlassPanel variant="primary" className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStatusColor() }}
            />
            <h3 className="text-lg font-semibold text-white">
              Data Consistency: {getStatusText()}
            </h3>
            {isValidating && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' as any }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={performValidation}
              disabled={isValidating}
            >
              Validate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleInvalidateAll}
            >
              Clear Cache
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {inconsistencies.length}
            </div>
            <div className="text-sm text-white/70">Issues Found</div>
          </div>
          
          {cacheStats && (
            <>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {formatHitRate(
                    (cacheStats.products.hitRate + cacheStats.sellers.hitRate + cacheStats.prices.hitRate) / 3
                  )}
                </div>
                <div className="text-sm text-white/70">Avg Hit Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {cacheStats.products.size + cacheStats.sellers.size + cacheStats.prices.size}
                </div>
                <div className="text-sm text-white/70">Cached Items</div>
              </div>
            </>
          )}
        </div>

        {/* Last Validation */}
        {lastValidation && (
          <div className="text-xs text-white/60 mb-4">
            Last validated: {lastValidation.toLocaleTimeString()}
          </div>
        )}

        {/* Inconsistencies List */}
        <AnimatePresence>
          {inconsistencies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <h4 className="text-sm font-semibold text-white mb-2">Issues:</h4>
              <div className="space-y-1">
                {inconsistencies.map((issue, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-sm text-red-300 bg-red-500/10 px-3 py-2 rounded-lg"
                  >
                    {issue}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detailed Stats */}
        <AnimatePresence>
          {isExpanded && cacheStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 pt-4"
            >
              <h4 className="text-sm font-semibold text-white mb-3">Cache Statistics:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Products Cache */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-white mb-2">Products</h5>
                  <div className="space-y-1 text-xs text-white/70">
                    <div>Usage: {formatCacheUsage(cacheStats.products.size, cacheStats.products.maxSize)}</div>
                    <div>Hit Rate: {formatHitRate(cacheStats.products.hitRate)}</div>
                  </div>
                </div>

                {/* Sellers Cache */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-white mb-2">Sellers</h5>
                  <div className="space-y-1 text-xs text-white/70">
                    <div>Usage: {formatCacheUsage(cacheStats.sellers.size, cacheStats.sellers.maxSize)}</div>
                    <div>Hit Rate: {formatHitRate(cacheStats.sellers.hitRate)}</div>
                  </div>
                </div>

                {/* Prices Cache */}
                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-white mb-2">Prices</h5>
                  <div className="space-y-1 text-xs text-white/70">
                    <div>Usage: {formatCacheUsage(cacheStats.prices.size, cacheStats.prices.maxSize)}</div>
                    <div>Hit Rate: {formatHitRate(cacheStats.prices.hitRate)}</div>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="mt-4 bg-white/5 rounded-lg p-3">
                <h5 className="text-sm font-medium text-white mb-2">Configuration</h5>
                <div className="grid grid-cols-2 gap-4 text-xs text-white/70">
                  <div>TTL: {Math.round(cacheStats.config.ttl / 1000 / 60)} minutes</div>
                  <div>Max Size: {cacheStats.config.maxSize} items</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  );
};

export default DataConsistencyMonitor;