import React, { useEffect, useState } from 'react';
import { useEnhancedSearch } from '../../hooks/useEnhancedSearch';
import { DiscoveryContent } from '../../types/enhancedSearch';
import { CommunityRecommendationCard } from './CommunityRecommendationCard';
import { UserRecommendationCard } from './UserRecommendationCard';
import { TrendingSection } from './TrendingSection';
import { LoadingSkeletons } from '../LoadingSkeletons';

interface DiscoveryDashboardProps {
  className?: string;
}

export function DiscoveryDashboard({ className = '' }: DiscoveryDashboardProps) {
  const {
    discoveryContent,
    loadDiscoveryContent,
    communityRecommendations,
    userRecommendations,
    loadRecommendations,
    followItem,
    joinCommunity,
    bookmarkItem,
    loading
  } = useEnhancedSearch();

  const [activeTab, setActiveTab] = useState<'trending' | 'recommendations' | 'personalized'>('trending');

  useEffect(() => {
    loadDiscoveryContent();
    loadRecommendations();
  }, [loadDiscoveryContent, loadRecommendations]);

  if (loading && !discoveryContent) {
    return <LoadingSkeletons.DiscoveryDashboard />;
  }

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Discover
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find new communities, users, and trending content tailored to your interests
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {[
          { id: 'trending', label: 'Trending', icon: '🔥' },
          { id: 'recommendations', label: 'For You', icon: '✨' },
          { id: 'personalized', label: 'Personalized', icon: '🎯' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Trending Tab */}
        {activeTab === 'trending' && discoveryContent && (
          <TrendingSection
            trending={discoveryContent.trending}
            onFollow={followItem}
            onJoin={joinCommunity}
            onBookmark={bookmarkItem}
          />
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-8">
            {/* Community Recommendations */}
            {communityRecommendations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Communities You Might Like
                  </h2>
                  <button
                    onClick={loadRecommendations}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {communityRecommendations.slice(0, 6).map((recommendation) => (
                    <CommunityRecommendationCard
                      key={recommendation.community.id}
                      recommendation={recommendation}
                      onJoin={joinCommunity}
                      onFollow={followItem}
                      onBookmark={bookmarkItem}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* User Recommendations */}
            {userRecommendations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    People You Might Know
                  </h2>
                  <button
                    onClick={loadRecommendations}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {userRecommendations.slice(0, 8).map((recommendation) => (
                    <UserRecommendationCard
                      key={recommendation.user.walletAddress}
                      recommendation={recommendation}
                      onFollow={followItem}
                      onBookmark={bookmarkItem}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Personalized Tab */}
        {activeTab === 'personalized' && discoveryContent && (
          <div className="space-y-8">
            {/* For You Posts */}
            {discoveryContent.personalized.forYou.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  For You
                </h2>
                <div className="space-y-4">
                  {discoveryContent.personalized.forYou.slice(0, 5).map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={post.authorInfo?.avatar || 'https://placehold.co/32'}
                          alt={post.authorInfo?.handle || 'User'}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {post.authorInfo?.handle || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-900 dark:text-white line-clamp-3">
                        {post.contentCid}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Based on Activity */}
            {discoveryContent.personalized.basedOnActivity.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  Based on Your Activity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {discoveryContent.personalized.basedOnActivity.slice(0, 4).map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="text-gray-900 dark:text-white line-clamp-2 mb-2">
                        {post.contentCid}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        by {post.authorInfo?.handle || 'Anonymous'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* From Your Network */}
            {discoveryContent.personalized.fromNetwork.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                  From Your Network
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {discoveryContent.personalized.fromNetwork.slice(0, 4).map((post) => (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="text-gray-900 dark:text-white line-clamp-2 mb-2">
                        {post.contentCid}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        by {post.authorInfo?.handle || 'Anonymous'}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && !discoveryContent && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No discovery content available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start engaging with communities and users to get personalized recommendations.
          </p>
          <button
            onClick={loadDiscoveryContent}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Refresh Content
          </button>
        </div>
      )}
    </div>
  );
}