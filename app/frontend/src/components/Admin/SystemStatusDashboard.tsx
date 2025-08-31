import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardMetrics {
  moderationStats: {
    totalCases: number;
    pendingCases: number;
    blockedContent: number;
    quarantinedContent: number;
    allowedContent: number;
    averageProcessingTime: number;
  };
  vendorHealth: {
    totalVendors: number;
    healthyVendors: number;
    degradedVendors: number;
    unhealthyVendors: number;
  };
  communityReports: {
    totalReports: number;
    openReports: number;
    resolvedReports: number;
    falsePositiveRate: number;
  };
  appeals: {
    totalAppeals: number;
    pendingAppeals: number;
    overturnRate: number;
    averageResolutionTime: number;
  };
  performance: {
    averageLatency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  costs: {
    totalCost: number;
    costPerRequest: number;
    vendorCostBreakdown: Record<string, number>;
  };
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
  alerts: Array<{
    id: number;
    alertName: string;
    status: 'ok' | 'warning' | 'critical';
    currentValue: number;
    thresholdValue: number;
    lastTriggered?: Date;
  }>;
}

export const SystemStatusDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, statusRes, historicalRes] = await Promise.all([
        fetch(`/api/admin/dashboard/metrics?timeRange=${timeRange}`),
        fetch('/api/admin/dashboard/status'),
        fetch(`/api/admin/dashboard/historical?metricNames=latency,throughput,error_rate&granularity=hour&timeRange=${timeRange}`)
      ]);

      const [metricsData, statusData, historicalData] = await Promise.all([
        metricsRes.json(),
        statusRes.json(),
        historicalRes.json()
      ]);

      if (metricsData.success) setMetrics(metricsData.data);
      if (statusData.success) setSystemStatus(statusData.data);
      if (historicalData.success) setHistoricalData(historicalData.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  if (isLoading || !metrics || !systemStatus) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Chart configurations
  const moderationTrendData = {
    labels: historicalData?.latency?.map((point: any) => 
      new Date(point.timestamp).toLocaleTimeString()
    ) || [],
    datasets: [
      {
        label: 'Latency (ms)',
        data: historicalData?.latency?.map((point: any) => point.value) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Throughput (req/min)',
        data: historicalData?.throughput?.map((point: any) => point.value) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
        yAxisID: 'y1',
      }
    ],
  };

  const moderationStatsData = {
    labels: ['Allowed', 'Quarantined', 'Blocked', 'Pending'],
    datasets: [
      {
        data: [
          metrics.moderationStats.allowedContent,
          metrics.moderationStats.quarantinedContent,
          metrics.moderationStats.blockedContent,
          metrics.moderationStats.pendingCases
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderWidth: 0,
      },
    ],
  };

  const vendorCostData = {
    labels: Object.keys(metrics.costs.vendorCostBreakdown),
    datasets: [
      {
        label: 'Cost ($)',
        data: Object.values(metrics.costs.vendorCostBreakdown),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">System Status Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className="flex items-center text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Live
          </div>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus.status)}`}>
              {systemStatus.status.toUpperCase()}
            </div>
            <p className="text-sm text-gray-500 mt-1">Overall Status</p>
          </div>
          {Object.entries(systemStatus.components).map(([component, status]) => (
            <div key={component} className="text-center">
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                {status}
              </div>
              <p className="text-sm text-gray-500 mt-1 capitalize">{component}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Cases</dt>
                <dd className="text-lg font-medium text-gray-900">{formatNumber(metrics.moderationStats.totalCases)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Avg Processing: {metrics.moderationStats.averageProcessingTime.toFixed(1)}s
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Throughput</dt>
                <dd className="text-lg font-medium text-gray-900">{formatNumber(metrics.performance.throughput)}/min</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Latency: {metrics.performance.averageLatency.toFixed(0)}ms
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Cost</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(metrics.costs.totalCost)}</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Per Request: {formatCurrency(metrics.costs.costPerRequest)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Error Rate</dt>
                <dd className="text-lg font-medium text-gray-900">{(metrics.performance.errorRate * 100).toFixed(2)}%</dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-500">
              Uptime: {(metrics.performance.uptime * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
          <div className="h-64">
            <Line
              data={moderationTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                      drawOnChartArea: false,
                    },
                  },
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Moderation Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Moderation Distribution</h3>
          <div className="h-64">
            <Doughnut
              data={moderationStatsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Vendor Health and Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Vendors</span>
              <span className="font-medium">{metrics.vendorHealth.totalVendors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Healthy</span>
              <span className="font-medium text-green-600">{metrics.vendorHealth.healthyVendors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-yellow-600">Degraded</span>
              <span className="font-medium text-yellow-600">{metrics.vendorHealth.degradedVendors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600">Unhealthy</span>
              <span className="font-medium text-red-600">{metrics.vendorHealth.unhealthyVendors}</span>
            </div>
          </div>
        </div>

        {/* Vendor Costs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Costs</h3>
          <div className="h-48">
            <Bar
              data={vendorCostData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return formatCurrency(value as number);
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {systemStatus.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            {systemStatus.alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAlertColor(alert.status)} mr-3`}>
                    {alert.status}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{alert.alertName}</div>
                    <div className="text-sm text-gray-500">
                      Current: {alert.currentValue} | Threshold: {alert.thresholdValue}
                    </div>
                  </div>
                </div>
                {alert.lastTriggered && (
                  <div className="text-sm text-gray-500">
                    {new Date(alert.lastTriggered).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};