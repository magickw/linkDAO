import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw
} from 'lucide-react';

interface DashboardData {
  performance: {
    responseTime: { average: number; p95: number; p99: number };
    throughput: { requestsPerSecond: number; transactionsPerSecond: number };
    errorRate: { percentage: number; count: number };
    systemHealth: { cpuUsage: number; memoryUsage: number; diskUsage: number };
  };
  ldao: {
    tokenPurchases: number;
    stakingTransactions: number;
    dexTrades: number;
    earnedTokens: number;
    totalTransactionValue: number;
    averageTransactionValue: number;
    userEngagement: {
      activeUsers: number;
      newSignups: number;
      retentionRate: number;
    };
  };
  feedback: {
    totalFeedback: number;
    averageRating: number;
    feedbackByCategory: Record<string, number>;
    sentimentAnalysis: {
      positive: number;
      neutral: number;
      negative: number;
    };
  };
  alerts: any[];
  systemStatus: string;
  uptime: number;
}

const LDAOMonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/ldao-support/metrics');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatNumber = (num: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to Load Dashboard Data
        </h3>
        <button
          onClick={loadDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            LDAO System Monitoring
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring and analytics for LDAO token system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              autoRefresh 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={loadDashboardData}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Status</p>
              <div className="flex items-center mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dashboardData.systemStatus)}`}>
                  {dashboardData.systemStatus.toUpperCase()}
                </span>
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(dashboardData.uptime, 2)}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(dashboardData.performance.responseTime.average)}ms
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatNumber(dashboardData.performance.errorRate.percentage, 2)}%
              </p>
            </div>
            <AlertTriangle className={`w-8 h-8 ${
              dashboardData.performance.errorRate.percentage > 5 ? 'text-red-500' : 'text-green-500'
            }`} />
          </div>
        </div>
      </div>

      {/* LDAO Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            LDAO Token Metrics (24h)
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-900">
                {formatNumber(dashboardData.ldao.tokenPurchases)}
              </p>
              <p className="text-sm text-blue-600">Token Purchases</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-900">
                {formatNumber(dashboardData.ldao.stakingTransactions)}
              </p>
              <p className="text-sm text-green-600">Staking Transactions</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-900">
                {formatNumber(dashboardData.ldao.dexTrades)}
              </p>
              <p className="text-sm text-purple-600">DEX Trades</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-900">
                {formatNumber(dashboardData.ldao.earnedTokens)}
              </p>
              <p className="text-sm text-orange-600">Tokens Earned</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Total Transaction Value</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(dashboardData.ldao.totalTransactionValue)}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm font-medium text-gray-600">Average Transaction</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(dashboardData.ldao.averageTransactionValue)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            User Engagement
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-blue-600 mr-3" />
                <span className="font-medium text-gray-700">Active Users</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.ldao.userEngagement.activeUsers)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
                <span className="font-medium text-gray-700">New Signups</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.ldao.userEngagement.newSignups)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-6 h-6 text-purple-600 mr-3" />
                <span className="font-medium text-gray-700">Retention Rate</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.ldao.userEngagement.retentionRate, 1)}%
              </span>
            </div>
          </div>
          
          {/* User Engagement Chart Placeholder */}
          <div className="mt-6 h-32 bg-gray-50 rounded-lg flex items-center justify-center">
            <LineChart className="w-8 h-8 text-gray-400" />
            <span className="ml-2 text-gray-500">Engagement Trend Chart</span>
          </div>
        </div>
      </div>

      {/* Performance and Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            System Performance
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">CPU Usage</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.performance.systemHealth.cpuUsage, 1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.performance.systemHealth.cpuUsage > 80 ? 'bg-red-500' :
                    dashboardData.performance.systemHealth.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.performance.systemHealth.cpuUsage}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Memory Usage</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.performance.systemHealth.memoryUsage, 1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.performance.systemHealth.memoryUsage > 80 ? 'bg-red-500' :
                    dashboardData.performance.systemHealth.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.performance.systemHealth.memoryUsage}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Disk Usage</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.performance.systemHealth.diskUsage, 1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    dashboardData.performance.systemHealth.diskUsage > 80 ? 'bg-red-500' :
                    dashboardData.performance.systemHealth.diskUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${dashboardData.performance.systemHealth.diskUsage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Requests/sec</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatNumber(dashboardData.performance.throughput.requestsPerSecond, 1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Transactions/sec</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatNumber(dashboardData.performance.throughput.transactionsPerSecond, 1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            User Feedback
          </h2>
          
          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {formatNumber(dashboardData.feedback.averageRating, 1)}/5.0
            </div>
            <div className="text-sm text-gray-600">
              Average Rating ({formatNumber(dashboardData.feedback.totalFeedback)} reviews)
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-600">Positive</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="h-2 bg-green-500 rounded-full"
                    style={{ width: `${dashboardData.feedback.sentimentAnalysis.positive}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.feedback.sentimentAnalysis.positive, 1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-yellow-600">Neutral</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="h-2 bg-yellow-500 rounded-full"
                    style={{ width: `${dashboardData.feedback.sentimentAnalysis.neutral}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.feedback.sentimentAnalysis.neutral, 1)}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-600">Negative</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="h-2 bg-red-500 rounded-full"
                    style={{ width: `${dashboardData.feedback.sentimentAnalysis.negative}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(dashboardData.feedback.sentimentAnalysis.negative, 1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Feedback Categories */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Feedback by Category</h3>
            <div className="space-y-2">
              {Object.entries(dashboardData.feedback.feedbackByCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{category.replace('-', ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      {dashboardData.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Recent Alerts
          </h2>
          
          <div className="space-y-4">
            {dashboardData.alerts.slice(0, 5).map((alert, index) => (
              <div key={index} className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900">{alert.title}</h3>
                  <p className="text-sm text-red-700 mt-1">{alert.description}</p>
                  <p className="text-xs text-red-600 mt-2">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LDAOMonitoringDashboard;