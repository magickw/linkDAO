import React, { useState } from 'react';
import { EnhancedSearchInterface, DiscoveryDashboard } from '../components/EnhancedSearch';
import { useToast } from '../context/ToastContext';

export default function TestEnhancedSearch() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'search' | 'discovery'>('search');

  const handleResultSelect = (type: 'post' | 'community' | 'user', id: string) => {
    addToast(`Selected ${type}: ${id}`, 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Enhanced Search & Discovery
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Test the advanced search and discovery features with real-time suggestions, 
            content previews, and personalized recommendations.
          </p>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'search'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              🔍 Search
            </button>
            <button
              onClick={() => setActiveTab('discovery')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === 'discovery'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ✨ Discovery
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'search' ? (
          <div className="space-y-8">
            {/* Search Interface */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Enhanced Search Interface
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Try searching for posts, communities, users, hashtags, or topics. 
                The search includes real-time suggestions, advanced filters, and content previews.
              </p>
              
              <EnhancedSearchInterface
                onResultSelect={handleResultSelect}
                showFilters={true}
                placeholder="Search for anything... Try 'technology', '#defi', '@user', or 'r/community'"
              />
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-xl">⚡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Real-time Suggestions
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get instant suggestions as you type, with previews and trending indicators.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Advanced Filters
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Filter by time range, content type, engagement level, and more.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 text-xl">🔗</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Content Previews
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  See rich previews of NFTs, links, proposals, and media content.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 dark:text-orange-400 text-xl">🤝</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Social Proof
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  See engagement from people you follow and community leaders.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 dark:text-red-400 text-xl">🏆</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Reputation System
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  View user reputation, badges, and community standing.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600 dark:text-indigo-400 text-xl">🧠</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Learning Algorithm
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Personalized results that improve based on your interactions.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Discovery Dashboard */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Discovery Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Explore trending content, get personalized recommendations, and discover 
                new communities and users based on your interests and activity.
              </p>
              
              <DiscoveryDashboard />
            </div>

            {/* Discovery Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600 dark:text-orange-400 text-xl">🔥</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Trending Content
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Discover what's trending across posts, communities, hashtags, and topics.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-xl">✨</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Smart Recommendations
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Get personalized community and user recommendations based on your activity.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 dark:text-green-400 text-xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Personalized Feed
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Content curated specifically for you based on your interests and network.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            💡 How to Test
          </h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <p>• <strong>Search:</strong> Try different queries like "technology", "#defi", "@username", or "r/community"</p>
            <p>• <strong>Filters:</strong> Use the filter options to narrow down results by time, type, and engagement</p>
            <p>• <strong>Suggestions:</strong> Start typing to see real-time suggestions with previews</p>
            <p>• <strong>Discovery:</strong> Switch to the Discovery tab to explore trending content and recommendations</p>
            <p>• <strong>Actions:</strong> Try following, joining, and bookmarking items to see how recommendations adapt</p>
          </div>
        </div>
      </div>
    </div>
  );
}