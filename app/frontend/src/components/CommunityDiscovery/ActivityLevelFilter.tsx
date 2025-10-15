import React from 'react';
import { Activity, TrendingUp, Zap, BarChart3 } from 'lucide-react';

interface ActivityLevel {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  threshold: {
    postsPerDay: number;
    activeMembers: number;
    engagementRate: number;
  };
}

interface ActivityLevelFilterProps {
  selectedLevels: string[];
  onLevelsChange: (levels: string[]) => void;
  showDescriptions?: boolean;
  layout?: 'grid' | 'list';
}

const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    id: 'very-high',
    label: 'Very High',
    description: '50+ posts/day, 80%+ engagement',
    icon: <Zap className="w-5 h-5" />,
    color: 'border-red-500 bg-red-50 text-red-700',
    threshold: {
      postsPerDay: 50,
      activeMembers: 1000,
      engagementRate: 0.8
    }
  },
  {
    id: 'high',
    label: 'High',
    description: '20-49 posts/day, 60%+ engagement',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'border-orange-500 bg-orange-50 text-orange-700',
    threshold: {
      postsPerDay: 20,
      activeMembers: 500,
      engagementRate: 0.6
    }
  },
  {
    id: 'medium',
    label: 'Medium',
    description: '5-19 posts/day, 40%+ engagement',
    icon: <Activity className="w-5 h-5" />,
    color: 'border-yellow-500 bg-yellow-50 text-yellow-700',
    threshold: {
      postsPerDay: 5,
      activeMembers: 200,
      engagementRate: 0.4
    }
  },
  {
    id: 'low',
    label: 'Low',
    description: '1-4 posts/day, 20%+ engagement',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'border-blue-500 bg-blue-50 text-blue-700',
    threshold: {
      postsPerDay: 1,
      activeMembers: 50,
      engagementRate: 0.2
    }
  }
];

export const ActivityLevelFilter: React.FC<ActivityLevelFilterProps> = ({
  selectedLevels,
  onLevelsChange,
  showDescriptions = true,
  layout = 'grid'
}) => {
  const toggleLevel = (levelId: string) => {
    if (selectedLevels.includes(levelId)) {
      onLevelsChange(selectedLevels.filter(id => id !== levelId));
    } else {
      onLevelsChange([...selectedLevels, levelId]);
    }
  };

  const selectAll = () => {
    onLevelsChange(ACTIVITY_LEVELS.map(level => level.id));
  };

  const clearAll = () => {
    onLevelsChange([]);
  };

  const containerClass = layout === 'grid' 
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'space-y-2';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Activity Level</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Select All
          </button>
          <span className="text-xs text-gray-400">|</span>
          <button
            onClick={clearAll}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Activity Level Options */}
      <div className={containerClass}>
        {ACTIVITY_LEVELS.map(level => {
          const isSelected = selectedLevels.includes(level.id);
          
          return (
            <button
              key={level.id}
              onClick={() => toggleLevel(level.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? level.color
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${isSelected ? '' : 'text-gray-400'}`}>
                  {level.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium">{level.label}</h4>
                    {isSelected && (
                      <div className="w-2 h-2 bg-current rounded-full"></div>
                    )}
                  </div>
                  
                  {showDescriptions && (
                    <p className="text-sm opacity-75 mb-2">
                      {level.description}
                    </p>
                  )}
                  
                  {/* Threshold Indicators */}
                  <div className="flex items-center space-x-4 text-xs opacity-60">
                    <span>{level.threshold.postsPerDay}+ posts/day</span>
                    <span>{(level.threshold.engagementRate * 100)}%+ engagement</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Count */}
      {selectedLevels.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          {selectedLevels.length} activity level{selectedLevels.length !== 1 ? 's' : ''} selected
        </div>
      )}

      {/* Activity Level Legend */}
      {layout === 'grid' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Activity Metrics</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>• Posts/day: Daily post count in the community</div>
            <div>• Engagement: Ratio of active members to total members</div>
            <div>• Active members: Users who posted or commented recently</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLevelFilter;