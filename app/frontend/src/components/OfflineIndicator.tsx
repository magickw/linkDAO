import React from 'react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isBackendAvailable: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline, isBackendAvailable }) => {
  if (isOnline && isBackendAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <span>
        {!isOnline 
          ? 'You are currently offline' 
          : 'Service temporarily unavailable'}
      </span>
    </div>
  );
};