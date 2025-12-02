import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { returnAnalyticsService, ReturnAnalytics } from '../../../services/returnAnalyticsService';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  sellerId?: string;
  category?: string;
}

interface TrendData {
  date: string;
  returns: number;
  refunds: number;
  approvalRate: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  avgRefundAmount: number;
  [key: string]: string | number;
}

interface SellerPerformanceData {
  sellerId: string;
  sellerName: string;
  totalReturns: number;
  approvalRate: number;
  avgProcessingTime: number;
  customerSatisfaction: number;
  complianceScore: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];


export const ReturnAnalyticsDashboard: React.FC = () => {
  // State management
  const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<SellerPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(true);
      const data = await returnAnalyticsService.getAnalytics(filters.dateRange, filters.sellerId);
      setAnalytics(data);
      
      // Transform data for visualizations
      transformTrendData(data);
      transformCategoryData(data);
      transformSellerData(data);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Transform trend data for line chart
  const transformTrendData = (data: ReturnAnalytics) => {
    if (!data.returnTrends?.weeklyTrend) return;
    
    const transformed = data.returnTrends.weeklyTrend.map(week => ({
      date: week.week,
      returns: week.returns,
      refunds: week.refunds,
      approvalRate: week.returns > 0 ? (week.refunds / week.returns) * 100 : 0,
    }));
    
    setTrendData(transformed);
  };

  // Transform category data for pie/bar charts
  const transformCategoryData = (data: ReturnAnalytics) => {
    // Mock category data - in real implementation, this would come from the API
    const mockCategories: CategoryData[] = [
      { category: 'Electronics', count: 145, percentage: 32, avgRefundAmount: 250 },
      { category: 'Clothing', count: 98, percentage: 22, avgRefundAmount: 45 },
      { category: 'Home & Garden', count: 76, percentage: 17, avgRefundAmount: 120 },
      { category: 'Books', count: 54, percentage: 12, avgRefundAmount: 25 },
      { category: 'Sports', count: 43, percentage: 10, avgRefundAmount: 85 },
      { category: 'Other', count: 32, percentage: 7, avgRefundAmount: 60 },
    ];
    
    setCategoryData(mockCategories);
  };

  // Transform seller performance data
  const transformSellerData = (data: ReturnAnalytics) => {
    // Mock seller data - in real implementation, this would come from the API
    const mockSellers: SellerPerformanceData[] = [
      { sellerId: 'S001', sellerName: 'TechStore Pro', totalReturns: 45, approvalRate: 92, avgProcessingTime: 2.3, customerSatisfaction: 4.5, complianceScore: 95 },
      { sellerId: 'S002', sellerName: 'Fashion Hub', totalReturns: 38, approvalRate: 88, avgProcessingTime: 3.1, customerSatisfaction: 4.2, complianceScore: 90 },
      { sellerId: 'S003', sellerName: 'Home Essentials', totalReturns: 32, approvalRate: 95, avgProcessingTime: 1.8, customerSatisfaction: 4.7, complianceScore: 98 },
      { sellerId: 'S004', sellerName: 'Book World', totalReturns: 28, approvalRate: 85, avgProcessingTime: 2.5, customerSatisfaction: 4.3, complianceScore: 87 },
      { sellerId: 'S005', sellerName: 'Sports Gear', totalReturns: 25, approvalRate: 90, avgProcessingTime: 2.0, customerSatisfaction: 4.4, complianceScore: 92 },
    ];
    
    setSellerPerformance(mockSellers);
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await fetchAnalytics();
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchAnalytics();
    }
  }, [filters.dateRange, filters.sellerId, filters.category]);

  // Handle filter changes
  const handleDateRangeChange = (start: string, end: string) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end } }));
  };

  const handleRefresh = async () => {
    await fetchAnalytics();
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Return Analytics Dashboard
              </h1>
              <p className="text-gray-400">
                Comprehensive analytics on return patterns, trends, and performance metrics
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3"
            >
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateRangeChange(e.target.value, filters.dateRange.end)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400 self-center">to</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateRangeChange(filters.dateRange.start, e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Quick Select
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    handleDateRangeChange(start, end);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  30 Days
                </button>
                <button
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    handleDateRangeChange(start, end);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  90 Days
                </button>
                <button
                  onClick={() => {
                    const end = new Date().toISOString().split('T')[0];
                    const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    handleDateRangeChange(start, end);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  1 Year
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <ChartBarIcon className="w-8 h-8 text-blue-400" />
                <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
                  {analytics.returnTrends.monthOverMonth > 0 ? '+' : ''}{analytics.returnTrends.monthOverMonth.toFixed(1)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{analytics.metrics.totalReturns}</p>
              <p className="text-sm text-gray-400">Total Returns</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl border border-green-500/30 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
                <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                  ${analytics.financial.averageRefundAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                ${(analytics.financial.totalRefundAmount / 1000).toFixed(1)}K
              </p>
              <p className="text-sm text-gray-400">Total Refunded</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <ArrowTrendingUpIcon className="w-8 h-8 text-purple-400" />
                <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
                  {analytics.returnRate.toFixed(1)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {((analytics.metrics.approvedReturns / analytics.metrics.totalReturns) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">Approval Rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-xl border border-orange-500/30 rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <UserGroupIcon className="w-8 h-8 text-orange-400" />
                <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded">
                  {analytics.customerSatisfaction.toFixed(1)}/5.0
                </span>
              </div>
              <p className="text-2xl font-bold text-white mb-1">
                {analytics.processingTime.averageTotalResolutionTime.toFixed(1)}d
              </p>
              <p className="text-sm text-gray-400">Avg Resolution Time</p>
            </motion.div>
          </div>
        )}


        {/* Trend Visualization */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ArrowTrendingUpIcon className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Return Trends</h2>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Weekly Analysis</span>
            </div>
          </div>

          {isLoading || isRefreshing ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#9CA3AF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="returns" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Returns"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="refunds" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Refunds"
                  dot={{ fill: '#10B981', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="approvalRate" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Approval Rate (%)"
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>


        {/* Category Breakdown Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pie Chart */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <ShoppingBagIcon className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Returns by Category</h2>
            </div>

            {isLoading || isRefreshing ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.category} (${entry.percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar Chart */}
          <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <CurrencyDollarIcon className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Avg Refund by Category</h2>
            </div>

            {isLoading || isRefreshing ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="category" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                    label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Bar 
                    dataKey="avgRefundAmount" 
                    fill="#10B981"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>


        {/* Seller Performance Table */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="w-6 h-6 text-orange-400" />
              <h2 className="text-xl font-bold text-white">Seller Performance</h2>
            </div>
            <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View All Sellers →
            </button>
          </div>

          {isLoading || isRefreshing ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Seller</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Total Returns</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Approval Rate</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Avg Processing</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Satisfaction</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerPerformance.map((seller, index) => (
                    <motion.tr
                      key={seller.sellerId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {seller.sellerName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium">{seller.sellerName}</p>
                            <p className="text-xs text-gray-400">{seller.sellerId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-white font-medium">{seller.totalReturns}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                seller.approvalRate >= 90 ? 'bg-green-500' : 
                                seller.approvalRate >= 80 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${seller.approvalRate}%` }}
                            />
                          </div>
                          <span className="text-white text-sm">{seller.approvalRate}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-white">{seller.avgProcessingTime.toFixed(1)}d</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-yellow-400">★</span>
                          <span className="text-white">{seller.customerSatisfaction.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          seller.complianceScore >= 95 ? 'bg-green-500/20 text-green-400' :
                          seller.complianceScore >= 85 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {seller.complianceScore}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
