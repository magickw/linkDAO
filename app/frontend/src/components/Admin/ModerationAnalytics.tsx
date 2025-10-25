import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Download,
  Filter
} from 'lucide-react';

interface ModerationAnalyticsData {
  overview: {
    totalModerated: number;
    autoBlocked: number;
    autoLimited: number;
    manualReviewed: number;
    avgResponseTime: number;
    falsePositiveRate: number;
  };
  trends: {
    date: string;
    blocked: number;
    limited: number;
    reviewed: number;
    approved: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
    percentage: number;
  }[];
  performanceMetrics: {
    metric: string;
    value: number;
    trend: 'up' | 'down' | 'neutral';
    change: number;
  }[];
}

export const ModerationAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [data, setData] = useState<ModerationAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/moderation/analytics?timeRange=${timeRange}`);
      // const data = await response.json();

      // Mock data
      setData({
        overview: {
          totalModerated: 1247,
          autoBlocked: 456,
          autoLimited: 234,
          manualReviewed: 557,
          avgResponseTime: 2.3,
          falsePositiveRate: 0.078
        },
        trends: [
          { date: '2025-10-19', blocked: 45, limited: 23, reviewed: 67, approved: 156 },
          { date: '2025-10-20', blocked: 52, limited: 28, reviewed: 71, approved: 168 },
          { date: '2025-10-21', blocked: 38, limited: 19, reviewed: 54, approved: 142 },
          { date: '2025-10-22', blocked: 61, limited: 31, reviewed: 82, approved: 189 },
          { date: '2025-10-23', blocked: 49, limited: 25, reviewed: 68, approved: 171 },
          { date: '2025-10-24', blocked: 55, limited: 29, reviewed: 75, approved: 178 },
          { date: '2025-10-25', blocked: 67, limited: 34, reviewed: 91, approved: 203 }
        ],
        categoryBreakdown: [
          { category: 'spam', count: 234, percentage: 36.5 },
          { category: 'toxicity', count: 189, percentage: 29.5 },
          { category: 'harassment', count: 123, percentage: 19.2 },
          { category: 'hate_speech', count: 67, percentage: 10.4 },
          { category: 'copyright', count: 28, percentage: 4.4 }
        ],
        performanceMetrics: [
          { metric: 'Accuracy Rate', value: 92.2, trend: 'up', change: 2.3 },
          { metric: 'False Positive Rate', value: 7.8, trend: 'down', change: -1.2 },
          { metric: 'Avg Response Time', value: 2.3, trend: 'down', change: -0.5 },
          { metric: 'Auto-Resolution Rate', value: 55.4, trend: 'up', change: 3.1 }
        ]
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!data) return;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moderation-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  const maxTrendValue = Math.max(...data.trends.map(t => t.blocked + t.limited + t.reviewed + t.approved));

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <BarChart3 className="w-6 h-6" />
          <span>Moderation Analytics</span>
        </h2>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Moderated</h3>
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overview.totalModerated.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Content items processed</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto-Blocked</h3>
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overview.autoBlocked}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {((data.overview.autoBlocked / data.overview.totalModerated) * 100).toFixed(1)}% of total
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto-Limited</h3>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overview.autoLimited}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {((data.overview.autoLimited / data.overview.totalModerated) * 100).toFixed(1)}% of total
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Manual Reviews</h3>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overview.manualReviewed}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Human moderation required</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</h3>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{data.overview.avgResponseTime}h</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time to resolution</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">False Positive Rate</h3>
            <TrendingDown className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{(data.overview.falsePositiveRate * 100).toFixed(1)}%</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI accuracy improving</p>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Moderation Trends</h3>
        <div className="space-y-4">
          {data.trends.map((day, idx) => {
            const total = day.blocked + day.limited + day.reviewed + day.approved;
            const blockedPercent = (day.blocked / maxTrendValue) * 100;
            const limitedPercent = (day.limited / maxTrendValue) * 100;
            const reviewedPercent = (day.reviewed / maxTrendValue) * 100;
            const approvedPercent = (day.approved / maxTrendValue) * 100;

            return (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{total} items</span>
                </div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  <div
                    className="bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
                    style={{ width: `${blockedPercent}%` }}
                    title={`Blocked: ${day.blocked}`}
                  />
                  <div
                    className="bg-yellow-500 hover:bg-yellow-600 transition-colors cursor-pointer"
                    style={{ width: `${limitedPercent}%` }}
                    title={`Limited: ${day.limited}`}
                  />
                  <div
                    className="bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
                    style={{ width: `${reviewedPercent}%` }}
                    title={`Reviewed: ${day.reviewed}`}
                  />
                  <div
                    className="bg-green-500 hover:bg-green-600 transition-colors cursor-pointer"
                    style={{ width: `${approvedPercent}%` }}
                    title={`Approved: ${day.approved}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Blocked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Limited</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Reviewed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Approved</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown and Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <PieChartIcon className="w-5 h-5" />
            <span>Violation Categories</span>
          </h3>
          <div className="space-y-4">
            {data.categoryBreakdown.map((cat, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {cat.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{cat.count}</span>
                    <span className="text-xs text-gray-400">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Performance Metrics</span>
          </h3>
          <div className="space-y-4">
            {data.performanceMetrics.map((metric, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{metric.metric}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}%</span>
                    {metric.trend === 'up' && (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs ml-1">+{metric.change}%</span>
                      </div>
                    )}
                    {metric.trend === 'down' && (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs ml-1">{metric.change}%</span>
                      </div>
                    )}
                  </div>
                </div>
                {metric.trend === 'up' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : metric.trend === 'down' ? (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                ) : (
                  <Activity className="w-8 h-8 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationAnalytics;
