/**
 * Automated Tier Upgrade Panel Component
 * Displays tier progression, requirements, and upgrade status
 */

import React, { useState } from 'react';
import { useAutomatedTierUpgrade } from '../../../hooks/useAutomatedTierUpgrade';
import { Button, GlassPanel, LoadingSkeleton } from '../../../design-system';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface AutomatedTierUpgradePanelProps {
  walletAddress: string;
  className?: string;
  showNotifications?: boolean;
  enableManualEvaluation?: boolean;
}

export const AutomatedTierUpgradePanel: React.FC<AutomatedTierUpgradePanelProps> = ({
  walletAddress,
  className = '',
  showNotifications = true,
  enableManualEvaluation = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    progression,
    progressionLoading,
    progressionError,
    criteria,
    criteriaLoading,
    triggerEvaluation,
    evaluationLoading,
    canTriggerManualEvaluation,
    notifications,
    unreadNotificationCount,
    formatRequirement,
    formatEstimatedTime,
    getTierColor,
    getTierIcon,
    refreshProgression,
  } = useAutomatedTierUpgrade({
    walletAddress,
    enableRealTimeUpdates: true,
  });

  const handleManualEvaluation = async () => {
    try {
      const result = await triggerEvaluation(false);
      
      if (result.upgradeEligible) {
        // Show success message
        console.log('Tier upgrade successful!', result);
      } else {
        // Show current status
        console.log('No upgrade available', result);
      }
    } catch (error) {
      console.error('Manual evaluation failed:', error);
    }
  };

  if (progressionLoading) {
    return (
      <GlassPanel className={`p-6 ${className}`}>
        <div className="space-y-4">
          <LoadingSkeleton className="h-6 w-48" />
          <LoadingSkeleton className="h-4 w-full" />
          <LoadingSkeleton className="h-20 w-full" />
        </div>
      </GlassPanel>
    );
  }

  if (progressionError) {
    return (
      <GlassPanel className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to Load Tier Information
          </h3>
          <p className="text-gray-600 mb-4">
            There was an error loading your tier progression data.
          </p>
          <Button
            onClick={refreshProgression}
            variant="secondary"
            size="small"
          >
            Try Again
          </Button>
        </div>
      </GlassPanel>
    );
  }

  if (!progression) {
    return null;
  }

  const currentTierColor = getTierColor(progression.currentTier);
  const nextTierColor = progression.nextTier ? getTierColor(progression.nextTier) : '#6B7280';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Tier Progress Panel */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl"
              style={{ color: currentTierColor }}
            >
              {getTierIcon(progression.currentTier)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {progression.currentTier.charAt(0).toUpperCase() + progression.currentTier.slice(1)} Tier
              </h3>
              {progression.nextTier && (
                <p className="text-sm text-gray-600">
                  Progress to {progression.nextTier.charAt(0).toUpperCase() + progression.nextTier.slice(1)}
                </p>
              )}
            </div>
          </div>
          
          {showNotifications && unreadNotificationCount > 0 && (
            <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
              <SparklesIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {unreadNotificationCount} new update{unreadNotificationCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {progression.nextTier && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Upgrade Progress
              </span>
              <span className="text-sm text-gray-600">
                {progression.progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progression.progressPercentage}%`,
                  background: `linear-gradient(90deg, ${currentTierColor}, ${nextTierColor})`,
                }}
              />
            </div>
            {progression.estimatedUpgradeTime !== null && (
              <p className="text-xs text-gray-500 mt-1">
                Estimated time to upgrade: {formatEstimatedTime(progression.estimatedUpgradeTime)}
              </p>
            )}
          </div>
        )}

        {/* Requirements Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {progression.requirementsMet.slice(0, 4).map((requirement, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg ${
                requirement.met ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              {requirement.met ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  requirement.met ? 'text-green-800' : 'text-gray-700'
                }`}>
                  {requirement.requirement}
                </p>
                <p className={`text-xs ${
                  requirement.met ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {formatRequirement(requirement.requirement, requirement.current, requirement.required)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {enableManualEvaluation && (
            <Button
              onClick={handleManualEvaluation}
              disabled={!canTriggerManualEvaluation || evaluationLoading}
              loading={evaluationLoading}
              variant="primary"
              size="small"
              className="flex-1"
            >
              {evaluationLoading ? 'Evaluating...' : 'Check for Upgrade'}
            </Button>
          )}
          
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="secondary"
            size="small"
            className="flex-1"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </Button>
        </div>

        {!canTriggerManualEvaluation && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Manual evaluation available in 1 hour
          </p>
        )}
      </GlassPanel>

      {/* Detailed Requirements Panel */}
      {showDetails && (
        <GlassPanel className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Tier Requirements Details
          </h4>
          
          <div className="space-y-4">
            {progression.requirementsMet.map((requirement, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">
                    {requirement.requirement}
                  </h5>
                  {requirement.met ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">{requirement.current}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Required:</span>
                    <span className="font-medium">{requirement.required}</span>
                  </div>
                  
                  {!requirement.met && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                      Need {requirement.required - requirement.current} more to meet this requirement
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {progression.nextTier && criteria && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">
                {progression.nextTier.charAt(0).toUpperCase() + progression.nextTier.slice(1)} Tier Benefits
              </h5>
              
              {(() => {
                const nextTierCriteria = criteria.find(c => c.tierId === progression.nextTier);
                if (!nextTierCriteria) return null;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="text-sm">
                      <span className="text-gray-600">Listing Limit:</span>
                      <span className="ml-2 font-medium">{nextTierCriteria.benefits.listingLimit}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Commission Rate:</span>
                      <span className="ml-2 font-medium">{nextTierCriteria.benefits.commissionRate}%</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">Analytics:</span>
                      <span className="ml-2 font-medium capitalize">{nextTierCriteria.benefits.analyticsAccess}</span>
                    </div>
                    {nextTierCriteria.benefits.prioritySupport && (
                      <div className="text-sm">
                        <span className="text-gray-600">Priority Support:</span>
                        <span className="ml-2 font-medium text-green-600">✓ Included</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </GlassPanel>
      )}

      {/* Recent Notifications */}
      {showNotifications && notifications && notifications.length > 0 && (
        <GlassPanel className="p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Tier Updates
          </h4>
          
          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification, index) => (
              <div
                key={notification.id || index}
                className={`p-3 rounded-lg border ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <SparklesIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.congratulatoryMessage || `Upgraded to ${notification.toTier}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.upgradeDate || notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
};

export default AutomatedTierUpgradePanel;