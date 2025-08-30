import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import TrendingContent from '@/components/TrendingContent';

export default function TrendingPage() {
  const router = useRouter();

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
        <title>Trending - Web3 Social Platform</title>
        <meta name="description" content="Discover what's trending in the Web3 community - hot posts, growing communities, and popular hashtags" />
      </Head>

      <DashboardLayout activeView="feed">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🔥 Trending Now
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover what's hot in the Web3 community right now
            </p>
          </div>

          {/* Main Trending Content */}
          <div className="space-y-8">
            <TrendingContent
              timeRange="day"
              limit={15}
              onItemClick={handleTrendingItemClick}
            />
            
            {/* Additional trending sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  📈 This Week
                </h2>
                <TrendingContent
                  timeRange="week"
                  limit={5}
                  showPosts={false}
                  showTopics={false}
                  showHeaders={false}
                  onItemClick={handleTrendingItemClick}
                />
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🏆 This Month
                </h2>
                <TrendingContent
                  timeRange="month"
                  limit={5}
                  showCommunities={false}
                  showTopics={false}
                  showHeaders={false}
                  onItemClick={handleTrendingItemClick}
                />
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}