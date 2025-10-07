/**
 * Cache Analytics Dashboard
 * Displays real-time cache performance metrics and optimization insights
 */

import React, { useState, useEffect, useCallback } from 'react';
import { advancedCachingService } from '../../services/advancedCachingService';

interface CacheMetrics {
  hitRate: number;
  compressionRatio: number;
  deduplicationSavings: number;
  preloadSuccessRate: number;
  userSatisfactionScore: number;
}

interface PerformanceInsight {
  type: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
  recommendations: string[];
  expectedImprovement: number;
}

interface ResourcePerformance {
  url: string;
  averageLoadTime: number;
  hitRate: number;
  requestCount: number;
  totalTransferSize: number;
}

interface AnalyticsData {
  timestamp: number;
  hitRate: number;
  missRate: number;
  compressionRatio: number;
  deduplicationSavings: number;
  preloadSuccessRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  networkSavings: number;
  userSatisfactionScore: number;
}

const CacheAnalyticsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRate: 0,
    compressionRatio: 0,
    deduplicationSavings: 0,
    preloadSuccessRate: 0,
    userSatisfactionScore: 0
  });

  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [analyticsHistory, setAnalyticsHistory] = useState<AnalyticsData[]>([]);
  const [slowResources, setSlowResources] = useState<ResourcePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Update metrics periodically
  const updateMetrics = useCallback(async () => {
    try {
      const currentMetrics = advancedCachingService.getCurrentMetrics();
      setMetrics(currentMetrics);

      const history = advancedCachingService.getCacheAnalytics();
      setAnalyticsHistory(history);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to update cache metrics:', error);
    }
  }, []);

  // Handle insights from analytics worker
  const handleInsights = useCallback((event: MessageEvent) => {
    const { type, insights: newInsights } = event.data;
    
    if (type === 'optimization_insights') {
      setInsights(newInsights);
    }
  }, []);

  // Handle slow resource detection
  const handleSlowResource = useCallback((event: MessageEvent) => {
    const { type, url, averageLoadTime, hitRate, requestCount } = event.data;
    
    if (type === 'slow_resource_detected') {
      setSlowResources(prev => {
        const existing = prev.find(r => r.url === url);
        if (existing) {
          existing.averageLoadTime = averageLoadTime;
          existing.hitRate = hitRate;
          existing.requestCount = requestCount;
          return [...prev];
        } else {
          return [...prev, {
            url,
            averageLoadTime,
            hitRate,
            requestCount,
            totalTransferSize: 0
          }].slice(0, 10); // Keep only top 10
        }
      });
    }
  }, []);

  useEffect(() => {
    updateMetrics();

    // Set up periodic updates
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(updateMetrics, 30000); // Update every 30 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [updateMetrics, autoRefresh]);

  // Filter analytics data based on selected time range
  const getFilteredAnalytics = useCallback(() => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - timeRanges[selectedTimeRange];
    return analyticsHistory.filter(data => data.timestamp >= cutoff);
  }, [analyticsHistory, selectedTimeRange]);

  // Calculate trend for a metric
  const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  };

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Get trend icon
  const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredAnalytics = getFilteredAnalytics();
  const hitRateTrend = calculateTrend(filteredAnalytics.map(d => d.hitRate));
  const responseTimeTrend = calculateTrend(filteredAnalytics.map(d => d.averageResponseTime));
  const satisfactionTrend = calculateTrend(filteredAnalytics.map(d => d.userSatisfactionScore));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading cache analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Cache Performance Analytics</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              autoRefresh 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={updateMetrics}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics.hitRate)}
              </p>
            </div>
            <span className="text-lg">{getTrendIcon(hitRateTrend)}</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${metrics.hitRate * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Compression Ratio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics.compressionRatio)}
              </p>
            </div>
            <span className="text-lg">🗜️</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Average size reduction
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Preload Success</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics.preloadSuccessRate)}
              </p>
            </div>
            <span className="text-lg">🎯</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Prediction accuracy
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deduplication</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.deduplicationSavings}
              </p>
            </div>
            <span className="text-lg">♻️</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Duplicate entries saved
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">User Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(metrics.userSatisfactionScore)}
              </p>
            </div>
            <span className="text-lg">{getTrendIcon(satisfactionTrend)}</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${metrics.userSatisfactionScore * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Optimization Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight, index) => (
                <div key={index} className="border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(insight.priority)}`}>
                        {insight.priority.toUpperCase()}
                      </span>
                      <h4 className="font-medium text-gray-900">{insight.description}</h4>
                    </div>
                    <span className="text-sm text-green-600 font-medium">
                      +{formatPercentage(insight.expectedImprovement)} improvement
                    </span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">Recommendations:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {insight.recommendations.slice(0, 3).map((rec, recIndex) => (
                        <li key={recIndex} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slow Resources */}
      {slowResources.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Performance Issues</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {slowResources.map((resource, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 truncate" title={resource.url}>
                      {resource.url.length > 60 ? `${resource.url.substring(0, 60)}...` : resource.url}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span>Load time: {resource.averageLoadTime.toFixed(0)}ms</span>
                      <span>Hit rate: {formatPercentage(resource.hitRate)}</span>
                      <span>Requests: {resource.requestCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      SLOW
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Historical Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Performance Trends</h3>
        </div>
        <div className="p-6">
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Performance chart would be displayed here</p>
              <p className="text-sm text-gray-400">
                Showing {filteredAnalytics.length} data points over {selectedTimeRange}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cache Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Compression</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Algorithm: GZIP</p>
                <p>Level: 6</p>
                <p>Threshold: 1KB</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preloading</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Max concurrent: 3</p>
                <p>Confidence threshold: 70%</p>
                <p>Network threshold: 1 Mbps</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Deduplication</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Algorithm: SHA-256</p>
                <p>Max duplicates: 10</p>
                <p>Content types: JSON, HTML, CSS, JS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheAnalyticsDashboard;