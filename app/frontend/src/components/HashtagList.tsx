import React from 'react';

interface Hashtag {
  tag: string;
  count: number;
  growth: number;
}

interface HashtagListProps {
  hashtags: Hashtag[];
  selectedHashtag: string;
  onHashtagSelect: (hashtag: string) => void;
  isLoading?: boolean;
  className?: string;
}

export default function HashtagList({
  hashtags,
  selectedHashtag,
  onHashtagSelect,
  isLoading = false,
  className = ''
}: HashtagListProps) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sticky top-4 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <span className="mr-2" aria-hidden="true">#️⃣</span>
        <span>Trending Hashtags</span>
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : hashtags.length > 0 ? (
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
          {hashtags.map((hashtag, index) => (
            <button
              key={hashtag.tag}
              onClick={() => onHashtagSelect(hashtag.tag)}
              aria-pressed={selectedHashtag === hashtag.tag}
              aria-label={`${hashtag.tag} hashtag with ${hashtag.count} posts and ${hashtag.growth}% growth`}
              className={`w-full text-left p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                selectedHashtag === hashtag.tag
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-primary-600 dark:text-primary-400">
                  #{hashtag.tag}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400" aria-hidden="true">
                  #{index + 1}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{hashtag.count.toLocaleString()} posts</span>
                {hashtag.growth > 0 && (
                  <span className="text-green-600 dark:text-green-400 flex items-center" aria-label={`${hashtag.growth}% growth`}>
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
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
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="text-sm">No trending hashtags</p>
        </div>
      )}
    </div>
  );
}
