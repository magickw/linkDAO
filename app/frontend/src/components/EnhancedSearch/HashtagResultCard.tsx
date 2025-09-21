import React, { useState } from 'react';
import { HashtagResult } from '../../types/enhancedSearch';

interface HashtagResultCardProps {
  hashtag: HashtagResult;
  position: number;
  onFollow: (tag: string) => Promise<void>;
  onBookmark: (tag: string, title: string) => Promise<void>;
}

export function HashtagResultCard({
  hashtag,
  position,
  onFollow,
  onBookmark
}: HashtagResultCardProps) {
  const [following, setFollowing] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(true);
    try {
      await onFollow(hashtag.tag);
    } finally {
      setFollowing(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      await onBookmark(hashtag.tag, `#${hashtag.tag}`);
    } finally {
      setBookmarking(false);
    }
  };

  const getGrowthIndicator = (growth: number) => {
    if (growth > 50) return { icon: '🚀', color: 'text-green-600 dark:text-green-400', text: 'Exploding' };
    if (growth > 20) return { icon: '📈', color: 'text-green-600 dark:text-green-400', text: 'Growing Fast' };
    if (growth > 5) return { icon: '📊', color: 'text-blue-600 dark:text-blue-400', text: 'Growing' };
    if (growth > 0) return { icon: '➡️', color: 'text-gray-600 dark:text-gray-400', text: 'Stable' };
    return { icon: '📉', color: 'text-red-600 dark:text-red-400', text: 'Declining' };
  };

  const growth = getGrowthIndicator(hashtag.growth);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">#</span>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              #{hashtag.tag}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{hashtag.count.toLocaleString()} posts</span>
              <span>•</span>
              <span className={growth.color}>
                {growth.icon} {growth.text}
              </span>
            </div>
          </div>
        </div>

        {/* Trending Badge */}
        {hashtag.trending && (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full font-medium">
            🔥 Trending
          </span>
        )}
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {hashtag.engagementMetrics.totalPosts.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Posts</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {hashtag.engagementMetrics.totalEngagement.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Engagement</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-900 dark:text-white">
            {hashtag.engagementMetrics.averageEngagement.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Engagement</div>
        </div>
      </div>

      {/* Related Tags */}
      {hashtag.relatedTags.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Related Tags</div>
          <div className="flex flex-wrap gap-1">
            {hashtag.relatedTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 dark:hover:text-primary-300 transition-colors cursor-pointer"
              >
                #{tag}
              </span>
            ))}
            {hashtag.relatedTags.length > 4 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{hashtag.relatedTags.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Posts Preview */}
      {hashtag.topPosts.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Posts</div>
          <div className="space-y-2">
            {hashtag.topPosts.slice(0, 2).map((post) => (
              <div
                key={post.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <div className="text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
                  {post.contentCid}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>by {post.author}</span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={handleFollow}
          disabled={following}
          className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {following ? (
            <div className="flex items-center justify-center space-x-1">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Following...</span>
            </div>
          ) : (
            'Follow Tag'
          )}
        </button>
        
        <button
          onClick={handleBookmark}
          disabled={bookmarking}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {bookmarking ? (
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          )}
        </button>
      </div>

      {/* Growth Percentage */}
      {hashtag.growth > 0 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 text-xs rounded-full font-medium">
          +{hashtag.growth}%
        </div>
      )}
    </div>
  );
}