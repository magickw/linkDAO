import React from 'react';

interface ActivityIndicatorsProps {
  className?: string;
}

export interface ActivityIndicator {
  label: string;
  count: number;
  color: string;
}

export const createActivityIndicator = (label: string, count: number, color: string): ActivityIndicator => ({
  label,
  count,
  color
});

export const mockActivityIndicators: ActivityIndicator[] = [
  { label: 'New Posts', count: 12, color: 'bg-blue-500' },
  { label: 'Mentions', count: 3, color: 'bg-green-500' },
  { label: 'Reactions', count: 8, color: 'bg-purple-500' },
  { label: 'Comments', count: 5, color: 'bg-orange-500' },
];

export const ActivityIndicators: React.FC<ActivityIndicatorsProps> = ({
  className = ''
}) => {
  const activities = mockActivityIndicators;

  return (
    <div className={`space-y-3 ${className}`}>
      {activities.map((activity) => (
        <div key={activity.label} className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${activity.color}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {activity.label}
            </span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            {activity.count}
          </span>
        </div>
      ))}
    </div>
  );
};