import React, { useState } from 'react';
import { TopicResult } from '../../types/enhancedSearch';

interface TopicResultCardProps {
  topic: TopicResult;
  position: number;
  onFollow: (name: string) => Promise<void>;
  onBookmark: (name: string, title: string, description?: string) => Promise<void>;
}

export function TopicResultCard({
  topic,
  position,
  onFollow,
  onBookmark
}: TopicResultCardProps) {
  const [following, setFollowing] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowing(true);
    try {
      await onFollow(topic.name);
    } finally {
      setFollowing(false);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarking(true);
    try {
      await onBookmark(topic.name, topic.name, topic.description);
    } finally {
      setBookmarking(false);
    }
  };

  const getTopicIcon = (name: string) => {
    const iconMap: Record<string, string> = {
      'Technology': '💻',
      'Gaming': '🎮',
      'Art': '🎨',
      'Music': '🎵',
      'Sports': '⚽',
      'Education': '📚',
      'Business': '💼',
      'Science': '🔬',
      'Politics': '🏛️',
      'Entertainment': '🎬',
      'Health': '🏥',
      'Travel': '✈️',
      'Food': '🍕',
      'Fashion': '👗',
      'Photography': '📸',
      'Cryptocurrency': '₿',
      'DeFi': '🏦',
      'NFT': '🖼️',
      'Web3': '🌐'
    };
    return iconMap[name] || '🏷️';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 group relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">{getTopicIcon(topic.name)}</span>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {topic.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span>{topic.postCount.toLocaleString()} posts</span>
              <span>•</span>
              <span>{topic.communityCount.toLocaleString()} communities</span>
            </div>
          </div>
        </div>

        {/* Trending Badge */}
        {topic.trending && (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-300 text-xs rounded-full font-medium">
            🔥 Trending
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
        {topic.description}
      </p>

      {/* Related Topics */}
      {topic.relatedTopics.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Related Topics</div>
          <div className="flex flex-wrap gap-1">
            {topic.relatedTopics.slice(0, 4).map((relatedTopic) => (
              <span
                key={relatedTopic}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 dark:hover:text-primary-300 transition-colors cursor-pointer"
              >
                {relatedTopic}
              </span>
            ))}
            {topic.relatedTopics.length > 4 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{topic.relatedTopics.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top Communities */}
      {topic.topCommunities.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Top Communities</div>
          <div className="space-y-2">
            {topic.topCommunities.slice(0, 3).map((community) => (
              <div
                key={community.id}
                className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                {community.avatar ? (
                  <img
                    src={community.avatar}
                    alt={community.displayName}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {community.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {community.displayName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {community.memberCount.toLocaleString()} members
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts Preview */}
      {topic.recentPosts.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Posts</div>
          <div className="space-y-2">
            {topic.recentPosts.slice(0, 2).map((post) => (
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
            'Follow Topic'
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
    </div>
  );
}