/**
 * Fallback Content Components
 * Provides fallback content when live data fails to load
 */

import React from 'react';

interface FallbackContentProps {
  type: 'feed' | 'profile' | 'wallet' | 'notifications' | 'search' | 'generic';
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const FallbackContent: React.FC<FallbackContentProps> = ({
  type,
  message,
  onRetry,
  showRetry = true
}) => {
  const getFallbackContent = () => {
    switch (type) {
      case 'feed':
        return <FeedFallback />;
      case 'profile':
        return <ProfileFallback />;
      case 'wallet':
        return <WalletFallback />;
      case 'notifications':
        return <NotificationsFallback />;
      case 'search':
        return <SearchFallback />;
      default:
        return <GenericFallback />;
    }
  };

  return (
    <div className="p-6 text-center">
      {getFallbackContent()}
      
      {message && (
        <p className="text-gray-600 mt-4">{message}</p>
      )}
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

const FeedFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">📰</div>
    <h3 className="text-lg font-semibold">Feed Unavailable</h3>
    <p className="text-gray-600">
      We're having trouble loading your feed right now.
    </p>
    <div className="space-y-3 mt-6">
      {/* Skeleton posts */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border border-gray-200 rounded-lg animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProfileFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">👤</div>
    <h3 className="text-lg font-semibold">Profile Unavailable</h3>
    <p className="text-gray-600">
      Unable to load profile information at the moment.
    </p>
    <div className="mt-6 p-4 border border-gray-200 rounded-lg animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

const WalletFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">👛</div>
    <h3 className="text-lg font-semibold">Wallet Unavailable</h3>
    <p className="text-gray-600">
      Unable to connect to your wallet or load balance information.
    </p>
    <div className="mt-6 p-4 border border-gray-200 rounded-lg">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Balance</span>
          <span className="text-gray-400">--</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">USD Value</span>
          <span className="text-gray-400">--</span>
        </div>
        <div className="pt-3 border-t border-gray-200">
          <button
            disabled
            className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  </div>
);

const NotificationsFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">🔔</div>
    <h3 className="text-lg font-semibold">Notifications Unavailable</h3>
    <p className="text-gray-600">
      Unable to load your notifications right now.
    </p>
    <div className="mt-6 space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-3 border border-gray-200 rounded animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SearchFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">🔍</div>
    <h3 className="text-lg font-semibold">Search Unavailable</h3>
    <p className="text-gray-600">
      Search functionality is temporarily unavailable.
    </p>
    <div className="mt-6">
      <div className="relative">
        <input
          type="text"
          placeholder="Search (unavailable)"
          disabled
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
        />
        <button
          disabled
          className="absolute right-2 top-2 px-3 py-1 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
        >
          Search
        </button>
      </div>
    </div>
  </div>
);

const GenericFallback: React.FC = () => (
  <div className="space-y-4">
    <div className="text-4xl">⚠️</div>
    <h3 className="text-lg font-semibold">Content Unavailable</h3>
    <p className="text-gray-600">
      This content is temporarily unavailable.
    </p>
  </div>
);

// Cached content fallback
export const CachedContentFallback: React.FC<{
  cachedData?: any;
  lastUpdated?: Date;
  onRefresh?: () => void;
}> = ({ cachedData, lastUpdated, onRefresh }) => {
  if (!cachedData) {
    return <FallbackContent type="generic" />;
  }

  // Sanitize and validate cached data
  const sanitizeData = (data: any): string => {
    try {
      // Only serialize safe data types
      if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return String(data);
      }
      
      if (Array.isArray(data)) {
        return JSON.stringify(data.map(item => sanitizeData(item)), null, 2);
      }
      
      if (typeof data === 'object' && data !== null) {
        const sanitized: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
          // Skip potentially sensitive keys
          if (typeof key === 'string' && 
              (key.toLowerCase().includes('password') || 
               key.toLowerCase().includes('token') || 
               key.toLowerCase().includes('secret') ||
               key.toLowerCase().includes('private'))) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitizeData(value);
          }
        }
        return JSON.stringify(sanitized, null, 2);
      }
      
      return '[Unsupported data type]';
    } catch (error) {
      console.warn('Error sanitizing cached data:', error instanceof Error ? error.message : String(error));
      return '[Error sanitizing data]';
    }
  };

  const sanitizedContent = sanitizeData(cachedData);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="text-yellow-600">⚠️</div>
          <div className="flex-1">
            <p className="text-sm text-yellow-800">
              Showing cached content from {lastUpdated?.toLocaleString()}
            </p>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
      
      <div className="opacity-75">
        {/* Render sanitized cached content */}
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-96">
          {typeof sanitizedContent === 'string' 
            ? sanitizedContent 
            : JSON.stringify(sanitizedContent, null, 2)
          }
        </pre>
      </div>
    </div>
  );
};

// Progressive loading fallback
export const ProgressiveLoadingFallback: React.FC<{
  progress: number;
  stage: string;
}> = ({ progress, stage }) => (
  <div className="space-y-4 text-center">
    <div className="text-4xl">⏳</div>
    <h3 className="text-lg font-semibold">Loading...</h3>
    <p className="text-gray-600">{stage}</p>
    
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
    
    <p className="text-sm text-gray-500">{progress}% complete</p>
  </div>
);

// Maintenance mode fallback
export const MaintenanceFallback: React.FC<{
  estimatedTime?: string;
}> = ({ estimatedTime }) => (
  <div className="space-y-4 text-center">
    <div className="text-4xl">🔧</div>
    <h3 className="text-lg font-semibold">Under Maintenance</h3>
    <p className="text-gray-600">
      We're currently performing maintenance to improve your experience.
    </p>
    {estimatedTime && (
      <p className="text-sm text-gray-500">
        Estimated completion: {estimatedTime}
      </p>
    )}
    <div className="mt-6">
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Check Again
      </button>
    </div>
  </div>
);