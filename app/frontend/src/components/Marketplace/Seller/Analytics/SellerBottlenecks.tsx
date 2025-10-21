import React, { useState, useEffect } from 'react';
import { sellerAnalyticsService, SellerBottleneckAnalysis } from '../../../../services/sellerAnalyticsService';

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

interface SellerBottlenecksProps {
  sellerId: string;
  bottlenecks?: Array<any>;
  className?: string;
}

export const SellerBottlenecks: React.FC<SellerBottlenecksProps> = ({
  sellerId,
  bottlenecks: initialBottlenecks,
  className = ''
}) => {
  const [bottleneckAnalysis, setBottleneckAnalysis] = useState<SellerBottleneckAnalysis | null>(null);
  const [loading, setLoading] = useState(!initialBottlenecks);
  const [error, setError] = useState<string | null>(null);
  const [expandedBottleneck, setExpandedBottleneck] = useState<number | null>(null);

  useEffect(() => {
    if (!initialBottlenecks) {
      loadBottlenecks();
    }
  }, [sellerId, initialBottlenecks]);

  const loadBottlenecks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sellerAnalyticsService.detectPerformanceBottlenecks(sellerId);
      setBottleneckAnalysis(data);
    } catch (err) {
      console.error('Error loading seller bottlenecks:', err);
      setError('Failed to load bottleneck analysis');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📊';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`seller-bottlenecks ${className}`}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-3">Analyzing performance bottlenecks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`seller-bottlenecks ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadBottlenecks}
            className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const displayBottlenecks = bottleneckAnalysis?.bottlenecks || initialBottlenecks || [];
  const performanceScore = bottleneckAnalysis?.performanceScore || 0;
  const improvementPotential = bottleneckAnalysis?.improvementPotential || 0;

  return (
    <div className={`seller-bottlenecks ${className}`}>
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Performance Bottlenecks</h2>
              <p className="text-sm text-gray-600 mt-1">
                Identify and resolve issues limiting your performance
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getPerformanceScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </div>
              <div className="text-sm text-gray-500">Performance Score</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Current Performance</h3>
                  <p className="text-blue-700 mt-1">Overall system efficiency</p>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {performanceScore}%
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${performanceScore}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Improvement Potential</h3>
                  <p className="text-green-700 mt-1">Possible performance gains</p>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  +{improvementPotential}%
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${improvementPotential}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottlenecks List */}
          {displayBottlenecks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No major bottlenecks detected!
              </h3>
              <p className="text-gray-600">
                Your seller performance is running smoothly. Keep up the great work!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Identified Bottlenecks ({displayBottlenecks.length})
              </h3>
              
              {displayBottlenecks.map((bottleneck, index) => (
                <div
                  key={index}
                  className={`border rounded-lg ${getSeverityColor(bottleneck.severity)}`}
                >
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => setExpandedBottleneck(expandedBottleneck === index ? null : index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className="text-2xl mr-4">
                          {getSeverityIcon(bottleneck.severity)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {bottleneck.area}
                            </h4>
                            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(bottleneck.severity)}`}>
                              {bottleneck.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">
                            {bottleneck.description}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Impact:</strong> {bottleneck.impact}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <svg 
                          className={`w-5 h-5 transform transition-transform ${expandedBottleneck === index ? 'rotate-180' : ''}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expandedBottleneck === index && (
                    <div className="px-6 pb-6 border-t border-gray-200 bg-white bg-opacity-50">
                      <div className="pt-4">
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">Root Cause:</h5>
                          <p className="text-gray-700">{bottleneck.rootCause}</p>
                        </div>

                        {bottleneck.solutions && bottleneck.solutions.length > 0 && (
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 mb-3">Recommended Solutions:</h5>
                            <div className="space-y-3">
                              {bottleneck.solutions.map((solution: { solution: string; effort: 'low' | 'medium' | 'high'; expectedImpact: string; timeframe: string; }, solutionIndex: number) => (
                                <div key={solutionIndex} className="bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <h6 className="font-medium text-gray-900">{solution.solution}</h6>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getEffortColor(solution.effort)}`}>
                                      {solution.effort.toUpperCase()} EFFORT
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{solution.expectedImpact}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Timeframe: {solution.timeframe}</span>
                                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                                      Learn More
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {bottleneck.metrics && Object.keys(bottleneck.metrics).length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Related Metrics:</h5>
                            <div className="bg-white rounded p-3 border border-gray-200">
                              <div className="grid grid-cols-2 gap-4">
                                {Object.entries(bottleneck.metrics).map(([key, value]) => (
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
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Summary */}
          {displayBottlenecks.length > 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Next Steps
              </h3>
              <p className="text-blue-700 mb-4">
                Focus on addressing {displayBottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high').length} high-priority bottlenecks first for maximum impact.
              </p>
              <div className="flex items-center space-x-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
                  Create Action Plan
                </button>
                <button className="text-blue-600 hover:text-blue-800 font-medium">
                  Schedule Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};