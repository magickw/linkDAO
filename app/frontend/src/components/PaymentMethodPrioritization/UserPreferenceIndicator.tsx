/**
 * User Preference Indicator Component
 * Shows previously used payment methods with visual cues and preference learning feedback
 */

import React, { useState } from 'react';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  UserPreferences,
  PaymentMethodPreference,
  RecentPaymentMethod
} from '../../types/paymentPrioritization';

interface UserPreferenceIndicatorProps {
  paymentMethod: PrioritizedPaymentMethod;
  userPreferences: UserPreferences;
  showPreferenceDetails?: boolean;
  showRecommendationReason?: boolean;
  showCostSavings?: boolean;
  onPreferenceUpdate?: (methodType: PaymentMethodType, action: 'prefer' | 'avoid') => void;
  className?: string;
}

const UserPreferenceIndicator: React.FC<UserPreferenceIndicatorProps> = ({
  paymentMethod,
  userPreferences,
  showPreferenceDetails = true,
  showRecommendationReason = true,
  showCostSavings = true,
  onPreferenceUpdate,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return date.toLocaleDateString();
  };

  const getPreferenceData = (): PaymentMethodPreference | null => {
    return userPreferences.preferredMethods.find(
      pref => pref.methodType === paymentMethod.method.type
    ) || null;
  };

  const getRecentUsage = (): RecentPaymentMethod[] => {
    return userPreferences.lastUsedMethods
      .filter(recent => recent.methodType === paymentMethod.method.type)
      .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
      .slice(0, 5); // Show last 5 uses
  };

  const isPreferred = (): boolean => {
    const preference = getPreferenceData();
    return preference ? preference.score > 0.6 : false;
  };

  const isAvoided = (): boolean => {
    return userPreferences.avoidedMethods.includes(paymentMethod.method.type);
  };

  const getPreferenceLevel = (): 'high' | 'medium' | 'low' | 'none' | 'avoided' => {
    if (isAvoided()) return 'avoided';
    
    const preference = getPreferenceData();
    if (!preference) return 'none';
    
    if (preference.score >= 0.8) return 'high';
    if (preference.score >= 0.6) return 'medium';
    if (preference.score >= 0.3) return 'low';
    return 'none';
  };

  const getPreferenceColor = (level: string): string => {
    switch (level) {
      case 'high':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'medium':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'low':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'avoided':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getPreferenceIcon = (level: string): string => {
    switch (level) {
      case 'high':
        return '💚';
      case 'medium':
        return '💙';
      case 'low':
        return '💛';
      case 'avoided':
        return '❌';
      default:
        return '⚪';
    }
  };

  const getPreferenceLabel = (level: string): string => {
    switch (level) {
      case 'high':
        return 'Highly Preferred';
      case 'medium':
        return 'Preferred';
      case 'low':
        return 'Sometimes Used';
      case 'avoided':
        return 'Avoided';
      default:
        return 'No Preference';
    }
  };

  const calculateCostSavings = (): number => {
    const preference = getPreferenceData();
    if (!preference || preference.usageCount === 0) return 0;
    
    // Estimate savings based on average transaction amount and current cost difference
    const avgTransactionAmount = preference.averageTransactionAmount;
    const currentCostRatio = paymentMethod.costEstimate.totalCost / avgTransactionAmount;
    
    // If current cost is lower than historical average, show potential savings
    if (currentCostRatio < 1) {
      return avgTransactionAmount * (1 - currentCostRatio);
    }
    
    return 0;
  };

  const preferenceLevel = getPreferenceLevel();
  const preferenceData = getPreferenceData();
  const recentUsage = getRecentUsage();
  const costSavings = showCostSavings ? calculateCostSavings() : 0;

  if (preferenceLevel === 'none' && recentUsage.length === 0) {
    return null; // Don't show indicator for methods with no preference data
  }

  return (
    <div className={`user-preference-indicator ${className}`}>
      <div className="flex items-center justify-between">
        {/* Main Preference Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`
            flex items-center px-2 py-1 rounded-full text-xs font-medium border
            ${getPreferenceColor(preferenceLevel)}
          `}>
            <span className="mr-1">{getPreferenceIcon(preferenceLevel)}</span>
            <span>{getPreferenceLabel(preferenceLevel)}</span>
          </div>

          {/* Usage Count */}
          {preferenceData && preferenceData.usageCount > 0 && (
            <div className="text-xs text-gray-600">
              Used {preferenceData.usageCount} time{preferenceData.usageCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Last Used */}
          {recentUsage.length > 0 && (
            <div className="text-xs text-gray-500">
              Last used {formatDate(recentUsage[0].usedAt)}
            </div>
          )}
        </div>

        {/* Details Toggle */}
        {showPreferenceDetails && (preferenceData || recentUsage.length > 0) && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {/* Recommendation Reason */}
      {showRecommendationReason && paymentMethod.recommendationReason && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-medium">Why recommended:</span> {paymentMethod.recommendationReason}
        </div>
      )}

      {/* Cost Savings */}
      {costSavings > 0 && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-sm text-green-600 font-medium">
            💰 Potential savings: {formatCurrency(costSavings)}
          </span>
          <span className="text-xs text-gray-500">
            vs. your average transaction cost
          </span>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
          {/* Preference Score Details */}
          {preferenceData && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Preference Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-600">Preference Score:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          preferenceData.score >= 0.7 ? 'bg-green-500' :
                          preferenceData.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${preferenceData.score * 100}%` }}
                      />
                    </div>
                    <span className="font-medium">
                      {Math.round(preferenceData.score * 100)}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Usage Count:</span>
                  <div className="font-medium">{preferenceData.usageCount}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Used:</span>
                  <div className="font-medium">{formatDate(preferenceData.lastUsed)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Avg. Amount:</span>
                  <div className="font-medium">
                    {formatCurrency(preferenceData.averageTransactionAmount)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Usage History */}
          {recentUsage.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Recent Usage
              </h4>
              <div className="space-y-2">
                {recentUsage.map((usage, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`
                        w-2 h-2 rounded-full
                        ${usage.successful ? 'bg-green-500' : 'bg-red-500'}
                      `} />
                      <span className="text-gray-600">
                        {formatDate(usage.usedAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {formatCurrency(usage.transactionAmount)}
                      </span>
                      <span className={`
                        px-1 py-0.5 rounded text-xs
                        ${usage.successful 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'}
                      `}>
                        {usage.successful ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Feedback */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Preference Learning
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                • Your preferences are learned from your transaction history
              </p>
              <p>
                • Methods you use more often get higher preference scores
              </p>
              <p>
                • Recent usage has more impact than older transactions
              </p>
              <p>
                • Successful transactions boost preference more than failed ones
              </p>
            </div>
          </div>

          {/* Preference Actions */}
          {onPreferenceUpdate && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Update Preferences
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => onPreferenceUpdate(paymentMethod.method.type, 'prefer')}
                  className="flex-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 transition-colors"
                >
                  👍 Prefer This Method
                </button>
                <button
                  onClick={() => onPreferenceUpdate(paymentMethod.method.type, 'avoid')}
                  className="flex-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
                >
                  👎 Avoid This Method
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserPreferenceIndicator;