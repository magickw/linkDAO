import React, { useState, useEffect } from 'react';
import { EngagementAnalyticsService } from '../../services/engagementAnalyticsService';
import type { 
  EngagementAnalytics, 
  EngagementTrend, 
  PostEngagementMetrics,
  UserEngagementProfile 
} from '../../types/engagementAnalytics';

interface EngagementAnalyticsDashboardProps {
  userId?: string;
  timeRange?: string;
  className?: string;
}

export default function EngagementAnalyticsDashboard({
  userId,
  timeRange = 'week',
  className = ''
}: EngagementAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<EngagementAnalytics | null>(null);
  const [trends, setTrends] = useState<EngagementTrend[]>([]);
  const [topPosts, setTopPosts] = useState<PostEngagementMetrics[]>([]);
  const [userProfile, setUserProfile] = useState<UserEngagementProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'posts' | 'profile'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [userId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsData, trendsData, postsData, profileData] = await Promise.all([
        EngagementAnalyticsService.getEngagementAnalytics(userId, timeRange),
        EngagementAnalyticsService.getEngagementTrends(userId, timeRange),
        EngagementAnalyticsService.getTopPerformingPosts(userId, timeRange, 10),
        userId ? EngagementAnalyticsService.getUserEngagementProfile(userId) : null
      ]);

      setAnalytics(analyticsData);
      setTrends(trendsData);
      setTopPosts(postsData);
      setUserProfile(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return <LoadingState className={className} />;
  }

  if (error && !analytics) {
    return <ErrorState error={error} onRetry={loadAnalytics} className={className} />;
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Engagement Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your content performance and audience engagement
          </p>
        </div>
        
        {/* Time Range Selector */}
        <TimeRangeSelector 
          value={timeRange} 
          onChange={(range) => window.location.search = `?timeRange=${range}`}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'trends', label: 'Trends', icon: '📈' },
            { key: 'posts', label: 'Top Posts', icon: '🏆' },
            { key: 'profile', label: 'Profile', icon: '👤' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <OverviewTab analytics={analytics} />
        )}
        {activeTab === 'trends' && (
          <TrendsTab trends={trends} />
        )}
        {activeTab === 'posts' && (
          <PostsTab posts={topPosts} />
        )}
        {activeTab === 'profile' && userProfile && (
          <ProfileTab profile={userProfile} />
        )}
      </div>
    </div>
  );
}

// Time range selector component
interface TimeRangeSelectorProps {
  value: string;
  onChange: (range: string) => void;
}

function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges = [
    { key: 'day', label: 'Last 24h' },
    { key: 'week', label: 'Last Week' },
    { key: 'month', label: 'Last Month' },
    { key: 'quarter', label: 'Last Quarter' },
    { key: 'year', label: 'Last Year' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        focus:ring-2 focus:ring-primary-500 focus:border-primary-500
      "
    >
      {ranges.map((range) => (
        <option key={range.key} value={range.key}>
          {range.label}
        </option>
      ))}
    </select>
  );
}

// Overview tab component
interface OverviewTabProps {
  analytics: EngagementAnalytics;
}

function OverviewTab({ analytics }: OverviewTabProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Engagement"
          value={formatNumber(analytics.totalEngagement)}
          change={analytics.engagementChange}
          icon="❤️"
          color="red"
        />
        <MetricCard
          title="Reach"
          value={formatNumber(analytics.totalReach)}
          change={analytics.reachChange}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Engagement Rate"
          value={`${analytics.engagementRate.toFixed(1)}%`}
          change={analytics.engagementRateChange}
          icon="📊"
          color="green"
        />
        <MetricCard
          title="Tips Received"
          value={formatNumber(analytics.totalTipsReceived)}
          change={analytics.tipsChange}
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Social Proof Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Social Proof Impact
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.verifiedUserEngagement}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Verified User Interactions
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {analytics.communityLeaderEngagement}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Community Leader Interactions
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analytics.followerEngagement}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Follower Network Interactions
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Engagement Breakdown
        </h3>
        
        <div className="space-y-4">
          <EngagementBar
            label="Reactions"
            value={analytics.reactions}
            total={analytics.totalEngagement}
            color="bg-red-500"
            icon="❤️"
          />
          <EngagementBar
            label="Comments"
            value={analytics.comments}
            total={analytics.totalEngagement}
            color="bg-blue-500"
            icon="💬"
          />
          <EngagementBar
            label="Reposts"
            value={analytics.reposts}
            total={analytics.totalEngagement}
            color="bg-green-500"
            icon="🔄"
          />
          <EngagementBar
            label="Tips"
            value={analytics.tips}
            total={analytics.totalEngagement}
            color="bg-yellow-500"
            icon="💰"
          />
        </div>
      </div>
    </div>
  );
}

// Metric card component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
}

function MetricCard({ title, value, change, icon, color }: MetricCardProps) {
  const colorClasses = {
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div className={`text-sm font-medium ${getChangeColor(change)}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>
      
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {title}
        </div>
      </div>
    </div>
  );
}

// Engagement bar component
interface EngagementBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  icon: string;
}

function EngagementBar({ label, value, total, color, icon }: EngagementBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2 w-24">
        <span>{icon}</span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </span>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value.toLocaleString()}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Trends tab component
interface TrendsTabProps {
  trends: EngagementTrend[];
}

function TrendsTab({ trends }: TrendsTabProps) {
  if (trends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📈</div>
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Engagement Trends
      </h3>
      
      {/* Simple trend visualization */}
      <div className="space-y-4">
        {trends.map((trend, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(trend.date).toLocaleDateString()}
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-red-600 dark:text-red-400">
                ❤️ {trend.reactions}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                💬 {trend.comments}
              </span>
              <span className="text-green-600 dark:text-green-400">
                🔄 {trend.reposts}
              </span>
              <span className="text-yellow-600 dark:text-yellow-400">
                💰 {trend.tips}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Posts tab component
interface PostsTabProps {
  posts: PostEngagementMetrics[];
}

function PostsTab({ posts }: PostsTabProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🏆</div>
          <p>No post data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post, index) => (
        <div key={post.postId} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  #{index + 1}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <p className="text-gray-900 dark:text-white mb-3 line-clamp-2">
                {post.content}
              </p>
              
              <div className="flex items-center space-x-4 text-sm">
                <span className="text-red-600 dark:text-red-400">
                  ❤️ {post.reactions}
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  💬 {post.comments}
                </span>
                <span className="text-green-600 dark:text-green-400">
                  🔄 {post.reposts}
                </span>
                <span className="text-yellow-600 dark:text-yellow-400">
                  💰 {post.tips}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  👁️ {post.views}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {post.engagementScore}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Engagement Score
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Profile tab component
interface ProfileTabProps {
  profile: UserEngagementProfile;
}

function ProfileTab({ profile }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Engagement Profile
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.averageEngagementRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Average Engagement Rate
            </div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.bestPerformingTime}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Best Posting Time
            </div>
          </div>
        </div>
      </div>

      {/* Audience Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Audience Insights
        </h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Verified Users
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {profile.audienceBreakdown.verified}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${profile.audienceBreakdown.verified}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Community Leaders
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {profile.audienceBreakdown.leaders}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-purple-500"
                style={{ width: `${profile.audienceBreakdown.leaders}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Regular Users
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {profile.audienceBreakdown.regular}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${profile.audienceBreakdown.regular}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-xl h-32" />
        ))}
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-64" />
    </div>
  );
}

// Error state component
function ErrorState({ 
  error, 
  onRetry, 
  className = '' 
}: { 
  error: string; 
  onRetry: () => void; 
  className?: string; 
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p>{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  );
}