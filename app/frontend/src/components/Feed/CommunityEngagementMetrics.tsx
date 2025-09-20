import React, { useState, useEffect } from 'react';
import type { CommunityEngagementMetrics, LeaderboardEntry } from '../../types/feed';
import { FeedService } from '../../services/feedService';

interface CommunityEngagementMetricsProps {
  communityId: string;
  timeRange?: string;
  className?: string;
}

export default function CommunityEngagementMetricsComponent({
  communityId,
  timeRange = 'week',
  className = ''
}: CommunityEngagementMetricsProps) {
  const [metrics, setMetrics] = useState<CommunityEngagementMetrics | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'posts' | 'engagement' | 'tips_received' | 'tips_given'>('engagement');

  useEffect(() => {
    if (communityId) {
      loadMetrics();
      loadLeaderboard();
    }
  }, [communityId, timeRange, activeMetric]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await FeedService.getCommunityEngagementMetrics(communityId, timeRange);
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await FeedService.getCommunityLeaderboard(communityId, activeMetric, 10);
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  if (loading && !metrics) {
    return <LoadingState className={className} />;
  }

  if (error && !metrics) {
    return <ErrorState error={error} onRetry={loadMetrics} className={className} />;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Metrics Overview */}
      <MetricsOverview metrics={metrics} timeRange={timeRange} />

      {/* Trending Tags */}
      <TrendingTags tags={metrics.trendingTags} />

      {/* Top Contributors */}
      <TopContributors contributors={metrics.topContributors} />

      {/* Leaderboard */}
      <CommunityLeaderboard
        leaderboard={leaderboard}
        activeMetric={activeMetric}
        onMetricChange={setActiveMetric}
      />
    </div>
  );
}

// Metrics overview component
interface MetricsOverviewProps {
  metrics: CommunityEngagementMetrics;
  timeRange: string;
}

function MetricsOverview({ metrics, timeRange }: MetricsOverviewProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatGrowth = (growth: number) => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Community Metrics
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
          Past {timeRange}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Posts */}
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatNumber(metrics.totalPosts)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Posts
          </div>
        </div>

        {/* Total Engagement */}
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatNumber(metrics.totalEngagement)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Engagement
          </div>
        </div>

        {/* Growth Rate */}
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className={`text-2xl font-bold ${getGrowthColor(metrics.engagementGrowth)}`}>
            {formatGrowth(metrics.engagementGrowth)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Growth Rate
          </div>
        </div>
      </div>
    </div>
  );
}

// Trending tags component
interface TrendingTagsProps {
  tags: string[];
}

function TrendingTags({ tags }: TrendingTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Trending Topics
      </h3>
      
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${index === 0 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' 
                : index === 1
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            #{tag}
            {index === 0 && <span className="ml-1">🔥</span>}
            {index === 1 && <span className="ml-1">📈</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

// Top contributors component
interface TopContributorsProps {
  contributors: any[];
}

function TopContributors({ contributors }: TopContributorsProps) {
  if (contributors.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Top Contributors
      </h3>
      
      <div className="space-y-3">
        {contributors.slice(0, 5).map((contributor, index) => (
          <div key={contributor.address} className="flex items-center space-x-3">
            {/* Rank */}
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${index === 0 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' 
                : index === 1
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                : index === 2
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }
            `}>
              {index + 1}
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              {contributor.avatar ? (
                <img
                  src={contributor.avatar}
                  alt={contributor.displayName || contributor.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {(contributor.displayName || contributor.username || contributor.address).charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {contributor.displayName || contributor.username || 
                   `${contributor.address.slice(0, 6)}...${contributor.address.slice(-4)}`}
                </span>
                {contributor.verified && (
                  <span className="text-blue-500">✓</span>
                )}
              </div>
              {contributor.reputation && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {contributor.reputation} reputation
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Community leaderboard component
interface CommunityLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  activeMetric: 'posts' | 'engagement' | 'tips_received' | 'tips_given';
  onMetricChange: (metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given') => void;
}

function CommunityLeaderboard({ leaderboard, activeMetric, onMetricChange }: CommunityLeaderboardProps) {
  const metrics = [
    { key: 'posts' as const, label: 'Posts', icon: '📝' },
    { key: 'engagement' as const, label: 'Engagement', icon: '❤️' },
    { key: 'tips_received' as const, label: 'Tips Received', icon: '💰' },
    { key: 'tips_given' as const, label: 'Tips Given', icon: '🎁' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Leaderboard
        </h3>
        
        {/* Metric selector */}
        <div className="flex space-x-1">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => onMetricChange(metric.key)}
              className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200
                ${activeMetric === metric.key
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className="mr-1">{metric.icon}</span>
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No leaderboard data available
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <LeaderboardEntry key={entry.user.address} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual leaderboard entry component
interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
}

function LeaderboardEntry({ entry }: LeaderboardEntryProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (rank === 2) return 'text-gray-600 dark:text-gray-400';
    if (rank === 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-gray-500 dark:text-gray-500';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '➡️';
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getRankColor(entry.rank)}`}>
        {entry.rank <= 3 ? (
          <span className="text-lg">
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
          </span>
        ) : (
          entry.rank
        )}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {entry.user.avatar ? (
          <img
            src={entry.user.avatar}
            alt={entry.user.displayName || entry.user.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium">
            {(entry.user.displayName || entry.user.username || entry.user.address).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {entry.user.displayName || entry.user.username || 
             `${entry.user.address.slice(0, 6)}...${entry.user.address.slice(-4)}`}
          </span>
          {entry.user.verified && (
            <span className="text-blue-500">✓</span>
          )}
        </div>
        {entry.user.reputation && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {entry.user.reputation} reputation
          </div>
        )}
      </div>

      {/* Score and change */}
      <div className="text-right">
        <div className="font-semibold text-gray-900 dark:text-white">
          {entry.score.toLocaleString()}
        </div>
        <div className={`text-sm flex items-center ${getChangeColor(entry.change)}`}>
          <span className="mr-1">{getChangeIcon(entry.change)}</span>
          {Math.abs(entry.change)}
        </div>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-32" />
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-24" />
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl h-48" />
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