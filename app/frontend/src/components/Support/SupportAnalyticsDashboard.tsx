import React, { useState, useEffect } from 'react';
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
  Loader
} from 'lucide-react';
import { supportAnalyticsService, SupportAnalytics, SupportTicket } from '../../services/supportAnalyticsService';

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

const SupportAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [ticketData, setTicketData] = useState<TicketDataPoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topAgents, setTopAgents] = useState<SupportAgent[]>([]);
  const [analytics, setAnalytics] = useState<SupportAnalytics | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stats from analytics
  const [stats, setStats] = useState({
    totalTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: '0h',
    satisfactionRate: 0,
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

      // Fetch analytics and tickets in parallel
      const [analyticsData, ticketsData] = await Promise.all([
        supportAnalyticsService.getSupportAnalytics(days),
        supportAnalyticsService.searchTickets({
          dateFrom: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
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
      setTopAgents(processed.topAgents);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
      // Set fallback data
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackData = () => {
    // Fallback to mock data if API fails
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

    setTopAgents([
      { id: '1', name: 'Alex Johnson', ticketsHandled: 124, avgResponseTime: '2.1h', satisfaction: 94 },
      { id: '2', name: 'Maria Garcia', ticketsHandled: 98, avgResponseTime: '1.8h', satisfaction: 96 },
      { id: '3', name: 'James Wilson', ticketsHandled: 87, avgResponseTime: '2.3h', satisfaction: 92 },
      { id: '4', name: 'Sarah Chen', ticketsHandled: 76, avgResponseTime: '1.9h', satisfaction: 95 },
      { id: '5', name: 'Robert Davis', ticketsHandled: 65, avgResponseTime: '2.5h', satisfaction: 90 }
    ]);

    setStats({
      totalTickets: 1248,
      resolvedTickets: 1124,
      avgResponseTime: '2.1h',
      satisfactionRate: 92,
    });
  };

  // Simple chart components for demonstration
  const SimpleBarChart = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const chartData = ticketData.slice(-days);
    const maxHeight = Math.max(...chartData.map(d => d.count), 1);
    
    return (
      <div className="h-64">
        <div className="flex items-end h-48 border-b border-l border-gray-200 pb-4 pl-4">
          {chartData.map((data, index) => {
            const date = new Date(data.date);
            const label = days <= 7 ? date.getDate().toString() : 
                         days <= 30 ? `${date.getMonth() + 1}/${date.getDate()}` :
                         `${date.getMonth() + 1}/${date.getDate()}`;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 px-1">
                <div
                  className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${Math.max((data.count / maxHeight) * 180, 4)}px` }}
                  title={`${data.count} tickets on ${data.date}`}
                ></div>
                <div className="text-xs text-gray-500 mt-2">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          Ticket Volume ({timeRange})
        </div>
      </div>
    );
  };

  const SimplePieChart = () => {
    const total = categoryData.reduce((sum, cat) => sum + cat.value, 0);
    const radius = 15.915;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercentage = 0;
    
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {categoryData.map((cat, index) => {
              const percentage = (cat.value / total) * 100;
              const strokeLength = (percentage / 100) * circumference;
              const strokeOffset = -cumulativePercentage * circumference / 100;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={cat.name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="8"
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{categoryData.length}</div>
              <div className="text-xs text-gray-500">Categories</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SimpleLineChart = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const chartData = ticketData.slice(-days);
    const maxValue = Math.max(...chartData.map(d => Math.max(d.resolved, d.count)), 1);
    
    return (
      <div className="h-64">
        <div className="h-48 border-b border-l border-gray-200 pb-4 pl-4 relative">
          {/* Grid lines - aligned with data scale */}
          {[0, 25, 50, 75, 100].map((y) => (
            <div
              key={y}
              className="absolute left-0 right-0 h-px bg-gray-100"
              style={{ bottom: `${y}%` }}
            ></div>
          ))}

          {/* Resolution rate line */}
          <svg className="absolute inset-0 w-full h-full" style={{ padding: '8px' }}>
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points={chartData.map((data, index) => {
                const x = chartData.length > 1 ? (index / (chartData.length - 1)) * 90 + 5 : 50;
                const resolutionRate = data.count > 0 ? (data.resolved / data.count) * 100 : 0;
                const y = 95 - resolutionRate; // Adjusted to match grid alignment
                return `${x}%,${Math.max(y, 5)}%`;
              }).join(' ')}
            />
          </svg>
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          Resolution Rate ({timeRange})
        </div>
      </div>
    );
  };

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
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Support Analytics</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadAnalyticsData}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTickets.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Response</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">{stats.satisfactionRate}%</p>
            </div>
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
              <div key={agent.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-500">{agent.ticketsHandled} tickets</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{agent.avgResponseTime}</p>
                  <p className="text-xs text-gray-500">⭐ {agent.satisfaction}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Insights */}
      {analytics && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Insights & Recommendations</h3>

          {/* Recommendations */}
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

          {/* Content Gaps */}
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

          {/* Prevention Opportunities */}
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

      {/* Peak Support Hours */}
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

export default SupportAnalyticsDashboard;
