import React from 'react';
import { useCommunities } from '../../hooks/useResilientAPI';
import ServiceUnavailableHandler from '../ErrorHandling/ServiceUnavailableHandler';
import { Loader2, Users, Globe } from 'lucide-react';
import { Community } from '../../models';

/**
 * Example component showing how to use resilient API hooks
 * with proper error handling and fallback data
 */
export const ResilientCommunityList: React.FC = () => {
  const { 
    data: communities, 
    loading, 
    error, 
    isServiceAvailable, 
    isFromCache, 
    retry,
    circuitBreakerState 
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
      {/* Debug Info (remove in production) */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        Service: {isServiceAvailable ? '✅ Available' : '❌ Unavailable'} | 
        Cache: {isFromCache ? '📦 Cached' : '🌐 Fresh'} | 
        Circuit: {circuitBreakerState} |
        Communities: {communities?.length || 0}
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

  // Show service unavailable handler if there are issues
  if (!isServiceAvailable || error) {
    return (
      <div>
        <ServiceUnavailableHandler
          error={error}
          onRetry={retry}
          affectedServices={['communities']}
        />
        {communities.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Showing cached data:</p>
            {content}
          </div>
        )}
      </div>
    );
  }

  return content;
};

export default ResilientCommunityList;