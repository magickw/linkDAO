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
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6">
                      #{index + 1}
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
                      #{hashtag.tag}
                    </span>
                    {/* Social Proof Badge */}
                    <div className="hidden sm:flex items-center space-x-1">
                      <div className="flex items-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>trending</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {hashtag.count.toLocaleString()} posts
                    </span>
                    {hashtag.growth > 0 && (
                      <span className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        +{hashtag.growth}%
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
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6">
                    #{index + 1}
                  </span>

                  <CommunityAvatar
                    avatar={community.avatar}
                    name={community.displayName}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {community.displayName}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        r/{community.name}
                      </span>
                      {/* Social Proof Badge */}
                      <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                        <span>trending</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{community.memberCount.toLocaleString()} members</span>
                      <span>•</span>
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        +{Math.floor(Math.random() * 50 + 10)}% this week
                      </span>
                    </div>
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
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                >
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-6 mt-1">
                    #{index + 1}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">
                      {post.contentCid.substring(0, 100)}
                      {post.contentCid.length > 100 && '...'}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>by {typeof post.author === 'string' ? `${post.author.slice(0, 6)}...${post.author.slice(-4)}` : post.author?.walletAddress ? `${post.author.walletAddress.slice(0, 6)}...${post.author.walletAddress.slice(-4)}` : 'Unknown'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{post.tags.length} tags</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {/* Social Proof Badge */}
                      <div className="flex items-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>hot</span>
                      </div>
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
                  
                  {/* Engagement Stats */}
                  <div className="flex flex-col items-end space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span>{Math.floor(Math.random() * 1000 + 50)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{Math.floor(Math.random() * 100 + 10)}</span>
                    </div>
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