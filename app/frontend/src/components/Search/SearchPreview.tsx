import React, { useState, useRef, useEffect } from 'react';
import { SearchResult } from './GlobalSearchInterface';

interface SearchPreviewProps {
  children: React.ReactNode;
  result: SearchResult;
  position: number;
  className?: string;
}

export function SearchPreview({ 
  children, 
  result, 
  position,
  className = '' 
}: SearchPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        // Position preview to the right of the element, with fallbacks
        const x = rect.right + 10;
        const y = rect.top;
        setPreviewPosition({ x, y });
        setShowPreview(true);
      }
    }, 500); // 500ms delay before showing preview
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPreview(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

  return (
    <div 
      ref={triggerRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {/* Preview Tooltip */}
      {showPreview && (
        <div 
          className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            maxHeight: '400px',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div className="flex items-start space-x-3 mb-3">
            {result.imageUrl ? (
              <img
                src={result.imageUrl}
                alt={result.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <div className="text-2xl">
                  {result.type === 'post' && '📝'}
                  {result.type === 'community' && '👥'}
                  {result.type === 'user' && '👤'}
                  {result.type === 'hashtag' && '#'}
                  {result.type === 'topic' && '🏷️'}
                </div>
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {result.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {result.type}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  #{position + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {result.description && (
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
              {result.description}
            </p>
          )}

          {/* Metadata */}
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            {/* Author */}
            {result.metadata.authorName && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>by {result.metadata.authorName}</span>
              </div>
            )}

            {/* Community */}
            {result.metadata.communityName && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>in {result.metadata.communityName}</span>
              </div>
            )}

            {/* Date */}
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(result.metadata.createdAt)}</span>
            </div>

            {/* Type-specific stats */}
            {result.type === 'community' && result.metadata.memberCount && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{formatNumber(result.metadata.memberCount)} members</span>
              </div>
            )}

            {result.type === 'user' && result.metadata.postCount && (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span>{formatNumber(result.metadata.postCount)} posts</span>
              </div>
            )}

            {/* Engagement */}
            {result.metadata.engagement && (
              <div className="flex items-center space-x-4 pt-1">
                {result.metadata.engagement.likes > 0 && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    <span>{formatNumber(result.metadata.engagement.likes)}</span>
                  </div>
                )}
                
                {result.metadata.engagement.comments > 0 && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{formatNumber(result.metadata.engagement.comments)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relevance Score */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">Relevance</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      result.metadata.relevanceScore >= 0.8 ? 'bg-green-500' :
                      result.metadata.relevanceScore >= 0.6 ? 'bg-yellow-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${result.metadata.relevanceScore * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {Math.round(result.metadata.relevanceScore * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}