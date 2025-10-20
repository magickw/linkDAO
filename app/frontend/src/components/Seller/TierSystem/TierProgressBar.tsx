/**
 * Tier Progress Bar Component
 * Displays tier progression and requirements
 */

import React from 'react';
import { TierProgress } from '../../../types/sellerTier';

interface TierProgressBarProps {
  progress: TierProgress;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const TierProgressBar: React.FC<TierProgressBarProps> = ({
  progress,
  showDetails = false,
  compact = false,
  className = '',
}) => {
  const { currentTier, nextTier, progressPercentage, requirementsMet, totalRequirements } = progress;

  if (compact) {
    return (
      <div className={`tier-progress-compact ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{currentTier.icon}</span>
            <span className="text-sm font-medium text-gray-700">{currentTier.name}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {nextTier && (
            <div className="flex items-center space-x-2">
              <span className="text-lg opacity-50">{nextTier.icon}</span>
              <span className="text-sm text-gray-500">{nextTier.name}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`tier-progress ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-xl">{currentTier.icon}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{currentTier.name} Tier</h3>
              <p className="text-sm text-gray-600">Level {currentTier.level}</p>
            </div>
          </div>

          {nextTier && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Next: {nextTier.name}</p>
              <p className="text-xs text-gray-500">Level {nextTier.level}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress to {nextTier?.name || 'Max Level'}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            >
              {progressPercentage > 10 && (
                <div className="absolute inset-0 bg-white bg-opacity-20 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Requirements met: {requirementsMet} of {totalRequirements}
          </span>
          {progress.estimatedUpgradeTime && (
            <span className="text-blue-600 font-medium">
              Est. {progress.estimatedUpgradeTime}
            </span>
          )}
        </div>

        {/* Detailed Requirements */}
        {showDetails && nextTier && nextTier.requirements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Requirements for {nextTier.name}:
            </h4>
            <div className="space-y-2">
              {nextTier.requirements.map((requirement, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      requirement.met 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {requirement.met ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 bg-current rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      requirement.met ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {requirement.description}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    requirement.met ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {formatRequirementProgress(requirement)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Tier Benefits Preview */}
        {showDetails && nextTier && nextTier.benefits.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {nextTier.name} Benefits:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {nextTier.benefits.slice(0, 4).map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-700">{benefit.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatRequirementProgress(requirement: any): string {
  switch (requirement.type) {
    case 'sales_volume':
      return `$${requirement.current.toLocaleString()} / $${requirement.value.toLocaleString()}`;
    case 'rating':
      return `${requirement.current.toFixed(1)} / ${requirement.value.toFixed(1)} ⭐`;
    case 'reviews':
      return `${requirement.current} / ${requirement.value} reviews`;
    case 'time_active':
      return `${requirement.current} / ${requirement.value} days`;
    default:
      return `${requirement.current} / ${requirement.value}`;
  }
}

export default TierProgressBar;