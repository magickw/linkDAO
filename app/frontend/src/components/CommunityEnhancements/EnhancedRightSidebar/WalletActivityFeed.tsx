import React, { useState, useEffect, useMemo } from 'react';
import { WalletActivity } from '../../../types/communityEnhancements';
import { useCommunityWebSocket } from '../../../hooks/useCommunityWebSocket';
import { MicroInteractionLayer } from '../SharedComponents/MicroInteractionLayer';

interface WalletActivityFeedProps {
  activities: WalletActivity[];
  maxItems?: number;
  showRealTimeUpdates?: boolean;
  onActivityClick?: (activity: WalletActivity) => void;
  communityId: string;
}

interface ActivityFilterProps {
  selectedTypes: string[];
  onFilterChange: (types: string[]) => void;
  availableTypes: string[];
}

const ActivityFilter: React.FC<ActivityFilterProps> = ({
  selectedTypes,
  onFilterChange,
  availableTypes
}) => {
  const filterOptions = [
    { type: 'tip_received', label: 'Tips', icon: '💰', color: 'text-green-600' },
    { type: 'transaction', label: 'Transactions', icon: '🔄', color: 'text-blue-600' },
    { type: 'badge_earned', label: 'Badges', icon: '🏆', color: 'text-yellow-600' },
    { type: 'reward_claimed', label: 'Rewards', icon: '🎁', color: 'text-purple-600' }
  ].filter(option => availableTypes.includes(option.type));

  const toggleFilter = (type: string) => {
    if (selectedTypes.includes(type)) {
      onFilterChange(selectedTypes.filter(t => t !== type));
    } else {
      onFilterChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filterOptions.map(option => (
        <button
          key={option.type}
          onClick={() => toggleFilter(option.type)}
          className={`
            px-3 py-1 text-xs rounded-full border transition-all duration-200
            ${selectedTypes.includes(option.type)
              ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          <span className="mr-1">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
};

interface CelebrationAnimationProps {
  activity: WalletActivity;
  onAnimationComplete: () => void;
}

const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  activity,
  onAnimationComplete
}) => {
  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, 3000);
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  const getAnimationEmoji = (type: string) => {
    switch (type) {
      case 'tip_received': return '💰';
      case 'badge_earned': return '🏆';
      case 'reward_claimed': return '🎉';
      default: return '✨';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-bounce text-6xl">
        {getAnimationEmoji(activity.type)}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 opacity-20 animate-pulse" />
    </div>
  );
};

interface ActivityItemProps {
  activity: WalletActivity;
  onClick?: (activity: WalletActivity) => void;
  showCelebration?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onClick,
  showCelebration = false
}) => {
  const [showAnimation, setShowAnimation] = useState(showCelebration && activity.celebratory);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tip_received':
        return (
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
            </svg>
          </div>
        );
      case 'transaction':
        return (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'badge_earned':
        return (
          <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        );
      case 'reward_claimed':
        return (
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  const formatAmount = (amount?: number, token?: string) => {
    if (!amount || !token) return '';
    return `${amount.toLocaleString()} ${token}`;
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>
      <MicroInteractionLayer interactionType="hover">
        <div
          onClick={() => onClick?.(activity)}
          className={`
            p-3 rounded-lg border border-gray-200 dark:border-gray-700 
            hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200
            ${onClick ? 'cursor-pointer' : ''}
            ${activity.celebratory ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
          `}
        >
          <div className="flex items-start space-x-3">
            {getActivityIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.description}
              </p>
              {activity.amount && activity.token && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  +{formatAmount(activity.amount, activity.token)}
                </p>
              )}
              {activity.relatedUser && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  from @{activity.relatedUser}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </MicroInteractionLayer>

      {showAnimation && (
        <CelebrationAnimation
          activity={activity}
          onAnimationComplete={() => setShowAnimation(false)}
        />
      )}
    </>
  );
};

export const WalletActivityFeed: React.FC<WalletActivityFeedProps> = ({
  activities,
  maxItems = 10,
  showRealTimeUpdates = true,
  onActivityClick,
  communityId
}) => {
  const [filteredActivities, setFilteredActivities] = useState<WalletActivity[]>(activities);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newActivityCount, setNewActivityCount] = useState(0);
  const { isConnected } = useCommunityWebSocket(communityId);

  // Get available activity types
  const availableTypes = useMemo(() => {
    return Array.from(new Set(activities.map(activity => activity.type)));
  }, [activities]);

  // Filter activities based on selected filters and search query
  useEffect(() => {
    let filtered = activities;

    // Apply type filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(activity => selectedFilters.includes(activity.type));
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.relatedUser?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by timestamp (newest first) and limit
    filtered = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);

    setFilteredActivities(filtered);
  }, [activities, selectedFilters, searchQuery, maxItems]);

  // Track new activities for real-time updates
  useEffect(() => {
    if (showRealTimeUpdates && activities.length > filteredActivities.length) {
      setNewActivityCount(activities.length - filteredActivities.length);
    }
  }, [activities.length, filteredActivities.length, showRealTimeUpdates]);

  const handleRefresh = () => {
    setNewActivityCount(0);
    // In a real implementation, this would trigger a data refresh
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Wallet Activity
        </h3>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">No wallet activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Wallet Activity
        </h3>
        <div className="flex items-center space-x-2">
          {isConnected && showRealTimeUpdates && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
          {newActivityCount > 0 && (
            <button
              onClick={handleRefresh}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              {newActivityCount} new
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Activity Filters */}
      {availableTypes.length > 1 && (
        <ActivityFilter
          selectedTypes={selectedFilters}
          onFilterChange={setSelectedFilters}
          availableTypes={availableTypes}
        />
      )}

      {/* Activity List */}
      <div className="space-y-3">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              onClick={onActivityClick}
              showCelebration={showRealTimeUpdates}
            />
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No activities match your filters
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {activities.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
            View All Activity →
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletActivityFeed;