/**
 * Enhanced Analytics Dashboard
 * Comprehensive analytics with advanced metrics and insights
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MessageCircle, 
  DollarSign, Activity, Eye, Heart, Share2,
  Clock, Target, Zap, Globe, ArrowUp, ArrowDown,
  Calendar, Filter, Download, RefreshCw, AlertTriangle,
  TrendingDown, Info, CheckCircle
} from 'lucide-react';
import { advancedAnalyticsService } from '@/services/advancedAnalyticsService';
import { AnalyticsTimeRange, MarketplaceAnalytics, AnalyticsInsight, TimeSeriesPoint } from '@/types/analytics';

interface ChannelMetrics {
  id: string;
  name: string;
  memberCount: number;
  messageCount: number;
  engagementRate: number;
  growthRate: number;
  avgResponseTime: number; // minutes
  topContributors: Contributor[];
  activityTrend: ActivityData[];
  tokenFlow: TokenFlowData[];
}

interface Contributor {
  address: string;
  name: string;
  messageCount: number;
  reactionCount: number;
  repostsCount: number;
  tokenEarned: number;
  rank: number;
}

interface ActivityData {
  date: string;
  messages: number;
  reactions: number;
  reposts: number;
  newMembers: number;
  activeMembers: number;
}

interface TokenFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  transactions: number;
}

interface MemberInsight {
  address: string;
  name: string;
  activityLevel: 'high' | 'medium' | 'low';
  joinDate: Date;
  totalMessages: number;
  totalReactions: number;
  tokenBalance: number;
  engagementScore: number;
  lastActive: Date;
  interests: string[];
}

interface EngagementMetrics {
  totalMessages: number;
  totalReactions: number;
  totalReposts: number;
  activeMembers: number;
  engagementRate: number;
  avgSessionDuration: number;
  peakHours: number[];
  topContent: ContentMetric[];
}

interface ContentMetric {
  id: string;
  content: string;
  type: 'message' | 'nft' | 'transaction' | 'proposal';
  engagement: number;
  reach: number;
  reactions: number;
  reposts: number;
  timestamp: Date;
}

const EnhancedAnalyticsDashboard: React.FC<{
  className?: string;
  channelId?: string;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  onExportData?: (data: any) => void;
}> = ({ className = '', channelId, timeRange = '7d', onExportData }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<keyof typeof timeRangeMap>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'engagement' | 'members' | 'insights' | 'trends'>('overview');
  const [analyticsData, setAnalyticsData] = useState<MarketplaceAnalytics | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesPoint[]>([]);

  // Time range mapping
  const timeRangeMap = {
    '24h': { days: 1, period: '24h' as const },
    '7d': { days: 7, period: '7d' as const },
    '30d': { days: 30, period: '30d' as const },
    '90d': { days: 90, period: '90d' as const }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate date range based on selected time range
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRangeMap[selectedTimeRange].days;
      startDate.setDate(startDate.getDate() - days);
      
      const range: AnalyticsTimeRange = {
        start: startDate,
        end: endDate,
        period: timeRangeMap[selectedTimeRange].period
      };
      
      // Fetch analytics data from service
      const [analytics, insightsData, revenueData] = await Promise.all([
        advancedAnalyticsService.getMarketplaceAnalytics(range),
        advancedAnalyticsService.generateInsights(range),
        advancedAnalyticsService.getTimeSeriesData('revenue', range, 'day')
      ]);
      
      setAnalyticsData(analytics);
      setInsights(insightsData);
      setTimeSeriesData(revenueData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedTimeRange]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const exportData = async () => {
    if (!analyticsData) return;
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      const days = timeRangeMap[selectedTimeRange].days;
      startDate.setDate(startDate.getDate() - days);
      
      const range: AnalyticsTimeRange = {
        start: startDate,
        end: endDate,
        period: timeRangeMap[selectedTimeRange].period
      };
      
      const exportResult = await advancedAnalyticsService.exportAnalyticsData(
        range,
        'json'
      );
      
      if (onExportData) {
        onExportData(analyticsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics data');
    }
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUp size={16} className="text-green-500" />;
    if (value < 0) return <ArrowDown size={16} className="text-red-500" />;
    return <ArrowUp size={16} className="text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="text-red-400 mb-4 flex items-center">
          <AlertTriangle size={24} className="mr-2" />
          <h3 className="text-lg font-semibold">Error Loading Analytics</h3>
        </div>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 size={24} className="text-blue-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Enhanced Analytics</h2>
            <p className="text-sm text-gray-400">Advanced marketplace insights and metrics</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as keyof typeof timeRangeMap)}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          <button
            onClick={refreshData}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={exportData}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">Total Revenue</div>
              <DollarSign size={16} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">${formatNumber(analyticsData.overview.totalRevenue)}</div>
            <div className={`text-sm flex items-center ${getTrendColor(analyticsData.growth.revenueGrowth)}`}>
              {getTrendIcon(analyticsData.growth.revenueGrowth)}
              <span className="ml-1">{formatPercentage(analyticsData.growth.revenueGrowth)}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">Total Transactions</div>
              <Activity size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(analyticsData.overview.totalTransactions)}</div>
            <div className={`text-sm flex items-center ${getTrendColor(analyticsData.growth.transactionGrowth)}`}>
              {getTrendIcon(analyticsData.growth.transactionGrowth)}
              <span className="ml-1">{formatPercentage(analyticsData.growth.transactionGrowth)}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">Active Users</div>
              <Users size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(analyticsData.overview.activeUsers)}</div>
            <div className={`text-sm flex items-center ${getTrendColor(analyticsData.growth.userGrowth)}`}>
              {getTrendIcon(analyticsData.growth.userGrowth)}
              <span className="ml-1">{formatPercentage(analyticsData.growth.userGrowth)}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-400">Avg Order Value</div>
              <TrendingUp size={16} className="text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-white">${formatNumber(analyticsData.overview.averageOrderValue)}</div>
            <div className="text-sm text-gray-400">USD</div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'engagement', label: 'Engagement', icon: <Activity size={16} /> },
          { id: 'insights', label: 'AI Insights', icon: <Target size={16} /> },
          { id: 'trends', label: 'Trends', icon: <TrendingUp size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as any)}
            className={`flex items-center px-4 py-2 rounded text-sm transition-colors ${
              viewMode === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {viewMode === 'overview' && analyticsData && (
        <div className="space-y-6">
          {/* Geographic Distribution */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Globe size={18} className="mr-2" />
              Geographic Distribution
            </h3>
            
            <div className="space-y-3">
              {Object.entries(analyticsData.geographic).map(([region, data]) => (
                <div key={region} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="font-medium text-white">{region}</div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">${formatNumber(data.revenue)}</div>
                      <div className="text-xs text-gray-400">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatNumber(data.users)}</div>
                      <div className="text-xs text-gray-400">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatNumber(data.transactions)}</div>
                      <div className="text-xs text-gray-400">Txns</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target size={18} className="mr-2" />
              Category Performance
            </h3>
            
            <div className="space-y-3">
              {Object.entries(analyticsData.categories).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="font-medium text-white">{category}</div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">${formatNumber(data.revenue)}</div>
                      <div className="text-xs text-gray-400">Revenue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-white">{formatNumber(data.transactions)}</div>
                      <div className="text-xs text-gray-400">Txns</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${
                      data.growth >= 0 ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      {data.growth >= 0 ? '+' : ''}{formatPercentage(data.growth)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Insights Tab */}
      {viewMode === 'insights' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Target size={18} className="mr-2" />
              AI-Powered Insights
            </h3>
            
            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div 
                    key={insight.id} 
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.severity === 'positive' ? 'bg-green-900/20 border-green-500' :
                      insight.severity === 'negative' ? 'bg-red-900/20 border-red-500' :
                      insight.severity === 'warning' ? 'bg-yellow-900/20 border-yellow-500' :
                      'bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center">
                          <h4 className="text-white font-medium">{insight.title}</h4>
                          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                            insight.severity === 'positive' ? 'bg-green-800 text-green-200' :
                            insight.severity === 'negative' ? 'bg-red-800 text-red-200' :
                            insight.severity === 'warning' ? 'bg-yellow-800 text-yellow-200' :
                            'bg-blue-800 text-blue-200'
                          }`}>
                            {insight.type}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">{insight.description}</p>
                        
                        {insight.recommendations && insight.recommendations.length > 0 && (
                          <div className="mt-3">
                            <h5 className="text-sm font-medium text-gray-400">Recommendations:</h5>
                            <ul className="mt-1 space-y-1">
                              {insight.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-gray-300 flex items-start">
                                  <CheckCircle size={12} className="text-green-400 mt-0.5 mr-2 flex-shrink-0" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xs text-gray-400">
                          Confidence: {(insight.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">
                          {insight.createdAt.toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Info size={48} className="mx-auto mb-4" />
                  <p>No insights available for the selected time period</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {viewMode === 'engagement' && analyticsData && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Customer Satisfaction</h3>
              <div className="text-3xl font-bold text-white">{analyticsData.overview.customerSatisfaction}/5</div>
              <div className="text-sm text-gray-400">Overall rating</div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Dispute Rate</h3>
              <div className="text-3xl font-bold text-white">{formatPercentage(analyticsData.overview.disputeRate)}</div>
              <div className="text-sm text-gray-400">Disputes per transaction</div>
            </div>
          </div>

          {/* Revenue Trend Chart Placeholder */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
            <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
              {timeSeriesData.length > 0 ? (
                <div className="text-center">
                  <div className="text-gray-400">Revenue trend visualization</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {timeSeriesData.length} data points from {new Date(timeSeriesData[0].timestamp).toLocaleDateString()} 
                    to {new Date(timeSeriesData[timeSeriesData.length - 1].timestamp).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {viewMode === 'trends' && timeSeriesData && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h3>
            <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
              {timeSeriesData.length > 0 ? (
                <div className="text-center">
                  <div className="text-gray-400">Revenue trend visualization</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {timeSeriesData.length} data points showing revenue trend
                  </div>
                </div>
              ) : (
                <div className="text-gray-400">No data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAnalyticsDashboard;