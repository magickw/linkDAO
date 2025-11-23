import React, { useState, useEffect } from 'react';
import { sellerPerformanceMonitoringService } from '../../../../services/sellerPerformanceMonitoringService';
import type { PerformanceTestResult } from '../../../../services/sellerPerformanceMonitoringService';
import ErrorBoundary from '../../../ErrorBoundary';

// Simple loading spinner component
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const getSize = () => {
    switch (size) {
      case 'sm': return '16px';
      case 'lg': return '48px';
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

// Test Configuration Component
const TestConfiguration: React.FC<{
  testType: string;
  onTestTypeChange: (type: string) => void;
  onRunTest: () => void;
  isRunning: boolean;
}> = ({ testType, onTestTypeChange, onRunTest, isRunning }) => {
  const testTypes = [
    {
      value: 'load',
      label: 'Load Test',
      description: 'Test normal expected load with typical user behavior',
      icon: '📊'
    },
    {
      value: 'stress',
      label: 'Stress Test',
      description: 'Test beyond normal capacity to find breaking point',
      icon: '⚡'
    },
    {
      value: 'endurance',
      label: 'Endurance Test',
      description: 'Test sustained load over extended period',
      icon: '⏱️'
    },
    {
      value: 'spike',
      label: 'Spike Test',
      description: 'Test sudden increases in load',
      icon: '📈'
    },
    {
      value: 'volume',
      label: 'Volume Test',
      description: 'Test with large amounts of data',
      icon: '💾'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Test Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {testTypes.map((type) => (
              <div
                key={type.value}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  testType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onTestTypeChange(type.value)}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">{type.icon}</span>
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
                <p className="text-xs text-gray-600">{type.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Selected: <span className="font-medium">{testTypes.find(t => t.value === testType)?.label}</span>
          </div>
          <button
            onClick={onRunTest}
            disabled={isRunning}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Running Test...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3z" />
                </svg>
                Run Test
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Test Results Component
const TestResults: React.FC<{ results: PerformanceTestResult[] }> = ({ results }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'failed': return '❌';
      case 'cancelled': return '⏹️';
      default: return '❓';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🧪</div>
          <p className="text-gray-500">No test results yet</p>
          <p className="text-sm text-gray-400 mt-1">Run a performance test to see results here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.testId} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {result.testType.charAt(0).toUpperCase() + result.testType.slice(1)} Test
                  </h4>
                  <p className="text-sm text-gray-500">
                    {new Date(result.startTime).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDuration(result.duration)}
                </span>
              </div>
            </div>

            {result.status === 'completed' && result.results && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {Math.round(result.results.averageResponseTime)}ms
                  </div>
                  <div className="text-xs text-gray-500">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {result.results.successRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {result.results.throughput}
                  </div>
                  <div className="text-xs text-gray-500">Req/sec</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {result.results.errorRate.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">Error Rate</div>
                </div>
              </div>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h5>
                <ul className="list-disc list-inside space-y-1">
                  {result.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600">{rec}</li>
                  ))}
                  {result.recommendations.length > 3 && (
                    <li className="text-sm text-gray-400">
                      +{result.recommendations.length - 3} more recommendations
                    </li>
                  )}
                </ul>
              </div>
            )}

            {result.regressions && result.regressions.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-red-500">⚠️</span>
                  <h5 className="text-sm font-medium text-red-700">
                    {result.regressions.length} Performance Regression{result.regressions.length > 1 ? 's' : ''} Detected
                  </h5>
                </div>
                <div className="space-y-1">
                  {result.regressions.slice(0, 2).map((regression, index) => (
                    <div key={index} className="text-sm text-red-600">
                      {regression.metric}: {regression.regressionPercentage.toFixed(1)}% regression
                    </div>
                  ))}
                  {result.regressions.length > 2 && (
                    <div className="text-sm text-red-400">
                      +{result.regressions.length - 2} more regressions
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Test History Component
const TestHistory: React.FC<{ results: PerformanceTestResult[] }> = ({ results }) => {
  const completedTests = results.filter(r => r.status === 'completed');
  
  if (completedTests.length === 0) {
    return null;
  }

  const averageResponseTime = completedTests.reduce((sum, test) => 
    sum + (test.results?.averageResponseTime || 0), 0) / completedTests.length;
  
  const averageSuccessRate = completedTests.reduce((sum, test) => 
    sum + (test.results?.successRate || 0), 0) / completedTests.length;

  const averageThroughput = completedTests.reduce((sum, test) => 
    sum + (test.results?.throughput || 0), 0) / completedTests.length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Test History Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(averageResponseTime)}ms
          </div>
          <div className="text-sm text-gray-500">Avg Response Time</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {averageSuccessRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Avg Success Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(averageThroughput)}
          </div>
          <div className="text-sm text-gray-500">Avg Throughput</div>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Based on {completedTests.length} completed test{completedTests.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};

// Main Component
interface PerformanceRegressionTesterProps {
  sellerId: string;
  className?: string;
}

export const PerformanceRegressionTester: React.FC<PerformanceRegressionTesterProps> = ({
  sellerId,
  className = ''
}) => {
  const [testType, setTestType] = useState<'load' | 'stress' | 'endurance' | 'spike' | 'volume'>('load');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load existing test results on mount
  useEffect(() => {
    // In a real implementation, you would load historical test results
    // For now, we'll start with an empty array
  }, [sellerId]);

  const handleRunTest = async () => {
    try {
      setIsRunning(true);
      setError(null);

      const result = await sellerPerformanceMonitoringService.runPerformanceRegressionTest(
        sellerId,
        testType
      );

      setTestResults(prev => [result, ...prev]);
    } catch (err) {
      console.error('Error running performance test:', err);
      setError('Failed to run performance test. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className={`performance-regression-tester ${className} space-y-6`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Regression Testing</h1>
              <p className="text-sm text-gray-500 mt-1">
                Automated performance testing for seller {sellerId}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🧪 Testing Suite
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Test Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Test Configuration */}
        <TestConfiguration
          testType={testType}
          onTestTypeChange={(type) => setTestType(type as any)}
          onRunTest={handleRunTest}
          isRunning={isRunning}
        />

        {/* Test History Summary */}
        <TestHistory results={testResults} />

        {/* Test Results */}
        <TestResults results={testResults} />
      </div>
    </ErrorBoundary>
  );
};

export default PerformanceRegressionTester;