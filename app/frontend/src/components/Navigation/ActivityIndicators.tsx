import React from 'react';
import { ActivityIndicator } from '@/types/navigation';

interface ActivityIndicatorsProps {
  className?: string;
  activities?: ActivityIndicator[];
}

export const createActivityIndicator = (type: ActivityIndicator['type'], count: number, color: string): ActivityIndicator => ({
  id: `${type}-${Date.now()}`, // Generate a unique ID
  type,
  count,
  priority: 'medium', // Default priority
  lastUpdate: new Date(),
  isAnimated: false
});

export const mockActivityIndicators: ActivityIndicator[] = [
  createActivityIndicator('notification', 12, 'bg-blue-500'),
  createActivityIndicator('transaction', 3, 'bg-green-500'),
  createActivityIndicator('community', 8, 'bg-purple-500'),
  createActivityIndicator('governance', 5, 'bg-orange-500'),
];

export const ActivityIndicators: React.FC<ActivityIndicatorsProps> = ({
  className = '',
  activities = mockActivityIndicators
}) => {

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity) => (
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