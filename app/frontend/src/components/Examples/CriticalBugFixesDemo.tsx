import React, { useState } from 'react';
import { Package, Users, FileText, Settings, Zap } from 'lucide-react';
import { ResilientPostCreator } from '../Posts/ResilientPostCreator';
import { ResilientCommunityCreator } from '../Communities/ResilientCommunityCreator';
import { ResilientListingCreator } from '../Marketplace/Listing/ResilientListingCreator';
import { EnhancedStatusIndicator } from '../Status/EnhancedStatusIndicator';

type DemoMode = 'posts' | 'communities' | 'listings' | 'status';

export const CriticalBugFixesDemo: React.FC = () => {
  const [activeMode, setActiveMode] = useState<DemoMode>('posts');
  const [statusDemo, setStatusDemo] = useState<'idle' | 'loading' | 'success' | 'error' | 'queued' | 'retrying' | 'offline'>('idle');

  const modes = [
    {
      key: 'posts' as const,
      label: 'Post Creation',
      icon: FileText,
      description: 'Resilient post creation with 503 error handling and retry logic'
    },
    {
      key: 'communities' as const,
      label: 'Community Creation',
      icon: Users,
      description: 'Community creation with action queuing when backend is unavailable'
    },
    {
      key: 'listings' as const,
      label: 'Product Listings',
      icon: Package,
      description: 'Product listing creation with draft storage during outages'
    },
    {
      key: 'status' as const,
      label: 'Status Indicators',
      icon: Settings,
      description: 'Enhanced user feedback with clear retry options and status indicators'
    }
  ];

  const handlePostCreated = (postId: string) => {
    console.log('Post created successfully:', postId);
  };

  const handlePostQueued = (actionId: string) => {
    console.log('Post queued for later processing:', actionId);
  };

  const handleCommunityCreated = (communityId: string) => {
    console.log('Community created successfully:', communityId);
  };

  const handleCommunityQueued = (actionId: string) => {
    console.log('Community queued for later processing:', actionId);
  };

  const handleListingCreated = (listingId: string) => {
    console.log('Listing created successfully:', listingId);
  };

  const handleListingQueued = (actionId: string) => {
    console.log('Listing queued for later processing:', actionId);
  };

  const simulateStatusChange = (status: typeof statusDemo) => {
    setStatusDemo(status);
    
    // Auto-reset after demonstration
    if (status !== 'idle') {
      setTimeout(() => setStatusDemo('idle'), 5000);
    }
  };

  const renderContent = () => {
    switch (activeMode) {
      case 'posts':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Enhanced Post Creation Features</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Graceful handling of 503 Service Unavailable errors</li>
                <li>• Automatic retry with exponential backoff (up to 3 attempts)</li>
                <li>• Circuit breaker pattern to prevent cascading failures</li>
                <li>• Action queuing when backend is unavailable</li>
                <li>• Real-time status indicators with retry options</li>
              </ul>
            </div>
            
            <ResilientPostCreator
              onPostCreated={handlePostCreated}
              onPostQueued={handlePostQueued}
            />
          </div>
        );

      case 'communities':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Enhanced Community Creation Features</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Resilient API calls with circuit breaker protection</li>
                <li>• Automatic queuing when service is degraded</li>
                <li>• Enhanced error messages with specific guidance</li>
                <li>• Form data preservation during retry attempts</li>
                <li>• Visual feedback for different error types</li>
              </ul>
            </div>
            
            <ResilientCommunityCreator
              onCommunityCreated={handleCommunityCreated}
              onCommunityQueued={handleCommunityQueued}
            />
          </div>
        );

      case 'listings':
        return (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">Enhanced Product Listing Features</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Draft storage with auto-save functionality</li>
                <li>• Fallback to local storage during outages</li>
                <li>• Circuit breaker integration for marketplace API</li>
                <li>• Comprehensive form validation and error handling</li>
                <li>• Progress indicators and estimated completion times</li>
              </ul>
            </div>
            
            <ResilientListingCreator
              onListingCreated={handleListingCreated}
              onListingQueued={handleListingQueued}
            />
          </div>
        );

      case 'status':
        return (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Enhanced Status Indicator Features</h3>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Clear visual feedback for different states</li>
                <li>• Retry buttons with progress tracking</li>
                <li>• Estimated completion times</li>
                <li>• Contextual error messages and suggestions</li>
                <li>• Dismissible notifications</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => simulateStatusChange('loading')}
                className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-800 transition-colors"
              >
                Simulate Loading
              </button>
              <button
                onClick={() => simulateStatusChange('success')}
                className="p-3 bg-green-100 hover:bg-green-200 rounded-lg text-green-800 transition-colors"
              >
                Simulate Success
              </button>
              <button
                onClick={() => simulateStatusChange('error')}
                className="p-3 bg-red-100 hover:bg-red-200 rounded-lg text-red-800 transition-colors"
              >
                Simulate Error
              </button>
              <button
                onClick={() => simulateStatusChange('queued')}
                className="p-3 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-yellow-800 transition-colors"
              >
                Simulate Queued
              </button>
              <button
                onClick={() => simulateStatusChange('retrying')}
                className="p-3 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-800 transition-colors"
              >
                Simulate Retrying
              </button>
              <button
                onClick={() => simulateStatusChange('offline')}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800 transition-colors"
              >
                Simulate Offline
              </button>
            </div>

            {statusDemo !== 'idle' && (
              <EnhancedStatusIndicator
                status={statusDemo}
                message={`This is a ${statusDemo} status demonstration`}
                details="This shows how users will see different states"
                retryable={statusDemo === 'error'}
                retryCount={statusDemo === 'retrying' ? 2 : 0}
                maxRetries={3}
                estimatedTime={statusDemo === 'retrying' ? 5 : undefined}
                onRetry={() => console.log('Retry clicked')}
                onDismiss={() => setStatusDemo('idle')}
                showProgress={statusDemo === 'loading'}
                actionLabel="Try Again"
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Critical Bug Fixes Demo</h1>
        </div>
        <p className="text-gray-600 text-lg">
          Demonstration of enhanced post/community/listing creation with 503 error handling, 
          retry logic, action queuing, and improved user feedback.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.key;
          
          return (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-6 w-6 mx-auto mb-2 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              <h3 className="font-semibold text-sm mb-1">{mode.label}</h3>
              <p className="text-xs opacity-75">{mode.description}</p>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderContent()}
      </div>

      {/* Implementation Notes */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Implementation Highlights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div>
            <h4 className="font-medium mb-2">Backend Enhancements:</h4>
            <ul className="space-y-1">
              <li>• Enhanced error responses with retry guidance</li>
              <li>• Proper HTTP status codes (503, 429)</li>
              <li>• Retry-After headers for rate limiting</li>
              <li>• Detailed error categorization</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Frontend Enhancements:</h4>
            <ul className="space-y-1">
              <li>• Circuit breaker pattern implementation</li>
              <li>• Exponential backoff retry logic</li>
              <li>• Action queuing with offline support</li>
              <li>• Enhanced status indicators and user feedback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriticalBugFixesDemo;