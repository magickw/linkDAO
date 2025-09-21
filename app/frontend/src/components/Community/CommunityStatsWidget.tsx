import React, { useState, useEffect, useCallback } from 'react';
import { CommunityStats, Community } from '../../types/community';

export interface CommunityStatsWidgetProps {
  community: Community;
  stats?: CommunityStats;
  onRefresh?: () => void;
  refreshInterval?: number; // in milliseconds
}

interface CommunityStatsWidgetState {
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * CommunityStatsWidget Component
 * 
 * Displays real-time community statistics including member count,
 * online status, weekly post count, and activity metrics.
 * Provides fallback display for unavailable statistics.
 */
export const CommunityStatsWidget: React.FC<CommunityStatsWidgetProps> = ({
  community,
  stats,
  onRefresh,
  refreshInterval = 30000 // 30 seconds default
}) => {
  const [state, setState] = useState<CommunityStatsWidgetState>({
    loading: false,
    error: null,
    lastUpdated: null
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!onRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [onRefresh, refreshInterval]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await onRefresh();
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        lastUpdated: new Date() 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh statistics' 
      }));
    }
  }, [onRefresh]);

  const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return 'N/A';
    
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatPercentage = (num: number | undefined): string => {
    if (num === undefined || num === null) return 'N/A';
    return `${num.toFixed(1)}%`;
  };

  const getOnlinePercentage = (): number | undefined => {
    if (!stats?.memberCount || !stats?.onlineCount) return undefined;
    return (stats.onlineCount / stats.memberCount) * 100;
  };

  const getActivityLevel = (): { level: string; color: string } => {
    const onlinePercentage = getOnlinePercentage();
    
    if (onlinePercentage === undefined) {
      return { level: 'Unknown', color: 'text-gray-500' };
    }
    
    if (onlinePercentage >= 10) {
      return { level: 'Very Active', color: 'text-green-600' };
    } else if (onlinePercentage >= 5) {
      return { level: 'Active', color: 'text-blue-600' };
    } else if (onlinePercentage >= 2) {
      return { level: 'Moderate', color: 'text-yellow-600' };
    } else {
      return { level: 'Quiet', color: 'text-gray-600' };
    }
  };

  const activityLevel = getActivityLevel();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Widget Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Community Stats
        </h3>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={state.loading}
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh statistics"
          >
            {state.loading ? (
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Refreshing...</span>
              </div>
            ) : (
              'Refresh'
            )}
          </button>
        )}
      </div>

      {/* Main Statistics */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total Members */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(stats?.memberCount)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Members
            </div>
          </div>

          {/* Online Members */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(stats?.onlineCount)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Online Now
            </div>
          </div>
        </div>

        {/* Activity Level Indicator */}
        <div className="text-center mb-4">
          <div className={`text-sm font-medium ${activityLevel.color} dark:${activityLevel.color.replace('text-', 'text-')}`}>
            {activityLevel.level}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {getOnlinePercentage() !== undefined 
              ? `${formatPercentage(getOnlinePercentage())} of members online`
              : 'Activity level unavailable'
            }
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatNumber(stats?.postsThisWeek)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Posts This Week
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatNumber(stats?.activeDiscussions)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Active Discussions
              </div>
            </div>
          </div>
        </div>

        {/* Growth Rate */}
        {stats?.growthRate !== undefined && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                stats.growthRate >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {stats.growthRate >= 0 ? '+' : ''}{formatPercentage(stats.growthRate)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Growth This Month
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {state.lastUpdated && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Last updated: {state.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="px-4 py-3 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="text-sm text-red-600 dark:text-red-400 text-center">
            {state.error}
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="mt-2 w-full text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Fallback State - No Data Available */}
      {!stats && !state.loading && !state.error && (
        <div className="px-4 py-6 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Statistics unavailable
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Community statistics will appear here when available
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Load Statistics
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityStatsWidget;