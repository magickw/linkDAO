import React, { useState, useEffect } from 'react';
import { sellerAnalyticsService, SellerPerformanceComparison as ComparisonType } from '../../../../services/sellerAnalyticsService';

// Simple loading spinner component to avoid import issues
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const getSize = () => {
    switch (size) {
      case 'sm': return '16px';
      case 'lg': return '48px';
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
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface SellerPerformanceComparisonProps {
  sellerId: string;
  className?: string;
}

export const SellerPerformanceComparison: React.FC<SellerPerformanceComparisonProps> = ({
  sellerId,
  className = ''
}) => {
  const [comparison, setComparison] = useState<ComparisonType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [sellerId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sellerAnalyticsService.getSellerPerformanceComparison(sellerId);
      setComparison(data);
    } catch (err) {
      console.error('Error loading seller performance comparison:', err);
      setError('Failed to load performance comparison');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    const sign = numValue >= 0 ? '+' : '';
    return `${sign}${numValue.toFixed(1)}%`;
  };

  const getPerformanceColor = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (numValue >= 10) return 'text-green-600';
    if (numValue >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceIcon = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (numValue >= 10) return '📈';
    if (numValue >= 0) return '📊';
    return '📉';
  };

  const getRankingColor = (percentile: number) => {
    if (percentile >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (percentile >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentile >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className={`seller-performance-comparison ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3">Loading performance comparison...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`seller-performance-comparison ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadComparison}
            className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className={`seller-performance-comparison ${className}`}>
        <div className="text-center py-12">
          <p className="text-gray-500">No comparison data available.</p>
        </div>
      </div>
    );
  }

  // Prepare radar chart data
  const radarData = [
    {
      metric: 'Conversion Rate',
      seller: comparison.sellerMetrics.conversionRate,
      industry: comparison.benchmarks.industryAverage?.conversionRate || 0,
      topPerformers: comparison.benchmarks.topPerformers?.conversionRate || 0,
      fullMark: Math.max(
        comparison.sellerMetrics.conversionRate,
        comparison.benchmarks.industryAverage?.conversionRate || 0,
        comparison.benchmarks.topPerformers?.conversionRate || 0
      ) * 1.2
    },
    {
      metric: 'Avg Order Value',
      seller: comparison.sellerMetrics.averageOrderValue,
      industry: comparison.benchmarks.industryAverage?.averageOrderValue || 0,
      topPerformers: comparison.benchmarks.topPerformers?.averageOrderValue || 0,
      fullMark: Math.max(
        comparison.sellerMetrics.averageOrderValue,
        comparison.benchmarks.industryAverage?.averageOrderValue || 0,
        comparison.benchmarks.topPerformers?.averageOrderValue || 0
      ) * 1.2
    },
    {
      metric: 'Satisfaction',
      seller: comparison.sellerMetrics.customerSatisfaction,
      industry: comparison.benchmarks.industryAverage?.customerSatisfaction || 0,
      topPerformers: comparison.benchmarks.topPerformers?.customerSatisfaction || 0,
      fullMark: 5
    },
    {
      metric: 'Response Time',
      seller: Math.max(0, 3600 - comparison.sellerMetrics.responseTime), // Invert for better visualization
      industry: Math.max(0, 3600 - (comparison.benchmarks.industryAverage?.responseTime || 0)),
      topPerformers: Math.max(0, 3600 - (comparison.benchmarks.topPerformers?.responseTime || 0)),
      fullMark: 3600
    }
  ];

  // Prepare bar chart data for performance vs industry
  const performanceData = [
    {
      metric: 'Conversion Rate',
      performance: parseFloat(comparison.performance.conversionRateVsIndustry),
      color: getPerformanceColor(comparison.performance.conversionRateVsIndustry).includes('green') ? '#10B981' : 
             getPerformanceColor(comparison.performance.conversionRateVsIndustry).includes('yellow') ? '#F59E0B' : '#EF4444'
    },
    {
      metric: 'Order Value',
      performance: parseFloat(comparison.performance.aovVsIndustry),
      color: getPerformanceColor(comparison.performance.aovVsIndustry).includes('green') ? '#10B981' : 
             getPerformanceColor(comparison.performance.aovVsIndustry).includes('yellow') ? '#F59E0B' : '#EF4444'
    },
    {
      metric: 'Satisfaction',
      performance: parseFloat(comparison.performance.satisfactionVsIndustry),
      color: getPerformanceColor(comparison.performance.satisfactionVsIndustry).includes('green') ? '#10B981' : 
             getPerformanceColor(comparison.performance.satisfactionVsIndustry).includes('yellow') ? '#F59E0B' : '#EF4444'
    },
    {
      metric: 'Response Time',
      performance: parseFloat(comparison.performance.responseTimeVsIndustry),
      color: getPerformanceColor(comparison.performance.responseTimeVsIndustry).includes('green') ? '#10B981' : 
             getPerformanceColor(comparison.performance.responseTimeVsIndustry).includes('yellow') ? '#F59E0B' : '#EF4444'
    }
  ];

  return (
    <div className={`seller-performance-comparison ${className}`}>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Performance Benchmarks</h2>
          <p className="text-sm text-gray-600 mt-1">
            Compare your performance against industry averages and top performers
          </p>
        </div>

        <div className="p-6">
          {/* Ranking Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`rounded-lg border p-6 ${getRankingColor(comparison.ranking.percentile)}`}>
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">#{comparison.ranking.overall}</div>
                <div className="text-sm font-medium">Overall Ranking</div>
                <div className="text-xs mt-1">
                  Top {(100 - comparison.ranking.percentile).toFixed(0)}% of sellers
                </div>
              </div>
            </div>

            <div className={`rounded-lg border p-6 ${getRankingColor(comparison.ranking.percentile)}`}>
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">#{comparison.ranking.category}</div>
                <div className="text-sm font-medium">Category Ranking</div>
                <div className="text-xs mt-1">In your category</div>
              </div>
            </div>

            <div className={`rounded-lg border p-6 ${getRankingColor(comparison.ranking.percentile)}`}>
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">{comparison.ranking.percentile}th</div>
                <div className="text-sm font-medium">Percentile</div>
                <div className="text-xs mt-1">Performance level</div>
              </div>
            </div>
          </div>

          {/* Performance vs Industry */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Radar Chart */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 'dataMax']} />
                  <Radar
                    name="Your Performance"
                    dataKey="seller"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Industry Average"
                    dataKey="industry"
                    stroke="#6B7280"
                    fill="#6B7280"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                  />
                  <Radar
                    name="Top Performers"
                    dataKey="topPerformers"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-6 mt-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span>Your Performance</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                  <span>Industry Average</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span>Top Performers</span>
                </div>
              </div>
            </div>

            {/* Performance Difference Bar Chart */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">vs Industry Average</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={['dataMin', 'dataMax']} />
                  <YAxis dataKey="metric" type="category" width={100} />
                  <Tooltip 
                    formatter={(value: number) => [`${formatPercentage(value)}`, 'vs Industry']}
                  />
                  <Bar 
                    dataKey="performance" 
                    fill="#3B82F6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metrics Comparison */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Conversion Rate */}
              <div className="bg-white rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Conversion Rate</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {comparison.sellerMetrics.conversionRate.toFixed(2)}%
                  </div>
                  <div className={`text-sm font-medium ${getPerformanceColor(comparison.performance.conversionRateVsIndustry)}`}>
                    {getPerformanceIcon(comparison.performance.conversionRateVsIndustry)} {formatPercentage(comparison.performance.conversionRateVsIndustry)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Industry: {comparison.benchmarks.industryAverage?.conversionRate?.toFixed(2) || 'N/A'}%
                  </div>
                </div>
              </div>

              {/* Average Order Value */}
              <div className="bg-white rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Avg Order Value</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    ${comparison.sellerMetrics.averageOrderValue.toFixed(0)}
                  </div>
                  <div className={`text-sm font-medium ${getPerformanceColor(comparison.performance.aovVsIndustry)}`}>
                    {getPerformanceIcon(comparison.performance.aovVsIndustry)} {formatPercentage(comparison.performance.aovVsIndustry)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Industry: ${comparison.benchmarks.industryAverage?.averageOrderValue?.toFixed(0) || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Customer Satisfaction */}
              <div className="bg-white rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Satisfaction</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {comparison.sellerMetrics.customerSatisfaction.toFixed(1)}/5
                  </div>
                  <div className={`text-sm font-medium ${getPerformanceColor(comparison.performance.satisfactionVsIndustry)}`}>
                    {getPerformanceIcon(comparison.performance.satisfactionVsIndustry)} {formatPercentage(comparison.performance.satisfactionVsIndustry)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Industry: {comparison.benchmarks.industryAverage?.customerSatisfaction?.toFixed(1) || 'N/A'}/5
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-white rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Response Time</div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {Math.floor(comparison.sellerMetrics.responseTime / 60)}m
                  </div>
                  <div className={`text-sm font-medium ${getPerformanceColor(comparison.performance.responseTimeVsIndustry)}`}>
                    {getPerformanceIcon(comparison.performance.responseTimeVsIndustry)} {formatPercentage(comparison.performance.responseTimeVsIndustry)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Industry: {Math.floor((comparison.benchmarks.industryAverage?.responseTime || 0) / 60)}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improvement Recommendations */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Improvement Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performanceData
                .filter(item => item.performance < 0)
                .map((item, index) => (
                  <div key={index} className="bg-white rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{item.metric}</span>
                      <span className="text-red-600 font-medium">
                        {formatPercentage(item.performance)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Focus on improving this metric to reach industry standards.
                    </p>
                  </div>
                ))}
              {performanceData.every(item => item.performance >= 0) && (
                <div className="col-span-2 text-center py-4">
                  <div className="text-green-600 text-lg font-medium mb-2">
                    🎉 Great job! You're performing above industry average in all key metrics.
                  </div>
                  <p className="text-gray-600">
                    Continue maintaining your excellent performance and consider targeting top performer benchmarks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};