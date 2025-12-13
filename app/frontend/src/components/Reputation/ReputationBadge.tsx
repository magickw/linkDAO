/**
 * Reputation Badge Component
 * Displays user's reputation level and score
 * Shows progress to next level
 */

import React from 'react';
import { useReputation, useReputationLevels } from '@/hooks/useReputation';
import { Shield, Star, TrendingUp, Crown } from 'lucide-react';

interface ReputationBadgeProps {
  userAddress?: string;
  showProgress?: boolean;
  showLevel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  userAddress,
  showProgress = true,
  showLevel = true,
  size = 'md',
  className = ''
}) => {
  const { reputation, loading } = useReputation(userAddress);
  const { getLevelProgress } = useReputationLevels();

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-full ${className}`}>
        <div className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  if (!reputation) {
    return null;
  }

  const score = parseFloat(reputation.score);
  const { level, progress } = getLevelProgress(score);

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-12 w-12 text-lg'
  };

  const getLevelIcon = (level: number) => {
    if (level >= 10) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (level >= 5) return <Star className="w-4 h-4 text-purple-500" />;
    if (level >= 3) return <Shield className="w-4 h-4 text-blue-500" />;
    return <Shield className="w-4 h-4 text-gray-500" />;
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (level >= 5) return 'bg-gradient-to-r from-purple-400 to-purple-600';
    if (level >= 3) return 'bg-gradient-to-r from-blue-400 to-blue-600';
    return 'bg-gradient-to-r from-gray-400 to-gray-600';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} ${getLevelColor(level)} rounded-full flex items-center justify-center text-white font-bold`}>
          {level}
        </div>
        <div className="absolute -bottom-1 -right-1">
          {getLevelIcon(level)}
        </div>
      </div>

      {showLevel && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            Level {level}
          </span>
          <span className="text-xs text-gray-500">
            {score.toFixed(0)} pts
          </span>
        </div>
      )}

      {showProgress && level < 10 && (
        <div className="flex-1 max-w-24">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-gray-400" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className={`${getLevelColor(level)} h-2 rounded-full transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReputationCardProps {
  userAddress?: string;
  showHistory?: boolean;
  showBenefits?: boolean;
  className?: string;
}

export const ReputationCard: React.FC<ReputationCardProps> = ({
  userAddress,
  showHistory = false,
  showBenefits = true,
  className = ''
}) => {
  const { reputation, loading, error } = useReputation(userAddress);
  const { getLevelProgress } = useReputationLevels();

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 animate-pulse ${className}`}>
        <div className="h-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (error || !reputation) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <p className="text-red-500">Failed to load reputation</p>
      </div>
    );
  }

  const score = parseFloat(reputation.score);
  const { level, progress, nextThreshold } = getLevelProgress(score);
  const scoreToNext = nextThreshold - score;

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reputation</h3>
        <ReputationBadge userAddress={userAddress} showProgress={false} />
      </div>

      <div className="space-y-4">
        {/* Score and Level */}
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {score.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">Reputation Points</div>
          <div className="text-lg font-medium text-gray-700 mt-1">
            Level {level}
          </div>
        </div>

        {/* Progress to Next Level */}
        {level < 10 && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress to Level {level + 1}</span>
              <span>{scoreToNext} pts to go</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Benefits */}
        {showBenefits && reputation.benefits.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Current Benefits</h4>
            <ul className="space-y-1">
              {reputation.benefits.map((benefit, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent History */}
        {showHistory && reputation.history.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recent Activity</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {reputation.history.slice(-5).reverse().map((entry, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{entry.action.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-green-600">
                    +{parseFloat(entry.amount).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};