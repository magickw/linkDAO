import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  animation = 'pulse' 
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Could be enhanced with a wave animation
    none: ''
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1rem' : undefined)
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6 animate-fadeInUp">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <Skeleton variant="circular" width={48} height={48} />
        
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton variant="text" width="40%" height="1.25rem" />
            <Skeleton variant="text" width="25%" height="0.875rem" />
          </div>
          
          {/* Content */}
          <div className="space-y-2">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="85%" />
            <Skeleton variant="text" width="60%" />
          </div>
          
          {/* Media placeholder */}
          <Skeleton variant="rounded" width="100%" height="200px" />
          
          {/* Actions */}
          <div className="flex items-center space-x-6 pt-4">
            <Skeleton variant="text" width="60px" height="1rem" />
            <Skeleton variant="text" width="60px" height="1rem" />
            <Skeleton variant="text" width="60px" height="1rem" />
            <Skeleton variant="text" width="60px" height="1rem" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Feed Skeleton
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
          <PostCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Sidebar Skeleton
export function SidebarSkeleton() {
  return (
    <div className="space-y-6 animate-fadeInRight">
      {/* User Profile Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 space-y-4">
        <div className="flex items-center space-x-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" width="70%" height="1rem" />
            <Skeleton variant="text" width="50%" height="0.75rem" />
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width="60%" height="1rem" />
          </div>
        ))}
      </div>

      {/* Communities */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl p-4 space-y-3">
        <Skeleton variant="text" width="40%" height="1.25rem" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3">
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width="70%" height="0.875rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard Header Skeleton
export function DashboardHeaderSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 p-6 animate-fadeInDown">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <Skeleton variant="circular" width={64} height={64} />
          <div className="space-y-2">
            <Skeleton variant="text" width="150px" height="1.5rem" />
            <Skeleton variant="text" width="100px" height="1rem" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 md:mb-0">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="text-center space-y-1">
              <Skeleton variant="text" width="60px" height="1.25rem" />
              <Skeleton variant="text" width="40px" height="0.75rem" />
            </div>
          ))}
        </div>

        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rounded" width="120px" height="40px" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Community Header Skeleton
export function CommunityHeaderSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden animate-fadeInUp">
      {/* Banner */}
      <Skeleton variant="rectangular" width="100%" height="120px" />
      
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <Skeleton variant="circular" width={80} height={80} className="-mt-10" />
          <div className="flex-1 space-y-3">
            <Skeleton variant="text" width="200px" height="1.5rem" />
            <Skeleton variant="text" width="300px" height="1rem" />
            <div className="flex items-center space-x-4">
              <Skeleton variant="text" width="80px" height="0.875rem" />
              <Skeleton variant="text" width="100px" height="0.875rem" />
            </div>
          </div>
          <Skeleton variant="rounded" width="100px" height="36px" />
        </div>
      </div>
    </div>
  );
}

// Loading Spinner Component
export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Pulsing Dot Indicator
export function PulsingDot({ 
  color = 'primary',
  size = 'sm',
  className = '' 
}: {
  color?: 'primary' | 'secondary' | 'green' | 'red' | 'yellow';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse ${className}`} />
  );
}