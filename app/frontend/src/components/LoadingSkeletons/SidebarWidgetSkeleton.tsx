import React from 'react';

interface SidebarWidgetSkeletonProps {
  type?: 'about' | 'stats' | 'moderators' | 'governance' | 'related' | 'generic';
  height?: 'small' | 'medium' | 'large';
}

export const SidebarWidgetSkeleton: React.FC<SidebarWidgetSkeletonProps> = ({ 
  type = 'generic',
  height = 'medium' 
}) => {
  const getHeightClass = () => {
    switch (height) {
      case 'small': return 'h-32';
      case 'large': return 'h-80';
      default: return 'h-48';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'about':
        return (
          <>
            <div className="w-3/4 h-4 bg-gray-200 rounded mb-3"></div>
            <div className="space-y-2 mb-4">
              <div className="w-full h-3 bg-gray-200 rounded"></div>
              <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
              <div className="w-4/5 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="flex items-center space-x-4 mb-3">
              <div className="w-12 h-3 bg-gray-200 rounded"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded"></div>
          </>
        );
      
      case 'stats':
        return (
          <>
            <div className="w-2/3 h-4 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="w-full h-6 bg-gray-200 rounded mb-1"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded mx-auto"></div>
              </div>
              <div className="text-center">
                <div className="w-full h-6 bg-gray-200 rounded mb-1"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded mx-auto"></div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full h-3 bg-gray-200 rounded mb-2"></div>
              <div className="w-4/5 h-3 bg-gray-200 rounded"></div>
            </div>
          </>
        );
      
      case 'moderators':
        return (
          <>
            <div className="w-1/2 h-4 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="w-3/4 h-3 bg-gray-200 rounded mb-1"></div>
                    <div className="w-1/2 h-2 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      
      case 'governance':
        return (
          <>
            <div className="w-2/3 h-4 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="border border-gray-200 rounded p-3">
                <div className="w-full h-3 bg-gray-200 rounded mb-2"></div>
                <div className="w-3/4 h-3 bg-gray-200 rounded mb-3"></div>
                <div className="flex justify-between items-center">
                  <div className="w-16 h-2 bg-gray-200 rounded"></div>
                  <div className="w-12 h-5 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
                <div className="w-8 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </>
        );
      
      case 'related':
        return (
          <>
            <div className="w-3/4 h-4 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div>
                      <div className="w-20 h-3 bg-gray-200 rounded mb-1"></div>
                      <div className="w-16 h-2 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-12 h-5 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </>
        );
      
      default:
        return (
          <>
            <div className="w-2/3 h-4 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="w-full h-3 bg-gray-200 rounded"></div>
              <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
              <div className="w-4/5 h-3 bg-gray-200 rounded"></div>
            </div>
            <div className="mt-4">
              <div className="w-3/4 h-6 bg-gray-200 rounded"></div>
            </div>
          </>
        );
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 mb-4 animate-pulse ${getHeightClass()}`}>
      {renderContent()}
    </div>
  );
};

export default SidebarWidgetSkeleton;