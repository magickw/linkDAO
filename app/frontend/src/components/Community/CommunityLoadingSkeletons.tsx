import React from 'react';

interface CommunityCardSkeletonProps {
  compact?: boolean;
}

export const CommunityCardSkeleton: React.FC<CommunityCardSkeletonProps> = ({ compact = false }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      {/* Banner */}
      <div className={`${compact ? 'h-20' : 'h-32'} bg-gray-200 dark:bg-gray-700`}></div>
      
      {/* Avatar */}
      <div className={`absolute -bottom-4 left-4 ${compact ? 'w-10 h-10' : 'w-14 h-14'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-full p-1">
          <div className={`rounded-full ${compact ? 'w-8 h-8' : 'w-12 h-12'} bg-gray-200 dark:bg-gray-700`}></div>
        </div>
      </div>
      
      {/* Content */}
      <div className={`pt-6 pb-4 px-4 ${compact ? 'pt-5' : ''}`}>
        <div className="mb-3">
          <div className={`h-5 bg-gray-200 dark:bg-gray-700 rounded mb-1 ${compact ? 'w-3/4' : 'w-full'}`}></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div>
          
          {!compact && (
            <>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
            </>
          )}
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-3">
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-gray-100 dark:border-gray-700">
          <div className="text-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
          <div className="text-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
        
        {/* Footer */}
        {!compact && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

interface CommunityFeedSkeletonProps {
  postCount?: number;
}

export const CommunityFeedSkeleton: React.FC<CommunityFeedSkeletonProps> = ({ postCount = 5 }) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: postCount }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
            </div>
          </div>
          
          {/* Content */}
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
          
          {/* Media placeholder */}
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
          
          {/* Interaction bar */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default { CommunityCardSkeleton, CommunityFeedSkeleton };