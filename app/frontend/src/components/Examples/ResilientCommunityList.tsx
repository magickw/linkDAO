import React from 'react';
import { useCommunities } from '../../hooks/useResilientAPI';
import ServiceUnavailableHandler from '../ErrorHandling/ServiceUnavailableHandler';
import { Loader2, Users, Globe, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Community } from '../../models';

/**
 * Enhanced example component showing resilient API hooks with:
 * - Circuit breaker integration
 * - Graceful degradation with cached/stale data
 * - Enhanced error handling and user feedback
 * - Real-time status indicators
 */
export const ResilientCommunityList: React.FC = () => {
  const { 
    data: communities, 
    loading, 
    error, 
    isServiceAvailable, 
    isFromCache, 
    isFromFallback,
    isStale,
    retry,
    refresh,
    forceRefresh,
    circuitBreakerState,
    hasData,
    isHealthy
  } = useCommunities({ isPublic: true, limit: 10 });

  if (loading && (!communities || communities.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading communities...</span>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Enhanced Status Bar */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm">
            {/* Service Health */}
            <div className="flex items-center">
              {isHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={isHealthy ? 'text-green-700' : 'text-red-700'}>
                {isHealthy ? 'Healthy' : 'Degraded'}
              </span>
            </div>

            {/* Data Source */}
            <div className="flex items-center">
              {isFromFallback ? (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                  Fallback Data
                </span>
              ) : isStale ? (
                <div className="flex items-center">
                  <Clock className="h-3 w-3 text-yellow-600 mr-1" />
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                    Stale Cache
                  </span>
                </div>
              ) : isFromCache ? (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Fresh Cache
                </span>
              ) : (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Live Data
                </span>
              )}
            </div>

            {/* Circuit Breaker State */}
            <div className="flex items-center">
              <span className="text-xs text-gray-500">Circuit:</span>
              <span className={`ml-1 text-xs font-medium ${
                circuitBreakerState === 'CLOSED' ? 'text-green-600' :
                circuitBreakerState === 'HALF_OPEN' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {circuitBreakerState}
              </span>
            </div>

            {/* Data Count */}
            <div className="text-xs text-gray-500">
              {communities?.length || 0} communities
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {isStale && (
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                title="Refresh stale data"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </button>
            )}
            <button
              onClick={forceRefresh}
              disabled={loading}
              className="flex items-center px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              title="Force refresh from network"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Force Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Communities List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {communities?.map((community: Community) => (
          <div
            key={community.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {community.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {community.description}
                </p>
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {community.memberCount || 0} members
                  </div>
                  {community.isPublic && (
                    <div className="flex items-center">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!communities?.length && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No communities found
          </h3>
          <p className="text-gray-600">
            {error ? 'Unable to load communities at the moment.' : 'There are no communities to display.'}
          </p>
        </div>
      )}
    </div>
  );

  // Enhanced error handling with graceful degradation
  if (error && !hasData) {
    return (
      <ServiceUnavailableHandler
        error={error}
        onRetry={retry}
        affectedServices={['communities']}
      />
    );
  }

  // Show error banner but continue showing data if available
  if (error && hasData) {
    return (
      <div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800">
                Service Temporarily Unavailable
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Showing {isFromFallback ? 'fallback' : isStale ? 'stale cached' : 'cached'} data. 
                {circuitBreakerState === 'OPEN' && ' Circuit breaker is open.'}
              </p>
            </div>
            <button
              onClick={retry}
              disabled={loading}
              className="ml-4 px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return content;
};

export default ResilientCommunityList;