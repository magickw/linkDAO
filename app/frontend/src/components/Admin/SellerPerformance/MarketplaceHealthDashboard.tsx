import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { MarketplaceHealthDashboard as MarketplaceHealthData } from '../../../types/sellerPerformance';
import { sellerPerformanceService } from '../../../services/sellerPerformanceService';

interface MarketplaceHealthDashboardProps {
  className?: string;
}

export const MarketplaceHealthDashboard: React.FC<MarketplaceHealthDashboardProps> = ({
  className = ''
}) => {
  const [healthData, setHealthData] = useState<MarketplaceHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sellers' | 'trends' | 'quality'>('overview');

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await sellerPerformanceService.getMarketplaceHealthDashboard();
      setHealthData(data);
    } catch (err) {
      console.error('Error loading marketplace health data:', err);
      setError('Failed to load marketplace health data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusBadge = (status: string) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 border-green-300',
      good: 'bg-blue-100 text-blue-800 border-blue-300',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      poor: 'bg-red-100 text-red-800 border-red-300'
    };

    const icons = {
      excellent: '🟢',
      good: '🔵',
      fair: '🟡',
      poor: '🔴'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colors[status as keyof typeof colors] || colors.fair}`}>
        <span className="mr-1">{icons[status as keyof typeof icons] || '⚪'}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBackground = (score: number) => {
    if (score >= 85) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-blue-50 border-blue-200';
    if (score >= 55) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const prepareSellerDistributionData = () => {
    if (!healthData?.sellerMetrics.sellerDistribution.byTier) return [];

    return healthData.sellerMetrics.sellerDistribution.byTier.map(tier => ({
      name: tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1),
      value: tier.count,
      percentage: tier.percentage
    }));
  };

  const prepareCategoryPerformanceData = () => {
    if (!healthData?.marketTrends.categoryPerformance) return [];

    return healthData.marketTrends.categoryPerformance.map(category => ({
      category: category.category,
      volume: category.volume,
      growth: category.growth,
      sellers: category.sellerCount,
      avgPrice: category.averagePrice
    }));
  };

  const prepareSeasonalTrendsData = () => {
    if (!healthData?.marketTrends.seasonalTrends) return [];

    return healthData.marketTrends.seasonalTrends.map(trend => ({
      period: trend.period,
      volume: trend.volume,
      orders: trend.orders,
      avgValue: trend.averageValue,
      growth: trend.growthRate
    }));
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
            onClick={loadHealthData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center text-gray-500">
          No marketplace health data available
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
            <h3 className="text-lg font-semibold text-gray-900">Marketplace Health Dashboard</h3>
            <p className="text-sm text-gray-500 mt-1">
              Real-time marketplace performance and health metrics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${getTrendColor(healthData.overallHealth.trend)}`}>
              <span>{getTrendIcon(healthData.overallHealth.trend)}</span>
              <span className="text-sm font-medium capitalize">{healthData.overallHealth.trend}</span>
            </div>
            {getHealthStatusBadge(healthData.overallHealth.status)}
            <div className={`text-right p-3 rounded-lg border-2 ${getHealthScoreBackground(healthData.overallHealth.score)}`}>
              <div className={`text-2xl font-bold ${getHealthScoreColor(healthData.overallHealth.score)}`}>
                {healthData.overallHealth.score}
              </div>
              <div className="text-xs text-gray-600">Health Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'sellers', label: 'Sellers' },
            { key: 'trends', label: 'Market Trends' },
            { key: 'quality', label: 'Quality Metrics' }
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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Volume</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {sellerPerformanceService.formatCurrency(healthData.marketTrends.totalVolume)}
                    </p>
                  </div>
                  <div className="text-blue-500 text-2xl">💰</div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Active Sellers</p>
                    <p className="text-2xl font-bold text-green-600">
                      {healthData.sellerMetrics.activeSellers.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-green-500 text-2xl">👥</div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Avg Order Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {sellerPerformanceService.formatCurrency(healthData.marketTrends.averageOrderValue)}
                    </p>
                  </div>
                  <div className="text-purple-500 text-2xl">🛒</div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-900">Growth Rate</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {sellerPerformanceService.formatPercentage(healthData.marketTrends.orderGrowthRate)}
                    </p>
                  </div>
                  <div className="text-orange-500 text-2xl">📈</div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Priority Recommendations</h4>
              <div className="space-y-3">
                {healthData.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${
                    rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="text-sm font-medium text-gray-900">{rec.title}</h5>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                        <p className="text-xs text-gray-500">{rec.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sellers' && (
          <div className="space-y-6">
            {/* Seller Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Seller Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Sellers</span>
                    <span className="text-sm font-medium">{healthData.sellerMetrics.totalSellers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Sellers</span>
                    <span className="text-sm font-medium">{healthData.sellerMetrics.activeSellers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New This Month</span>
                    <span className="text-sm font-medium">{healthData.sellerMetrics.newSellers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Top Performers</span>
                    <span className="text-sm font-medium">{healthData.sellerMetrics.topPerformers.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Score</span>
                    <span className="text-sm font-medium">{sellerPerformanceService.formatScore(healthData.sellerMetrics.averageSellerScore)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Concentration</span>
                    <span className="text-sm font-medium">{healthData.sellerMetrics.sellerDistribution.concentration.concentrationLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Top 10% Share</span>
                    <span className="text-sm font-medium">{sellerPerformanceService.formatPercentage(healthData.sellerMetrics.sellerDistribution.concentration.top10Percentage)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Distribution by Tier</h4>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={prepareSellerDistributionData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {prepareSellerDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Seller Distribution Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Seller Tier Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {healthData.sellerMetrics.sellerDistribution.byTier.map((tier, index) => (
                  <div key={tier.tier} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 capitalize">{tier.tier}</p>
                        <p className="text-lg font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                          {tier.count}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{sellerPerformanceService.formatPercentage(tier.percentage)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Category Performance */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Category Performance</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareCategoryPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [
                      name === 'volume' ? sellerPerformanceService.formatCurrency(value as number) : value,
                      name === 'volume' ? 'Volume' : name === 'growth' ? 'Growth %' : 'Sellers'
                    ]} />
                    <Legend />
                    <Bar dataKey="volume" fill="#3B82F6" name="Volume" />
                    <Bar dataKey="growth" fill="#10B981" name="Growth %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seasonal Trends */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Seasonal Trends (Last 12 Months)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={prepareSeasonalTrendsData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [
                      name === 'volume' || name === 'avgValue' ? sellerPerformanceService.formatCurrency(value as number) : value,
                      name === 'volume' ? 'Volume' : name === 'orders' ? 'Orders' : 'Avg Value'
                    ]} />
                    <Legend />
                    <Area type="monotone" dataKey="volume" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="orders" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-6">
            {/* Quality Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-900">Average Rating</p>
                    <p className="text-2xl font-bold text-green-600">
                      {sellerPerformanceService.formatScore(healthData.qualityMetrics.averageRating)}
                    </p>
                  </div>
                  <div className="text-green-500 text-2xl">⭐</div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Dispute Rate</p>
                    <p className="text-2xl font-bold text-red-600">
                      {sellerPerformanceService.formatPercentage(healthData.qualityMetrics.disputeRate)}
                    </p>
                  </div>
                  <div className="text-red-500 text-2xl">⚠️</div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Resolution Time</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {healthData.qualityMetrics.resolutionTime}h
                    </p>
                  </div>
                  <div className="text-blue-500 text-2xl">⏱️</div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-900">Customer Satisfaction</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {sellerPerformanceService.formatPercentage(healthData.qualityMetrics.customerSatisfaction)}
                    </p>
                  </div>
                  <div className="text-purple-500 text-2xl">😊</div>
                </div>
              </div>
            </div>

            {/* Quality Insights */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Quality Insights</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Positive Indicators</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {healthData.qualityMetrics.averageRating >= 4.0 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>High average rating ({sellerPerformanceService.formatScore(healthData.qualityMetrics.averageRating)}/5.0)</span>
                      </li>
                    )}
                    {healthData.qualityMetrics.disputeRate < 5 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>Low dispute rate ({sellerPerformanceService.formatPercentage(healthData.qualityMetrics.disputeRate)})</span>
                      </li>
                    )}
                    {healthData.qualityMetrics.customerSatisfaction >= 80 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>High customer satisfaction ({sellerPerformanceService.formatPercentage(healthData.qualityMetrics.customerSatisfaction)})</span>
                      </li>
                    )}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {healthData.qualityMetrics.resolutionTime > 48 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-yellow-500">!</span>
                        <span>Resolution time could be improved ({healthData.qualityMetrics.resolutionTime}h)</span>
                      </li>
                    )}
                    {healthData.qualityMetrics.disputeRate >= 5 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-red-500">⚠</span>
                        <span>Dispute rate needs attention ({sellerPerformanceService.formatPercentage(healthData.qualityMetrics.disputeRate)})</span>
                      </li>
                    )}
                    {healthData.qualityMetrics.averageRating < 4.0 && (
                      <li className="flex items-center space-x-2">
                        <span className="text-red-500">⚠</span>
                        <span>Average rating below target ({sellerPerformanceService.formatScore(healthData.qualityMetrics.averageRating)}/5.0)</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleString()} • Health Engine v3.0
          </div>
          <button
            onClick={loadHealthData}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};