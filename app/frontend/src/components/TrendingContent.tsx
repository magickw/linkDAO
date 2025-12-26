import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { SearchService, TrendingContent as TrendingData } from '@/services/searchService';
import { Post } from '@/models/Post';
import { Community } from '@/models/Community';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';
import CommunityAvatar from '@/components/Community/CommunityAvatar';

interface TrendingContentProps {
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  showPosts?: boolean;
  showCommunities?: boolean;
  showHashtags?: boolean;
  showTopics?: boolean;
  onItemClick?: (type: 'post' | 'community' | 'hashtag' | 'topic', item: any) => void;
  className?: string;
}

export default function TrendingContent({
  timeRange = 'day',
  limit = 10,
  showPosts = true,
  showCommunities = true,
  showHashtags = true,
  showTopics = true,
  onItemClick,
  className = ''
}: TrendingContentProps) {
  const router = useRouter();
  
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; count: number; growth: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimeRange, setActiveTimeRange] = useState(timeRange);

  // Load trending content
  const loadTrendingContent = async (selectedTimeRange: typeof timeRange) => {
    try {
      setLoading(true);
      setError(null);
      
      const [trending, hashtags] = await Promise.all([
        SearchService.getTrendingContent(selectedTimeRange, limit),
        showHashtags ? SearchService.getTrendingHashtags(selectedTimeRange, limit) : Promise.resolve([])
      ]);
      
      setTrendingData(trending);
      setTrendingHashtags(hashtags);
    } catch (err) {
      console.error('Error loading trending content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending content');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and reload when time range changes
  useEffect(() => {
    loadTrendingContent(activeTimeRange);
  }, [activeTimeRange, limit]);

  // Handle item clicks
  const handleItemClick = (type: 'post' | 'community' | 'hashtag' | 'topic', item: any) => {
    if (onItemClick) {
      onItemClick(type, item);
    } else {
      // Default navigation behavior
      switch (type) {
        case 'community':
          router.push(`/dashboard?community=${item.id}`);
          break;
        case 'hashtag':
          router.push(`/search?q=${encodeURIComponent('#' + item.tag)}&type=posts`);
          break;
        case 'topic':
          router.push(`/search?q=${encodeURIComponent(item)}&type=all`);
          break;
        case 'post':
          // Navigate to post or highlight in feed
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <LoadingSkeletons.TrendingContent />
      </div>
    );
  }

  if (error) {
    return (
      <RetryState
        title="Failed to load trending content"
        message={error}
        onRetry={() => loadTrendingContent(activeTimeRange)}
        className={className}
      />
    );
  }

  if (!trendingData) {
    return (
      <EmptyState
        title="No trending content"
        description="There's no trending content available right now."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          🔥 Trending Now
        </h2>
        
        <select
          value={activeTimeRange}
          onChange={(e) => setActiveTimeRange(e.target.value as typeof timeRange)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="hour">Past Hour</option>
          <option value="day">Past Day</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
        </select>
      </div>

      <div className="space-y-6">
        {/* Trending Hashtags */}
        {showHashtags && trendingHashtags.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">#️⃣</span>
              Trending Hashtags
            </h3>
            <div className="space-y-2">
              {trendingHashtags.slice(0, 10).map((hashtag, index) => (
                <div
                  key={hashtag.tag}
                  onClick={() => handleItemClick('hashtag', hashtag)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                      {index + 1}
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-medium">
                      #{hashtag.tag}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>{hashtag.count.toLocaleString()} posts</span>
                    {hashtag.growth > 0 && (
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        {hashtag.growth}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Communities */}
        {showCommunities && trendingData.communities.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Trending Communities
            </h3>
            <div className="space-y-3">
              {trendingData.communities.slice(0, 5).map((community, index) => (
                <div
                  key={community.id}
                  onClick={() => handleItemClick('community', community)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                    {index + 1}
                  </span>

                  <CommunityAvatar
                    avatar={community.avatar}
                    name={community.displayName}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-white truncate">
                        {community.displayName}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        r/{community.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {community.memberCount.toLocaleString()} members
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trending Topics */}
        {showTopics && trendingData.topics.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">🏷️</span>
              Trending Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingData.topics.slice(0, 15).map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleItemClick('topic', topic)}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Posts */}
        {showPosts && trendingData.posts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="mr-2">📈</span>
              Trending Posts
            </h3>
            <div className="space-y-3">
              {trendingData.posts.slice(0, 5).map((post, index) => (
                <div
                  key={post.id}
                  onClick={() => handleItemClick('post', post)}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6 mt-1">
                    {index + 1}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {post.contentCid.substring(0, 100)}
                      {post.contentCid.length > 100 && '...'}
                    </h4>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>by {typeof post.author === 'string' ? `${post.author.slice(0, 6)}...${post.author.slice(-4)}` : post.author?.walletAddress ? `${post.author.walletAddress.slice(0, 6)}...${post.author.walletAddress.slice(-4)}` : 'Unknown'}</span>
                      <span>{post.tags.length} tags</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}