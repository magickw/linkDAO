/**
 * SearchResults Component
 * Displays search results with ranking and relevance scoring
 * Implements requirements 4.1, 4.4 from the interconnected social platform spec
 */

import React from 'react';
import { SearchResult } from './GlobalSearchInterface';
import { useRouter } from 'next/router';

interface SearchResultsProps {
  results: (SearchResult & { isSelected?: boolean })[];
  onResultSelect: (result: SearchResult) => void;
  compact?: boolean;
  showMetadata?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onResultSelect,
  compact = false,
  showMetadata = true
}) => {
  const router = useRouter();

  const getResultIcon = (type: SearchResult['type']) => {
    const iconClass = compact ? "w-4 h-4" : "w-5 h-5";
    
    switch (type) {
      case 'post':
        return (
          <svg className={`${iconClass} text-blue-600 dark:text-blue-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'community':
        return (
          <svg className={`${iconClass} text-green-600 dark:text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'user':
        return (
          <svg className={`${iconClass} text-purple-600 dark:text-purple-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'hashtag':
        return (
          <svg className={`${iconClass} text-orange-600 dark:text-orange-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-600 dark:text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'post':
        return 'Post';
      case 'community':
        return 'Community';
      case 'user':
        return 'User';
      case 'hashtag':
        return 'Hashtag';
      default:
        return 'Content';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="search-results">
      {results.map((result, index) => (
        <div
          key={result.id}
          className={`
            search-result-item
            flex items-start space-x-3 p-3 cursor-pointer transition-colors
            hover:bg-gray-50 dark:hover:bg-gray-700
            ${result.isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
            ${compact ? 'py-2' : 'py-3'}
          `}
          onClick={() => onResultSelect(result)}
        >
          {/* Icon/Image */}
          <div className="flex-shrink-0">
            {result.imageUrl ? (
              <img
                src={result.imageUrl}
                alt={result.title}
                className={`rounded-lg object-cover ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
              />
            ) : (
              <div className={`
                rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center
                ${compact ? 'w-8 h-8' : 'w-12 h-12'}
              `}>
                {getResultIcon(result.type)}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Title and Type */}
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className={`
                    font-medium text-gray-900 dark:text-white truncate
                    ${compact ? 'text-sm' : 'text-base'}
                  `}>
                    {result.title}
                  </h3>
                  <span className={`
                    px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide flex-shrink-0
                  `}>
                    {getTypeLabel(result.type)}
                  </span>
                </div>

                {/* Description */}
                <p className={`
                  text-gray-600 dark:text-gray-400 line-clamp-2 mb-2
                  ${compact ? 'text-xs' : 'text-sm'}
                `}>
                  {result.description}
                </p>

                {/* Metadata */}
                {showMetadata && (
                  <div className={`
                    flex items-center space-x-3 text-gray-500 dark:text-gray-400
                    ${compact ? 'text-xs' : 'text-sm'}
                  `}>
                    {/* Author */}
                    {result.metadata.authorName && (
                      <span>by {result.metadata.authorName}</span>
                    )}

                    {/* Community */}
                    {result.metadata.communityName && (
                      <span>in {result.metadata.communityName}</span>
                    )}

                    {/* Date */}
                    <span>{formatDate(result.metadata.createdAt)}</span>

                    {/* Stats based on type */}
                    {result.type === 'community' && result.metadata.memberCount && (
                      <span>{formatNumber(result.metadata.memberCount)} members</span>
                    )}

                    {result.type === 'user' && result.metadata.postCount && (
                      <span>{formatNumber(result.metadata.postCount)} posts</span>
                    )}

                    {/* Engagement */}
                    {result.metadata.engagement && (
                      <div className="flex items-center space-x-2">
                        {result.metadata.engagement.likes > 0 && (
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                            </svg>
                            <span>{formatNumber(result.metadata.engagement.likes)}</span>
                          </span>
                        )}
                        
                        {result.metadata.engagement.comments > 0 && (
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{formatNumber(result.metadata.engagement.comments)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Relevance Score */}
              {!compact && (
                <div className="flex-shrink-0 ml-3">
                  <div className={`
                    text-xs font-medium px-2 py-1 rounded-full
                    ${getRelevanceColor(result.metadata.relevanceScore)}
                    bg-gray-100 dark:bg-gray-700
                  `}>
                    {Math.round(result.metadata.relevanceScore * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default SearchResults;