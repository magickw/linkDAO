import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart,
  LineChart,
  PieChart,
  RefreshCw,
  Loader,
  Download,
  FileText,

  Filter,
  Bell,
  Settings,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Activity
} from 'lucide-react';
import { supportAnalyticsService, SupportAnalytics, SupportTicket } from '../../services/supportAnalyticsService';
import { supportWebSocketService, WebSocketMessage } from '../../services/supportWebSocketService';
import { emailAlertService, AlertConfig } from '../../services/emailAlertService';
import { exportToCSV, exportToPDF, prepareAnalyticsForExport } from '../../utils/exportUtils';

interface TicketDataPoint {
  date: string;
  count: number;
  resolved: number;
  pending: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface SupportAgent {
  id: string;
  name: string;
  ticketsHandled: number;
  avgResponseTime: string;
  satisfaction: number;
}

interface FilterOptions {
  category?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
}

const EnhancedSupportAnalyticsDashboard: React.FC = () => {
  // Time Range State
  const [timeRange, setTimeRange] = useState('7d');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Data State
  const [ticketData, setTicketData] = useState<TicketDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topAgents, setTopAgents] = useState<SupportAgent[]>([]);
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<SupportAnalytics | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
    totalTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: '0h',
    satisfactionRate: 0,
  });

  // Alert State
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(emailAlertService.getConfig());

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange, filters]);

  // Load comparison data
  useEffect(() => {
    loadComparisonData();
  }, [timeRange]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!liveUpdatesEnabled) return;

    const unsubscribe = supportWebSocketService.subscribeToTickets((message: WebSocketMessage) => {
      handleRealtimeUpdate(message);
    });

    return () => {
      unsubscribe();
    };
  }, [liveUpdatesEnabled]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      let days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      }

      // Fetch analytics and tickets in parallel
      const [analyticsData, ticketsData] = await Promise.all([
        supportAnalyticsService.getSupportAnalytics(days),
        supportAnalyticsService.searchTickets({
          ...filters,
          dateFrom: startDate?.toISOString() || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: endDate?.toISOString(),
        }),
      ]);

      setAnalytics(analyticsData);
      setTickets(ticketsData.tickets);

      // Process data for dashboard display
      const processed = supportAnalyticsService.processToDashboardFormat(
        analyticsData,
        ticketsData.tickets,
        timeRange
      );

      setStats(processed.stats);
      setTicketData(processed.ticketData);
      setCategoryData(processed.categoryData);

      // Use real agent data from backend
      if (analyticsData.agentPerformance && analyticsData.agentPerformance.length > 0) {
        setTopAgents(analyticsData.agentPerformance.slice(0, 5).map(agent => ({
          id: agent.id,
          name: agent.name,
          ticketsHandled: agent.ticketsHandled,
          avgResponseTime: `${agent.avgResponseTime.toFixed(1)}h`,
          satisfaction: agent.satisfactionScore
        })));
      } else {
        setTopAgents(processed.topAgents);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadComparisonData = async () => {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const previousAnalytics = await supportAnalyticsService.getSupportAnalytics(days * 2);
      setPreviousAnalytics(previousAnalytics);
    } catch (error) {
      console.error('Failed to load comparison data:', error);
    }
  };

  const loadFallbackData = () => {
    // Fallback data loading logic (same as before)
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    const mockTicketData: TicketDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      mockTicketData.push({
        date: dateStr,
        count: Math.floor(Math.random() * 50) + 10,
        resolved: Math.floor(Math.random() * 40) + 5,
        pending: Math.floor(Math.random() * 20) + 1
      });
    }

    setTicketData(mockTicketData);
    setCategoryData([
      { name: 'Technical Issues', value: 35, color: '#3b82f6' },
      { name: 'Account Access', value: 25, color: '#10b981' },
      { name: 'Payment Issues', value: 20, color: '#f59e0b' },
      { name: 'Security Concerns', value: 15, color: '#ef4444' },
      { name: 'General Inquiries', value: 5, color: '#6b7280' }
    ]);

    setStats({
      totalTickets: 1248,
      resolvedTickets: 1124,
      avgResponseTime: '2.1h',
      satisfactionRate: 92,
    });
  };

  const handleRealtimeUpdate = (message: WebSocketMessage) => {
    console.log('Received real-time update:', message);

    // Refresh data when tickets are created, updated, or resolved
    if (['ticket_created', 'ticket_updated', 'ticket_resolved'].includes(message.type)) {
      loadAnalyticsData();
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;

    const exportData = prepareAnalyticsForExport(analytics, timeRange);

    // Export all sections
    exportToCSV(exportData.summary, `support-analytics-summary-${new Date().toISOString().split('T')[0]}.csv`);
    exportToCSV(exportData.agents, `support-analytics-agents-${new Date().toISOString().split('T')[0]}.csv`);
    exportToCSV(exportData.categories, `support-analytics-categories-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = async () => {
    if (!analytics) return;

    const exportData = prepareAnalyticsForExport(analytics, timeRange);
    await exportToPDF(exportData.summary, `support-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const applyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const updateAlertConfig = (config: Partial<AlertConfig>) => {
    const newConfig = { ...alertConfig, ...config };
    setAlertConfig(newConfig);
    emailAlertService.updateConfig(newConfig);
  };

  const calculateTrend = (current: number, previous: number): { value: number; isPositive: boolean } => {
    if (!previous) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  // Memoized trend calculations
  const trends = useMemo(() => {
    if (!previousAnalytics || !analytics) return null;

    return {
      totalTickets: calculateTrend(
        analytics.summary.totalTickets,
        previousAnalytics.summary.totalTickets
      ),
      avgResponseTime: calculateTrend(
        analytics.summary.averageResolutionTime,
        previousAnalytics.summary.averageResolutionTime
      ),
      satisfactionRate: calculateTrend(
        analytics.summary.documentationEffectiveness,
        previousAnalytics.summary.documentationEffectiveness
      ),
    };
  }, [analytics, previousAnalytics]);

  // Chart Components
  const SimpleBarChart = () => (
    <div className="h-64">
      <div className="flex items-end h-48 border-b border-l border-gray-200 pb-4 pl-4">
        {ticketData.slice(-7).map((data, index) => (
          <div key={index} className="flex flex-col items-center flex-1 px-1">
            <div
              className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
              style={{ height: `${(data.count / 60) * 100}%` }}
              title={`${data.count} tickets`}
            ></div>
            <div className="text-xs text-gray-500 mt-2">
              {new Date(data.date).getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        Ticket Volume (Last 7 Days)
      </div>
    </div>
  );

  const SimplePieChart = () => (
    <div className="h-64 flex items-center justify-center">
      <div className="relative w-48 h-48 rounded-full border-8 border-gray-200">
        {categoryData.map((cat, index) => {
          const startAngle = index * (360 / categoryData.length);
          const endAngle = (index + 1) * (360 / categoryData.length);
          return (
            <div
              key={cat.name}
              className="absolute inset-0 rounded-full"
              style={{
                clipPath: `conic-gradient(from ${startAngle}deg, ${cat.color} 0deg ${endAngle - startAngle}deg, transparent ${endAngle - startAngle}deg 360deg)`
              }}
            ></div>
          );
        })}
        <div className="absolute inset-4 bg-white rounded-full"></div>
      </div>
    </div>
  );

  const SimpleLineChart = () => (
    <div className="h-64">
      <div className="h-48 border-b border-l border-gray-200 pb-4 pl-4 relative">
        {[0, 25, 50, 75, 100].map((y) => (
          <div
            key={y}
            className="absolute left-0 right-0 h-px bg-gray-100"
            style={{ bottom: `${y}%` }}
          ></div>
        ))}

        <svg className="absolute inset-0 w-full h-full">
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={ticketData.slice(-7).map((data, index) => {
              const x = (index / 6) * 100;
              const y = 100 - (data.resolved / 50) * 100;
              return `${x}%,${y}%`;
            }).join(' ')}
          />
        </svg>
      </div>
      <div className="text-center text-sm text-gray-500 mt-2">
        Resolution Rate (Last 7 Days)
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Support Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time insights and performance metrics</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Updates Toggle */}
          <button
            onClick={() => setLiveUpdatesEnabled(!liveUpdatesEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              liveUpdatesEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={liveUpdatesEnabled ? 'Live updates enabled' : 'Live updates disabled'}
          >
            <Activity className="w-5 h-5" />
          </button>

          {/* Alert Settings */}
          <button
            onClick={() => setShowAlertSettings(!showAlertSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Alert settings"
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Filter data"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Export Buttons */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            title="Export to CSV"
          >
            <FileText className="w-4 h-4" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
            title="Export to PDF"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>

          {/* Refresh */}
          <button
            onClick={loadAnalyticsData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Time Range Selector */}
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => {
              const value = e.target.value;
              setTimeRange(value);
              if (value === 'custom') {
                setShowCustomDatePicker(true);
              } else {
                setShowCustomDatePicker(false);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomDatePicker && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => {
                if (customDateRange.start && customDateRange.end) {
                  loadAnalyticsData();
                }
              }}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={!customDateRange.start || !customDateRange.end}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Filter Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="technical">Technical</option>
                <option value="account">Account</option>
                <option value="payment">Payment</option>
                <option value="security">Security</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={() => applyFilters(filters)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Settings Panel */}
      {showAlertSettings && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Email Alert Settings</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={alertConfig.enabled}
                onChange={(e) => updateAlertConfig({ enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Enable alerts</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={alertConfig.frequency}
                onChange={(e) => updateAlertConfig({ frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!alertConfig.enabled}
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (comma-separated)</label>
              <input
                type="text"
                value={alertConfig.recipients.join(', ')}
                onChange={(e) => updateAlertConfig({ recipients: e.target.value.split(',').map(s => s.trim()) })}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!alertConfig.enabled}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">Warning</p>
            <p className="text-yellow-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Key Metrics with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTickets.toLocaleString()}</p>
              </div>
            </div>
            {trends?.totalTickets && (
              <div className={`flex items-center ${trends.totalTickets.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trends.totalTickets.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span className="text-sm ml-1">{trends.totalTickets.value.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolvedTickets.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Response</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
              </div>
            </div>
            {trends?.avgResponseTime && (
              <div className={`flex items-center ${!trends.avgResponseTime.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {!trends.avgResponseTime.isPositive ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                <span className="text-sm ml-1">{trends.avgResponseTime.value.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
              </div>
            </div>
            {trends?.satisfactionRate && (
              <div className={`flex items-center ${trends.satisfactionRate.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trends.satisfactionRate.isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span className="text-sm ml-1">{trends.satisfactionRate.value.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Ticket Volume
          </h3>
          <SimpleBarChart />
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-600" />
            Ticket Categories
          </h3>
          <SimplePieChart />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cat.color }}
                ></div>
                <span className="text-sm text-gray-600">{cat.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <LineChart className="w-5 h-5 mr-2 text-purple-600" />
            Resolution Rate
          </h3>
          <SimpleLineChart />
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-yellow-600" />
            Top Support Agents
          </h3>
          <div className="space-y-4">
            {topAgents.map((agent, index) => (
              <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.ticketsHandled} tickets handled</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.avgResponseTime}</p>
                  <p className="text-xs text-gray-500">⭐ {agent.satisfaction}% satisfaction</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      {analytics && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>

          {analytics.recommendations && analytics.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Action Items</h4>
              <div className="space-y-2">
                {analytics.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.contentGaps && analytics.contentGaps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Content Gaps Detected</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {analytics.contentGaps.slice(0, 3).map((gap, index) => (
                  <div key={index} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-yellow-900">{gap.topic}</h5>
                      <span className={`text-xs px-2 py-1 rounded ${
                        gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        gap.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        gap.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-sm text-yellow-700 mb-1">{gap.ticketCount} related tickets</p>
                    <p className="text-xs text-yellow-600">{gap.suggestedContent}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.preventionOpportunities && analytics.preventionOpportunities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Prevention Opportunities</h4>
              <div className="space-y-2">
                {analytics.preventionOpportunities.slice(0, 3).map((opp, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium text-green-900">{opp.issueType}</h5>
                      <span className="text-sm font-semibold text-green-700">{opp.potentialPrevention}% preventable</span>
                    </div>
                    <p className="text-sm text-green-700 mb-1">{opp.ticketCount} tickets</p>
                    <p className="text-xs text-green-600">{opp.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Insights */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Peak Support Hours</h4>
            <p className="text-sm text-blue-700 mt-1">10AM - 2PM (Mon-Fri)</p>
            <p className="text-xs text-blue-600 mt-2">40% of tickets created during this time</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900">Documentation Effectiveness</h4>
            <p className="text-sm text-green-700 mt-1">{analytics?.summary.documentationEffectiveness || 0}%</p>
            <p className="text-xs text-green-600 mt-2">Users finding answers before creating tickets</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900">Avg. Resolution Time</h4>
            <p className="text-sm text-purple-700 mt-1">{analytics?.summary.averageResolutionTime.toFixed(1) || 0}h</p>
            <p className="text-xs text-purple-600 mt-2">Time from ticket creation to resolution</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSupportAnalyticsDashboard;
