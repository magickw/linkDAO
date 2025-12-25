/**
 * TierProgressWidget Component
 * Dashboard widget showing tier progress and requirements
 */

import React from 'react';
import { SellerTierBadge, SellerTier } from './SellerTierBadge';
import { 
  TrendingUp, 
  Clock, 
  Star, 
  DollarSign, 
  Users, 
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface TierRequirement {
  id: string;
  label: string;
  current: number;
  required: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  isCompleted: boolean;
  progress: number;
}

interface TierProgressWidgetProps {
  currentTier: SellerTier;
  nextTier?: SellerTier;
  requirements: TierRequirement[];
  overallProgress: number;
  estimatedTimeToNext?: string;
  className?: string;
}

const TIER_NAMES = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond'
} as const;

export const TierProgressWidget: React.FC<TierProgressWidgetProps> = ({
  currentTier,
  nextTier,
  requirements,
  overallProgress,
  estimatedTimeToNext,
  className = ''
}) => {
  const completedRequirements = requirements.filter(req => req.isCompleted).length;
  const totalRequirements = requirements.length;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tier Progress
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {completedRequirements} of {totalRequirements} requirements met
          </p>
        </div>
        <SellerTierBadge tier={currentTier} size="lg" />
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progress to {nextTier ? TIER_NAMES[nextTier] : 'Max Tier'}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {overallProgress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        {estimatedTimeToNext && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <Clock className="inline w-3 h-3 mr-1" />
            Est. {estimatedTimeToNext} to next tier
          </p>
        )}
      </div>

      {/* Requirements */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Requirements
        </h4>
        {requirements.map((requirement) => (
          <div key={requirement.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <requirement.icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {requirement.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  requirement.isCompleted 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {requirement.current.toLocaleString()} / {requirement.required.toLocaleString()}
                </span>
                {requirement.isCompleted && (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  requirement.isCompleted 
                    ? 'bg-green-500' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600'
                }`}
                style={{ width: `${Math.min(requirement.progress, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Target className="w-4 h-4" />
            <span>{totalRequirements - completedRequirements} requirements remaining</span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            View Tips →
          </button>
        </div>
      </div>
    </div>
  );
};

export default TierProgressWidget;