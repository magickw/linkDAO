import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';
import { MetricsCard } from './MetricsCard';
import { ChartContainer } from './ChartContainer';
import { AnomalyAlerts } from './AnomalyAlerts';
import { RealTimeMetrics } from './RealTimeMetrics';
import { useAnalytics } from '../../hooks/useAnalytics';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

interface AnalyticsDashboardProps {
  sellerId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  sellerId,
  dateRange
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'users' | 'trends'>('overview');
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  
  const {
    overviewMetrics,
    salesAnalytics,
    userBehavior,
    marketTrends,
    anomalies,
    realTimeStats,
    isLoading,
    error,
    refetch
  } = useAnalytics({
    sellerId,
    dateRange,
    refreshInterval
  });

  // Auto-refresh functionality
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetch]);

  if (isLoading && !overviewMetrics) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
        <LoadingSkeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <GlassPanel className="p-6 text-center">
        <div className="text-red-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-lg font-semibold">Failed to load analytics</h3>
          <p className="text-sm text-gray-300 mt-1">{error}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </GlassPanel>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'trends', label: 'Trends', icon: '📈' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {sellerId ? 'Seller Analytics' : 'Platform Analytics'}
          </h1>
          <p className="text-gray-300 mt-1">
            Real-time insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Refresh Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600"
            >
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>
          </div>
          
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Real-time Status */}
      <RealTimeMetrics stats={realTimeStats} />

      {/* Anomaly Alerts */}
      {anomalies && anomalies.length > 0 && (
        <AnomalyAlerts anomalies={anomalies} />
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <OverviewTab metrics={overviewMetrics} />
        )}
        
        {activeTab === 'sales' && (
          <SalesTab analytics={salesAnalytics} />
        )}
        
        {activeTab === 'users' && (
          <UsersTab behavior={userBehavior} />
        )}
        
        {activeTab === 'trends' && (
          <TrendsTab trends={marketTrends} />
        )}
      </motion.div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ metrics: any }> = ({ metrics }) => {
  if (!metrics) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Revenue (GMV)"
          value={formatCurrency(metrics.gmv)}
          change={metrics.revenueGrowth}
          icon="💰"
          trend="up"
        />
        
        <MetricsCard
          title="Total Users"
          value={formatNumber(metrics.totalUsers)}
          change={metrics.userGrowth}
          icon="👥"
          trend="up"
        />
        
        <MetricsCard
          title="Total Orders"
          value={formatNumber(metrics.totalOrders)}
          change={metrics.orderGrowth}
          icon="📦"
          trend="up"
        />
        
        <MetricsCard
          title="Success Rate"
          value={formatPercentage(metrics.transactionSuccessRate)}
          change={metrics.successRateChange}
          icon="✅"
          trend={metrics.successRateChange >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Revenue Trend"
          type="line"
          data={metrics.revenueChart}
          height={300}
        />
        
        <ChartContainer
          title="User Acquisition"
          type="area"
          data={metrics.userChart}
          height={300}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Users</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Daily Active</span>
              <span className="text-white font-medium">{formatNumber(metrics.activeUsers.daily)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Weekly Active</span>
              <span className="text-white font-medium">{formatNumber(metrics.activeUsers.weekly)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Monthly Active</span>
              <span className="text-white font-medium">{formatNumber(metrics.activeUsers.monthly)}</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Conversion Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Conversion Rate</span>
              <span className="text-white font-medium">{formatPercentage(metrics.conversionRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Avg Order Value</span>
              <span className="text-white font-medium">{formatCurrency(metrics.averageOrderValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">User Acquisition Rate</span>
              <span className="text-white font-medium">{formatNumber(metrics.userAcquisitionRate)}</span>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Uptime</span>
              <span className="text-green-400 font-medium">99.9%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Response Time</span>
              <span className="text-white font-medium">150ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Error Rate</span>
              <span className="text-white font-medium">0.02%</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

// Sales Tab Component
const SalesTab: React.FC<{ analytics: any }> = ({ analytics }) => {
  if (!analytics) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Daily Sales"
          type="bar"
          data={analytics.dailySales}
          height={300}
        />
        
        <ChartContainer
          title="Revenue by Payment Method"
          type="doughnut"
          data={analytics.revenueByPaymentMethod}
          height={300}
        />
      </div>

      {/* Top Products */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 text-gray-300">Product</th>
                <th className="text-right py-2 text-gray-300">Sales</th>
                <th className="text-right py-2 text-gray-300">Revenue</th>
                <th className="text-right py-2 text-gray-300">Units</th>
              </tr>
            </thead>
            <tbody>
              {analytics.topProducts?.map((product: any, index: number) => (
                <tr key={product.productId} className="border-b border-gray-700/50">
                  <td className="py-3 text-white">{product.title}</td>
                  <td className="py-3 text-right text-white">{formatNumber(product.sales)}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(product.revenue)}</td>
                  <td className="py-3 text-right text-white">{formatNumber(product.units)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};

// Users Tab Component
const UsersTab: React.FC<{ behavior: any }> = ({ behavior }) => {
  if (!behavior) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* User Behavior Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Device Breakdown"
          type="pie"
          data={behavior.deviceBreakdown}
          height={300}
        />
        
        <ChartContainer
          title="Geographic Distribution"
          type="bar"
          data={behavior.geographicDistribution}
          height={300}
        />
      </div>

      {/* User Journey */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">User Journey</h3>
        <div className="space-y-4">
          {behavior.userJourney?.map((step: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {index + 1}
                </div>
                <span className="text-white">{step.step}</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{formatNumber(step.users)} users</div>
                <div className="text-red-400 text-sm">{formatPercentage(step.dropoffRate)} dropoff</div>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};

// Trends Tab Component
const TrendsTab: React.FC<{ trends: any }> = ({ trends }) => {
  if (!trends) return <LoadingSkeleton className="h-96" />;

  return (
    <div className="space-y-6">
      {/* Trending Categories */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Trending Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trends.trending?.map((category: any, index: number) => (
            <div key={index} className="p-4 bg-gray-800/50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-medium">{category.category}</h4>
                <span className="text-green-400 text-sm">+{formatPercentage(category.growth)}</span>
              </div>
              <div className="text-gray-300 text-sm">
                Volume: {formatNumber(category.volume)}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Seasonal Patterns */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Seasonal Patterns</h3>
        <ChartContainer
          title="Seasonal Demand"
          type="line"
          data={trends.seasonal}
          height={300}
        />
      </GlassPanel>

      {/* Price Analysis */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Price Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 text-gray-300">Category</th>
                <th className="text-right py-2 text-gray-300">Avg Price</th>
                <th className="text-right py-2 text-gray-300">Price Change</th>
              </tr>
            </thead>
            <tbody>
              {trends.priceAnalysis?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-gray-700/50">
                  <td className="py-3 text-white">{item.category}</td>
                  <td className="py-3 text-right text-white">{formatCurrency(item.avgPrice)}</td>
                  <td className={`py-3 text-right ${item.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.priceChange >= 0 ? '+' : ''}{formatPercentage(item.priceChange)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};

export default AnalyticsDashboard;