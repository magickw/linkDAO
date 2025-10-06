/**
 * PersonalizedRecommendations Component
 * Shows personalized user and content recommendations
 * Implements requirements 4.7, 6.2, 6.3 from the interconnected social platform spec
 */

import React from 'react';
import { UserRecommendations } from '../../services/userActivityService';

interface PersonalizedRecommendationsProps {
  recommendations: UserRecommendations;
  detailed?: boolean;
  onRecommendationClick: (type: 'user' | 'community' | 'post' | 'proposal', id: string) => void;
}

export const PersonalizedRecommendations: React.FC<PersonalizedRecommendationsProps> = ({
  recommendations,
  detailed = false,
  onRecommendationClick
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="personalized-recommendations space-y-6">
      {/* Suggested Users */}
      {recommendations.suggestedUsers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Suggested Users
          </h3>
          <div className="space-y-3">
            {recommendations.suggestedUsers.slice(0, detailed ? 10 : 3).map((user) => (
              <div
                key={user.address}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onRecommendationClick('user', user.address)}
              >
                <div className="flex items-center space-x-3">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.mutualConnections} mutual
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {Math.round(user.similarityScore * 100)}% match
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Communities */}
      {recommendations.suggestedCommunities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Suggested Communities
          </h3>
          <div className="space-y-3">
            {recommendations.suggestedCommunities.slice(0, detailed ? 10 : 3).map((community) => (
              <div
                key={community.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onRecommendationClick('community', community.id)}
              >
                <div className="flex items-center space-x-3">
                  {community.iconUrl ? (
                    <img src={community.iconUrl} alt={community.name} className="w-10 h-10 rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{community.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{community.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatNumber(community.memberCount)} members
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {Math.round(community.relevanceScore * 100)}% relevant
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalizedRecommendations;