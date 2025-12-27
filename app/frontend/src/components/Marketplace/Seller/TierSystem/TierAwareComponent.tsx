/**
 * Tier Aware Component
 * Wrapper component that provides tier-based rendering and feature gating
 */

import React from 'react';
import { useTier } from '../../../../contexts/TierContext';
import { TierAction, TIER_LEVELS } from '../../../../types/sellerTier';
import TierUpgradePrompt from './TierUpgradePrompt';
import LoadingSpinner from '../../../ui/LoadingSpinner';

interface TierAwareComponentProps {
  children: React.ReactNode;
  requiredAction?: TierAction;
  requiredTierLevel?: number;
  fallbackComponent?: React.ComponentType<any>;
  showUpgradePrompt?: boolean;
  className?: string;
}

const TierAwareComponent: React.FC<TierAwareComponentProps> = ({
  children,
  requiredAction,
  requiredTierLevel,
  fallbackComponent: FallbackComponent,
  showUpgradePrompt = true,
  className = '',
}) => {
  const { tier, loading, error, canPerformAction } = useTier();

  // Show loading state
  if (loading) {
    return (
      <div className={`tier-aware-loading ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-gray-600">Loading tier information...</span>
      </div>
    );
  }

  // Show error state
  if (error || !tier) {
    return (
      <div className={`tier-aware-error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load tier information
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error || 'Please try refreshing the page.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check tier level requirement
  if (requiredTierLevel && tier.level < requiredTierLevel) {
    if (FallbackComponent) {
      return <FallbackComponent tier={tier} requiredLevel={requiredTierLevel} />;
    }

    if (showUpgradePrompt) {
      return (
        <div className={`tier-upgrade-required ${className}`}>
          <TierUpgradePrompt
            currentTier={tier}
            requiredLevel={requiredTierLevel}
            message={`This feature requires ${getTierNameByLevel(requiredTierLevel)} tier or higher.`}
          />
        </div>
      );
    }

    return null;
  }

  // Check specific action requirement
  if (requiredAction) {
    const validation = canPerformAction(requiredAction);
    
    if (!validation.isAllowed) {
      if (FallbackComponent) {
        return <FallbackComponent tier={tier} validation={validation} />;
      }

      if (showUpgradePrompt && validation.upgradeRequired) {
        return (
          <div className={`tier-action-restricted ${className}`}>
            <TierUpgradePrompt
              currentTier={tier}
              message={validation.reason || 'This action is not available for your current tier.'}
              alternativeAction={validation.alternativeAction}
            />
          </div>
        );
      }

      return (
        <div className={`tier-restriction-notice ${className}`}>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Tier Requirement
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  {validation.reason}
                </div>
                {validation.alternativeAction && (
                  <div className="mt-2 text-sm text-blue-700 font-medium">
                    {validation.alternativeAction}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render children if all checks pass
  return <div className={className}>{children}</div>;
};

// Helper function to get tier name by level
function getTierNameByLevel(level: number): string {
  switch (level) {
    case TIER_LEVELS.BRONZE:
      return 'Bronze';
    case TIER_LEVELS.SILVER:
      return 'Silver';
    case TIER_LEVELS.GOLD:
      return 'Gold';
    case TIER_LEVELS.PLATINUM:
      return 'Platinum';
    case TIER_LEVELS.DIAMOND:
      return 'Diamond';
    default:
      return 'Unknown';
  }
}

export default TierAwareComponent;