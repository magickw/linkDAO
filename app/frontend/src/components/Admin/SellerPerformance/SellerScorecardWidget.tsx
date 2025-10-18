import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { SellerScorecard, PerformanceTrend } from '../../../types/sellerPerformance';
import { sellerPerformanceService } from '../../../services/sellerPerformanceService';

interface SellerScorecardWidgetProps {
  walletAddress: string;
  className?: string;
}

export const SellerScorecardWidget: React.FC<SellerScorecardWidgetProps> = ({
  walletAddress,
  className = ''
}) => {
  const [scorecard, setScorecard] = useState<SellerScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'recommendations'>('overview');

  useEffect(() => {
    loadScorecard();
  }, [walletAddress]);

  const loadScorecard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = await sellerPerformanceService.getSellerScorecard(walletAddress);
      
      // If no scorecard exists, calculate one
      if (!data) {
        data = await sellerPerformanceService.calculateSellerScorecard(walletAddress);
      }
      
      setScorecard(data);
    } catch (err) {
      console.error('Error loading seller scorecard:', err);
      setError('Failed to load seller scorecard');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceTierBadge = (tier: string) => {
    const colors = {
      platinum: 'bg-gray-100 text-gray-800 border-gray-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      silver: 'bg-gray-50 text-gray-700 border-gray-200',
      bronze: 'bg-orange-100 text-orange-800 border-orange-300'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[tier as keyof typeof colors] || colors.bronze}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 80) return 'bg-blue-50 border-blue-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const prepareRadarData = () => {
    if (!scorecard) return [];

    return [
      {
        dimension: 'Customer\nSatisfaction',
        score: scorecard.dimensions.customerSatisfaction,
        fullMark: 100
      },
      {
        dimension: 'Order\nFulfillment',
        score: scorecard.dimensions.orderFulfillment,
        fullMark: 100
      },
      {
        dimension: 'Response\nTime',
        score: scorecard.dimensions.responseTime,
        fullMark: 100
      },
      {
        dimension: 'Dispute\nRate',
        score: scorecard.dimensions.disputeRate,
        fullMark: 100
      },
      {
        dimension: 'Growth\nRate',
        score: scorecard.dimensions.growthRate,
        fullMark: 100
      }
    ];
  };

  const prepareTrendData = () => {
    if (!scorecard?.trends) return [];

    return scorecard.trends.map(trend => ({
      metric: trend.metric.replace('_', ' '),
      change: trend.changePercent,
      direction: trend.direction
    }));
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadScorecard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          No scorecard data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Seller Performance Scorecard</h3>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(scorecard.lastCalculatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getPerformanceTierBadge(scorecard.performanceTier)}
            <div className={`text-right p-3 rounded-lg border-2 ${getScoreBackground(scorecard.overallScore)}`}>
              <div className={`text-2xl font-bold ${getScoreColor(scorecard.overallScore)}`}>
                {sellerPerformanceService.formatScore(scorecard.overallScore)}
              </div>
              <div className="text-xs text-gray-600">Overall Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'trends', label: 'Trends' },
            { key: 'recommendations', label: 'Recommendations' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Radar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={prepareRadarData()}>
                  <PolarGrid />
                  <PolarAngleAxis 
                    dataKey="dimension" 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <Radar
                    name="Performance"
                    dataKey="score"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(scorecard.dimensions).map(([key, value]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className={`text-lg font-semibold ${getScoreColor(value)}`}>
                        {sellerPerformanceService.formatScore(value)}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getScoreBackground(value)}`}>
                      <span className={`text-sm font-medium ${getScoreColor(value)}`}>
                        {Math.round(value)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            {scorecard.trends.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scorecard.trends.map((trend, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {trend.metric.replace('_', ' ')}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span 
                              className="text-lg"
                              style={{ color: sellerPerformanceService.getTrendColor(trend.direction) }}
                            >
                              {sellerPerformanceService.getTrendIcon(trend.direction)}
                            </span>
                            <span 
                              className={`text-sm font-medium`}
                              style={{ color: sellerPerformanceService.getTrendColor(trend.direction) }}
                            >
                              {trend.changePercent > 0 ? '+' : ''}{sellerPerformanceService.formatPercentage(trend.changePercent)}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {trend.period}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trend Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="change" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No trend data available yet. Trends will appear after multiple scorecard calculations.
              </div>
            )}
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {scorecard.recommendations.length > 0 ? (
              scorecard.recommendations.map((recommendation, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800">{recommendation}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-green-500 text-2xl mb-2">✅</div>
                <p>Great job! No specific recommendations at this time.</p>
                <p className="text-sm mt-1">Keep up the excellent performance!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Scorecard ID: {scorecard.id} • Model Version: 1.0
          </div>
          <button
            onClick={loadScorecard}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};