import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWeb3 } from '@/context/Web3Context';
import DashboardLayout from '@/components/DashboardLayout';
import SearchInterface from '@/components/SearchInterface';
import TrendingContent from '@/components/TrendingContent';
import RecommendationSystem from '@/components/RecommendationSystem';

export default function SearchPage() {
  const router = useRouter();
  const { isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'recommendations'>('search');

  // Get initial query from URL
  const initialQuery = typeof router.query.q === 'string' ? router.query.q : '';
  const initialType = typeof router.query.type === 'string' ? router.query.type : 'all';

  // Set initial tab based on URL or query presence
  useEffect(() => {
    if (initialQuery) {
      setActiveTab('search');
    } else if (router.pathname === '/trending') {
      setActiveTab('trending');
    } else if (router.pathname === '/recommendations') {
      setActiveTab('recommendations');
    }
  }, [initialQuery, router.pathname]);

  const handleResultSelect = (type: 'post' | 'community' | 'user', id: string) => {
    switch (type) {
      case 'community':
        router.push(`/dashboard?community=${id}`);
        break;
      case 'user':
        router.push(`/profile?user=${id}`);
        break;
      case 'post':
        // Navigate to post detail or highlight in feed
        router.push(`/dashboard?post=${id}`);
        break;
    }
  };

  const handleTrendingItemClick = (type: 'post' | 'community' | 'hashtag' | 'topic', item: any) => {
    switch (type) {
      case 'community':
        router.push(`/dashboard?community=${item.id}`);
        break;
      case 'hashtag':
        router.push(`/hashtags/${item.tag}`);
        break;
      case 'topic':
        router.push(`/search?q=${encodeURIComponent(item)}&type=all`);
        break;
      case 'post':
        router.push(`/dashboard?post=${item.id}`);
        break;
    }
  };

  return (
    <>
      <Head>
        <title>Search & Discovery - Web3 Social Platform</title>
        <meta name="description" content="Search posts, communities, and users. Discover trending content and get personalized recommendations." />
      </Head>

      <DashboardLayout activeView="feed">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Search & Discovery
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Find posts, communities, and users. Explore trending content and discover new interests.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-8 overflow-x-auto">
            {[
              { id: 'search', label: 'Search', icon: '🔍', description: 'Search everything' },
              { id: 'trending', label: 'Trending', icon: '🔥', description: 'What\'s hot now' },
              { id: 'recommendations', label: 'For You', icon: '💡', description: 'Personalized picks' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap min-w-0 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-75 hidden sm:block">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-screen">
            {activeTab === 'search' && (
              <SearchInterface
                initialQuery={initialQuery}
                initialFilters={{ type: initialType as any }}
                onResultSelect={handleResultSelect}
              />
            )}

            {activeTab === 'trending' && (
              <div className="space-y-8">
                <TrendingContent
                  timeRange="day"
                  limit={15}
                  onItemClick={handleTrendingItemClick}
                />
                
                {/* Additional trending sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <TrendingContent
                    timeRange="week"
                    limit={5}
                    showPosts={false}
                    showTopics={false}
                    onItemClick={handleTrendingItemClick}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                  />
                  
                  <TrendingContent
                    timeRange="month"
                    limit={5}
                    showCommunities={false}
                    showTopics={false}
                    onItemClick={handleTrendingItemClick}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                  />
                </div>
              </div>
            )}

            {activeTab === 'recommendations' && (
              <div className="space-y-8">
                {isConnected ? (
                  <>
                    <RecommendationSystem
                      type="both"
                      basedOn="activity"
                      limit={12}
                    />
                    
                    {/* Additional recommendation sections */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <RecommendationSystem
                        type="communities"
                        basedOn="trending"
                        limit={6}
                        showHeaders={true}
                      />
                      
                      <RecommendationSystem
                        type="users"
                        basedOn="network"
                        limit={6}
                        showHeaders={true}
                      />
                    </div>
                  </>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="text-6xl mb-4">🔐</div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Connect Your Wallet
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Connect your wallet to get personalized recommendations based on your activity, 
                        interests, and network connections.
                      </p>
                      <button
                        onClick={() => {
                          // This would trigger wallet connection
                          // The actual implementation depends on your Web3Context
                        }}
                        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}