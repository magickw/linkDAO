import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { TrendingUp, Hash } from 'lucide-react';
import { FeedService } from '@/services/feedService';
import { FeedSortType } from '@/types/feed';
import { formatNumber } from '@/utils/formatters';

interface TrendingTopic {
  id: string;
  name: string;
  category: string;
  postCount: number;
}

interface WhatsHappeningWidgetProps {
  className?: string;
}

export default function WhatsHappeningWidget({ className = '' }: WhatsHappeningWidgetProps) {
  const router = useRouter();
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        setIsLoading(true);

        // Fetch recent posts from the feed (max 50 per backend validation)
        const feedResponse = await FeedService.getEnhancedFeed(
          {
            sortBy: FeedSortType.NEW,
            timeRange: 'all',
            feedSource: 'all'
          },
          1,
          50
        );

        // Extract hashtags and calculate trending score
        const hashtagCounts = new Map<string, { count: number; category: string }>();
        const categoryMap: { [key: string]: string } = {
          'gaming': 'Gaming',
          'defi': 'Finance',
          'nft': 'Art',
          'crypto': 'Finance',
          'metaverse': 'Technology',
          'web3': 'Technology',
          'dao': 'Governance',
          'blockchain': 'Technology',
          'trading': 'Finance',
          'art': 'Art',
          'music': 'Entertainment',
          'sports': 'Sports',
          'news': 'News',
          'tech': 'Technology',
          'ai': 'Technology',
          'dev': 'Development'
        };

        // Access the posts array from the response
        const feedData = feedResponse.posts || [];

        feedData.forEach(post => {
          // Extract hashtags from content
          const content = post.content || '';
          const hashtags = content.match(/#(\w+)/g) || [];

          hashtags.forEach(tag => {
            const tagLower = tag.slice(1).toLowerCase();
            hashtagCounts.set(tagLower, {
              count: (hashtagCounts.get(tagLower)?.count || 0) + 1,
              category: categoryMap[tagLower] || 'General'
            });
          });

          // Also count from post tags if available
          if (post.tags && Array.isArray(post.tags)) {
            post.tags.forEach(tag => {
              const tagLower = tag.toLowerCase();
              hashtagCounts.set(tagLower, {
                count: (hashtagCounts.get(tagLower)?.count || 0) + 1,
                category: categoryMap[tagLower] || 'General'
              });
            });
          }
        });

        // Sort by count and take top 5
        const sortedTopics = Array.from(hashtagCounts.entries())
          .map(([name, data]) => ({
            id: name,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            category: data.category,
            postCount: data.count
          }))
          .sort((a, b) => b.postCount - a.postCount)
          .slice(0, 5);

        setTrendingTopics(sortedTopics);
      } catch (error) {
        console.error('Error fetching trending topics:', error);
        // Set empty array on error
        setTrendingTopics([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingTopics();
  }, []);

  const handleHashtagClick = (hashtagName: string) => {
    // Navigate to search page with hashtag query
    router.push(`/search?q=${encodeURIComponent('#' + hashtagName.toLowerCase())}`);
  };

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">What's happening</h2>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trendingTopics.length > 0 ? (
          trendingTopics.map((topic, index) => (
            <div
              key={topic.id}
              onClick={() => handleHashtagClick(topic.name)}
              className="group relative py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                    {topic.category}
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <Hash className="w-3 h-3 text-gray-400" />
                    {topic.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                    {formatNumber(topic.postCount)} posts
                  </span>
                </div>

                {index < 3 && (
                  <span className="text-xl font-bold text-gray-300 dark:text-gray-600 ml-3">
                    #{index + 1}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No trending topics yet
          </div>
        )}

        <button
          onClick={() => router.push('/search?tab=hashtags')}
          className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Show more
        </button>
      </div>
    </div>
  );
}