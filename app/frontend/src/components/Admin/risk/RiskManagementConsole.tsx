import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  EyeIcon,
  UserGroupIcon,
  BellIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  FlagIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { riskManagementService, RiskMetrics, RiskReturn, RiskAlert, ReviewAssignment, RiskStatistics } from '../../../services/riskManagementService';

interface FilterState {
  riskLevel: string[];
  status: string[];
  dateRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

interface ViewState {
  dashboard: boolean;
  returns: boolean;
  alerts: boolean;
  reviews: boolean;
  reports: boolean;
  settings: boolean;
}

const RISK_LEVEL_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

const RISK_LEVEL_BADGES = {
  low: 'bg-green-100 text-green-800 border-green-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
  critical: 'bg-red-200 text-red-900 border-red-400'
};

const ALERT_SEVERITY_COLORS = {
  low: '#60A5FA',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

export const RiskManagementConsole: React.FC = () => {
  // State management
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [riskStatistics, setRiskStatistics] = useState<RiskStatistics | null>(null);
  const [highRiskReturns, setHighRiskReturns] = useState<RiskReturn[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  const [reviewAssignments, setReviewAssignments] = useState<ReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<keyof ViewState>('dashboard');

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    riskLevel: [],
    status: [],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    searchQuery: '',
  });

  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<RiskReturn | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [showReturnDetails, setShowReturnDetails] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);

  // Fetch initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Refresh data when filters change
  useEffect(() => {
    if (!isLoading) {
      loadDashboardData();
    }
  }, [filters.dateRange]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [metrics, statistics, returns, alerts, assignments] = await Promise.all([
        riskManagementService.getRiskMetrics(filters.dateRange),
        riskManagementService.getRiskStatistics(filters.dateRange),
        riskManagementService.getHighRiskReturns({
          riskLevel: filters.riskLevel.length > 0 ? filters.riskLevel[0] : undefined,
          status: filters.status.length > 0 ? filters.status[0] : undefined,
          dateRange: filters.dateRange,
          limit: 20,
        }),
        riskManagementService.getRiskAlerts({
          limit: 20,
        }),
        riskManagementService.getReviewAssignments({
          limit: 20,
        }),
      ]);

      setRiskMetrics(metrics);
      setRiskStatistics(statistics);
      setHighRiskReturns(returns.returns);
      setRiskAlerts(alerts.alerts);
      setReviewAssignments(assignments.assignments);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load risk management data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReturnClick = (returnItem: RiskReturn) => {
    setSelectedReturn(returnItem);
    setShowReturnDetails(true);
  };

  const handleAlertClick = (alert: RiskAlert) => {
    setSelectedAlert(alert);
    setShowAlertDetails(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await riskManagementService.acknowledgeAlert(alertId);
      await loadDashboardData();
      setShowAlertDetails(false);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      setError('Failed to acknowledge alert');
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <ShieldCheckIcon className="w-5 h-5 text-green-500" />;
      case 'medium': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'high': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'critical': return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      default: return <ShieldCheckIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDashboardNavigation = () => [
    { key: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { key: 'returns', label: 'Risk Returns', icon: ExclamationTriangleIcon },
    { key: 'alerts', label: 'Alerts', icon: BellIcon },
    { key: 'reviews', label: 'Reviews', icon: EyeIcon },
    { key: 'reports', label: 'Reports', icon: DocumentTextIcon },
    { key: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Risk Management Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Risk Management Console</h1>
                <p className="text-sm text-gray-500">Monitor and manage return risks and fraud detection</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Last Update */}
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {getDashboardNavigation().map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setSelectedView(item.key as keyof ViewState)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedView === item.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4"
          >
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Filters</span>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      placeholder="Search returns..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                  <select
                    value={filters.riskLevel[0] || ''}
                    onChange={(e) => handleFilterChange('riskLevel', e.target.value ? [e.target.value] : [])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status[0] || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : [])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="escalated">Escalated</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard View */}
        {selectedView === 'dashboard' && riskStatistics && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <ExclamationTriangleIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-500">Total Returns</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{riskStatistics.totalReturns}</div>
                <div className="text-sm text-gray-600 mt-1">In selected period</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-sm text-gray-500">High Risk</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{riskStatistics.riskDistribution.high || 0}</div>
                <div className="text-sm text-gray-600 mt-1">Require attention</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <BellIcon className="w-6 h-6 text-yellow-600" />
                  </div>
                  <span className="text-sm text-gray-500">Active Alerts</span>
                </div>
                <div className="text-2xl font-bold text-yellow-600">{riskStatistics.alertSummary.active}</div>
                <div className="text-sm text-gray-600 mt-1">Need review</div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <EyeIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <span className="text-sm text-gray-500">Pending Reviews</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">{riskStatistics.reviewQueue.pending}</div>
                <div className="text-sm text-gray-600 mt-1">{riskStatistics.reviewQueue.overdue} overdue</div>
              </div>
            </div>

            {/* Risk Distribution Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(riskStatistics.riskDistribution).map(([level, count]) => ({
                        name: level.charAt(0).toUpperCase() + level.slice(1),
                        value: count,
                        color: RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS]
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {Object.entries(riskStatistics.riskDistribution).map(([level], index) => (
                        <Cell key={`cell-${index}`} fill={RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={riskStatistics.riskTrends.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="averageScore" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Average Risk Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* High Risk Returns Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">High Risk Returns</h3>
                <button
                  onClick={() => setSelectedView('returns')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View All →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Return ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Risk Level</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Flagged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskReturns.slice(0, 5).map((returnItem) => (
                      <tr 
                        key={returnItem.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleReturnClick(returnItem)}
                      >
                        <td className="py-3 px-4 text-sm text-gray-900">{returnItem.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{returnItem.customerEmail}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${RISK_LEVEL_BADGES[returnItem.riskLevel]}`}>
                            {returnItem.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{returnItem.riskScore.toFixed(2)}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{returnItem.status.replace('_', ' ')}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDate(returnItem.flaggedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Returns View */}
        {selectedView === 'returns' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Risk Returns</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FunnelIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Return ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Risk Level</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Flagged</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskReturns.map((returnItem) => (
                    <tr key={returnItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{returnItem.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{returnItem.customerEmail}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatCurrency(returnItem.amount)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${RISK_LEVEL_BADGES[returnItem.riskLevel]}`}>
                          {returnItem.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{returnItem.riskScore.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{returnItem.status.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{formatDate(returnItem.flaggedAt)}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleReturnClick(returnItem)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alerts View */}
        {selectedView === 'alerts' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Risk Alerts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {riskAlerts.map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <BellIcon className={`w-5 h-5 ${ALERT_SEVERITY_COLORS[alert.severity]}`} />
                        <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{alert.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Triggered: {formatDate(alert.triggeredAt)}</span>
                        <span>Status: {alert.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAlertClick(alert)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                      )}
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews View */}
        {selectedView === 'reviews' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Review Assignments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Return ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Assigned To</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Priority</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Due Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{assignment.riskReturnId}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{assignment.assignedTo}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          assignment.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {assignment.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">{assignment.status.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(assignment.dueDate)}</td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports View */}
        {selectedView === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Reports</h3>
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No reports available yet</p>
              <p className="text-sm text-gray-500 mt-1">Reports will appear here once generated</p>
            </div>
          </div>
        )}

        {/* Settings View */}
        {selectedView === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Management Settings</h3>
            <div className="text-center py-12">
              <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Settings configuration coming soon</p>
              <p className="text-sm text-gray-500 mt-1">Configure risk thresholds and alert rules</p>
            </div>
          </div>
        )}
      </div>

      {/* Return Details Modal */}
      <AnimatePresence>
        {showReturnDetails && selectedReturn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowReturnDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Return Risk Details</h3>
                  <button
                    onClick={() => setShowReturnDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Return Information</h4>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Return ID:</dt>
                        <dd className="text-sm text-gray-900">{selectedReturn.id}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Customer:</dt>
                        <dd className="text-sm text-gray-900">{selectedReturn.customerEmail}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Amount:</dt>
                        <dd className="text-sm text-gray-900">{formatCurrency(selectedReturn.amount)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Risk Score:</dt>
                        <dd className="text-sm text-gray-900">{selectedReturn.riskScore.toFixed(2)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Risk Level:</dt>
                        <dd>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${RISK_LEVEL_BADGES[selectedReturn.riskLevel]}`}>
                            {selectedReturn.riskLevel.toUpperCase()}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Factors</h4>
                    <div className="space-y-2">
                      {selectedReturn.riskFactors.map((factor, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              factor.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              factor.severity === 'high' ? 'bg-red-100 text-red-800' :
                              factor.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {factor.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{factor.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowReturnDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Assign Review
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert Details Modal */}
      <AnimatePresence>
        {showAlertDetails && selectedAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAlertDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
                  <button
                    onClick={() => setShowAlertDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{selectedAlert.title}</h4>
                    <p className="text-sm text-gray-600">{selectedAlert.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-600">Type:</dt>
                      <dd className="text-sm text-gray-900">{selectedAlert.type.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Severity:</dt>
                      <dd>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedAlert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          selectedAlert.severity === 'high' ? 'bg-red-100 text-red-800' :
                          selectedAlert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedAlert.severity.toUpperCase()}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Status:</dt>
                      <dd className="text-sm text-gray-900">{selectedAlert.status.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600">Triggered:</dt>
                      <dd className="text-sm text-gray-900">{formatDate(selectedAlert.triggeredAt)}</dd>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAlertDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedAlert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledgeAlert(selectedAlert.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};