import React, { useState, useEffect } from 'react';
import { sellerPerformanceMonitoringService } from '../../../services/sellerPerformanceMonitoringService';
import type { 
  PerformanceDashboardData,
  PerformanceAlert,
  PerformanceRegression,
  PerformanceTestResult
} from '../../../services/sellerPerformanceMonitoringService';
import ErrorBoundary from '../../ErrorBoundary';

// Simple loading spinner component
const LoadingSpinner = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const getSize = () => {
    switch (size) {
      case 'small': return '16px';
      case 'large': return '48px';
      default: return '32px';
    }
  };

  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      
      <style jsx>{`
        .loading-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: ${getSize()};
          height: ${getSize()};
          border: 2px solid transparent;
          border-top: 2px solid var(--primary-color, #0070f3);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

// Performance Score Component
const PerformanceScore: React.FC<{ score: number }> = ({ score }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Overall Performance Score</h3>
          <p className="text-sm text-gray-500">Based on all performance metrics</p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div className="text-sm text-gray-500">
            {getScoreLabel(score)}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              score >= 90 ? 'bg-green-500' :
              score >= 70 ? 'bg-yellow-500' :
              score >= 50 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Performance Metrics Component
const PerformanceMetrics: React.FC<{ metrics: any }> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'API Response Time',
      value: `${Math.round(metrics.apiResponseTimes.getProfile)}ms`,
      description: 'Average profile API response',
      status: metrics.apiResponseTimes.getProfile < 1000 ? 'good' : 
              metrics.apiResponseTimes.getProfile < 2000 ? 'warning' : 'critical'
    },
    {
      title: 'Cache Hit Rate',
      value: `${Math.round(metrics.cacheMetrics.hitRate)}%`,
      description: 'Cache effectiveness',
      status: metrics.cacheMetrics.hitRate > 90 ? 'good' : 
              metrics.cacheMetrics.hitRate > 70 ? 'warning' : 'critical'
    },
    {
      title: 'Error Rate',
      value: `${metrics.errorMetrics.errorRate.toFixed(2)}%`,
      description: 'System error percentage',
      status: metrics.errorMetrics.errorRate < 1 ? 'good' : 
              metrics.errorMetrics.errorRate < 5 ? 'warning' : 'critical'
    },
    {
      title: 'First Contentful Paint',
      value: `${Math.round(metrics.userExperienceMetrics.firstContentfulPaint)}ms`,
      description: 'Time to first content',
      status: metrics.userExperienceMetrics.firstContentfulPaint < 1500 ? 'good' : 
              metrics.userExperienceMetrics.firstContentfulPaint < 2500 ? 'warning' : 'critical'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => (
        <div key={index} className={`border rounded-lg p-4 ${getStatusColor(metric.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{metric.title}</p>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs opacity-75">{metric.description}</p>
            </div>
            <div className="text-2xl">
              {metric.status === 'good' ? '✅' : 
               metric.status === 'warning' ? '⚠️' : '❌'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Performance Alerts Component
const PerformanceAlerts: React.FC<{ alerts: PerformanceAlert[] }> = ({ alerts }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📊';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Alerts</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-500">No active performance alerts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Alerts</h3>
      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="text-xl">{getSeverityIcon(alert.severity)}</div>
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm opacity-75 mt-1">{alert.description}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                {alert.severity.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
        {alerts.length > 5 && (
          <div className="text-center pt-2">
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              View all {alerts.length} alerts
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Performance Trends Component
const PerformanceTrends: React.FC<{ trends: any[] }> = ({ trends }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h3>
      <div className="space-y-4">
        {trends.slice(0, 3).map((trend, index) => (
          <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{trend.metric}</h4>
              <span className="text-sm text-gray-500">
                {trend.data.length} data points
              </span>
            </div>
            <div className="h-16 bg-gray-50 rounded flex items-end space-x-1 p-2">
              {trend.data.slice(-20).map((point: any, i: number) => (
                <div
                  key={i}
                  className="bg-blue-500 rounded-sm flex-1 min-w-0"
                  style={{ 
                    height: `${Math.max(4, (point.value / Math.max(...trend.data.map((p: any) => p.value))) * 100)}%` 
                  }}
                  title={`${point.value} at ${new Date(point.timestamp).toLocaleString()}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Performance Recommendations Component
const PerformanceRecommendations: React.FC<{ recommendations: any[] }> = ({ recommendations }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📋';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Recommendations</h3>
      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-gray-500">No recommendations at this time</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
              <div className="flex items-start space-x-3">
                <div className="text-xl">{getPriorityIcon(rec.priority)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-white bg-opacity-50 rounded">
                        {rec.effort} effort
                      </span>
                      <span className={`px-2 py-1 rounded font-medium ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm opacity-75 mb-2">{rec.description}</p>
                  <p className="text-xs opacity-60">
                    Expected impact: {rec.expectedImpact}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
interface SellerPerformanceDashboardProps {
  sellerId: string;
  className?: string;
}

export const SellerPerformanceDashboard: React.FC<SellerPerformanceDashboardProps> = ({
  sellerId,
  className = ''
}) => {
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<PerformanceTestResult | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [sellerId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await sellerPerformanceMonitoringService.getPerformanceDashboard(sellerId);
      setDashboardData(data);
    } catch (err) {
      console.error('Error loading performance dashboard:', err);
      setError('Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleRunRegressionTest = async () => {
    try {
      setRunningTest(true);
      const result = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        sellerId,
        'load'
      );
      setTestResult(result);
    } catch (err) {
      console.error('Error running regression test:', err);
    } finally {
      setRunningTest(false);
    }
  };

  if (loading) {
    return (
      <div className={`seller-performance-dashboard ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-lg">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`seller-performance-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Performance Data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`seller-performance-dashboard ${className}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">No performance data available.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`seller-performance-dashboard ${className} space-y-6`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Monitoring</h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time performance insights for seller {sellerId}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {refreshing ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span className="ml-2">Refresh</span>
              </button>
              <button
                onClick={handleRunRegressionTest}
                disabled={runningTest}
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {runningTest ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
                <span className="ml-2">Run Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <PerformanceScore score={dashboardData.overallScore} />

        {/* Performance Metrics */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Key Performance Metrics</h2>
          <PerformanceMetrics metrics={dashboardData.metrics} />
        </div>

        {/* Alerts and Trends Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceAlerts alerts={dashboardData.alerts} />
          <PerformanceTrends trends={dashboardData.trends} />
        </div>

        {/* Recommendations */}
        <PerformanceRecommendations recommendations={dashboardData.recommendations} />

        {/* Test Results Modal */}
        {testResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Performance Test Results</h3>
                <button
                  onClick={() => setTestResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Average Response Time</p>
                    <p className="text-lg font-medium">{Math.round(testResult.results.averageResponseTime)}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="text-lg font-medium">{testResult.results.successRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Throughput</p>
                    <p className="text-lg font-medium">{testResult.results.throughput} req/s</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Error Rate</p>
                    <p className="text-lg font-medium">{testResult.results.errorRate.toFixed(2)}%</p>
                  </div>
                </div>
                {testResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {testResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SellerPerformanceDashboard;