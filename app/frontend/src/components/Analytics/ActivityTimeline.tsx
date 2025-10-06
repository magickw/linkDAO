/**
 * ActivityTimeline Component
 * Shows user activity timeline with filtering
 */

import React, { useState, useEffect } from 'react';
import { userActivityService, UserActivity } from '../../services/userActivityService';

interface ActivityTimelineProps {
  userAddress: string;
  onActivityClick: (activity: UserActivity) => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  userAddress,
  onActivityClick
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [userAddress]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const response = await userActivityService.getUserActivityTimeline(userAddress, {
        limit: 20
      });
      setActivities(response.activities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: UserActivity['activityType']) => {
    switch (type) {
      case 'post_create':
        return '📝';
      case 'post_like':
        return '❤️';
      case 'community_join':
        return '👥';
      case 'message_send':
        return '💬';
      default:
        return '📊';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (loading) {
    return <div className="text-center py-4">Loading timeline...</div>;
  }

  return (
    <div className="activity-timeline">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Activity Timeline
      </h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => onActivityClick(activity)}
          >
            <div className="text-2xl">{getActivityIcon(activity.activityType)}</div>
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">
                {activity.activityType.replace('_', ' ')} - {activity.targetType}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;