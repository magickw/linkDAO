import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FunnelIcon, 
  CalendarIcon, 
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ReturnMetricsCards } from './ReturnMetricsCards';
import { StatusDistributionChart } from './StatusDistributionChart';
import { ReturnTrendsChart } from './ReturnTrendsChart';
import { RecentReturnsTable } from './RecentReturnsTable';
import { returnAnalyticsService, RealtimeMetrics, ReturnAnalytics } from '../../../services/returnAnalyticsService';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  status: string;
  sellerId?: string;
}

export const ReturnMonitoringDashboard: React.FC = () => {
  // State management
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    status: 'all',
  });

  // Fetch real-time metrics
  const fetchRealtimeMetrics = async () => {
    try {
      const metrics = await returnAnalyticsService.getRealtimeMetrics();
      setRealtimeMetrics(metrics);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching realtime metrics:', err);
      setError('Failed to fetch real-time metrics');
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setIsRefreshing(true);
      const [analyticsData, statusDist] = await Promise.all([
        returnAnalyticsService.getAnalytics(filters.dateRange, filters.sellerId),
        returnAnalyticsService.getStatusDistribution(filters.dateRange),
      ]);
      
      setAnalytics(analyticsData);
      setStatusDistribution(statusDist);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchRealtimeMetrics(),
        fetchAnalytics(),
      ]);
      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // Real-time updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealtimeMetrics();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Refetch analytics when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchAnalytics();
    }
  }, [filters.dateRange, filters.sellerId]);

  // Handle manual refresh
  const handleRefresh = async () => {
    await Promise.all([
      fetchRealtimeMetrics(),
      fetchAnalytics(),
    ]);
  };

  // Handle filter changes
  const handleDateRangeChange = (start: string, end: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start, end },
    }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Return Monitoring Dashboard
              </h1>
              <p className="text-gray-400">
                Real-time monitoring and analytics for return operations
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Last Update Indicator */}
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
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
          <div className="flex items-center space-x-4">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">Filters</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
                    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                    handleDateRangeChange(start, end);
                  }}
                  className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  7 Days
                </button>
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
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Metrics Cards */}
        <ReturnMetricsCards metrics={realtimeMetrics} isLoading={isLoading} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <StatusDistributionChart data={statusDistribution} isLoading={isLoading || isRefreshing} />

          {/* Return Trends */}
          <ReturnTrendsChart 
            data={analytics?.returnsByDay || []} 
            isLoading={isLoading || isRefreshing} 
          />
        </div>

        {/* Recent Returns Table */}
        <RecentReturnsTable 
          events={[]}
          isLoading={isLoading || isRefreshing}
        />
      </div>
    </div>
  );
};
