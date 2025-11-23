import React, { useEffect, useState } from 'react';
import { ProgressMilestone, ReputationCategory } from '../../types/reputation';

interface ProgressIndicatorProps {
  milestones: ProgressMilestone[];
  animated?: boolean;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  milestones,
  animated = true,
  showLabels = true,
  size = 'medium',
  orientation = 'horizontal'
}) => {
  const [animatedProgress, setAnimatedProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        const newProgress: Record<string, number> = {};
        milestones.forEach(milestone => {
          newProgress[milestone.category] = milestone.progress;
        });
        setAnimatedProgress(newProgress);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [milestones, animated]);

  const getCategoryIcon = (category: ReputationCategory) => {
    const icons = {
      posting: '✍️',
      governance: '🏛️',
      community: '👥',
      trading: '💰',
      moderation: '🛡️'
    };
    return icons[category];
  };

  const getCategoryColor = (category: ReputationCategory) => {
    const colors = {
      posting: 'bg-blue-500',
      governance: 'bg-purple-500',
      community: 'bg-green-500',
      trading: 'bg-yellow-500',
      moderation: 'bg-red-500'
    };
    return colors[category];
  };

  const getCategoryName = (category: ReputationCategory) => {
    const names = {
      posting: 'Content Creation',
      governance: 'Governance',
      community: 'Community',
      trading: 'Trading',
      moderation: 'Moderation'
    };
    return names[category];
  };

  const getSizeStyles = () => {
    const styles = {
      small: {
        height: 'h-2',
        text: 'text-xs',
        spacing: 'space-y-2',
        icon: 'text-sm'
      },
      medium: {
        height: 'h-3',
        text: 'text-sm',
        spacing: 'space-y-3',
        icon: 'text-base'
      },
      large: {
        height: 'h-4',
        text: 'text-base',
        spacing: 'space-y-4',
        icon: 'text-lg'
      }
    };
    return styles[size];
  };

  const sizeStyles = getSizeStyles();

  const formatProgress = (current: number, target: number) => {
    return `${current.toLocaleString()} / ${target.toLocaleString()}`;
  };

  const getProgressPercentage = (milestone: ProgressMilestone) => {
    if (animated && animatedProgress[milestone.category] !== undefined) {
      return animatedProgress[milestone.category];
    }
    return animated ? 0 : milestone.progress;
  };

  if (orientation === 'vertical') {
    return (
      <div className={`progress-indicator-vertical ${sizeStyles.spacing}`}>
        {milestones.map((milestone) => {
          const progressPercentage = getProgressPercentage(milestone);
          const categoryColor = getCategoryColor(milestone.category);
          
          return (
            <div key={milestone.category} className="flex items-center space-x-3">
              {/* Category Icon */}
              <div className={`flex-shrink-0 ${sizeStyles.icon}`}>
                {getCategoryIcon(milestone.category)}
              </div>

              {/* Progress Content */}
              <div className="flex-1">
                {showLabels && (
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-medium ${sizeStyles.text}`}>
                      {getCategoryName(milestone.category)}
                    </span>
                    <span className={`text-gray-500 ${sizeStyles.text}`}>
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className={`w-full bg-gray-200 rounded-full ${sizeStyles.height} overflow-hidden`}>
                  <div
                    className={`${categoryColor} ${sizeStyles.height} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                {showLabels && (
                  <div className={`flex justify-between items-center mt-1 ${sizeStyles.text} text-gray-600`}>
                    <span>{formatProgress(milestone.current, milestone.target)}</span>
                    <span className="text-green-600 font-medium">{milestone.reward}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`progress-indicator-horizontal ${sizeStyles.spacing}`}>
      {milestones.map((milestone) => {
        const progressPercentage = getProgressPercentage(milestone);
        const categoryColor = getCategoryColor(milestone.category);
        
        return (
          <div key={milestone.category} className="progress-item">
            {showLabels && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={sizeStyles.icon}>
                    {getCategoryIcon(milestone.category)}
                  </span>
                  <span className={`font-medium ${sizeStyles.text}`}>
                    {getCategoryName(milestone.category)}
                  </span>
                </div>
                <span className={`text-gray-500 ${sizeStyles.text}`}>
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className={`w-full bg-gray-200 rounded-full ${sizeStyles.height} overflow-hidden relative`}>
              <div
                className={`${categoryColor} ${sizeStyles.height} rounded-full transition-all duration-1000 ease-out relative`}
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Shimmer Effect for Active Progress */}
                {progressPercentage > 0 && progressPercentage < 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                )}
              </div>

              {/* Milestone Markers */}
              {milestone.nextMilestone && (
                <div
                  className="absolute top-0 w-0.5 bg-gray-400 opacity-50"
                  style={{
                    left: `${(milestone.current / milestone.target) * 100}%`,
                    height: '100%'
                  }}
                />
              )}
            </div>

            {showLabels && (
              <div className={`flex justify-between items-center mt-1 ${sizeStyles.text} text-gray-600`}>
                <span>{formatProgress(milestone.current, milestone.target)}</span>
                <span className="text-green-600 font-medium">{milestone.reward}</span>
              </div>
            )}

            {/* Next Milestone Preview */}
            {milestone.nextMilestone && (
              <div className={`mt-2 p-2 bg-gray-50 rounded-lg ${sizeStyles.text} text-gray-600`}>
                <div className="flex items-center justify-between">
                  <span>Next: {milestone.nextMilestone.reward}</span>
                  <span className="font-medium">
                    {formatProgress(milestone.nextMilestone.current, milestone.nextMilestone.target)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;