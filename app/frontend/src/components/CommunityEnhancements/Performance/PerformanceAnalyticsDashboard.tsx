/**
 * Performance Analytics Dashboard
 * Advanced analytics and visualization for performance metrics
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformanceMonitoring } from './PerformanceMonitoringService';

// Chart data interfaces
interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface PerformanceTrend {
  metric: string;
  data: ChartDataPoint[];
  trend: 'improving' | 'degrading' | 'stable';
  change: number;
}

interface PerformanceInsight {
  id: string;
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendation?: string;
}

/**
 * Performance Analytics Dashboard Component
 */
export const PerformanceAnalyticsDashboard: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const { metrics, alerts, service } = usePerformanceMonitoring();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['renderTime', 'memoryUsage', 'networkRequests']);
  const [historicalData, setHistoricalData] = useState<Record<string, ChartDataPoint[]>>({});
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Collect historical data
  useEffect(() => {
    const interval = setInterval(() => {
      const timestamp = Date.now();
      
      setHistoricalData(prev => {
        const newData = { ...prev };
        
        // Add current metrics to historical data
        Object.entries(metrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            if (!newData[key]) newData[key] = [];
            
            newData[key].push({
              timestamp,
              value,
              label: new Date(timestamp).toLocaleTimeString()
            });
            
            // Keep only data for selected time range
            const cutoffTime = timestamp - getTimeRangeMs(selectedTimeRange);
            newData[key] = newData[key].filter(point => point.timestamp > cutoffTime);
          }
        });
        
        return newData;
      });
    }, 5000); // Collect every 5 seconds

    return () => clearInterval(interval);
  }, [metrics, selectedTimeRange]);

  // Generate performance insights
  useEffect(() => {
    const generateInsights = async () => {
      setIsAnalyzing(true);
      
      const newInsights: PerformanceInsight[] = [];
      
      // Analyze render performance
      if (metrics.averageRenderTime > 16) {
        newInsights.push({
          id: 'slow-renders',
          type: 'warning',
          title: 'Slow Render Performance',
          description: `Average render time is ${metrics.averageRenderTime.toFixed(2)}ms, exceeding the 16ms budget for 60fps.`,
          impact: 'high',
          actionable: true,
          recommendation: 'Consider implementing React.memo, useMemo, and virtual scrolling for large lists.'
        });
      }
      
      // Analyze memory usage
      const memoryMB = metrics.memoryUsage / 1024 / 1024;
      if (memoryMB > 100) {
        newInsights.push({
          id: 'high-memory',
          type: 'warning',
          title: 'High Memory Usage',
          description: `Current memory usage is ${memoryMB.toFixed(1)}MB, which may impact performance.`,
          impact: 'medium',
          actionable: true,
          recommendation: 'Review component cleanup and implement proper useEffect cleanup functions.'
        });
      }
      
      // Analyze network performance
      if (metrics.averageResponseTime > 1000) {
        newInsights.push({
          id: 'slow-network',
          type: 'warning',
          title: 'Slow Network Requests',
          description: `Average response time is ${metrics.averageResponseTime.toFixed(0)}ms.`,
          impact: 'high',
          actionable: true,
          recommendation: 'Implement request caching, optimize API endpoints, and consider using a CDN.'
        });
      }
      
      // Analyze cache performance
      if (metrics.cacheHitRate < 70) {
        newInsights.push({
          id: 'low-cache-hit',
          type: 'optimization',
          title: 'Low Cache Hit Rate',
          description: `Cache hit rate is ${metrics.cacheHitRate.toFixed(1)}%, indicating inefficient caching.`,
          impact: 'medium',
          actionable: true,
          recommendation: 'Review caching strategies and implement intelligent preloading.'
        });
      }
      
      // Analyze interaction latency
      if (metrics.interactionLatency > 100) {
        newInsights.push({
          id: 'slow-interactions',
          type: 'warning',
          title: 'Slow User Interactions',
          description: `Average interaction latency is ${metrics.interactionLatency.toFixed(2)}ms.`,
          impact: 'high',
          actionable: true,
          recommendation: 'Optimize event handlers and reduce main thread blocking operations.'
        });
      }
      
      // Positive insights
      if (metrics.animationFrameRate >= 58) {
        newInsights.push({
          id: 'good-framerate',
          type: 'info',
          title: 'Excellent Frame Rate',
          description: `Maintaining ${metrics.animationFrameRate} FPS for smooth animations.`,
          impact: 'low',
          actionable: false
        });
      }
      
      setInsights(newInsights);
      setIsAnalyzing(false);
    };

    generateInsights();
  }, [metrics]);

  // Calculate performance trends
  const performanceTrends = useMemo((): PerformanceTrend[] => {
    const trends: PerformanceTrend[] = [];
    
    selectedMetrics.forEach(metricKey => {
      const data = historicalData[metricKey] || [];
      if (data.length < 2) return;
      
      const recent = data.slice(-10);
      const older = data.slice(-20, -10);
      
      if (recent.length === 0 || older.length === 0) return;
      
      const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length;
      
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (Math.abs(change) > 5) {
        // For metrics where lower is better
        if (['renderTime', 'memoryUsage', 'averageResponseTime', 'interactionLatency'].includes(metricKey)) {
          trend = change < 0 ? 'improving' : 'degrading';
        } else {
          // For metrics where higher is better
          trend = change > 0 ? 'improving' : 'degrading';
        }
      }
      
      trends.push({
        metric: metricKey,
        data,
        trend,
        change
      });
    });
    
    return trends;
  }, [historicalData, selectedMetrics]);

  // Get time range in milliseconds
  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  };

  // Format metric names for display
  const formatMetricName = (key: string): string => {
    const names: Record<string, string> = {
      renderTime: 'Render Time',
      memoryUsage: 'Memory Usage',
      networkRequests: 'Network Requests',
      averageResponseTime: 'Response Time',
      interactionLatency: 'Interaction Latency',
      animationFrameRate: 'Frame Rate',
      cacheHitRate: 'Cache Hit Rate'
    };
    return names[key] || key;
  };

  // Export performance data
  const exportData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics,
      alerts: alerts.slice(0, 50),
      insights,
      historicalData: Object.fromEntries(
        Object.entries(historicalData).map(([key, data]) => [
          key,
          data.slice(-100) // Last 100 data points
        ])
      )
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [metrics, alerts, insights, historicalData]);

  return (
    <div className={`performance-analytics-dashboard ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
            <div className="flex items-center space-x-3">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
              <button
                onClick={exportData}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Export Data
              </button>
            </div>
          </div>

          {/* Metric Selection */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(metrics).filter(key => typeof metrics[key as keyof typeof metrics] === 'number').map(key => (
              <button
                key={key}
                onClick={() => {
                  setSelectedMetrics(prev => 
                    prev.includes(key) 
                      ? prev.filter(m => m !== key)
                      : [...prev, key]
                  );
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedMetrics.includes(key)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatMetricName(key)}
              </button>
            ))}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {performanceTrends.map(trend => (
            <TrendCard key={trend.metric} trend={trend} />
          ))}
        </div>

        {/* Insights Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
            {isAnalyzing && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span>Analyzing...</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </AnimatePresence>
            {insights.length === 0 && !isAnalyzing && (
              <p className="text-gray-500 text-center py-8">
                No performance insights available. Keep using the app to generate insights.
              </p>
            )}
          </div>
        </div>

        {/* Real-time Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <RealTimeMetric
              label="Render Time"
              value={`${metrics.renderTime.toFixed(2)}ms`}
              trend={metrics.renderTime < 16 ? 'good' : 'warning'}
            />
            <RealTimeMetric
              label="Memory"
              value={`${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`}
              trend={metrics.memoryUsage < 50 * 1024 * 1024 ? 'good' : 'warning'}
            />
            <RealTimeMetric
              label="Network"
              value={`${metrics.averageResponseTime.toFixed(0)}ms`}
              trend={metrics.averageResponseTime < 500 ? 'good' : 'warning'}
            />
            <RealTimeMetric
              label="FPS"
              value={`${metrics.animationFrameRate}`}
              trend={metrics.animationFrameRate >= 55 ? 'good' : 'warning'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Trend Card Component
const TrendCard: React.FC<{ trend: PerformanceTrend }> = ({ trend }) => {
  const trendColors = {
    improving: 'text-green-600 bg-green-50 border-green-200',
    degrading: 'text-red-600 bg-red-50 border-red-200',
    stable: 'text-blue-600 bg-blue-50 border-blue-200'
  };

  const trendIcons = {
    improving: '↗️',
    degrading: '↘️',
    stable: '→'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{formatMetricName(trend.metric)}</h4>
        <div className={`px-2 py-1 rounded text-xs font-medium ${trendColors[trend.trend]}`}>
          {trendIcons[trend.trend]} {Math.abs(trend.change).toFixed(1)}%
        </div>
      </div>
      
      <div className="h-24 bg-gray-50 rounded flex items-center justify-center">
        <MiniChart data={trend.data} />
      </div>
      
      <div className="mt-2 text-xs text-gray-600">
        {trend.data.length} data points over {selectedTimeRange}
      </div>
    </motion.div>
  );
};

// Mini Chart Component
const MiniChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  if (data.length < 2) {
    return <span className="text-gray-400">Insufficient data</span>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((point.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" className="text-blue-600">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

// Insight Card Component
const InsightCard: React.FC<{ insight: PerformanceInsight }> = ({ insight }) => {
  const typeColors = {
    optimization: 'border-l-blue-500 bg-blue-50',
    warning: 'border-l-yellow-500 bg-yellow-50',
    info: 'border-l-green-500 bg-green-50'
  };

  const impactColors = {
    high: 'text-red-600',
    medium: 'text-yellow-600',
    low: 'text-green-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`border-l-4 p-4 rounded-r ${typeColors[insight.type]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
          <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-sm text-gray-600 italic">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
        <div className="ml-4 text-right">
          <span className={`text-xs font-medium ${impactColors[insight.impact]}`}>
            {insight.impact.toUpperCase()} IMPACT
          </span>
          {insight.actionable && (
            <div className="text-xs text-gray-500 mt-1">Actionable</div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Real-time Metric Component
const RealTimeMetric: React.FC<{
  label: string;
  value: string;
  trend: 'good' | 'warning' | 'error';
}> = ({ label, value, trend }) => {
  const trendColors = {
    good: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50'
  };

  return (
    <div className={`p-3 rounded-lg ${trendColors[trend]}`}>
      <p className="text-xs font-medium opacity-75 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
};

// Helper function to format metric names
const formatMetricName = (key: string): string => {
  const names: Record<string, string> = {
    renderTime: 'Render Time',
    memoryUsage: 'Memory Usage',
    networkRequests: 'Network Requests',
    averageResponseTime: 'Response Time',
    interactionLatency: 'Interaction Latency',
    animationFrameRate: 'Frame Rate',
    cacheHitRate: 'Cache Hit Rate'
  };
  return names[key] || key;
};

export default PerformanceAnalyticsDashboard;