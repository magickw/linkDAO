import React from 'react';
import PostCardSkeleton from './PostCardSkeleton';

interface PostListSkeletonProps {
  count?: number;
  viewMode?: 'card' | 'compact';
  showSortingTabs?: boolean;
}

export const PostListSkeleton: React.FC<PostListSkeletonProps> = ({ 
  count = 5,
  viewMode = 'card',
  showSortingTabs = true 
}) => {
  return (
    <div className="space-y-4">
      {/* Sorting tabs skeleton */}
      {showSortingTabs && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-12 h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      )}
      
      {/* Post cards skeleton */}
      <div className="space-y-2">
        {Array.from({ length: count }, (_, i) => (
          <PostCardSkeleton 
            key={i} 
            viewMode={viewMode}
            showThumbnail={Math.random() > 0.3} // Randomly show thumbnails
          />
        ))}
      </div>
      
      {/* Load more skeleton */}
      <div className="flex justify-center py-4">
        <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
};

export default PostListSkeleton;