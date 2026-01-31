import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { SearchService } from '@/services/searchService';
import { Post } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';
import HashtagList from '@/components/HashtagList';

interface HashtagDiscoveryProps {
  hashtag?: string;
  onHashtagSelect?: (hashtag: string) => void;
  className?: string;
}

interface HashtagData {
  tag: string;
  count: number;
  growth: number;
  posts: Post[];
}

export default function HashtagDiscovery({
  hashtag,
  onHashtagSelect,
  className = ''
}: HashtagDiscoveryProps) {
  const router = useRouter();
  
  const [selectedHashtag, setSelectedHashtag] = useState(hashtag || '');
  const [hashtagData, setHashtagData] = useState<HashtagData | null>(null);
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; count: number; growth: number }[]>([]);
  const [popularCategories, setPopularCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [loadingHashtag, setLoadingHashtag] = useState<string | null>(null);

  // Load trending hashtags and popular categories
  const loadTrendingHashtags = useCallback(async () => {
    try {
      setTrendingLoading(true);
      const trending = await SearchService.getTrendingHashtags('day', 50);
      setTrendingHashtags(trending);

      // Extract top categories from trending data (first 8 with highest count)
      const topCategories = trending
        .slice(0, 8)
        .sort((a, b) => b.count - a.count)
        .map(h => h.tag);
      setPopularCategories(topCategories);
    } catch (err) {
      console.error('Error loading trending hashtags:', err);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  // Load posts for a specific hashtag with growth data
  const loadHashtagPosts = useCallback(async (tag: string, pageNum: number = 0) => {
    if (!tag) return;

    try {
      // Show loading state for the specific hashtag
      if (pageNum === 0) {
        setLoadingHashtag(tag);
      }

      setLoading(true);
      setError(null);

      const cleanTag = tag.replace('#', '');

      // Get posts and growth data together
      const result = await SearchService.getPostsByHashtag(cleanTag, {}, 20, pageNum * 20);

      // Get growth data from trending list
      const trendingData = trendingHashtags.find(t => t.tag === cleanTag);

      if (pageNum === 0) {
        setHashtagData({
          tag: cleanTag,
          count: result.total,
          growth: trendingData?.growth || 0,
          posts: result.posts
        });
      } else {
        setHashtagData(prev => prev ? {
          ...prev,
          posts: [...prev.posts, ...result.posts]
        } : null);
      }

      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading hashtag posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load hashtag posts');
    } finally {
      setLoading(false);
      setLoadingHashtag(null);
    }
  }, [trendingHashtags]);

  // Handle hashtag selection
  const handleHashtagSelect = (tag: string) => {
    const cleanTag = tag.replace('#', '');
    setSelectedHashtag(cleanTag);
    setPage(0);
    loadHashtagPosts(cleanTag, 0);

    if (onHashtagSelect) {
      onHashtagSelect(cleanTag);
    }

    // Update URL to search page with hashtag query
    router.push(`/search?q=${encodeURIComponent('#' + cleanTag)}`);
  };

  // Load more posts
  const loadMore = () => {
    if (!loading && hasMore && selectedHashtag) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadHashtagPosts(selectedHashtag, nextPage);
    }
  };

  // Initial load
  useEffect(() => {
    loadTrendingHashtags();
  }, [loadTrendingHashtags]);

  // Load posts when hashtag selection changes
  useEffect(() => {
    if (selectedHashtag) {
      loadHashtagPosts(selectedHashtag, 0);
    }
  }, [selectedHashtag, loadHashtagPosts]);

  return (
    <div className={className}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Hashtag Sidebar */}
          <div className="lg:col-span-1">
            <HashtagList
              hashtags={trendingHashtags}
              selectedHashtag={selectedHashtag}
              onHashtagSelect={handleHashtagSelect}
              isLoading={trendingLoading}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedHashtag ? (
              <div className="flex flex-col">
                {/* Hashtag Header - Sticky on scroll */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center mb-2">
                        <span className="text-primary-600 dark:text-primary-400 mr-2 text-2xl" aria-hidden="true">#</span>
                        <span>{selectedHashtag}</span>
                      </h1>
                      {hashtagData && (
                        <div className="flex flex-wrap items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            <span className="font-semibold text-gray-900 dark:text-gray-200">
                              {hashtagData.count.toLocaleString()}
                            </span>
                            {' '}posts
                          </span>
                          {hashtagData.growth > 0 && (
                            <span className="text-green-600 dark:text-green-400 flex items-center" aria-label={`${hashtagData.growth}% growth`}>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {hashtagData.growth}% growth
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => router.push(`/search?q=${encodeURIComponent('#' + selectedHashtag)}&type=posts`)}
                      className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors whitespace-nowrap"
                      aria-label={`View all posts for hashtag ${selectedHashtag}`}
                    >
                      View All Posts
                    </button>
                  </div>
                </div>

                {/* Posts */}
                {loading && !hashtagData ? (
                  <LoadingSkeletons.PostFeed count={3} />
                ) : error ? (
                  <RetryState
                    title="Failed to load posts"
                    message={error}
                    onRetry={() => loadHashtagPosts(selectedHashtag, 0)}
                  />
                ) : hashtagData && hashtagData.posts.length > 0 ? (
                  <div className="space-y-6">
                    {hashtagData.posts.map((post) => (
                      <Web3SocialPostCard
                        key={post.id}
                        post={post}
                        onTip={async () => {}}
                        className="transition-all duration-300 hover:shadow-lg"
                      />
                    ))}

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="text-center pt-4">
                        <button
                          onClick={loadMore}
                          disabled={loading}
                          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-colors"
                          aria-label="Load more posts"
                        >
                          {loading ? (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </span>
                          ) : (
                            'Load More Posts'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No posts found"
                    description={`No posts found for #${selectedHashtag}. Be the first to post with this hashtag!`}
                    icon={
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    }
                    action={{
                      label: 'Create Post',
                      onClick: () => router.push('/dashboard')
                    }}
                  />
                )}
              </div>
            ) : (
              /* Welcome State */
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="max-w-md mx-auto">
                  <div className="text-6xl mb-4" aria-hidden="true">#️⃣</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Discover Hashtags
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Explore trending hashtags and discover content around topics you're interested in.
                    Click on any hashtag from the sidebar to see related posts.
                  </p>

                  {/* Popular Categories */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {trendingLoading ? 'Loading Popular Categories...' : 'Popular Categories'}
                    </h3>
                    {trendingLoading ? (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"
                          ></div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-center">
                        {popularCategories.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleHashtagSelect(tag)}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                            aria-label={`Explore ${tag} hashtag`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}