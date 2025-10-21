import React from 'react';
import { SellerTierProgression as TierProgressionType } from '../../../services/sellerAnalyticsService';

interface SellerTierProgressionProps {
  tierProgression: TierProgressionType;
  className?: string;
}

export const SellerTierProgression: React.FC<SellerTierProgressionProps> = ({
  tierProgression,
  className = ''
}) => {
  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'diamond': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      case 'diamond': return '💠';
      default: return '🏆';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeToNextTier = (days: number) => {
    if (days <= 0) return 'Eligible now!';
    if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
    if (days < 30) return `${Math.ceil(days / 7)} week${Math.ceil(days / 7) === 1 ? '' : 's'}`;
    return `${Math.ceil(days / 30)} month${Math.ceil(days / 30) === 1 ? '' : 's'}`;
  };

  return (
    <div className={`seller-tier-progression ${className}`}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Seller Tier Progression</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track your progress and unlock new benefits
          </p>
        </div>

        <div className="p-6">
          {/* Current Tier Status */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(tierProgression.currentTier)}`}>
                <span className="mr-2">{getTierIcon(tierProgression.currentTier)}</span>
                {tierProgression.currentTier} Tier
              </div>
              {tierProgression.nextTier && (
                <>
                  <div className="mx-4 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(tierProgression.nextTier)}`}>
                    <span className="mr-2">{getTierIcon(tierProgression.nextTier)}</span>
                    {tierProgression.nextTier} Tier
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {tierProgression.progressPercentage}%
              </div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progress to {tierProgression.nextTier || 'Next'} Tier
              </span>
              <span className="text-sm text-gray-500">
                {tierProgression.nextTier ? formatTimeToNextTier(tierProgression.estimatedTimeToNextTier) : 'Max tier reached'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(tierProgression.progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Requirements */}
          {tierProgression.requirements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Requirements for {tierProgression.nextTier || 'Next'} Tier
              </h3>
              <div className="space-y-3">
                {tierProgression.requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-3 ${
                        requirement.met 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {requirement.met ? (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 bg-current rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{requirement.metric}</div>
                        <div className="text-sm text-gray-600">{requirement.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${requirement.met ? 'text-green-600' : 'text-gray-900'}`}>
                        {typeof requirement.current === 'number' && requirement.current > 1000 
                          ? requirement.current.toLocaleString() 
                          : requirement.current}
                        {typeof requirement.required === 'number' && ` / ${requirement.required.toLocaleString()}`}
                      </div>
                      {!requirement.met && (
                        <div className="text-sm text-gray-500">
                          {typeof requirement.required === 'number' && typeof requirement.current === 'number' && 
                            `${((requirement.current / requirement.required) * 100).toFixed(0)}% complete`
                          }
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Tier Benefits */}
          {tierProgression.benefits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Tier Benefits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierProgression.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-shrink-0 w-5 h-5 text-green-600 mt-0.5">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{benefit.description}</div>
                      <div className="text-sm text-green-600 font-medium">{benefit.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {tierProgression.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recommendations to Advance
              </h3>
              <div className="space-y-3">
                {tierProgression.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium mr-3 mt-0.5 ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {recommendation.action}
                      </div>
                      <div className="text-sm text-gray-600">
                        {recommendation.impact}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Learn More
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Next Tier Message */}
          {!tierProgression.nextTier && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Congratulations! You've reached the highest tier.
              </h3>
              <p className="text-gray-600">
                Continue providing excellent service to maintain your {tierProgression.currentTier} status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};