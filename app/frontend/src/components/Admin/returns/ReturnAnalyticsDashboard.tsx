import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowsRightLeftIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from 'recharts';
import { returnAnalyticsService, ReturnAnalytics, CategoryMetrics, SellerPerformanceMetrics } from '../../../services/returnAnalyticsService';

interface FilterState {
  dateRange: {
    start: string;
    end: string;
  };
  sellerId?: string;
  category?: string;
  categories: string[];
  statuses: string[];
  reasons: string[];
  searchQuery: string;
}

interface TrendData {
  date: string;
  returns: number;
  refunds: number;
  approvalRate: number;
}

// interfaces specific to this component but leveraging service types
// interface CategoryData extends CategoryMetrics { [key: string]: any } // if needed
// but let's try just using the imported types directly first


interface DrillDownData {
  type: 'category' | 'seller' | 'reason' | 'status' | null;
  value: string | null;
  data: any;
}

interface ComparisonPeriod {
  label: string;
  start: string;
  end: string;
}

interface ExportFormat {
  type: 'csv' | 'excel' | 'pdf';
  label: string;
  icon: React.ReactNode;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const STATUS_OPTIONS = [
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'received', label: 'Received' },
  { value: 'inspected', label: 'Inspected' },
  { value: 'refund_processing', label: 'Refund Processing' },
  { value: 'completed', label: 'Completed' },
];

const CATEGORY_OPTIONS = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'home_garden', label: 'Home & Garden' },
  { value: 'books', label: 'Books' },
  { value: 'sports', label: 'Sports' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'health', label: 'Health & Beauty' },
  { value: 'other', label: 'Other' },
];

const REASON_OPTIONS = [
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'damaged_shipping', label: 'Damaged in Shipping' },
  { value: 'changed_mind', label: 'Changed Mind' },
  { value: 'better_price', label: 'Found Better Price' },
  { value: 'no_longer_needed', label: 'No Longer Needed' },
  { value: 'other', label: 'Other' },
];


export const ReturnAnalyticsDashboard: React.FC = () => {
  // State management
  const [analytics, setAnalytics] = useState<ReturnAnalytics | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMetrics[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<SellerPerformanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    categories: [],
    statuses: [],
    reasons: [],
    searchQuery: '',
  });

  // Advanced UI state
  const [showFilters, setShowFilters] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Drill-down state
  const [drillDown, setDrillDown] = useState<DrillDownData>({
    type: null,
    value: null,
    data: null,
  });

  // Comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    current: ReturnAnalytics | null;
    previous: ReturnAnalytics | null;
  }>({ current: null, previous: null });
  const [comparisonPeriod, setComparisonPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

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
    if (data.categoryData) {
      setCategoryData(data.categoryData);
    }
  };

  // Transform seller performance data
  const transformSellerData = (data: ReturnAnalytics) => {
    if (data.sellerPerformance) {
      setSellerPerformance(data.sellerPerformance);
    }
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

  const handleMultiSelectChange = (filterType: 'categories' | 'statuses' | 'reasons', value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value]
    }));
  };

  const handleSearchChange = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
      categories: [],
      statuses: [],
      reasons: [],
      searchQuery: '',
    });
  };

  const handleRefresh = async () => {
    await fetchAnalytics();
  };

  // Export functionality
  const exportFormats: ExportFormat[] = [
    {
      type: 'csv',
      label: 'CSV',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    },
    {
      type: 'excel',
      label: 'Excel',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    },
    {
      type: 'pdf',
      label: 'PDF Report',
      icon: <DocumentArrowDownIcon className="w-5 h-5" />
    }
  ];

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      // Prepare export data
      const exportData = {
        dateRange: filters.dateRange,
        filters: {
          categories: filters.categories,
          statuses: filters.statuses,
          reasons: filters.reasons,
          searchQuery: filters.searchQuery
        },
        analytics: analytics,
        trendData: trendData,
        categoryData: categoryData,
        sellerPerformance: sellerPerformance,
        exportTimestamp: new Date().toISOString()
      };

      switch (format) {
        case 'csv':
          await exportToCSV(exportData);
          break;
        case 'excel':
          await exportToExcel(exportData);
          break;
        case 'pdf':
          await exportToPDF(exportData);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const exportToCSV = async (data: any) => {
    // Create CSV content for different data types
    const csvContent = [
      // Summary section
      ['Return Analytics Export', '', '', ''],
      ['Export Date', new Date().toLocaleDateString(), '', ''],
      ['Date Range', `${data.dateRange.start} to ${data.dateRange.end}`, '', ''],
      ['', '', '', ''],

      // Metrics
      ['Metrics', '', '', ''],
      ['Total Returns', data.analytics?.metrics?.totalReturns || 0, '', ''],
      ['Approved Returns', data.analytics?.metrics?.approvedReturns || 0, '', ''],
      ['Rejected Returns', data.analytics?.metrics?.rejectedReturns || 0, '', ''],
      ['Total Refund Amount', `$${data.analytics?.financial?.totalRefundAmount || 0}`, '', ''],
      ['Average Refund Amount', `$${data.analytics?.financial?.averageRefundAmount || 0}`, '', ''],
      ['', '', '', ''],

      // Category data
      ['Category Analysis', '', '', ''],
      ['Category', 'Count', 'Percentage', 'Avg Refund Amount'],
      ...data.categoryData.map((cat: any) => [
        cat.category,
        cat.count,
        `${cat.percentage}%`,
        `$${cat.avgRefundAmount}`
      ]),
      ['', '', '', ''],

      // Seller performance
      ['Seller Performance', '', '', ''],
      ['Seller Name', 'Total Returns', 'Approval Rate', 'Avg Processing Time'],
      ...data.sellerPerformance.map((seller: any) => [
        seller.sellerName,
        seller.totalReturns,
        `${seller.approvalRate}%`,
        `${seller.avgProcessingTime} days`
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `return-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (data: any) => {
    // For Excel export, we'll create a more structured format
    // In a real implementation, you might use a library like xlsx
    const workbookData = {
      summary: {
        'Total Returns': data.analytics?.metrics?.totalReturns || 0,
        'Approved Returns': data.analytics?.metrics?.approvedReturns || 0,
        'Rejected Returns': data.analytics?.metrics?.rejectedReturns || 0,
        'Total Refund Amount': data.analytics?.financial?.totalRefundAmount || 0,
        'Average Refund Amount': data.analytics?.financial?.averageRefundAmount || 0,
        'Return Rate': `${data.analytics?.returnRate || 0}%`,
        'Customer Satisfaction': `${data.analytics?.customerSatisfaction || 0}/5.0`
      },
      categories: data.categoryData,
      sellers: data.sellerPerformance,
      trends: data.trendData
    };

    // Convert to JSON and download as .xlsx (simplified approach)
    const jsonContent = JSON.stringify(workbookData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `return-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = async (data: any) => {
    // For PDF export, we'll create a formatted text report
    // In a real implementation, you might use a library like jsPDF
    const reportContent = `
RETURN ANALYTICS REPORT
========================

Export Date: ${new Date().toLocaleDateString()}
Date Range: ${data.dateRange.start} to ${data.dateRange.end}

SUMMARY METRICS
----------------
Total Returns: ${data.analytics?.metrics?.totalReturns || 0}
Approved Returns: ${data.analytics?.metrics?.approvedReturns || 0}
Rejected Returns: ${data.analytics?.metrics?.rejectedReturns || 0}
Total Refund Amount: $${data.analytics?.financial?.totalRefundAmount || 0}
Average Refund Amount: $${data.analytics?.financial?.averageRefundAmount || 0}
Return Rate: ${data.analytics?.returnRate || 0}%
Customer Satisfaction: ${data.analytics?.customerSatisfaction || 0}/5.0

CATEGORY BREAKDOWN
------------------
${data.categoryData.map((cat: any) =>
      `${cat.category}: ${cat.count} returns (${cat.percentage}%), Avg: ${cat.avgRefundAmount}`
    ).join('\n')}

SELLER PERFORMANCE
------------------
${data.sellerPerformance.map((seller: any) =>
      `${seller.sellerName}: ${seller.totalReturns} returns, ${seller.approvalRate}% approval, ${seller.avgProcessingTime} days avg processing`
    ).join('\n')}

TREND ANALYSIS
----------------
${data.trendData.map((trend: any) =>
      `${trend.date}: ${trend.returns} returns, ${trend.refunds} refunds, ${trend.approvalRate.toFixed(1)}% approval rate`
    ).join('\n')}
')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `return-analytics-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Drill-down functionality
  const handleDrillDown = async (type: 'category' | 'seller' | 'reason' | 'status', value: string) => {
    try {
      setIsLoading(true);

      const drilledData = await returnAnalyticsService.getDrillDownAnalytics(
        type,
        value,
        filters.dateRange
      );

      setDrillDown({
        type,
        value,
        data: drilledData
      });

    } catch (error) {
      console.error('Drill-down failed:', error);
      setError('Failed to load detailed information');
    } finally {
      setIsLoading(false);
    }
  };

  const clearDrillDown = () => {
    setDrillDown({ type: null, value: null, data: null });
  };

  // Comparison functionality
  const handleComparison = async (period: 'week' | 'month' | 'quarter' | 'year') => {
    try {
      setIsLoading(true);
      setComparisonPeriod(period);

      // Calculate previous period dates
      const currentEnd = new Date(filters.dateRange.end);
      const currentStart = new Date(filters.dateRange.start);
      const duration = currentEnd.getTime() - currentStart.getTime();

      const previousEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
      const previousStart = new Date(previousEnd.getTime() - duration);

      // Fetch current and previous period data
      const [currentData, previousData] = await Promise.all([
        returnAnalyticsService.getAnalytics(filters.dateRange),
        returnAnalyticsService.getAnalytics({
          start: previousStart.toISOString().split('T')[0],
          end: previousEnd.toISOString().split('T')[0]
        })
      ]);

      setComparisonData({
        current: currentData,
        previous: previousData
      });
    } catch (error) {
      console.error('Comparison failed:', error);
      setError('Failed to load comparison data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number): { value: number; percentage: number; trend: 'up' | 'down' | 'neutral' } => {
    if (previous === 0) return { value: current, percentage: 0, trend: 'neutral' };

    const change = current - previous;
    const percentage = (change / previous) * 100;
    const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    return { value: change, percentage, trend };
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

            <div className="flex items-center space-x-4">
              {/* Export Button */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <ArrowDownTrayIcon className={`w-5 h-5 ${isExporting ? 'animate-pulse' : ''}`} />
                  <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                </button>

                {/* Export Dropdown Menu */}
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
                    >
                      {exportFormats.map((format) => (
                        <button
                          key={format.type}
                          onClick={() => handleExport(format.type)}
                          disabled={isExporting}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {format.icon}
                          <span className="text-white">{format.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comparison Button */}
              <button
                onClick={() => {
                  if (showComparison) {
                    setShowComparison(false);
                  } else {
                    handleComparison(comparisonPeriod);
                    setShowComparison(true);
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <ArrowsRightLeftIcon className="w-5 h-5" />
                <span>Compare</span>
              </button>

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

        {/* Enhanced Filters */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <span className="text-white font-medium">Filters</span>
              {(filters.categories.length > 0 || filters.statuses.length > 0 || filters.reasons.length > 0 || filters.searchQuery) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {showFilters ? <XMarkIcon className="w-5 h-5" /> : <FunnelIcon className="w-5 h-5" />}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* Search Bar */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
                    Search Returns
                  </label>
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by return ID, customer name, or product..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                  {/* Status Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Status
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => document.getElementById('status-dropdown')?.classList.toggle('hidden')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                      >
                        <span>
                          {filters.statuses.length > 0
                            ? `${filters.statuses.length} selected`
                            : 'All Statuses'}
                        </span>
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>

                      <div
                        id="status-dropdown"
                        className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg hidden"
                      >
                        <div className="max-h-48 overflow-y-auto p-2">
                          {STATUS_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.statuses.includes(option.value)}
                                onChange={() => handleMultiSelectChange('statuses', option.value)}
                                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                              />
                              <span className="text-white text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => document.getElementById('category-dropdown')?.classList.toggle('hidden')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                      >
                        <span>
                          {filters.categories.length > 0
                            ? `${filters.categories.length} selected`
                            : 'All Categories'}
                        </span>
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>

                      <div
                        id="category-dropdown"
                        className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg hidden"
                      >
                        <div className="max-h-48 overflow-y-auto p-2">
                          {CATEGORY_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.categories.includes(option.value)}
                                onChange={() => handleMultiSelectChange('categories', option.value)}
                                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                              />
                              <span className="text-white text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reason Multi-Select */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Return Reason
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => document.getElementById('reason-dropdown')?.classList.toggle('hidden')}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                      >
                        <span>
                          {filters.reasons.length > 0
                            ? `${filters.reasons.length} selected`
                            : 'All Reasons'}
                        </span>
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>

                      <div
                        id="reason-dropdown"
                        className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-lg hidden"
                      >
                        <div className="max-h-48 overflow-y-auto p-2">
                          {REASON_OPTIONS.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={filters.reasons.includes(option.value)}
                                onChange={() => handleMultiSelectChange('reasons', option.value)}
                                className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                              />
                              <span className="text-white text-sm">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
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
                        const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        handleDateRangeChange(start, end);
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      7 Days
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date().toISOString().split('T')[0];
                        const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        handleDateRangeChange(start, end);
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      30 Days
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date().toISOString().split('T')[0];
                        const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        handleDateRangeChange(start, end);
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      90 Days
                    </button>
                    <button
                      onClick={() => {
                        const end = new Date().toISOString().split('T')[0];
                        const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                        handleDateRangeChange(start, end);
                      }}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                    >
                      1 Year
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* Comparison View */}
        <AnimatePresence>
          {showComparison && comparisonData.current && comparisonData.previous && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <ArrowsRightLeftIcon className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Period Comparison</h2>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Period Selector */}
                  <div className="flex space-x-2">
                    {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => handleComparison(period)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${comparisonPeriod === period
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowComparison(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Comparison Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Returns Comparison */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Total Returns</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {comparisonData.current.metrics.totalReturns}
                      </p>
                      <p className="text-xs text-gray-500">Current Period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-400">
                        {comparisonData.previous.metrics.totalReturns}
                      </p>
                      <p className="text-xs text-gray-500">Previous Period</p>
                    </div>
                  </div>
                  {(() => {
                    const change = calculateChange(
                      comparisonData.current.metrics.totalReturns,
                      comparisonData.previous.metrics.totalReturns
                    );
                    return (
                      <div className="flex items-center space-x-2">
                        {change.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />
                        ) : change.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm font-medium ${change.trend === 'up' ? 'text-red-400' :
                          change.trend === 'down' ? 'text-green-400' :
                            'text-gray-400'
                          }`}>
                          {change.trend !== 'neutral' && (change.trend === 'up' ? '+' : '')}
                          {change.percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Refund Amount Comparison */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Total Refund Amount</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        ${(comparisonData.current.financial.totalRefundAmount / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-gray-500">Current Period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-400">
                        ${(comparisonData.previous.financial.totalRefundAmount / 1000).toFixed(1)}K
                      </p>
                      <p className="text-xs text-gray-500">Previous Period</p>
                    </div>
                  </div>
                  {(() => {
                    const change = calculateChange(
                      comparisonData.current.financial.totalRefundAmount,
                      comparisonData.previous.financial.totalRefundAmount
                    );
                    return (
                      <div className="flex items-center space-x-2">
                        {change.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />
                        ) : change.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm font-medium ${change.trend === 'up' ? 'text-red-400' :
                          change.trend === 'down' ? 'text-green-400' :
                            'text-gray-400'
                          }`}>
                          {change.trend !== 'neutral' && (change.trend === 'up' ? '+' : '')}
                          {change.percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Approval Rate Comparison */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Approval Rate</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {((comparisonData.current.metrics.approvedReturns / comparisonData.current.metrics.totalReturns) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">Current Period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-400">
                        {((comparisonData.previous.metrics.approvedReturns / comparisonData.previous.metrics.totalReturns) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">Previous Period</p>
                    </div>
                  </div>
                  {(() => {
                    const currentRate = (comparisonData.current.metrics.approvedReturns / comparisonData.current.metrics.totalReturns) * 100;
                    const previousRate = (comparisonData.previous.metrics.approvedReturns / comparisonData.previous.metrics.totalReturns) * 100;
                    const change = calculateChange(currentRate, previousRate);
                    return (
                      <div className="flex items-center space-x-2">
                        {change.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                        ) : change.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm font-medium ${change.trend === 'up' ? 'text-green-400' :
                          change.trend === 'down' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                          {change.trend !== 'neutral' && (change.trend === 'up' ? '+' : '')}
                          {change.percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Processing Time Comparison */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">Avg Processing Time</p>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {comparisonData.current.processingTime.averageTotalResolutionTime.toFixed(1)}d
                      </p>
                      <p className="text-xs text-gray-500">Current Period</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-400">
                        {comparisonData.previous.processingTime.averageTotalResolutionTime.toFixed(1)}d
                      </p>
                      <p className="text-xs text-gray-500">Previous Period</p>
                    </div>
                  </div>
                  {(() => {
                    const change = calculateChange(
                      comparisonData.current.processingTime.averageTotalResolutionTime,
                      comparisonData.previous.processingTime.averageTotalResolutionTime
                    );
                    return (
                      <div className="flex items-center space-x-2">
                        {change.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />
                        ) : change.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <span className={`text-sm font-medium ${change.trend === 'up' ? 'text-red-400' :
                          change.trend === 'down' ? 'text-green-400' :
                            'text-gray-400'
                          }`}>
                          {change.trend !== 'neutral' && (change.trend === 'up' ? '+' : '')}
                          {change.percentage.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drill-down View */}
        <AnimatePresence>
          {drillDown.type && drillDown.value && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <ChevronRightIcon className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">
                    Drill-down: {drillDown.type} - {drillDown.value}
                  </h2>
                </div>

                <button
                  onClick={clearDrillDown}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Drill-down content would be rendered here based on the type */}
              {drillDown.data && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Filtered Returns</p>
                      <p className="text-xl font-bold text-white">{drillDown.data.details?.totalCount || 0}</p>
                    </div>
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Refund Value</p>
                      <p className="text-xl font-bold text-green-400">
                        ${(Number(drillDown.data.details?.totalRefundValue) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Filtered Trend */}
                  {drillDown.data.trends && drillDown.data.trends.length > 0 && (
                    <div className="bg-gray-700/30 p-4 rounded-lg h-48">
                      <p className="text-sm text-gray-400 mb-2">Trend Analysis</p>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={drillDown.data.trends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" hide />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          />
                          <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Related Items */}
                  {drillDown.data.relatedItems && drillDown.data.relatedItems.length > 0 && (
                    <div className="bg-gray-700/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-2">Top Related Returns</p>
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-gray-700/50">
                            <tr>
                              <th className="px-2 py-1">Item/Seller</th>
                              <th className="px-2 py-1">Value</th>
                              <th className="px-2 py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillDown.data.relatedItems.map((item: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-700/50">
                                <td className="px-2 py-1 text-white truncate max-w-[150px]">{item.name}</td>
                                <td className="px-2 py-1 text-green-400">${Number(item.value || 0).toFixed(2)}</td>
                                <td className="px-2 py-1 text-gray-300">{item.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

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
                    data={categoryData as any[]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.category} (${entry.percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    onClick={(data: any) => handleDrillDown('category', data.payload?.category || data.category)}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        style={{ cursor: 'pointer' }}
                      />
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
                <BarChart data={categoryData as any[]}>
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
                    radius={[4, 4, 0, 0]}
                    onClick={(data: any) => handleDrillDown('category', data.category || data.payload?.category)}
                    style={{ cursor: 'pointer' }}
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
                      className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer"
                      onClick={() => handleDrillDown('seller', seller.sellerName)}
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
                              className={`h-2 rounded-full ${seller.approvalRate >= 90 ? 'bg-green-500' :
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${seller.complianceScore >= 95 ? 'bg-green-500/20 text-green-400' :
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
