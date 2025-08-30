import React from 'react';

// Base skeleton component
interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
    />
  );
}

// Post card skeleton for feed
export function PostCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/4 mb-2" />
          <Skeleton className="h-3 w-1/6" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      
      {/* Content */}
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      
      {/* Media placeholder (sometimes) */}
      {Math.random() > 0.5 && (
        <Skeleton className="h-48 w-full mb-4 rounded-lg" />
      )}
      
      {/* Interaction bar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

// Community post skeleton (Reddit-style)
export function CommunityPostSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse ${className}`}>
      <div className="flex">
        {/* Vote section */}
        <div className="w-12 p-2 bg-gray-50 dark:bg-gray-900 rounded-l-xl flex flex-col items-center space-y-1">
          <Skeleton className="w-6 h-6" />
          <Skeleton className="w-8 h-4" />
          <Skeleton className="w-6 h-6" />
        </div>
        
        {/* Content section */}
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-3">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          
          {/* Title */}
          <Skeleton className="h-5 w-4/5 mb-3" />
          
          {/* Content */}
          <div className="space-y-2 mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Feed skeleton with multiple posts
export function FeedSkeleton({ postCount = 3, className = '' }: { postCount?: number; className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: postCount }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Community feed skeleton
export function CommunityFeedSkeleton({ postCount = 3, className = '' }: { postCount?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: postCount }, (_, i) => (
        <CommunityPostSkeleton key={i} />
      ))}
    </div>
  );
}

// Community header skeleton
export function CommunityHeaderSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden animate-pulse ${className}`}>
      {/* Banner */}
      <Skeleton className="h-32 w-full" />
      
      {/* Community Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <Skeleton className="w-16 h-16 rounded-full" />
            
            {/* Details */}
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Join button */}
          <Skeleton className="h-10 w-24" />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// Sidebar skeleton
export function SidebarSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* User profile section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
      
      {/* Navigation section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <Skeleton className="h-5 w-20 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Communities section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
        <Skeleton className="h-5 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comment thread skeleton
export function CommentThreadSkeleton({ depth = 0, className = '' }: { depth?: number; className?: string }) {
  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''} ${className}`}>
      <div className="animate-pulse">
        {/* Comment header */}
        <div className="flex items-center space-x-2 mb-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        
        {/* Comment content */}
        <div className="space-y-2 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Comment actions */}
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-16" />
        </div>
        
        {/* Nested comments */}
        {depth < 2 && Math.random() > 0.5 && (
          <CommentThreadSkeleton depth={depth + 1} />
        )}
      </div>
    </div>
  );
}

// Loading spinner component
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`} />
  );
}

// Community grid skeleton
export function CommunityGridSkeleton({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          {/* Banner */}
          <Skeleton className="h-20 w-full" />
          
          <div className="p-4">
            {/* Avatar and Info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <Skeleton className="w-12 h-12 rounded-full -mt-6" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            
            {/* Description */}
            <div className="space-y-2 mb-3">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            
            {/* Stats and Tags */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              <Skeleton className="h-4 w-8 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-4 w-10 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Progressive loading indicator
export function ProgressiveLoader({ 
  isLoading, 
  hasMore, 
  onLoadMore, 
  className = '' 
}: { 
  isLoading: boolean; 
  hasMore: boolean; 
  onLoadMore?: () => void;
  className?: string;
}) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="flex items-center space-x-3">
          <LoadingSpinner />
          <span className="text-gray-600 dark:text-gray-300">Loading more content...</span>
        </div>
      </div>
    );
  }
  
  if (!hasMore) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            You've reached the end
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Check back later for new content
          </p>
        </div>
      </div>
    );
  }
  
  if (onLoadMore) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <button
          onClick={onLoadMore}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium"
        >
          Load More
        </button>
      </div>
    );
  }
  
  return null;
}

// Search Results Skeleton
export function SearchResultsSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="animate-pulse">
        <Skeleton className="h-4 w-48 mb-4" />
      </div>
      
      {/* Posts Section */}
      <div>
        <div className="animate-pulse mb-4">
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
      
      {/* Communities Section */}
      <div>
        <div className="animate-pulse mb-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
              <div className="flex items-center space-x-3 mb-2">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Trending Content Skeleton
export function TrendingContentSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between animate-pulse">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      {/* Trending Hashtags */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse mb-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="flex items-center justify-between p-2 animate-pulse">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Recommendation Cards Skeleton
export function RecommendationCardsSkeleton({ count = 6, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between animate-pulse">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse mb-4">
          <Skeleton className="h-5 w-48" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <Skeleton className="h-16 w-full" />
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Skeleton className="w-10 h-10 rounded-full -mt-8" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Post Feed Skeleton (for hashtag pages)
export function PostFeedSkeleton({ count = 5, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Export all skeletons as a namespace for easier importing
export const LoadingSkeletons = {
  PostCard: PostCardSkeleton,
  CommunityPost: CommunityPostSkeleton,
  Feed: FeedSkeleton,
  CommunityFeed: CommunityFeedSkeleton,
  CommunityHeader: CommunityHeaderSkeleton,
  CommunityGrid: CommunityGridSkeleton,
  Sidebar: SidebarSkeleton,
  CommentThread: CommentThreadSkeleton,
  Spinner: LoadingSpinner,
  ProgressiveLoader: ProgressiveLoader,
  SearchResults: SearchResultsSkeleton,
  TrendingContent: TrendingContentSkeleton,
  RecommendationCards: RecommendationCardsSkeleton,
  PostFeed: PostFeedSkeleton
};