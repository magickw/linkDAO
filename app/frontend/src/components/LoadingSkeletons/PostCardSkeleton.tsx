import React from 'react';

interface PostCardSkeletonProps {
  viewMode?: 'card' | 'compact';
  showThumbnail?: boolean;
}

export const PostCardSkeleton: React.FC<PostCardSkeletonProps> = ({ 
  viewMode = 'card',
  showThumbnail = true 
}) => {
  if (viewMode === 'compact') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2 animate-pulse">
        <div className="flex items-center space-x-3">
          {/* Vote arrows */}
          <div className="flex flex-col items-center space-y-1">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="w-8 h-4 bg-gray-200 rounded"></div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
          </div>
          
          {/* Thumbnail */}
          {showThumbnail && (
            <div className="w-16 h-12 bg-gray-200 rounded flex-shrink-0"></div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-12 h-3 bg-gray-200 rounded"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="w-3/4 h-4 bg-gray-300 rounded mb-1"></div>
            <div className="flex items-center space-x-3 text-xs">
              <div className="w-12 h-3 bg-gray-200 rounded"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
              <div className="w-10 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4 animate-pulse">
      <div className="flex">
        {/* Vote section */}
        <div className="flex flex-col items-center p-3 space-y-2">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="w-10 h-5 bg-gray-200 rounded"></div>
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 p-4">
          {/* Post metadata */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
            <div className="w-12 h-4 bg-gray-200 rounded"></div>
          </div>
          
          {/* Title */}
          <div className="space-y-2 mb-4">
            <div className="w-full h-5 bg-gray-300 rounded"></div>
            <div className="w-4/5 h-5 bg-gray-300 rounded"></div>
          </div>
          
          {/* Thumbnail */}
          {showThumbnail && (
            <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
          )}
          
          {/* Content preview */}
          <div className="space-y-2 mb-4">
            <div className="w-full h-4 bg-gray-200 rounded"></div>
            <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
            <div className="w-12 h-6 bg-gray-200 rounded"></div>
            <div className="w-14 h-6 bg-gray-200 rounded"></div>
            <div className="w-12 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCardSkeleton;