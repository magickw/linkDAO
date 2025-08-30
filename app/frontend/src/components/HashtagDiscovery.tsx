import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { SearchService } from '@/services/searchService';
import { Post } from '@/models/Post';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState, RetryState } from '@/components/FallbackStates';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Load trending hashtags
  const loadTrendingHashtags = useCallback(async () => {
    try {
      const trending = await SearchService.getTrendingHashtags('day', 50);
      setTrendingHashtags(trending);
    } catch (err) {
      console.error('Error loading trending hashtags:', err);
    }
  }, []);

  // Load posts for a specific hashtag
  const loadHashtagPosts = useCallback(async (tag: string, pageNum: number = 0) => {
    if (!tag) return;

    try {
      setLoading(true);
      setError(null);
      
      const cleanTag = tag.replace('#', '');
      const result = await SearchService.getPostsByHashtag(cleanTag, {}, 20, pageNum * 20);
      
      if (pageNum === 0) {
        setHashtagData({
          tag: cleanTag,
          count: result.total,
          growth: 0, // We'll get this from trending data if available
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
    }
  }, []);

  // Handle hashtag selection
  const handleHashtagSelect = (tag: string) => {
    const cleanTag = tag.replace('#', '');
    setSelectedHashtag(cleanTag);
    setPage(0);
    loadHashtagPosts(cleanTag, 0);
    
    if (onHashtagSelect) {
      onHashtagSelect(cleanTag);
    }
    
    // Update URL
    router.push(`/hashtags/${cleanTag}`, undefined, { shallow: true });
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
    if (selectedHashtag) {
      loadHashtagPosts(selectedHashtag, 0);
    }
  }, [loadTrendingHashtags, loadHashtagPosts, selectedHashtag]);

  // Update growth data from trending hashtags
  useEffect(() => {
    if (hashtagData && trendingHashtags.length > 0) {
      const trendingData = trendingHashtags.find(t => t.tag === hashtagData.tag);
      if (trendingData) {
        setHashtagData(prev => prev ? { ...prev, growth: trendingData.growth } : null);
      }
    }
  }, [hashtagData, trendingHashtags]);

  return (
    <div className={className}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Hashtag Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="mr-2">#️⃣</span>
                Trending Hashtags
              </h2>
              
              {trendingHashtags.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {trendingHashtags.map((hashtag, index) => (
                    <button
                      key={hashtag.tag}
                      onClick={() => handleHashtagSelect(hashtag.tag)}
                      className={`w-full text-left p-2 rounded-lg transition-colors ${
                        selectedHashtag === hashtag.tag
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-primary-600 dark:text-primary-400">
                          #{hashtag.tag}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm">No trending hashtags</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedHashtag ? (
              <div>
                {/* Hashtag Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <span className="text-primary-600 dark:text-primary-400 mr-2">#</span>
                        {selectedHashtag}
                      </h1>
                      {hashtagData && (
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          <span>{hashtagData.count.toLocaleString()} posts</span>
                          {hashtagData.growth > 0 && (
                            <span className="text-green-600 dark:text-green-400 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
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
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
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
                        profile={{ 
                          handle: post.author.slice(0, 6) + '...' + post.author.slice(-4), 
                          ens: '', 
                          avatarCid: 'https://placehold.co/40' 
                        }}
                        onTip={async () => {}}
                        className="transition-all duration-300 hover:shadow-lg"
                      />
                    ))}
                    
                    {/* Load More Button */}
                    {hasMore && (
                      <div className="text-center">
                        <button
                          onClick={loadMore}
                          disabled={loading}
                          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Loading...' : 'Load More Posts'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState
                    title="No posts found"
                    description={`No posts found for #${selectedHashtag}. Be the first to post with this hashtag!`}
                    icon={
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="text-6xl mb-4">#️⃣</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Discover Hashtags
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Explore trending hashtags and discover content around topics you're interested in. 
                    Click on any hashtag from the sidebar to see related posts.
                  </p>
                  
                  {/* Popular Categories */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Popular Categories</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['defi', 'nft', 'web3', 'crypto', 'blockchain', 'dao', 'metaverse', 'gaming'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleHashtagSelect(tag)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
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