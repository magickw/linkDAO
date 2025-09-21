/**
 * Error Handling Test Page
 * Demonstrates all error handling and fallback systems
 */

import React, { useState } from 'react';
import {
  ErrorBoundary,
  ContentCreationErrorBoundary,
  WalletErrorBoundary,
  FeedErrorBoundary,
  GracefulDegradation,
  FallbackContent,
  CachedContentFallback,
  ProgressiveLoadingFallback,
  MaintenanceFallback,
  OfflineIndicator,
  OfflineQueueViewer,
  OfflineBanner,
  useErrorHandler,
  useOfflineSupport,
  ErrorCategory
} from '../components/ErrorHandling';

// Component that throws errors for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean; errorType: string }> = ({
  shouldThrow,
  errorType
}) => {
  if (shouldThrow) {
    throw new Error(`Test ${errorType} error`);
  }
  return <div className="p-4 bg-green-100 rounded">Component working normally</div>;
};

// Component that simulates network operations
const NetworkOperationComponent: React.FC = () => {
  const { error, isLoading, executeWithErrorHandling, retry, clearError } = useErrorHandler({
    category: ErrorCategory.NETWORK
  });

  const simulateNetworkOperation = async () => {
    await executeWithErrorHandling(async () => {
      // Simulate random failure
      if (Math.random() < 0.5) {
        throw new Error('Network request failed');
      }
      return { success: true };
    });
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700 mb-2">{error.userMessage}</p>
        <div className="space-x-2">
          <button
            onClick={retry}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
          <button
            onClick={clearError}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <button
        onClick={simulateNetworkOperation}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Loading...' : 'Simulate Network Operation'}
      </button>
    </div>
  );
};

