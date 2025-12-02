import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, Clock, Server, Database, Cpu, HardDrive } from 'lucide-react';

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  endpoint: string;
  method: string;
  statusCode: number;
  memoryUsage?: number;
  cpuUsage?: number;
  databaseQueryTime?: number;
}

interface PerformanceAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
  }>;
}

interface PerformanceReport {
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  endpoints: Array<{
    endpoint: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  alerts: PerformanceAlert[];
}

interface PerformanceDashboardProps {
  apiUrl?: string;
  refreshInterval?: number;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  refreshInterval = 30000 // 30 seconds
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchPerformanceData();
    fetchHealthStatus();
  }, [timeRange]);

  // Set up real-time streaming
  useEffect(() => {
    if (autoRefresh) {
      connectEventStream();
    } else {
      disconnectEventStream();
    }

    return () => {
      disconnectEventStream();
    };
  }, [autoRefresh]);

  // Auto refresh polling
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchPerformanceData();
      fetchHealthStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, timeRange]);

  const connectEventStream = () => {
    try {
      const eventSource = new EventSource(`${apiUrl}/api/performance/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'report':
              setReport(data.data);
              break;
            case 'alert':
              setAlerts(prev => [data.data, ...prev.slice(0, 49)]); // Keep last 50 alerts
              break;
            case 'alert_resolved':
              setAlerts(prev => prev.map(alert => 
                alert.id === data.data.id ? { ...alert, ...data.data } : alert
              ));
              break;
            case 'health':
              setHealthStatus(data.data);
              break;
          }
        } catch (error) {
          console.error('Failed to parse event data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventStream error:', error);
        disconnectEventStream();
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (autoRefresh) {
            connectEventStream();
          }
        }, 5000);
      };

    } catch (error) {
      console.error('Failed to connect to event stream:', error);
      setError('Failed to connect to real-time updates');
    }
  };

  const disconnectEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate time range
      const now = new Date();
      let start: Date;
      
      switch (timeRange) {
        case '1h':
          start = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(now.getTime() - 60 * 60 * 1000);
      }

      const [reportResponse, alertsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/performance/report?start=${start.toISOString()}&end=${now.toISOString()}`),
        fetch(`${apiUrl}/api/performance/alerts?resolved=false`)
      ]);

      if (!reportResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const [reportData, alertsData] = await Promise.all([
        reportResponse.json(),
        alertsResponse.json()
      ]);

      setReport(reportData.data);
      setAlerts(alertsData.data);

    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/performance/health`);
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/performance/alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warn': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Dashboard</h2>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto Refresh</span>
          </label>

          {/* Refresh Button */}
          <button
            onClick={fetchPerformanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <div className={`rounded-lg p-4 ${
          healthStatus.status === 'healthy' ? 'bg-green-50 border border-green-200' :
          healthStatus.status === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <h3 className="text-lg font-semibold mb-3">System Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {healthStatus.checks.map((check, index) => (
              <div key={index} className="flex items-center space-x-2">
                {getStatusIcon(check.status)}
                <div>
                  <div className="text-sm font-medium capitalize">{check.name.replace('_', ' ')}</div>
                  {check.message && (
                    <div className="text-xs text-gray-600">{check.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.summary.totalRequests.toLocaleString()}</p>
              </div>
              <Server className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.summary.averageResponseTime.toFixed(0)}ms</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.summary.errorRate.toFixed(2)}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">95th Percentile</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.summary.p95ResponseTime.toFixed(0)}ms</p>
              </div>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">99th Percentile</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.summary.p99ResponseTime.toFixed(0)}ms</p>
              </div>
              <Cpu className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Response Time Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="responseTime" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Endpoint Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Endpoint Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report?.endpoints.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageResponseTime" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No active alerts</p>
          ) : (
            alerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!alert.resolved && (
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;