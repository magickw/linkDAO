/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics for channel engagement, member activity, and token flow
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MessageCircle, 
  DollarSign, Activity, Eye, Heart, Share2,
  Clock, Target, Zap, Globe, ArrowUp, ArrowDown,
  Calendar, Filter, Download, RefreshCw
} from 'lucide-react';
import { advancedAnalyticsService } from '@/services/advancedAnalyticsService';
import { AnalyticsTimeRange, MarketplaceAnalytics, AnalyticsInsight } from '@/types/analytics';

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

const AdvancedAnalyticsDashboard: React.FC<{
  className?: string;
  channelId?: string;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  onExportData?: (data: any) => void;
}> = ({ className = '', channelId, timeRange = '7d', onExportData }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<keyof typeof timeRangeMap>(timeRange as keyof typeof timeRangeMap);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'engagement' | 'members' | 'tokens'>('overview');
  const [analyticsData, setAnalyticsData] = useState<MarketplaceAnalytics | null>(null);

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
      const analytics = await advancedAnalyticsService.getMarketplaceAnalytics(range);
      setAnalyticsData(analytics);
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
          <span className="mr-2">⚠️</span>
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
            <h2 className="text-xl font-bold text-white">Advanced Analytics</h2>
            <p className="text-sm text-gray-400">Channel engagement and member insights</p>
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
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={exportData}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
          { id: 'engagement', label: 'Engagement', icon: <Activity size={16} /> },
          { id: 'members', label: 'Members', icon: <Users size={16} /> },
          { id: 'tokens', label: 'Token Flow', icon: <DollarSign size={16} /> }
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
          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Total Revenue</div>
                <DollarSign size={16} className="text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">${formatNumber(analyticsData.overview.totalRevenue)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                {formatPercentage(analyticsData.growth.revenueGrowth)}%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Total Transactions</div>
                <Activity size={16} className="text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(analyticsData.overview.totalTransactions)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                {formatPercentage(analyticsData.growth.transactionGrowth)}%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Active Users</div>
                <Users size={16} className="text-green-500" />
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(analyticsData.overview.activeUsers)}</div>
              <div className="text-sm text-green-400 flex items-center">
                <ArrowUp size={12} className="mr-1" />
                {formatPercentage(analyticsData.growth.userGrowth)}%
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">Avg Order Value</div>
                <TrendingUp size={16} className="text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-white">${formatNumber(analyticsData.overview.averageOrderValue)}</div>
              <div className="text-sm text-gray-400">USD</div>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h3>
            
            <div className="space-y-3">
              {Object.entries(analyticsData.geographic).map(([region, data]) => (
                <div key={region} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="font-medium text-white">{region}</div>
                  <div className="flex items-center space-x-6">
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
        </div>
      )}

      {/* Engagement Tab */}
      {viewMode === 'engagement' && analyticsData && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Customer Satisfaction</div>
              <div className="text-2xl font-bold text-white">{analyticsData.overview.customerSatisfaction}/5</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Dispute Rate</div>
              <div className="text-2xl font-bold text-white">{formatPercentage(analyticsData.overview.disputeRate)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Avg Order Value</div>
              <div className="text-2xl font-bold text-white">${formatNumber(analyticsData.overview.averageOrderValue)}</div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Category Performance</h3>
            
            <div className="space-y-3">
              {Object.entries(analyticsData.categories).map(([category, data]) => (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="font-medium text-white">{category}</div>
                  <div className="flex items-center space-x-6">
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

      {/* Members Tab */}
      {viewMode === 'members' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Top Sellers</h3>
            
            <div className="space-y-3">
              {analyticsData?.[viewMode === 'members' ? 'topSellers' : 'averageMetrics'] ? (
                // Render actual seller data when available
                <div className="text-center py-8 text-gray-400">
                  <Users size={48} className="mx-auto mb-4" />
                  <p>Seller data visualization would go here</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Users size={48} className="mx-auto mb-4" />
                  <p>No seller data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Token Flow Tab */}
      {viewMode === 'tokens' && (
        <div className="space-y-6">
          {/* Token Flow Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-white">${analyticsData ? formatNumber(analyticsData.overview.totalRevenue) : '0.00'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
              <div className="text-2xl font-bold text-white">{analyticsData ? formatNumber(analyticsData.overview.totalTransactions) : '0'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Active Users</div>
              <div className="text-2xl font-bold text-white">{analyticsData ? formatNumber(analyticsData.overview.activeUsers) : '0'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Dispute Rate</div>
              <div className="text-2xl font-bold text-white">{analyticsData ? formatPercentage(analyticsData.overview.disputeRate) : '0.0%'}</div>
            </div>
          </div>

          {/* Token Flow Chart Placeholder */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Marketplace Health</h3>
            <div className="h-64 bg-gray-700 rounded flex items-center justify-center">
              <div className="text-gray-400">Marketplace metrics visualization would go here</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalyticsDashboard;