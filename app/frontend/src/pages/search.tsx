import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useWeb3 } from '@/context/Web3Context';
import { EnhancedSearchInterface } from '@/components/EnhancedSearch/EnhancedSearchInterface';
import TrendingContent from '@/components/TrendingContent';
import RecommendationSystem from '@/components/RecommendationSystem';
import HashtagDiscovery from '@/components/HashtagDiscovery';

export default function SearchPage() {
  const router = useRouter();
  const { isConnected } = useWeb3();
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'hashtags' | 'recommendations'>('search');

  // Get initial query from URL
  const initialQuery = typeof router.query.q === 'string' ? router.query.q : '';
  const initialType = typeof router.query.type === 'string' ? router.query.type : 'all';
  const initialTab = typeof router.query.tab === 'string' ? (router.query.tab as any) : undefined;

  // Set initial tab based on URL or query presence
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (initialQuery) {
      setActiveTab('search');
    } else if (router.pathname === '/recommendations') {
      setActiveTab('recommendations');
    } else if (router.pathname.startsWith('/hashtags')) {
      setActiveTab('hashtags');
    }
  }, [initialQuery, initialTab, router.pathname]);

  const handleResultSelect = (type: 'post' | 'community' | 'user', id: string) => {
    switch (type) {
      case 'community':
        router.push(`/?community=${id}`);
        break;
      case 'user':
        router.push(`/profile?user=${id}`);
        break;
      case 'post':
        // Navigate to post detail or highlight in feed
        router.push(`/?post=${id}`);
        break;
    }
  };

  const handleTrendingItemClick = (type: 'post' | 'community' | 'hashtag' | 'topic', item: any) => {
    switch (type) {
      case 'community':
        router.push(`/?community=${item.id}`);
        break;
      case 'hashtag':
        router.push(`/search?q=${encodeURIComponent('#' + item.tag)}`);
        break;
      case 'topic':
        router.push(`/search?q=${encodeURIComponent(item)}&type=all`);
        break;
      case 'post':
        router.push(`/?post=${item.id}`);
        break;
    }
  };

  const handleHashtagSelect = (tag: string) => {
    router.push(`/search?q=${encodeURIComponent('#' + tag)}`);
  };

  return (
    <>
      <Head>
        <title>Search & Discovery - Web3 Social Platform</title>
        <meta name="description" content="Search posts, communities, and users. Discover trending content and get personalized recommendations." />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-screen-2xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search & Discovery</h1>
          </div>
        </header>

        {/* Main Grid Layout - Same as Home Page */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full px-0 sm:px-2 lg:px-4 mx-auto max-w-screen-2xl pt-0 lg:pt-6">
          {/* Left Sidebar - Navigation - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Navigation</h3>
                <nav className="space-y-2">
                  <a 
                    href="/" 
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Home
                  </a>
                  <a 
                    href="/communities" 
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Communities
                  </a>
                  <a 
                    href="/profile" 
                    className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Profile
                  </a>
                </nav>
              </div>
            </div>
          </div>

          {/* Center Search Content - Same width as Home Feed */}
          <div className="col-span-1 lg:col-span-9">
            <div className="py-6 px-4">
              {/* Navigation Tabs */}
              <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 overflow-x-auto">
                {[
                  { id: 'search', label: 'Search', icon: '🔍', description: 'Search everything' },
                  { id: 'trending', label: 'Trending', icon: '🔥', description: 'What\'s hot now' },
                  { id: 'hashtags', label: 'Hashtags', icon: '#️⃣', description: 'Explore topics' },
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
              <div>
                {activeTab === 'search' && (
                  <EnhancedSearchInterface
                    initialQuery={initialQuery}
                    initialFilters={{ type: initialType as any }}
                    onResultSelect={handleResultSelect}
                    showFilters={true}
                    placeholder="Search content..."
                    autoExecute={initialQuery.startsWith('#')}
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

                {activeTab === 'hashtags' && (
                  <HashtagDiscovery
                    onHashtagSelect={handleHashtagSelect}
                    className="min-h-screen"
                  />
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
          </div>
        </div>
      </div>
    </>
  );
}