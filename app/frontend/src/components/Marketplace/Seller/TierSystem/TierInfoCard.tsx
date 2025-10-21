/**
 * Tier Information Card Component
 * Displays current tier information and progress in seller profile
 */

import React from 'react';
import { useTier } from '../../../../contexts/TierContext';
import TierProgressBar from './TierProgressBar';
import TierUpgradePrompt from './TierUpgradePrompt';

interface TierInfoCardProps {
  compact?: boolean;
  showUpgradePrompt?: boolean;
  className?: string;
}

const TierInfoCard: React.FC<TierInfoCardProps> = ({
  compact = false,
  showUpgradePrompt = true,
  className = '',
}) => {
  const { tier, progress, loading, error } = useTier();

  if (loading) {
    return (
      <div className={`tier-info-card-loading ${className}`}>
        <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !tier) {
    return (
      <div className={`tier-info-card-error ${className}`}>
        <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-red-400 font-medium">Tier Information Unavailable</h4>
              <p className="text-red-300 text-sm mt-1">
                {error || 'Unable to load tier information'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`tier-info-card-compact ${className}`}>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{tier.icon}</span>
              <div>
                <h4 className="text-white font-medium">{tier.name} Tier</h4>
                <p className="text-gray-400 text-sm">Level {tier.level}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={`w-3 h-3 rounded-full ${tier.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            </div>
          </div>
          
          {progress && (
            <TierProgressBar progress={progress} compact={true} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`tier-info-card ${className}`}>
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Tier Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ backgroundColor: tier.color + '20', color: tier.color }}
            >
              {tier.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{tier.name} Tier</h3>
              <p className="text-gray-400 text-sm">Level {tier.level}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${tier.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-gray-400 text-sm">
              {tier.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Current Tier Benefits */}
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">Current Benefits</h4>
          <div className="grid grid-cols-1 gap-2">
            {tier.benefits.slice(0, 3).map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-300 text-sm">{benefit.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress to Next Tier */}
        {progress && (
          <div className="mb-4">
            <TierProgressBar progress={progress} showDetails={false} />
          </div>
        )}

        {/* Upgrade Prompt */}
        {showUpgradePrompt && progress && progress.nextTier && progress.progressPercentage < 100 && (
          <div className="mt-4">
            <TierUpgradePrompt
              currentTier={tier}
              message={`You're ${Math.round(100 - progress.progressPercentage)}% away from ${progress.nextTier.name} tier!`}
              compact={true}
            />
          </div>
        )}

        {/* Tier Limitations */}
        {tier.limitations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-gray-400 font-medium mb-2 text-sm">Current Limitations</h4>
            <div className="space-y-1">
              {tier.limitations.slice(0, 2).map((limitation, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <svg className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-400 text-xs">{limitation.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TierInfoCard;