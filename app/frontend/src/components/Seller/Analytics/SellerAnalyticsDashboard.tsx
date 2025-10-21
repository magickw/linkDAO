import React, { useState, useEffect } from 'react';
import { sellerAnalyticsService } from '../../../services/sellerAnalyticsService';
import type { SellerAnalyticsDashboard as SellerAnalyticsDashboardType } from '../../../services/sellerAnalyticsService';
import { SellerPerformanceMetrics } from './SellerPerformanceMetrics';
import { SellerTierProgression } from './SellerTierProgression';
import { SellerInsights } from './SellerInsights';
import { SellerBottlenecks } from './SellerBottlenecks';
import { SellerPerformanceComparison } from './SellerPerformanceComparison';
import ErrorBoundary from '../../ErrorBoundary';

// Simple loading spinner component to avoid import issues
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

interface SellerAnalyticsDashboardProps {
  sellerId: string;
  className?: string;
}

export const SellerAnalyticsDashboard: React.FC<SellerAnalyticsDashboardProps> = ({
  sellerId,
  className = ''
}) => {
  const [dashboardData, setDashboardData] = useState<SellerAnalyticsDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'comparison' | 'bottlenecks'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [sellerId, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await sellerAnalyticsService.getSellerAnalyticsDashboard(
        sellerId,
        dateRange.startDate,
        dateRange.endDate
      );

      setDashboardData(data);
    } catch (err) {
      console.error('Error loading seller analytics dashboard:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleDateRangeChange = (startDate?: Date, endDate?: Date) => {
    setDateRange({ startDate, endDate });
  };

  const handleExportData = async (format: 'json' | 'csv' = 'json') => {
    try {
      const exportData = await sellerAnalyticsService.exportSellerAnalytics(
        sellerId,
        dateRange.startDate,
        dateRange.endDate,
        format
      );

      // Create download link
      const blob = new Blob([
        format === 'json' ? JSON.stringify(exportData, null, 2) : exportData
      ], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seller-analytics-${sellerId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting analytics data:', err);
    }
  };

  if (loading) {
    return (
      <div className={`seller-analytics-dashboard ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-lg">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`seller-analytics-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Analytics</h3>
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
      <div className={`seller-analytics-dashboard ${className}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">No analytics data available.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`seller-analytics-dashboard ${className}`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seller Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Performance insights and recommendations for seller {sellerId}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.startDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange(e.target.valueAsDate || undefined, dateRange.endDate)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.endDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.valueAsDate || undefined)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
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
              <div className="relative">
                <button
                  onClick={() => handleExportData('json')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="ml-2">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-semibold">Overall Performance Score</h2>
              <p className="text-blue-100">Based on key performance indicators</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{dashboardData.performanceScore}/100</div>
              <div className="text-sm text-blue-100">
                {dashboardData.performanceScore >= 80 ? 'Excellent' :
                 dashboardData.performanceScore >= 60 ? 'Good' :
                 dashboardData.performanceScore >= 40 ? 'Fair' : 'Needs Improvement'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <nav className="px-6">
            <div className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: '📊' },
                { key: 'insights', label: 'Insights', icon: '💡' },
                { key: 'comparison', label: 'Benchmarks', icon: '📈' },
                { key: 'bottlenecks', label: 'Bottlenecks', icon: '🔍' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <SellerPerformanceMetrics
                metrics={dashboardData.metrics}
                dateRange={dateRange}
              />
              <SellerTierProgression
                tierProgression={dashboardData.tierProgression}
              />
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="p-6">
              <SellerInsights
                sellerId={sellerId}
                insights={dashboardData.insights}
              />
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="p-6">
              <SellerPerformanceComparison
                sellerId={sellerId}
              />
            </div>
          )}

          {activeTab === 'bottlenecks' && (
            <div className="p-6">
              <SellerBottlenecks
                sellerId={sellerId}
                bottlenecks={dashboardData.bottlenecks}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
            </div>
            <div className="flex items-center space-x-4">
              <span>Data range: {dateRange.startDate?.toLocaleDateString()} - {dateRange.endDate?.toLocaleDateString()}</span>
              <button
                onClick={() => handleExportData('csv')}
                className="text-blue-600 hover:text-blue-800"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};