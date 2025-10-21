import React, { useState, useEffect } from 'react';
import { sellerAnalyticsService, SellerPerformanceInsights } from '../../../../services/sellerAnalyticsService';

// Simple loading spinner component to avoid import issues
const LoadingSpinner = ({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) => {
  const getSize = () => {
    switch (size) {
      case 'small': return '16px';
      case 'large': return '48px';
      default: return '32px';
    }
  };

  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
      
      <style jsx>{`
        .loading-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: ${getSize()};
          height: ${getSize()};
          border: 2px solid transparent;
          border-top: 2px solid var(--primary-color, #0070f3);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

interface SellerInsightsProps {
  sellerId: string;
  insights?: Array<any>;
  className?: string;
}

export const SellerInsights: React.FC<SellerInsightsProps> = ({
  sellerId,
  insights: initialInsights,
  className = ''
}) => {
  const [insights, setInsights] = useState<SellerPerformanceInsights | null>(null);
  const [loading, setLoading] = useState(!initialInsights);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialInsights) {
      loadInsights();
    }
  }, [sellerId, initialInsights]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sellerAnalyticsService.getSellerPerformanceInsights(sellerId);
      setInsights(data);
    } catch (err) {
      console.error('Error loading seller insights:', err);
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return '🚀';
      case 'warning': return '⚠️';
      case 'achievement': return '🏆';
      case 'recommendation': return '💡';
      default: return '📊';
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    const baseColors = {
      opportunity: 'blue',
      warning: 'yellow',
      achievement: 'green',
      recommendation: 'purple'
    };
    
    const color = baseColors[type as keyof typeof baseColors] || 'gray';
    const intensity = impact === 'high' ? '600' : impact === 'medium' ? '500' : '400';
    
    return {
      bg: `bg-${color}-50`,
      border: `border-${color}-200`,
      text: `text-${color}-${intensity}`,
      button: `text-${color}-600 hover:text-${color}-800`
    };
  };

  if (loading) {
    return (
      <div className={`seller-insights ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-3">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`seller-insights ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadInsights}
            className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayInsights = insights?.insights || initialInsights || [];

  return (
    <div className={`seller-insights ${className}`}>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Performance Insights</h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered recommendations to improve your seller performance
          </p>
        </div>

        <div className="p-6">
          {displayInsights.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No insights available yet
              </h3>
              <p className="text-gray-600">
                Keep selling and we'll provide personalized insights to help you grow.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {displayInsights.map((insight, index) => {
                const colors = getInsightColor(insight.type, insight.impact);
                
                return (
                  <div
                    key={index}
                    className={`p-6 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="text-2xl mr-4">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {insight.title}
                            </h3>
                            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.text} bg-white border`}>
                              {insight.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
                          <p className="text-gray-700 mb-4">
                            {insight.description}
                          </p>
                          
                          {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Suggested Actions:
                              </h4>
                              <ul className="space-y-1">
                                {insight.suggestedActions.map((action: string, actionIndex: number) => (
                                  <li key={actionIndex} className="flex items-start">
                                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2"></div>
                                    <span className="text-sm text-gray-600">{action}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {insight.metrics && Object.keys(insight.metrics).length > 0 && (
                            <div className="bg-white bg-opacity-50 rounded p-3">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Related Metrics:
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(insight.metrics).map(([key, value]) => (
                                  <div key={key} className="text-sm">
                                    <span className="text-gray-600 capitalize">
                                      {key.replace(/_/g, ' ')}:
                                    </span>
                                    <span className="ml-1 font-medium text-gray-900">
                                      {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {insight.actionable && (
                          <button className={`text-sm font-medium ${colors.button}`}>
                            Take Action
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};