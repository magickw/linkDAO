/**
 * Tier Upgrade Prompt Component
 * Displays upgrade prompts and tier progression information
 */

import React, { useState } from 'react';
import { SellerTier } from '../../../../types/sellerTier';
import { useTier } from '../../../../contexts/TierContext';
import TierProgressBar from './TierProgressBar';
import TierUpgradeModal from './TierUpgradeModal';

interface TierUpgradePromptProps {
  currentTier: SellerTier;
  requiredLevel?: number;
  message: string;
  alternativeAction?: string;
  compact?: boolean;
  className?: string;
}

const TierUpgradePrompt: React.FC<TierUpgradePromptProps> = ({
  currentTier,
  requiredLevel,
  message,
  alternativeAction,
  compact = false,
  className = '',
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { progress } = useTier();

  const handleUpgradeClick = () => {
    setShowUpgradeModal(true);
  };

  const handleCloseModal = () => {
    setShowUpgradeModal(false);
  };

  if (compact) {
    return (
      <div className={`tier-upgrade-prompt-compact ${className}`}>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-lg">{currentTier.icon}</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">
                  {message}
                </p>
                {alternativeAction && (
                  <p className="text-xs text-blue-700 mt-1">
                    {alternativeAction}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleUpgradeClick}
              className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>

        {showUpgradeModal && (
          <TierUpgradeModal
            currentTier={currentTier}
            onClose={handleCloseModal}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`tier-upgrade-prompt ${className}`}>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-xl p-6">
        <div className="text-center">
          {/* Current Tier Badge */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-md mb-4">
            <span className="text-2xl">{currentTier.icon}</span>
          </div>

          {/* Tier Name and Level */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {currentTier.name} Tier
          </h3>

          {/* Main Message */}
          <p className="text-gray-700 mb-4">
            {message}
          </p>

          {/* Alternative Action */}
          {alternativeAction && (
            <p className="text-sm text-blue-700 font-medium mb-4">
              {alternativeAction}
            </p>
          )}

          {/* Progress Bar */}
          {progress && (
            <div className="mb-6">
              <TierProgressBar progress={progress} showDetails={true} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleUpgradeClick}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              View Upgrade Path
            </button>

            <button
              onClick={() => window.open('/seller/tier-benefits', '_blank')}
              className="inline-flex items-center justify-center px-6 py-3 border border-blue-300 text-base font-medium rounded-lg text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Learn More
            </button>
          </div>

          {/* Benefits Preview */}
          {requiredLevel && (
            <div className="mt-6 pt-6 border-t border-blue-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                What you'll get with the next tier:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Higher listing limits
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lower commission rates
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced analytics
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpgradeModal && (
        <TierUpgradeModal
          currentTier={currentTier}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default TierUpgradePrompt;