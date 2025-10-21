/**
 * Tier Upgrade Modal Component
 * Modal for displaying tier upgrade information and workflows
 */

import React, { useState, useEffect } from 'react';
import { SellerTier, TierUpgradeInfo } from '../../../../types/sellerTier';
import { useTier } from '../../../../contexts/TierContext';
import tierManagementService from '../../../../services/tierManagementService';
import TierProgressBar from './TierProgressBar';

interface TierUpgradeModalProps {
  currentTier: SellerTier;
  onClose: () => void;
}

const TierUpgradeModal: React.FC<TierUpgradeModalProps> = ({
  currentTier,
  onClose,
}) => {
  const { progress, refreshTier } = useTier();
  const [upgradeInfo, setUpgradeInfo] = useState<TierUpgradeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpgradeInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get upgrade eligibility information
        const info = await tierManagementService.checkTierUpgradeEligibility(currentTier.id);
        setUpgradeInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load upgrade information');
      } finally {
        setLoading(false);
      }
    };

    fetchUpgradeInfo();
  }, [currentTier.id]);

  const handleRefreshTier = async () => {
    try {
      await refreshTier();
      onClose();
    } catch (err) {
      console.error('Failed to refresh tier:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Tier Upgrade Information</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading upgrade information...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Progress */}
              {progress && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Current Progress</h3>
                  <TierProgressBar progress={progress} showDetails={true} />
                </div>
              )}

              {/* Upgrade Information */}
              {upgradeInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {upgradeInfo.canUpgrade ? 'Ready to Upgrade!' : 'Upgrade Requirements'}
                  </h3>

                  {upgradeInfo.canUpgrade ? (
                    <div className="bg-green-900 bg-opacity-50 border border-green-500 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <svg className="w-6 h-6 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h4 className="text-green-400 font-medium">Congratulations!</h4>
                      </div>
                      <p className="text-green-300">
                        You've met all requirements for {upgradeInfo.nextTier?.name} tier. 
                        Your tier will be automatically updated within 24 hours, or you can refresh now.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-blue-900 bg-opacity-50 border border-blue-500 rounded-lg p-4 mb-4">
                      <h4 className="text-blue-400 font-medium mb-2">Missing Requirements</h4>
                      <div className="space-y-2">
                        {upgradeInfo.missingRequirements.map((requirement, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-blue-300">{requirement.description}</span>
                            <span className="text-blue-400 text-sm">
                              {requirement.current} / {requirement.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Tier Benefits */}
                  {upgradeInfo.nextTier && (
                    <div>
                      <h4 className="text-white font-medium mb-3">
                        {upgradeInfo.nextTier.name} Tier Benefits
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {upgradeInfo.nextTier.benefits.map((benefit, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="text-gray-300 text-sm">{benefit.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upgrade Actions */}
                  {upgradeInfo.upgradeActions.length > 0 && (
                    <div>
                      <h4 className="text-white font-medium mb-3">Recommended Actions</h4>
                      <div className="space-y-2">
                        {upgradeInfo.upgradeActions.map((action, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-300 text-sm">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estimated Time */}
                  {upgradeInfo.estimatedTimeToUpgrade && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-400 text-sm">Estimated time to upgrade:</span>
                        <span className="text-blue-400 font-medium">{upgradeInfo.estimatedTimeToUpgrade}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
          
          <div className="flex space-x-3">
            {upgradeInfo?.canUpgrade && (
              <button
                onClick={handleRefreshTier}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Refresh Tier Status
              </button>
            )}
            
            <button
              onClick={() => window.open('/seller/tier-guide', '_blank')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Tier Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierUpgradeModal;