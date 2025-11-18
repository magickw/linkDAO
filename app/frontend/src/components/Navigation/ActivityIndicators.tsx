import React, { useMemo } from 'react';
import { ActivityIndicator } from '@/types/navigation';

interface ActivityIndicatorsProps {
  className?: string;
  activities?: ActivityIndicator[];
}

export const createActivityIndicator = (type: ActivityIndicator['type'], count: number, color: string): ActivityIndicator => ({
  id: `${type}-${Date.now()}`, // Generate a unique ID
  type,
  count,
  color,
  priority: 'medium', // Default priority
  lastUpdate: new Date(),
  isAnimated: false
});

const DEFAULT_ACTIVITIES: ActivityIndicator[] = [
  {
    id: 'notification-default',
    type: 'notification',
    count: 12,
    color: 'bg-blue-500',
    priority: 'medium',
    lastUpdate: new Date(),
    isAnimated: false
  },
  {
    id: 'transaction-default',
    type: 'transaction',
    count: 3,
    color: 'bg-green-500',
    priority: 'medium',
    lastUpdate: new Date(),
    isAnimated: false
  },
  {
    id: 'community-default',
    type: 'community',
    count: 8,
    color: 'bg-purple-500',
    priority: 'medium',
    lastUpdate: new Date(),
    isAnimated: false
  },
  {
    id: 'governance-default',
    type: 'governance',
    count: 5,
    color: 'bg-orange-500',
    priority: 'medium',
    lastUpdate: new Date(),
    isAnimated: false
  }
];

export const mockActivityIndicators: ActivityIndicator[] = DEFAULT_ACTIVITIES;

export const ActivityIndicators: React.FC<ActivityIndicatorsProps> = ({
  className = '',
  activities
}) => {
  const displayActivities = useMemo(() => activities || DEFAULT_ACTIVITIES, [activities]);

  return (
    <div className={`space-y-3 ${className}`}>
      {displayActivities.map((activity) => (
        <div key={activity.id} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${activity.color}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {activity.type}
            </span>
          </div>
          <span className="text-sm font-bold text-white bg-primary-600 dark:bg-primary-500 px-2 py-0.5 rounded-full">
            {activity.count}
          </span>
        </div>
      ))}
    </div>
  );
};