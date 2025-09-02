import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { AnalyticsDashboard } from '../components/Analytics/AnalyticsDashboard';
import { GlassPanel } from '../design-system/components/GlassPanel';

const AnalyticsPage: NextPage = () => {
  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });

  const [selectedSeller, setSelectedSeller] = useState<string>('');

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({
      startDate: new Date(start),
      endDate: new Date(end)
    });
  };

  return (
    <>
      <Head>
        <title>Analytics Dashboard - Web3 Marketplace</title>
        <meta name="description" content="Comprehensive analytics and business intelligence for the Web3 marketplace platform" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-300 text-lg">
                  Comprehensive insights and performance metrics for your Web3 marketplace
                </p>
              </div>

              {/* Date Range and Filters */}
              <GlassPanel className="p-4 w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <label className="text-sm text-gray-300 whitespace-nowrap">
                      Date Range:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateRange.startDate.toISOString().split('T')[0]}
                        onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate.toISOString().split('T')[0])}
                        className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-gray-400 self-center">to</span>
                      <input
                        type="date"
                        value={dateRange.endDate.toISOString().split('T')[0]}
                        onChange={(e) => handleDateRangeChange(dateRange.startDate.toISOString().split('T')[0], e.target.value)}
                        className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <label className="text-sm text-gray-300 whitespace-nowrap">
                      Seller Filter:
                    </label>
                    <select
                      value={selectedSeller}
                      onChange={(e) => setSelectedSeller(e.target.value)}
                      className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none min-w-[150px]"
                    >
                      <option value="">All Sellers</option>
                      <option value="seller-1">Top Seller 1</option>
                      <option value="seller-2">Top Seller 2</option>
                      <option value="seller-3">Top Seller 3</option>
                    </select>
                  </div>

                  {/* Quick Date Presets */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDateRangeChange(
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        new Date().toISOString().split('T')[0]
                      )}
                      className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                    >
                      7D
                    </button>
                    <button
                      onClick={() => handleDateRangeChange(
                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        new Date().toISOString().split('T')[0]
                      )}
                      className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                    >
                      30D
                    </button>
                    <button
                      onClick={() => handleDateRangeChange(
                        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        new Date().toISOString().split('T')[0]
                      )}
                      className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors"
                    >
                      90D
                    </button>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <AnalyticsDashboard
            sellerId={selectedSeller || undefined}
            dateRange={dateRange}
          />

          {/* Additional Information */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                📊 Analytics Features
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Real-time metrics and monitoring
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Comprehensive user behavior tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Sales performance analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Market trend analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Anomaly detection and alerts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Custom report generation
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                🎯 Key Metrics
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex justify-between">
                  <span>GMV Tracking</span>
                  <span className="text-blue-400">Real-time</span>
                </li>
                <li className="flex justify-between">
                  <span>User Acquisition</span>
                  <span className="text-green-400">Daily/Weekly/Monthly</span>
                </li>
                <li className="flex justify-between">
                  <span>Transaction Success Rate</span>
                  <span className="text-purple-400">Live Monitoring</span>
                </li>
                <li className="flex justify-between">
                  <span>Conversion Rates</span>
                  <span className="text-yellow-400">Funnel Analysis</span>
                </li>
                <li className="flex justify-between">
                  <span>Geographic Distribution</span>
                  <span className="text-pink-400">Global Insights</span>
                </li>
              </ul>
            </GlassPanel>

            <GlassPanel className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                🔍 Advanced Analytics
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">🤖</span>
                  AI-powered anomaly detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">📈</span>
                  Predictive market trends
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-400">🎨</span>
                  Custom dashboard creation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">📊</span>
                  Interactive data visualization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-400">📤</span>
                  Data export capabilities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">🔔</span>
                  Smart alert system
                </li>
              </ul>
            </GlassPanel>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <GlassPanel className="p-6">
              <p className="text-gray-300 text-sm">
                Analytics data is updated in real-time and cached for optimal performance. 
                Historical data is available for up to 2 years. For custom analytics requirements, 
                contact our support team.
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                  Export Data
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors">
                  Schedule Report
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors">
                  API Access
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;