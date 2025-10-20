/**
 * Tier Upgrade Workflow Component
 * Comprehensive workflow for tier upgrades across all seller components
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { SellerTier, TierUpgradeInfo, TIER_ACTIONS } from '../../../types/sellerTier';
import { useTier } from '../../../contexts/TierContext';
import tierManagementService from '../../../services/tierManagementService';
import TierProgressBar from './TierProgressBar';
import TierUpgradeModal from './TierUpgradeModal';

interface TierUpgradeWorkflowProps {
  walletAddress: string;
  currentAction?: string;
  onUpgradeComplete?: () => void;
  className?: string;
}

const TierUpgradeWorkflow: React.FC<TierUpgradeWorkflowProps> = ({
  walletAddress,
  currentAction,
  onUpgradeComplete,
  className = '',
}) => {
  const router = useRouter();
  const { tier, progress, refreshTier } = useTier();
  const [upgradeInfo, setUpgradeInfo] = useState<TierUpgradeInfo | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpgradeInfo = async () => {
      if (!tier) return;

      try {
        setLoading(true);
        setError(null);
        
        const info = await tierManagementService.checkTierUpgradeEligibility(walletAddress);
        setUpgradeInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load upgrade information');
      } finally {
        setLoading(false);
      }
    };

    fetchUpgradeInfo();
  }, [tier, walletAddress]);

  const handleUpgradeAction = async (actionType: string) => {
    try {
      setLoading(true);
      
      switch (actionType) {
        case 'refresh':
          await refreshTier();
          break;
        case 'view_requirements':
          setShowUpgradeModal(true);
          break;
        case 'complete_profile':
          router.push('/marketplace/seller/profile');
          break;
        case 'create_listing':
          router.push('/marketplace/seller/listings/create');
          break;
        case 'verify_email':
          router.push('/marketplace/seller/verification');
          break;
        case 'submit_kyc':
          router.push('/marketplace/seller/kyc');
          break;
        default:
          console.warn('Unknown upgrade action:', actionType);
      }
      
      if (onUpgradeComplete) {
        onUpgradeComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform upgrade action');
    } finally {
      setLoading(false);
    }
  };

  interface ActionRecommendation {
    action: string;
    description: string;
    actionType: string;
    priority: 'high' | 'medium' | 'low';
  }

  const getActionRecommendations = (): ActionRecommendation[] => {
    if (!tier || !upgradeInfo) return [];

    const recommendations: ActionRecommendation[] = [];

    // Check for missing requirements and suggest actions
    upgradeInfo.missingRequirements.forEach(requirement => {
      switch (requirement.type) {
        case 'sales_volume':
          recommendations.push({
            action: 'Increase Sales',
            description: `Complete ${requirement.value - requirement.current} more in sales`,
            actionType: 'create_listing',
            priority: 'high',
          });
          break;
        case 'rating':
          recommendations.push({
            action: 'Improve Rating',
            description: `Maintain ${requirement.value}+ star rating`,
            actionType: 'view_requirements',
            priority: 'medium',
          });
          break;
        case 'reviews':
          recommendations.push({
            action: 'Get More Reviews',
            description: `Receive ${requirement.value - requirement.current} more reviews`,
            actionType: 'create_listing',
            priority: 'medium',
          });
          break;
        case 'verification_status':
          recommendations.push({
            action: 'Complete Verification',
            description: 'Verify your email and complete KYC',
            actionType: 'verify_email',
            priority: 'high',
          });
          break;
      }
    });

    return recommendations;
  };

  const renderUpgradeActions = () => {
    const recommendations = getActionRecommendations();
    
    if (recommendations.length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-gray-400">No specific actions needed at this time.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h4 className="text-white font-medium mb-3">Recommended Actions</h4>
        {recommendations.map((rec, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex-1">
              <h5 className="text-white font-medium">{rec.action}</h5>
              <p className="text-gray-400 text-sm">{rec.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs ${
                rec.priority === 'high' ? 'bg-red-600 text-white' :
                rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                'bg-blue-600 text-white'
              }`}>
                {rec.priority}
              </span>
              <button
                onClick={() => handleUpgradeAction(rec.actionType)}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Take Action'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!tier) {
    return (
      <div className={`tier-upgrade-workflow-loading ${className}`}>
        <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`tier-upgrade-workflow ${className}`}>
      <div className="bg-gray-800 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Tier Upgrade Path</h3>
            <p className="text-gray-400 text-sm">
              {upgradeInfo?.canUpgrade 
                ? 'You\'re ready to upgrade!' 
                : 'Complete requirements to unlock the next tier'
              }
            </p>
          </div>
          
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            View Details
          </button>
        </div>

        {/* Progress */}
        {progress && (
          <div className="mb-6">
            <TierProgressBar progress={progress} showDetails={false} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Upgrade Status */}
        {upgradeInfo && (
          <div className="mb-4">
            {upgradeInfo.canUpgrade ? (
              <div className="bg-green-900 bg-opacity-50 border border-green-500 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-green-400 font-medium">Ready to Upgrade!</h4>
                </div>
                <p className="text-green-300 text-sm mb-3">
                  Congratulations! You've met all requirements for {upgradeInfo.nextTier?.name} tier.
                </p>
                <button
                  onClick={() => handleUpgradeAction('refresh')}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh Tier Status'}
                </button>
              </div>
            ) : (
              <div className="bg-blue-900 bg-opacity-50 border border-blue-500 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">
                  Progress to {upgradeInfo.nextTier?.name} Tier
                </h4>
                <p className="text-blue-300 text-sm">
                  {upgradeInfo.missingRequirements.length} requirement(s) remaining
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Recommendations */}
        {!upgradeInfo?.canUpgrade && renderUpgradeActions()}

        {/* Current Action Context */}
        {currentAction && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-yellow-400 text-sm">
                This action requires {getActionTierRequirement(currentAction)} tier or higher
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <TierUpgradeModal
          currentTier={tier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

// Helper function to get tier requirement for actions
function getActionTierRequirement(action: string): string {
  switch (action) {
    case TIER_ACTIONS.ACCESS_ANALYTICS:
      return 'Silver';
    case TIER_ACTIONS.PRIORITY_SUPPORT:
      return 'Gold';
    case TIER_ACTIONS.CUSTOM_BRANDING:
      return 'Gold';
    case TIER_ACTIONS.FEATURED_PLACEMENT:
      return 'Platinum';
    case TIER_ACTIONS.BULK_OPERATIONS:
      return 'Platinum';
    case TIER_ACTIONS.ADVANCED_TOOLS:
      return 'Diamond';
    default:
      return 'Bronze';
  }
}

export default TierUpgradeWorkflow;