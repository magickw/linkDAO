import React from 'react';

interface CommunityHeaderSkeletonProps {
  showBanner?: boolean;
}

export const CommunityHeaderSkeleton: React.FC<CommunityHeaderSkeletonProps> = ({ 
  showBanner = true 
}) => {
  return (
    <div className="bg-white border-b border-gray-200 animate-pulse">
      {/* Banner */}
      {showBanner && (
        <div className="w-full h-32 md:h-48 bg-gradient-to-r from-gray-200 to-gray-300"></div>
      )}
      
      {/* Header content */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Community avatar */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 rounded-full border-4 border-white -mt-8"></div>
            
            {/* Community info */}
            <div className="space-y-2">
              <div className="w-32 h-6 bg-gray-300 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
          
          {/* Join button */}
          <div className="w-20 h-8 bg-gray-200 rounded"></div>
        </div>
        
        {/* Navigation tabs */}
        <div className="flex items-center space-x-6 mt-4 border-b border-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-16 h-4 bg-gray-200 rounded mb-2"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityHeaderSkeleton;