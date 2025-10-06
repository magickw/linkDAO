/**
 * CrossFeatureInsights Component
 * Shows insights about cross-feature usage patterns
 */

import React from 'react';

interface CrossFeatureInsightsProps {
  insights: any;
  onInsightClick: (insight: any) => void;
}

export const CrossFeatureInsights: React.FC<CrossFeatureInsightsProps> = ({
  insights,
  onInsightClick
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500">📈</span>;
      case 'down':
        return <span className="text-red-500">📉</span>;
      default:
        return <span className="text-gray-500">➡️</span>;
    }
  };

  return (
    <div className="cross-feature-insights">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Cross-Feature Insights
      </h3>

      {/* Feature Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Feature Usage Patterns
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(insights.featureUsage).map(([feature, data]: [string, any]) => (
            <div
              key={feature}
              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer"
              onClick={() => onInsightClick({ feature, ...data })}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {feature}
                </span>
                {getTrendIcon(data.trend)}
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {data.usage}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Features */}
      {insights.recommendedFeatures.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Recommended Features
          </h4>
          <div className="space-y-3">
            {insights.recommendedFeatures.map((recommendation: any, index: number) => (
              <div
                key={index}
                className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onInsightClick(recommendation)}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {recommendation.feature}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {recommendation.reason}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {recommendation.potentialBenefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossFeatureInsights;