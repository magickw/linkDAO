import React from 'react';
import { Clock, Eye, TrendingUp } from 'lucide-react';

interface ScrollProgressIndicatorProps {
  progress: number;
  readTime: string;
  views?: number;
  popularity?: number;
  className?: string;
}

const ScrollProgressIndicator: React.FC<ScrollProgressIndicatorProps> = ({
  progress,
  readTime,
  views,
  popularity,
  className = ''
}) => {
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm ${className}`}>
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200">
        <div 
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Document Info */}
      <div className="px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4 text-gray-600">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{readTime}</span>
          </div>
          
          {views && (
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{views.toLocaleString()} views</span>
            </div>
          )}
          
          {popularity && (
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>{popularity}% helpful</span>
            </div>
          )}
        </div>
        
        <div className="text-gray-500">
          {progress.toFixed(0)}% complete
        </div>
      </div>
    </div>
  );
};

export default ScrollProgressIndicator;