// Component that demonstrates offline functionality
const OfflineTestComponent: React.FC = () => {
  const { isOnline, queueAction, syncNow, queuedActions } = useOfflineSupport();

  const handleOfflineAction = () => {
    queueAction('TEST_ACTION', { message: 'Test offline action' }, { priority: 'high' });
  };

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded">
      <div className="flex items-center space-x-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-medium">
          Status: {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <div className="space-x-2 mb-3">
        <button
          onClick={handleOfflineAction}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Queue Action
        </button>
        
        {isOnline && queuedActions.length > 0 && (
          <button
            onClick={syncNow}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Sync Now
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-600">
        Queued actions: {queuedActions.length}
      </p>
    </div>
  );
};

export default function TestErrorHandling() {
  const [throwError, setThrowError] = useState(false);
  const [errorType, setErrorType] = useState('generic');
  const [fallbackType, setFallbackType] = useState<'feed' | 'profile' | 'wallet' | 'notifications' | 'search' | 'generic'>('feed');
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateProgressiveLoading = () => {
    setShowProgressiveLoading(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowProgressiveLoading(false);
          return 0;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <OfflineBanner />
      <OfflineIndicator />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Error Handling & Fallback Systems Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Error Boundary Tests */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Error Boundary Tests</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={throwError}
                      onChange={(e) => setThrowError(e.target.checked)}
                      className="mr-2"
                    />
                    Throw Error
                  </label>
                  
                  <select
                    value={errorType}
                    onChange={(e) => setErrorType(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    <option value="generic">Generic</option>
                    <option value="network">Network</option>
                    <option value="wallet">Wallet</option>
                    <option value="content">Content</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium mb-2">Content Creation Error Boundary</h3>
                    <ContentCreationErrorBoundary>
                      <ErrorThrowingComponent shouldThrow={throwError && errorType === 'content'} errorType="content creation" />
                    </ContentCreationErrorBoundary>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Wallet Error Boundary</h3>
                    <WalletErrorBoundary>
                      <ErrorThrowingComponent shouldThrow={throwError && errorType === 'wallet'} errorType="wallet" />
                    </WalletErrorBoundary>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Feed Error Boundary</h3>
                    <FeedErrorBoundary>
                      <ErrorThrowingComponent shouldThrow={throwError && errorType === 'network'} errorType="feed" />
                    </FeedErrorBoundary>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Network Operation Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Network Error Handling</h2>
              <NetworkOperationComponent />
            </div>
            
            {/* Offline Support Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Offline Support</h2>
              <OfflineTestComponent />
            </div>
          </div>
          
          {/* Fallback Content Tests */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Fallback Content</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="font-medium">Fallback Type:</label>
                  <select
                    value={fallbackType}
                    onChange={(e) => setFallbackType(e.target.value as any)}
                    className="px-3 py-1 border border-gray-300 rounded"
                  >
                    <option value="feed">Feed</option>
                    <option value="profile">Profile</option>
                    <option value="wallet">Wallet</option>
                    <option value="notifications">Notifications</option>
                    <option value="search">Search</option>
                    <option value="generic">Generic</option>
                  </select>
                </div>
                
                <FallbackContent
                  type={fallbackType}
                  message="This is a test fallback message"
                  onRetry={() => alert('Retry clicked!')}
                />
              </div>
            </div>
            
            {/* Progressive Loading Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Progressive Loading</h2>
              
              <div className="space-y-4">
                <button
                  onClick={simulateProgressiveLoading}
                  disabled={showProgressiveLoading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {showProgressiveLoading ? 'Loading...' : 'Start Progressive Loading'}
                </button>
                
                {showProgressiveLoading && (
                  <ProgressiveLoadingFallback
                    progress={progress}
                    stage={`Loading stage ${Math.floor(progress / 25) + 1}`}
                  />
                )}
              </div>
            </div>
            
            {/* Cached Content Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Cached Content</h2>
              
              <CachedContentFallback
                cachedData={{
                  posts: [
                    { id: 1, title: 'Cached Post 1', author: 'User A' },
                    { id: 2, title: 'Cached Post 2', author: 'User B' }
                  ],
                  timestamp: new Date().toISOString()
                }}
                lastUpdated={new Date(Date.now() - 300000)} // 5 minutes ago
                onRefresh={() => alert('Refresh clicked!')}
              />
            </div>
            
            {/* Maintenance Mode Test */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Maintenance Mode</h2>
              
              <MaintenanceFallback estimatedTime="2 hours" />
            </div>
          </div>
        </div>
        
        {/* Graceful Degradation Examples */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Graceful Degradation Examples</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Enhanced Post Composer</h3>
              <GracefulDegradation
                feature="Enhanced Post Composer"
                category={ErrorCategory.CONTENT}
                fallback={
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded resize-none"
                      placeholder="What's on your mind? (Basic mode)"
                      rows={3}
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm text-gray-500">Basic posting mode</span>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Post
                      </button>
                    </div>
                  </div>
                }
              >
                <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
                  Enhanced post composer loaded successfully!
                </div>
              </GracefulDegradation>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Token Reactions</h3>
              <GracefulDegradation
                feature="Token Reactions"
                category={ErrorCategory.BLOCKCHAIN}
                fallback={
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      👍 Like
                    </button>
                    <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      💬 Comment
                    </button>
                    <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      🔄 Share
                    </button>
                  </div>
                }
              >
                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-orange-100 rounded hover:bg-orange-200">
                    🔥 Fire (1 token)
                  </button>
                  <button className="px-3 py-1 bg-blue-100 rounded hover:bg-blue-200">
                    🚀 Rocket (2 tokens)
                  </button>
                  <button className="px-3 py-1 bg-purple-100 rounded hover:bg-purple-200">
                    💎 Diamond (5 tokens)
                  </button>
                </div>
              </GracefulDegradation>
            </div>
          </div>
        </div>
        
        {/* Offline Queue Viewer */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Offline Queue</h2>
          <OfflineQueueViewer />
        </div>
      </div>
    </div>
  );
}