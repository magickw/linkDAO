// Mock Loading Skeletons for testing
import React from 'react';

const LoadingSkeletons: React.FC = () => {
  return (
    <div data-testid="loading-skeletons" className="animate-pulse">
      <div className="bg-gray-300 h-4 rounded mb-2"></div>
      <div className="bg-gray-300 h-4 rounded mb-2"></div>
      <div className="bg-gray-300 h-4 rounded"></div>
    </div>
  );
};

export default LoadingSkeletons;