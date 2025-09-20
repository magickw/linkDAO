import React from 'react';
import { motion } from 'framer-motion';

// Base skeleton component with shimmer effect
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animate?: boolean;
}

function BaseSkeleton({
  className = '',
  width = '100%',
  height = '1rem',
  rounded = 'md',
  animate = true
}: SkeletonProps) {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };

  const shimmerAnimation = animate ? {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  } : {};

  return (
    <motion.div
      className={`
        bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
        dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
        ${roundedClasses[rounded]} ${className}
      `}
      style={{
        width,
        height,
        backgroundSize: '200% 100%'
      }}
      {...shimmerAnimation}
    />
  );
}

// Post Card Skeleton
export function PostCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-gray-700/50 overflow-hidden p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start space-x-3 mb-4">
        <BaseSkeleton width={48} height={48} rounded="xl" />
        <div className="flex-1 space-y-2">
          <BaseSkeleton width="40%" height={16} />
          <BaseSkeleton width="60%" height={14} />
        </div>
        <BaseSkeleton width={60} height={24} rounded="full" />
      </div>

      {/* Title */}
      <BaseSkeleton width="80%" height={20} className="mb-3" />

      {/* Content */}
      <div className="space-y-2 mb-4">
        <BaseSkeleton width="100%" height={16} />
        <BaseSkeleton width="90%" height={16} />
        <BaseSkeleton width="75%" height={16} />
      </div>

      {/* Media placeholder */}
      <BaseSkeleton width="100%" height={200} rounded="xl" className="mb-4" />

      {/* Hashtags */}
      <div className="flex space-x-2 mb-4">
        <BaseSkeleton width={60} height={20} rounded="full" />
        <BaseSkeleton width={80} height={20} rounded="full" />
        <BaseSkeleton width={70} height={20} rounded="full" />
      </div>

      {/* Interaction bar */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-4">
          <BaseSkeleton width={40} height={32} rounded="lg" />
          <BaseSkeleton width={40} height={32} rounded="lg" />
          <BaseSkeleton width={40} height={32} rounded="lg" />
        </div>
        <BaseSkeleton width={80} height={32} rounded="lg" />
      </div>
    </div>
  );
}

// Sidebar Link Skeleton
export function SidebarLinkSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 px-4 py-3 ${className}`}>
      <BaseSkeleton width={20} height={20} rounded="sm" />
      <BaseSkeleton width="60%" height={16} />
      <BaseSkeleton width={24} height={16} rounded="full" />
    </div>
  );
}

// User Profile Card Skeleton
export function UserProfileCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-gray-700/50 p-4 ${className}`}>
      {/* Avatar and basic info */}
      <div className="flex items-center space-x-3 mb-4">
        <BaseSkeleton width={60} height={60} rounded="full" />
        <div className="flex-1 space-y-2">
          <BaseSkeleton width="70%" height={18} />
          <BaseSkeleton width="50%" height={14} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center space-y-1">
          <BaseSkeleton width="100%" height={20} />
          <BaseSkeleton width="80%" height={12} />
        </div>
        <div className="text-center space-y-1">
          <BaseSkeleton width="100%" height={20} />
          <BaseSkeleton width="80%" height={12} />
        </div>
        <div className="text-center space-y-1">
          <BaseSkeleton width="100%" height={20} />
          <BaseSkeleton width="80%" height={12} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex space-x-2 mb-4">
        <BaseSkeleton width={24} height={24} rounded="full" />
        <BaseSkeleton width={24} height={24} rounded="full" />
        <BaseSkeleton width={24} height={24} rounded="full" />
      </div>

      {/* Action button */}
      <BaseSkeleton width="100%" height={36} rounded="lg" />
    </div>
  );
}

// Wallet Dashboard Skeleton
export function WalletDashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-gray-700/50 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <BaseSkeleton width="40%" height={18} />
        <BaseSkeleton width={24} height={24} rounded="full" />
      </div>

      {/* Balance */}
      <div className="mb-4">
        <BaseSkeleton width="60%" height={32} className="mb-2" />
        <BaseSkeleton width="40%" height={16} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <BaseSkeleton width="100%" height={36} rounded="lg" />
        <BaseSkeleton width="100%" height={36} rounded="lg" />
      </div>

      {/* Recent transactions */}
      <div className="space-y-3">
        <BaseSkeleton width="50%" height={16} />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <BaseSkeleton width={32} height={32} rounded="full" />
            <div className="flex-1 space-y-1">
              <BaseSkeleton width="70%" height={14} />
              <BaseSkeleton width="50%" height={12} />
            </div>
            <BaseSkeleton width="20%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Feed Skeleton
export function FeedSkeleton({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <PostCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

// Navigation Skeleton
export function NavigationSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* User profile section */}
      <div className="p-4 mb-4">
        <div className="flex items-center space-x-3 mb-4">
          <BaseSkeleton width={48} height={48} rounded="full" />
          <div className="flex-1 space-y-2">
            <BaseSkeleton width="70%" height={16} />
            <BaseSkeleton width="50%" height={14} />
          </div>
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-4 mb-4">
        <BaseSkeleton width="40%" height={16} className="mb-3" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <SidebarLinkSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Communities */}
      <div className="px-4">
        <BaseSkeleton width="50%" height={16} className="mb-3" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <SidebarLinkSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Trending Widget Skeleton
export function TrendingWidgetSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl border border-white/30 dark:border-gray-700/50 p-4 ${className}`}>
      <BaseSkeleton width="60%" height={18} className="mb-4" />
      
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <BaseSkeleton width={8} height={8} rounded="full" />
            <div className="flex-1 space-y-2">
              <BaseSkeleton width="80%" height={14} />
              <BaseSkeleton width="60%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reputation Progress Skeleton
export function ReputationProgressSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall progress */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <BaseSkeleton width="40%" height={16} />
          <BaseSkeleton width="20%" height={16} />
        </div>
        <BaseSkeleton width="100%" height={8} rounded="full" />
      </div>

      {/* Category progress */}
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <div className="flex justify-between items-center mb-2">
            <BaseSkeleton width="30%" height={14} />
            <BaseSkeleton width="15%" height={14} />
          </div>
          <BaseSkeleton width="100%" height={6} rounded="full" />
        </div>
      ))}
    </div>
  );
}

// Badge Collection Skeleton
export function BadgeCollectionSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-4 gap-3 ${className}`}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="text-center space-y-2">
          <BaseSkeleton width={48} height={48} rounded="full" className="mx-auto" />
          <BaseSkeleton width="80%" height={12} className="mx-auto" />
        </div>
      ))}
    </div>
  );
}

// Loading Skeleton with stagger animation
interface StaggeredSkeletonProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggeredSkeleton({
  children,
  staggerDelay = 0.1,
  className = ''
}: StaggeredSkeletonProps) {
  return (
    <motion.div
      className={className}
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      initial="initial"
      animate="animate"
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.3 }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Pulse loading indicator
export function PulseLoader({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    white: 'bg-white'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </div>
  );
}