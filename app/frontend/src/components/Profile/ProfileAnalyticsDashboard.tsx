/**
 * Profile Analytics Dashboard
 * Comprehensive analytics for individual user profiles
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, MessageCircle, Eye, Heart,
  DollarSign, Activity, BarChart3, Calendar, Target,
  Zap, Clock, Globe, ArrowUp, ArrowDown, RefreshCw,
  Filter, Download, Share2, Award, Star, Flame, Trophy
} from 'lucide-react';

interface ProfileAnalyticsData {
  // Overview metrics
  totalViews: number;
  totalEngagement: number;
  engagementRate: number;
  avgEngagementRate: number;
  totalFollowers: number;
  followerGrowthRate: number;
  totalTipsReceived: number;
  totalEarnings: number;

  // Engagement breakdown
  reactions: number;
  comments: number;
  reposts: number;
  shares: number;
  tips: number;

  // Performance metrics
  bestPerformingTime: string;
  mostEngagedContentType: string;
  topPerformingPosts: TopPost[];

  // Time series data
  engagementTrends: TrendData[];
  followerGrowth: TrendData[];
  earningsTrend: TrendData[];

  // Audience insights
  audienceBreakdown: {
    verified: number;
    leaders: number;
    regular: number;
  };

  // Engagement patterns
  peakHours: number[];
  peakDays: string[];

  // Comparison
  vsPreviousPeriod: {
    engagementChange: number;
    reachChange: number;
    followersChange: number;
    earningsChange: number;
  };
}

interface TopPost {
  id: string;
  content: string;
  engagement: number;
  views: number;
  reactions: number;
  comments: number;
  reposts: number;
  createdAt: string;
}

interface TrendData {
  date: string;
  value: number;
  label?: string;
}

interface ProfileAnalyticsDashboardProps {
  userId: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  className?: string;
}

const ProfileAnalyticsDashboard: React.FC<ProfileAnalyticsDashboardProps> = ({
  userId,
  timeRange = '30d',
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<ProfileAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'followers' | 'earnings'>('engagement');

  useEffect(() => {
    loadAnalytics();
  }, [userId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Call backend API
      const response = await fetch(`/api/profile-analytics/${userId}?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to load analytics');

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      console.error('Error loading profile analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (change: number) => {
    return change >= 0 ? (
      <ArrowUp className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = (change: number) => {
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'engagement':
        return <Activity className="w-5 h-5" />;
      case 'followers':
        return <Users className="w-5 h-5" />;
      case 'earnings':
        return <DollarSign className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Profile Analytics
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track your performance and growth
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => window.location.href = window.location.pathname + `?timeRange=${e.target.value}`}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={loadAnalytics}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className={`text-sm font-medium ${getTrendColor(analytics.vsPreviousPeriod.reachChange)}`}>
                {analytics.vsPreviousPeriod.reachChange >= 0 ? '+' : ''}{analytics.vsPreviousPeriod.reachChange.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalViews.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Views</div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className={`text-sm font-medium ${getTrendColor(analytics.vsPreviousPeriod.engagementChange)}`}>
                {analytics.vsPreviousPeriod.engagementChange >= 0 ? '+' : ''}{analytics.vsPreviousPeriod.engagementChange.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalEngagement.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Engagement</div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className={`text-sm font-medium ${getTrendColor(analytics.vsPreviousPeriod.followersChange)}`}>
                {analytics.vsPreviousPeriod.followersChange >= 0 ? '+' : ''}{analytics.vsPreviousPeriod.followersChange.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalFollowers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className={`text-sm font-medium ${getTrendColor(analytics.vsPreviousPeriod.earningsChange)}`}>
                {analytics.vsPreviousPeriod.earningsChange >= 0 ? '+' : ''}{analytics.vsPreviousPeriod.earningsChange.toFixed(1)}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${analytics.totalEarnings.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="col-span-2 space-y-6">
            {/* Trend Chart */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {selectedMetric === 'engagement' && 'Engagement Trends'}
                    {selectedMetric === 'followers' && 'Follower Growth'}
                    {selectedMetric === 'earnings' && 'Earnings Trend'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Over the selected time period
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedMetric('engagement')}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedMetric === 'engagement'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMetric('followers')}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedMetric === 'followers'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedMetric('earnings')}
                    className={`p-2 rounded-lg transition-colors ${
                      selectedMetric === 'earnings'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Simple Chart Visualization */}
              <div className="h-64 flex items-end space-x-2">
                {(selectedMetric === 'engagement' ? analytics.engagementTrends :
                  selectedMetric === 'followers' ? analytics.followerGrowth :
                  analytics.earningsTrend
                ).map((point, index) => {
                  const maxValue = Math.max(...(selectedMetric === 'engagement' ? analytics.engagementTrends :
                    selectedMetric === 'followers' ? analytics.followerGrowth :
                    analytics.earningsTrend).map(p => p.value));
                  const height = maxValue > 0 ? (point.value / maxValue) * 100 : 0;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-primary-600 rounded-t transition-all duration-300"
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Performing Posts */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Performing Posts
              </h3>
              <div className="space-y-3">
                {analytics.topPerformingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-gray-900 dark:text-white line-clamp-2 flex-1">
                        {post.content}
                      </p>
                      <div className="flex items-center space-x-1 ml-4 text-sm text-gray-600 dark:text-gray-400">
                        <Eye className="w-4 h-4" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <Heart className="w-4 h-4" />
                        <span>{post.reactions}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                        <Share2 className="w-4 h-4" />
                        <span>{post.reposts}</span>
                      </div>
                      <div className="ml-auto flex items-center space-x-1 text-green-600">
                        <Zap className="w-4 h-4" />
                        <span>{post.engagement}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Insights */}
          <div className="space-y-6">
            {/* Engagement Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Engagement Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Reactions</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {analytics.reactions.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Comments</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {analytics.comments.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Share2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Reposts</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {analytics.reposts.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Tips</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {analytics.tips.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Audience Insights */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Audience Insights
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Verified Users</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {analytics.audienceBreakdown.verified}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${analytics.audienceBreakdown.verified}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Community Leaders</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {analytics.audienceBreakdown.leaders}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${analytics.audienceBreakdown.leaders}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Regular Users</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {analytics.audienceBreakdown.regular}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: `${analytics.audienceBreakdown.regular}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Insights
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Best Time to Post
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {analytics.bestPerformingTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Target className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Top Content Type
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {analytics.mostEngagedContentType}
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Trophy className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Avg Engagement Rate
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {analytics.avgEngagementRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAnalyticsDashboard;