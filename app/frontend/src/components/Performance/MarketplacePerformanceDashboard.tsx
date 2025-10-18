/**
 * Marketplace Performance Dashboard
 * Real-time performance monitoring and optimization controls for marketplace
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketplacePerformance } from '../../hooks/useMarketplacePerformance';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';
import { productCache, sellerCache, searchCache } from '../../services/marketplaceDataCache';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

export const MarketplacePerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible,
  onClose
}) => {
  const {
    metrics,
    optimizations,
    isOptimizing,
    optimizePerformance,
    clearPerformanceData,
    getPerformanceRecommendations,
    updateOptimizations
  } = useMarketplacePerformance();

  const [coreWebVitals, setCoreWebVitals] = useState(performanceMonitoringService.getCoreWebVitals());
  const [cacheStats, setCacheStats] = useState({
    product: productCache.getStats(),
    seller: sellerCache.getStats(),
    search: searchCache.getStats()
  });

  // Update metrics periodically
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCoreWebVitals(performanceMonitoringService.getCoreWebVitals());
      setCacheStats({
        product: productCache.getStats(),
        seller: sellerCache.getStats(),
        search: searchCache.getStats()
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const getMetricColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'text-green-500';
    if (value <= thresholds.poor) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const recommendations = getPerformanceRecommendations();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Marketplace Performance Dashboard
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Core Web Vitals */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Core Web Vitals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Largest Contentful Paint</div>
                  <div className={`text-2xl font-bold ${getMetricColor(coreWebVitals.LCP || 0, { good: 2500, poor: 4000 })}`}>
                    {coreWebVitals.LCP ? formatTime(coreWebVitals.LCP) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Good: ≤2.5s</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">First Input Delay</div>
                  <div className={`text-2xl font-bold ${getMetricColor(coreWebVitals.FID || 0, { good: 100, poor: 300 })}`}>
                    {coreWebVitals.FID ? formatTime(coreWebVitals.FID) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Good: ≤100ms</div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cumulative Layout Shift</div>
                  <div className={`text-2xl font-bold ${getMetricColor(coreWebVitals.CLS || 0, { good: 0.1, poor: 0.25 })}`}>
                    {coreWebVitals.CLS ? coreWebVitals.CLS.toFixed(3) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Good: ≤0.1</div>
                </div>
              </div>
            </div>

            {/* Marketplace Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Marketplace Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Navigation Time</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatTime(metrics.navigationTime)}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">API Response</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatTime(metrics.apiResponseTime)}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Image Load</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatTime(metrics.imageLoadTime)}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {(metrics.cacheHitRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Cache Statistics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Cache Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Product Cache</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Size:</span>
                      <span className="text-sm font-medium">{cacheStats.product.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory:</span>
                      <span className="text-sm font-medium">{formatBytes(cacheStats.product.memoryUsage * 1024 * 1024)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Hit Rate:</span>
                      <span className="text-sm font-medium">{(cacheStats.product.hitRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Seller Cache</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Size:</span>
                      <span className="text-sm font-medium">{cacheStats.seller.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory:</span>
                      <span className="text-sm font-medium">{formatBytes(cacheStats.seller.memoryUsage * 1024 * 1024)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Hit Rate:</span>
                      <span className="text-sm font-medium">{(cacheStats.seller.hitRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Search Cache</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm">Size:</span>
                      <span className="text-sm font-medium">{cacheStats.search.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory:</span>
                      <span className="text-sm font-medium">{formatBytes(cacheStats.search.memoryUsage * 1024 * 1024)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Hit Rate:</span>
                      <span className="text-sm font-medium">{(cacheStats.search.hitRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Optimization Controls */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Optimization Controls
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={optimizations.preloadEnabled}
                    onChange={(e) => updateOptimizations(prev => ({ ...prev, preloadEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Preloading</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={optimizations.cacheEnabled}
                    onChange={(e) => updateOptimizations(prev => ({ ...prev, cacheEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Caching</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={optimizations.imageOptimizationEnabled}
                    onChange={(e) => updateOptimizations(prev => ({ ...prev, imageOptimizationEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Image Optimization</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={optimizations.lazyLoadingEnabled}
                    onChange={(e) => updateOptimizations(prev => ({ ...prev, lazyLoadingEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Lazy Loading</span>
                </label>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Performance Recommendations
                </h3>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <ul className="space-y-2">
                    {recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-yellow-800 dark:text-yellow-200">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-3">
                <button
                  onClick={optimizePerformance}
                  disabled={isOptimizing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isOptimizing && (
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  <span>{isOptimizing ? 'Optimizing...' : 'Optimize Now'}</span>
                </button>

                <button
                  onClick={clearPerformanceData}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Clear Data
                </button>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Performance indicator component for development
export const PerformanceIndicator: React.FC = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  const { metrics } = useMarketplacePerformance();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  const getOverallScore = () => {
    const scores = [
      metrics.navigationTime < 800 ? 100 : Math.max(0, 100 - (metrics.navigationTime - 800) / 10),
      metrics.apiResponseTime < 500 ? 100 : Math.max(0, 100 - (metrics.apiResponseTime - 500) / 10),
      metrics.cacheHitRate * 100,
      metrics.imageLoadTime < 1000 ? 100 : Math.max(0, 100 - (metrics.imageLoadTime - 1000) / 20)
    ];
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const score = getOverallScore();
  const scoreColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <>
      <button
        onClick={() => setShowDashboard(true)}
        className={`fixed bottom-4 left-4 z-40 w-12 h-12 ${scoreColor} text-white rounded-full shadow-lg flex items-center justify-center text-sm font-bold hover:scale-110 transition-transform`}
        title="Performance Dashboard"
      >
        {score}
      </button>

      <MarketplacePerformanceDashboard
        isVisible={showDashboard}
        onClose={() => setShowDashboard(false)}
      />
    </>
  );
};

export default MarketplacePerformanceDashboard;