/**
 * Graceful Degradation Components
 * Provides fallback functionality when advanced features fail
 */

import React, { useState, useEffect, ReactNode } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { ErrorCategory } from '../../utils/errorHandling/ErrorManager';

interface GracefulDegradationProps {
  children: ReactNode;
  fallback: ReactNode;
  feature: string;
  category?: ErrorCategory;
  timeout?: number;
}

export const GracefulDegradation: React.FC<GracefulDegradationProps> = ({
  children,
  fallback,
  feature,
  category = ErrorCategory.UNKNOWN,
  timeout = 5000
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { handleError } = useErrorHandler({ category });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
        setIsLoading(false);
        handleError(new Error(`Feature "${feature}" failed to load within timeout`));
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout, feature, handleError]);

  useEffect(() => {
    // Simulate feature loading completion
    const loadTimer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(loadTimer);
  }, []);

  if (showFallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Enhanced Post Composer with graceful degradation
export const EnhancedPostComposerWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
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
    {children}
  </GracefulDegradation>
);

// Token Reactions with graceful degradation
export const TokenReactionsWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
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
    {children}
  </GracefulDegradation>
);

// Wallet Dashboard with graceful degradation
export const WalletDashboardWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <GracefulDegradation
    feature="Wallet Dashboard"
    category={ErrorCategory.WALLET}
    fallback={
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Wallet</h3>
        <p className="text-sm text-gray-600 mb-3">
          Connect your wallet to view balance and transactions
        </p>
        <button className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Connect Wallet
        </button>
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);

// Real-time Notifications with graceful degradation
export const NotificationsWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <GracefulDegradation
    feature="Real-time Notifications"
    category={ErrorCategory.NETWORK}
    fallback={
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-700">
          Real-time updates unavailable. Refresh to see latest content.
        </p>
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);

// Enhanced Search with graceful degradation
export const SearchWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <GracefulDegradation
    feature="Enhanced Search"
    category={ErrorCategory.PERFORMANCE}
    fallback={
      <div className="relative">
        <input
          type="text"
          placeholder="Search (basic mode)..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button className="absolute right-2 top-2 px-3 py-1 bg-blue-500 text-white rounded">
          Search
        </button>
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);

// Virtual Scrolling with graceful degradation
export const VirtualScrollWithFallback: React.FC<{
  children: ReactNode;
  items: any[];
}> = ({ children, items }) => (
  <GracefulDegradation
    feature="Virtual Scrolling"
    category={ErrorCategory.PERFORMANCE}
    fallback={
      <div className="space-y-4">
        {items.slice(0, 10).map((item, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded">
            Basic item view (showing first 10 items)
          </div>
        ))}
        {items.length > 10 && (
          <div className="p-4 text-center text-gray-500">
            ... and {items.length - 10} more items
          </div>
        )}
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);

// Reputation System with graceful degradation
export const ReputationWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <GracefulDegradation
    feature="Reputation System"
    category={ErrorCategory.CONTENT}
    fallback={
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-sm">👤</span>
        </div>
        <span className="text-sm text-gray-600">User</span>
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);

// Content Previews with graceful degradation
export const ContentPreviewsWithFallback: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <GracefulDegradation
    feature="Content Previews"
    category={ErrorCategory.NETWORK}
    fallback={
      <div className="p-3 bg-gray-100 border border-gray-200 rounded">
        <p className="text-sm text-gray-600">Preview unavailable</p>
      </div>
    }
  >
    {children}
  </GracefulDegradation>
);