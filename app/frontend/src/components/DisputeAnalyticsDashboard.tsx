import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Clock, Gavel, AlertTriangle, CheckCircle } from 'lucide-react';

interface DisputeAnalytics {
  totalDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  disputesByType: Record<string, number>;
  verdictsByType: Record<string, number>;
  successRateByArbitrator: Record<string, number>;
}

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, value, icon, trend, color }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
            {Math.abs(trend.value)}% from last month
          </div>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

export const DisputeAnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<DisputeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/disputes/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDisputeTypeData = (disputesByType: Record<string, number>) => {
    return Object.entries(disputesByType).map(([type, count]) => ({
      name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  };

  const formatVerdictData = (verdictsByType: Record<string, number>) => {
    return Object.entries(verdictsByType).map(([verdict, count]) => ({
      name: verdict.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-200 h-64 rounded-lg"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">Error loading analytics: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <p className="text-gray-500 text-center">No analytics data available</p>
      </div>
    );
  }

  const resolutionRate = analytics.totalDisputes > 0 
    ? ((analytics.resolvedDisputes / analytics.totalDisputes) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispute Analytics</h1>
          <p className="text-gray-600">Monitor dispute resolution performance and trends</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Disputes"
          value={analytics.totalDisputes}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          color="bg-red-500"
          trend={{ value: 12, isPositive: false }}
        />
        <AnalyticsCard
          title="Resolved Disputes"
          value={analytics.resolvedDisputes}
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          color="bg-green-500"
          trend={{ value: 8, isPositive: true }}
        />
        <AnalyticsCard
          title="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={<Gavel className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          trend={{ value: 5, isPositive: true }}
        />
        <AnalyticsCard
          title="Avg Resolution Time"
          value={`${analytics.averageResolutionTime}h`}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disputes by Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Disputes by Type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatDisputeTypeData(analytics.disputesByType)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Verdicts Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Outcomes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={formatVerdictData(analytics.verdictsByType)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formatVerdictData(analytics.verdictsByType).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Arbitrator Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Arbitrators</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arbitrator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cases Handled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Resolution Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(analytics.successRateByArbitrator).slice(0, 5).map(([arbitrator, successRate], index) => (
                <tr key={arbitrator}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {arbitrator.slice(0, 8)}...{arbitrator.slice(-6)}
                        </div>
                        <div className="text-sm text-gray-500">Arbitrator #{index + 1}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(Math.random() * 50) + 10}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{successRate.toFixed(1)}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(Math.random() * 48) + 12}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">
                        {(4.0 + Math.random()).toFixed(1)}
                      </div>
                      <div className="ml-1 text-yellow-400">★</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Dispute Activity</h3>
        <div className="space-y-4">
          {[
            { id: 1, type: 'created', message: 'New dispute created for escrow #1234', time: '2 hours ago' },
            { id: 2, type: 'resolved', message: 'Dispute #5678 resolved in favor of buyer', time: '4 hours ago' },
            { id: 3, type: 'evidence', message: 'Evidence submitted for dispute #9012', time: '6 hours ago' },
            { id: 4, type: 'vote', message: 'Community vote cast on dispute #3456', time: '8 hours ago' },
            { id: 5, type: 'escalated', message: 'Dispute #7890 escalated to DAO governance', time: '12 hours ago' }
          ].map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'created' ? 'bg-blue-500' :
                activity.type === 'resolved' ? 'bg-green-500' :
                activity.type === 'evidence' ? 'bg-yellow-500' :
                activity.type === 'vote' ? 'bg-purple-500' :
                'bg-red-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};