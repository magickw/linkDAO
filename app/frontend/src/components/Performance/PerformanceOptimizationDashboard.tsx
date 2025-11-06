/**
 * Performance Optimization Dashboard
 * Displays performance metrics and optimization controls
 */

import React, { useState, useEffect } from 'react';
import { performanceOptimizationService } from '../../services/performanceOptimizationService';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';
import { requestDeduplicationService } from '../../services/requestDeduplicationService';
import { compressionOptimizationService } from '../../services/compressionOptimizationService';

interface PerformanceStats {
  optimization: any;
  monitoring: any;
  deduplication: any;
  compression: any;
}

const PerformanceOptimizationDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'caching' | 'compression' | 'monitoring'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadStats();
    
    if (autoRefresh) {
      const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadStats = async () => {
    try {
      const [optimization, monitoring, deduplication, compression] = await Promise.all([
        Promise.resolve(performanceOptimizationService.getPerformanceMetrics()),
        Promise.resolve(performanceMonitoringService.generateReport()),
        Promise.resolve(requestDeduplicationService.getMetrics()),
        Promise.resolve(compressionOptimizationService.getCompressionMetrics())
      ]);

      setStats({
        optimization,
        monitoring,
        deduplication,
        compression
      });
    } catch (error) {
      console.error('Failed to load performance stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = (type?: string) => {
    performanceOptimizationService.clearCache(type);
    loadStats();
  };

  const resetMetrics = () => {
    performanceMonitoringService.clearData();
    requestDeduplicationService.resetMetrics();
    compressionOptimizationService.resetMetrics();
    loadStats();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load performance data</p>
        <button 
          onClick={loadStats}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Performance Optimization Dashboard</h2>
        <div className="flex gap-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            Auto Refresh
          </label>
          <button
            onClick={loadStats}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={resetMetrics}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'caching', label: 'Caching' },
          { key: 'compression', label: 'Compression' },
          { key: 'monitoring', label: 'Monitoring' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Cache Hit Rate"
            value={`${stats.optimization.cacheHitRate.toFixed(1)}%`}
            color={stats.optimization.cacheHitRate > 70 ? 'green' : stats.optimization.cacheHitRate > 40 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Avg Response Time"
            value={`${stats.optimization.averageResponseTime.toFixed(0)}ms`}
            color={stats.optimization.averageResponseTime < 1000 ? 'green' : stats.optimization.averageResponseTime < 2000 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Deduplication Savings"
            value={`${stats.deduplication.savingsPercentage.toFixed(1)}%`}
            color={stats.deduplication.savingsPercentage > 20 ? 'green' : stats.deduplication.savingsPercentage > 10 ? 'yellow' : 'red'}
          />
          <MetricCard
            title="Compression Ratio"
            value={`${stats.compression.compressionRatio.toFixed(1)}%`}
            color={stats.compression.compressionRatio > 30 ? 'green' : stats.compression.compressionRatio > 15 ? 'yellow' : 'red'}
          />
        </div>
      )}

      {/* Caching Tab */}
      {activeTab === 'caching' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Requests"
              value={stats.optimization.requestCount.toString()}
              color="blue"
            />
            <MetricCard
              title="Cache Hits"
              value={`${stats.optimization.cacheHitRate.toFixed(1)}%`}
              color={stats.optimization.cacheHitRate > 70 ? 'green' : 'yellow'}
            />
            <MetricCard
              title="Error Rate"
              value={`${stats.optimization.errorRate.toFixed(1)}%`}
              color={stats.optimization.errorRate < 5 ? 'green' : 'red'}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Cache Management</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => clearCache()}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Clear All Cache
              </button>
              <button
                onClick={() => clearCache('feed')}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                Clear Feed Cache
              </button>
              <button
                onClick={() => clearCache('communities')}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                Clear Communities Cache
              </button>
              <button
                onClick={() => clearCache('profiles')}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
              >
                Clear Profiles Cache
              </button>
            </div>
          </div>

          <CacheStatistics stats={performanceOptimizationService.getCacheStatistics()} />
        </div>
      )}

      {/* Compression Tab */}
      {activeTab === 'compression' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Requests"
              value={stats.compression.totalRequests.toString()}
              color="blue"
            />
            <MetricCard
              title="Compressed Requests"
              value={stats.compression.compressedRequests.toString()}
              color="green"
            />
            <MetricCard
              title="Compression Ratio"
              value={`${stats.compression.compressionRatio.toFixed(1)}%`}
              color={stats.compression.compressionRatio > 30 ? 'green' : 'yellow'}
            />
            <MetricCard
              title="Avg Compression Time"
              value={`${stats.compression.averageCompressionTime.toFixed(1)}ms`}
              color={stats.compression.averageCompressionTime < 50 ? 'green' : 'yellow'}
            />
          </div>

          <CompressionSupport support={compressionOptimizationService.getCompressionSupport()} />
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <WebVitalsDisplay vitals={performanceMonitoringService.getWebVitals()} />
          <PerformanceRecommendations recommendations={stats.monitoring.recommendations} />
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}> = ({ title, value, color }) => {
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium opacity-75">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

// Cache Statistics Component
const CacheStatistics: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Cache Statistics</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p><strong>Total Entries:</strong> {stats.totalEntries}</p>
        <p><strong>Total Size:</strong> {(stats.totalSize / 1024).toFixed(1)} KB</p>
        <p><strong>Pending Requests:</strong> {stats.pendingRequests}</p>
      </div>
      <div>
        <h4 className="font-medium mb-2">By Type:</h4>
        {stats.typeStats.map((type: any) => (
          <div key={type.type} className="text-sm">
            <span className="capitalize">{type.type}:</span> {type.count} entries, {type.hitRate.toFixed(1)}% hit rate
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Compression Support Component
const CompressionSupport: React.FC<{ support: any }> = ({ support }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Compression Support</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={`p-3 rounded ${support.webWorker ? 'bg-green-100' : 'bg-red-100'}`}>
        <p className="font-medium">Web Worker</p>
        <p className="text-sm">{support.webWorker ? 'Available' : 'Not Available'}</p>
      </div>
      <div className={`p-3 rounded ${support.compressionStreams ? 'bg-green-100' : 'bg-red-100'}`}>
        <p className="font-medium">Compression Streams</p>
        <p className="text-sm">{support.compressionStreams ? 'Available' : 'Not Available'}</p>
      </div>
      <div className={`p-3 rounded ${support.decompressionStreams ? 'bg-green-100' : 'bg-red-100'}`}>
        <p className="font-medium">Decompression Streams</p>
        <p className="text-sm">{support.decompressionStreams ? 'Available' : 'Not Available'}</p>
      </div>
    </div>
  </div>
);

// Web Vitals Display Component
const WebVitalsDisplay: React.FC<{ vitals: any }> = ({ vitals }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Web Vitals</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="First Contentful Paint"
        value={`${vitals.fcp.toFixed(0)}ms`}
        color={vitals.fcp < 1800 ? 'green' : vitals.fcp < 3000 ? 'yellow' : 'red'}
      />
      <MetricCard
        title="Largest Contentful Paint"
        value={`${vitals.lcp.toFixed(0)}ms`}
        color={vitals.lcp < 2500 ? 'green' : vitals.lcp < 4000 ? 'yellow' : 'red'}
      />
      <MetricCard
        title="Cumulative Layout Shift"
        value={vitals.cls.toFixed(3)}
        color={vitals.cls < 0.1 ? 'green' : vitals.cls < 0.25 ? 'yellow' : 'red'}
      />
    </div>
  </div>
);

// Performance Recommendations Component
const PerformanceRecommendations: React.FC<{ recommendations: string[] }> = ({ recommendations }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Performance Recommendations</h3>
    {recommendations.length > 0 ? (
      <ul className="space-y-2">
        {recommendations.map((rec, index) => (
          <li key={index} className="flex items-start">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <span className="text-sm">{rec}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-green-600 text-sm">✅ No performance issues detected</p>
    )}
  </div>
);

export default PerformanceOptimizationDashboard;