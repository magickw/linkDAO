/**
 * SellerAnalyticsDashboard Component
 * Comprehensive analytics dashboard with charts and metrics
 */

import React, { useState } from 'react';
import { SellerTierBadge, SellerTier } from './SellerTierBadge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Star,
  Clock,
  Package,
  Eye,
  ShoppingCart,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  salesOverTime: Array<{ date: string; sales: number; orders: number }>;
  revenueByCategory: Array<{ category: string; revenue: number; percentage: number }>;
  customerSatisfaction: Array<{ month: string; rating: number; reviews: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  responseTimeMetrics: Array<{ time: string; average: number; target: number }>;
  geographicDistribution: Array<{ country: string; orders: number; revenue: number }>;
}

interface SellerAnalyticsDashboardProps {
  sellerTier: SellerTier;
  analyticsData: AnalyticsData;
  currentMetrics: {
    totalSales: number;
    totalOrders: number;
    averageRating: number;
    averageResponseTime: number;
    conversionRate: number;
    repeatCustomerRate: number;
  };
  periodFilter: '7d' | '30d' | '90d' | '1y';
  onPeriodChange: (period: '7d' | '30d' | '90d' | '1y') => void;
  className?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' }
];

export const SellerAnalyticsDashboard: React.FC<SellerAnalyticsDashboardProps> = ({
  sellerTier,
  analyticsData,
  currentMetrics,
  periodFilter,
  onPeriodChange,
  className = ''
}) => {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color 
  }: { 
    title: string; 
    value: string; 
    change?: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-1 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <TrendingUp className="w-4 h-4 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 mr-1" />
              )}
              {Math.abs(change)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track your performance and grow your business
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SellerTierBadge tier={sellerTier} />
          <select
            value={periodFilter}
            onChange={(e) => onPeriodChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            {PERIOD_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value={`$${currentMetrics.totalSales.toLocaleString()}`}
          change={12.5}
          icon={DollarSign}
          color="text-green-600 dark:text-green-400"
        />
        <MetricCard
          title="Total Orders"
          value={currentMetrics.totalOrders.toLocaleString()}
          change={8.3}
          icon={ShoppingCart}
          color="text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          title="Average Rating"
          value={currentMetrics.averageRating.toFixed(1)}
          change={2.1}
          icon={Star}
          color="text-yellow-600 dark:text-yellow-400"
        />
        <MetricCard
          title="Response Time"
          value={`${currentMetrics.averageResponseTime} min`}
          change={-15.2}
          icon={Clock}
          color="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.salesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                name="Sales ($)"
              />
              <Area 
                type="monotone" 
                dataKey="orders" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.3}
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="revenue"
              >
                {analyticsData.revenueByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Satisfaction
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.customerSatisfaction}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[4, 5]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke="#F59E0B" 
                strokeWidth={2}
                name="Average Rating"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Performing Products
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#8B5CF6" name="Units Sold" />
              <Bar dataKey="revenue" fill="#EC4899" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Response Time Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Response Time Trends
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.responseTimeMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Avg Response (min)"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#EF4444" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Geographic Distribution
          </h3>
          <div className="space-y-3">
            {analyticsData.geographicDistribution.slice(0, 5).map((country, index) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {country.country}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {country.orders.toLocaleString()} orders
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    ${country.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Performance Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {currentMetrics.conversionRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Repeat Customers</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {currentMetrics.repeatCustomerRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${Math.round(currentMetrics.totalSales / currentMetrics.totalOrders)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                1,247
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Last updated: {new Date().toLocaleString()}
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600">
            <Calendar className="w-4 h-4" />
            Schedule Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerAnalyticsDashboard;