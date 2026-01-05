import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { marketplaceMessagingAnalyticsService } from '../../../services/marketplaceMessagingAnalyticsService';
import type { SellerMessagingAnalytics } from '../../../services/marketplaceMessagingAnalyticsService';

interface StatCardProps {
  title: string;
  value: string;
  trend?: 'improving' | 'declining' | 'stable';
  alert?: boolean;
  icon: React.ReactNode;
}

interface CommonQuestion {
  keyword: string;
  count: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, trend, alert, icon }) => {
  const getTrendColor = () => {
    if (alert) return 'text-red-500';
    switch (trend) {
      case 'improving': return 'text-green-500';
      case 'declining': return 'text-red-500';
      case 'stable': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getTrendIcon = () => {
    if (alert) return <AlertCircle size={16} />;
    switch (trend) {
      case 'improving': return <TrendingUp size={16} />;
      case 'declining': return <TrendingUp size={16} className="rotate-180" />;
      case 'stable': return <BarChart3 size={16} />;
      default: return <BarChart3 size={16} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${alert ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center mt-3 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="ml-1 capitalize">
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

const LineChart: React.FC<{ data: Array<{ date: Date; responseTime: number }> }> = ({ data }) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.responseTime));
  const minValue = Math.min(...data.map(d => d.responseTime));
  const range = maxValue - minValue || 1; // Avoid division by zero

  return (
    <div className="w-full h-64 relative">
      <svg viewBox={`0 0 ${data.length * 50} 200`} className="w-full h-full">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1="0"
            y1={i * 40}
            x2={data.length * 50}
            y2={i * 40}
            stroke="#e5e7eb"
            strokeDasharray="4"
            className="dark:stroke-gray-700"
          />
        ))}

        {/* Data line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={data.map((point, i) =>
            `${i * 50},${200 - ((point.responseTime - minValue) / range) * 160 - 20}`
          ).join(' ')}
        />

        {/* Data points */}
        {data.map((point, i) => (
          <circle
            key={i}
            cx={i * 50}
            cy={200 - ((point.responseTime - minValue) / range) * 160 - 20}
            r="4"
            fill="#3b82f6"
          />
        ))}
      </svg>
    </div>
  );
};

export const MessagingAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<SellerMessagingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get seller address from auth context or wallet
        const sellerAddress = localStorage.getItem('linkdao_wallet_address') ||
          localStorage.getItem('wallet_address') || '';

        if (!sellerAddress) {
          console.warn('No seller address found for analytics');
          setLoading(false);
          return;
        }

        const data = await marketplaceMessagingAnalyticsService.getSellerMessagingAnalytics(sellerAddress);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch messaging analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <MessageCircle size={48} className="mx-auto mb-4" />
          <p>Unable to load messaging analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messaging-analytics-dashboard p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Messaging Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your messaging performance and buyer engagement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Avg Response Time"
          value={marketplaceMessagingAnalyticsService.formatDuration(analytics.avgResponseTime ?? 0)}
          trend={analytics.responseTimeTrend}
          icon={<Clock className="text-blue-500" size={24} />}
        />
        <StatCard
          title="Inquiry → Sale Conversion"
          value={`${analytics.conversionRate ?? 0}%`}
          trend={analytics.conversionTrend}
          icon={<TrendingUp className="text-green-500" size={24} />}
        />
        <StatCard
          title="Active Conversations"
          value={(analytics.activeConversations ?? 0).toString()}
          icon={<MessageCircle className="text-purple-500" size={24} />}
        />
        <StatCard
          title="Unread Messages"
          value={(analytics.unreadCount ?? 0).toString()}
          alert={(analytics.unreadCount ?? 0) > 5}
          icon={<AlertCircle className="text-yellow-500" size={24} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Response Time Trend (7 days)</h3>
          <LineChart data={analytics.responseTimeHistory ?? []} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Most Common Questions</h3>
          <div className="space-y-4">
            {(analytics.commonQuestions ?? []).map((question: CommonQuestion, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="font-medium text-gray-900 dark:text-white">{question.keyword}</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                  {question.count} times
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <button className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Create Template from Common Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};