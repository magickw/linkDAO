/**
 * Preference Learning Feedback Component
 * Displays recommendation reasons and cost savings with learning insights
 */

import React, { useState } from 'react';
import {
  PrioritizedPaymentMethod,
  PaymentMethodType,
  UserPreferences,
  PrioritizationRecommendation
} from '../../types/paymentPrioritization';

interface PreferenceLearningFeedbackProps {
  paymentMethods: PrioritizedPaymentMethod[];
  userPreferences: UserPreferences;
  recommendations: PrioritizationRecommendation[];
  selectedMethod?: PrioritizedPaymentMethod;
  onFeedback?: (methodType: PaymentMethodType, feedback: 'helpful' | 'not_helpful', reason?: string) => void;
  showLearningInsights?: boolean;
  className?: string;
}

const PreferenceLearningFeedback: React.FC<PreferenceLearningFeedbackProps> = ({
  paymentMethods,
  userPreferences,
  recommendations,
  selectedMethod,
  onFeedback,
  showLearningInsights = true,
  className = ''
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [showInsights, setShowInsights] = useState(false);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getMethodIcon = (methodType: PaymentMethodType): string => {
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
        return '🪙';
      case PaymentMethodType.STABLECOIN_USDT:
        return '💰';
      case PaymentMethodType.FIAT_STRIPE:
        return '💳';
      case PaymentMethodType.NATIVE_ETH:
        return '💎';
      default:
        return '💸';
    }
  };

  const getRecommendationIcon = (type: string): string => {
    switch (type) {
      case 'cost_savings':
        return '💰';
      case 'speed':
        return '⚡';
      case 'security':
        return '🔒';
      case 'convenience':
        return '✨';
      default:
        return '💡';
    }
  };

  const calculateTotalSavings = (): number => {
    return recommendations
      .filter(rec => rec.potentialSavings)
      .reduce((total, rec) => total + (rec.potentialSavings || 0), 0);
  };

  const getPersonalizedInsights = () => {
    const insights = [];
    
    // Analyze user's preference patterns
    const preferredMethods = userPreferences.preferredMethods
      .filter(pref => pref.score > 0.6)
      .sort((a, b) => b.score - a.score);

    if (preferredMethods.length > 0) {
      const topPreference = preferredMethods[0];
      insights.push({
        type: 'preference_pattern',
        icon: '📊',
        title: 'Your Payment Pattern',
        message: `You typically prefer ${topPreference.methodType.replace('_', ' ').toLowerCase()} with ${topPreference.usageCount} successful transactions.`
      });
    }

    // Analyze cost sensitivity
    const avgTransactionAmount = userPreferences.preferredMethods.reduce(
      (sum, pref) => sum + pref.averageTransactionAmount, 0
    ) / Math.max(userPreferences.preferredMethods.length, 1);

    if (avgTransactionAmount > 0) {
      const currentCostRatio = selectedMethod 
        ? (selectedMethod.costEstimate.gasFee / avgTransactionAmount) * 100
        : 0;

      if (currentCostRatio > 5) {
        insights.push({
          type: 'cost_sensitivity',
          icon: '📈',
          title: 'Cost Impact Analysis',
          message: `Gas fees represent ${currentCostRatio.toFixed(1)}% of your typical transaction amount. Consider alternatives to reduce costs.`
        });
      }
    }

    // Network usage patterns
    const recentNetworks = userPreferences.lastUsedMethods
      .map(method => method.chainId)
      .filter(chainId => chainId !== undefined);

    if (recentNetworks.length > 0) {
      const mostUsedNetwork = recentNetworks.reduce((a, b, i, arr) =>
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      );

      insights.push({
        type: 'network_preference',
        icon: '🌐',
        title: 'Network Usage',
        message: `You frequently use network ${mostUsedNetwork}. Methods on this network may be prioritized for you.`
      });
    }

    return insights;
  };

  const handleFeedback = (methodType: PaymentMethodType, feedback: 'helpful' | 'not_helpful') => {
    const feedbackKey = `${methodType}-${feedback}`;
    setFeedbackGiven(prev => new Set([...prev, feedbackKey]));
    onFeedback?.(methodType, feedback);
  };

  const totalSavings = calculateTotalSavings();
  const personalizedInsights = showLearningInsights ? getPersonalizedInsights() : [];

  return (
    <div className={`preference-learning-feedback ${className}`}>
      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              💡 Smart Recommendations
            </h3>
            {totalSavings > 0 && (
              <div className="text-sm font-medium text-green-600">
                Total potential savings: {formatCurrency(totalSavings)}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {recommendations.map((recommendation, index) => {
              const suggestedMethod = paymentMethods.find(
                method => method.method.type === recommendation.suggestedMethod
              );
              const feedbackKey = `${recommendation.suggestedMethod}-helpful`;
              const hasFeedback = feedbackGiven.has(feedbackKey) || feedbackGiven.has(`${recommendation.suggestedMethod}-not_helpful`);

              return (
                <div
                  key={index}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getRecommendationIcon(recommendation.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-blue-900 capitalize">
                          {recommendation.type.replace('_', ' ')}
                        </h4>
                        {suggestedMethod && (
                          <span className="text-sm text-blue-700">
                            {getMethodIcon(recommendation.suggestedMethod)} {suggestedMethod.method.name}
                          </span>
                        )}
                      </div>
                      <p className="text-blue-800 text-sm mb-3">
                        {recommendation.message}
                      </p>

                      {/* Recommendation Details */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-blue-700">
                          {recommendation.potentialSavings && (
                            <span className="font-medium">
                              💰 Save {formatCurrency(recommendation.potentialSavings)}
                            </span>
                          )}
                          {recommendation.estimatedTimeDifference && (
                            <span className="font-medium">
                              ⚡ {recommendation.estimatedTimeDifference > 0 ? '+' : ''}{recommendation.estimatedTimeDifference} min
                            </span>
                          )}
                        </div>

                        {/* Feedback Buttons */}
                        {onFeedback && !hasFeedback && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-blue-600">Helpful?</span>
                            <button
                              onClick={() => handleFeedback(recommendation.suggestedMethod, 'helpful')}
                              className="px-2 py-1 text-xs text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200 transition-colors"
                            >
                              👍 Yes
                            </button>
                            <button
                              onClick={() => handleFeedback(recommendation.suggestedMethod, 'not_helpful')}
                              className="px-2 py-1 text-xs text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 transition-colors"
                            >
                              👎 No
                            </button>
                          </div>
                        )}

                        {hasFeedback && (
                          <div className="text-xs text-gray-600">
                            Thanks for your feedback! 🙏
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Personalized Insights */}
      {personalizedInsights.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              🧠 Personalized Insights
            </h3>
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showInsights ? 'Hide Insights' : 'Show Insights'}
            </button>
          </div>

          {showInsights && (
            <div className="space-y-3">
              {personalizedInsights.map((insight, index) => (
                <div
                  key={index}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-2xl">
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 mb-1">
                        {insight.title}
                      </h4>
                      <p className="text-purple-800 text-sm">
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Learning Progress */}
      {userPreferences.preferredMethods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📚 Learning Progress
          </h3>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Methods Learned:</span>
                <div className="font-semibold text-lg">
                  {userPreferences.preferredMethods.length}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Total Transactions:</span>
                <div className="font-semibold text-lg">
                  {userPreferences.preferredMethods.reduce((sum, pref) => sum + pref.usageCount, 0)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Learning Confidence:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (userPreferences.preferredMethods.length / 4) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="font-semibold text-sm">
                    {Math.min(100, Math.round((userPreferences.preferredMethods.length / 4) * 100))}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-600">
              <p>
                💡 The more you use different payment methods, the better our recommendations become.
                We learn from your successful transactions to suggest the best options for you.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cost Savings Summary */}
      {selectedMethod && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">
            💰 Cost Impact Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-700">Selected Method:</span>
              <div className="font-semibold">
                {selectedMethod.method.name}
              </div>
            </div>
            <div>
              <span className="text-green-700">Total Cost:</span>
              <div className="font-semibold">
                {formatCurrency(selectedMethod.costEstimate.totalCost)}
              </div>
            </div>
            <div>
              <span className="text-green-700">Gas Fee:</span>
              <div className="font-semibold">
                {selectedMethod.costEstimate.gasFee === 0 
                  ? 'Free' 
                  : formatCurrency(selectedMethod.costEstimate.gasFee)
                }
              </div>
            </div>
            <div>
              <span className="text-green-700">Recommendation Reason:</span>
              <div className="font-semibold text-xs">
                {selectedMethod.recommendationReason}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferenceLearningFeedback;