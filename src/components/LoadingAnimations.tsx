import React from 'react';
import { motion } from 'framer-motion';
import { loadingSpinner, loadingPulse, staggerContainer, staggerItem } from '@/lib/animations';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <motion.div
      variants={loadingSpinner}
      animate="animate"
      className={`${sizeClasses[size]} border-2 border-gray-300 border-t-primary-500 rounded-full ${className}`}
    />
  );
};

interface LoadingDotsProps {
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-primary-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

interface LoadingPulseProps {
  className?: string;
}

export const LoadingPulse: React.FC<LoadingPulseProps> = ({ className = '' }) => {
  return (
    <motion.div
      variants={loadingPulse}
      animate="animate"
      className={`w-4 h-4 bg-primary-500 rounded-full ${className}`}
    />
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines = 1 }) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`space-y-2 ${className}`}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          variants={staggerItem}
          className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          style={{
            width: index === lines - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </motion.div>
  );
};

interface PostSkeletonProps {
  className?: string;
}

export const PostSkeleton: React.FC<PostSkeletonProps> = ({ className = '' }) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4 ${className}`}
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 animate-pulse" />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={staggerItem} className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
      </motion.div>

      {/* Image placeholder */}
      <motion.div 
        variants={staggerItem} 
        className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" 
      />

      {/* Actions */}
      <motion.div variants={staggerItem} className="flex items-center space-x-4">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </motion.div>
    </motion.div>
  );
};

interface FeedSkeletonProps {
  count?: number;
  className?: string;
}

export const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ 
  count = 3, 
  className = '' 
}) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`space-y-6 ${className}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div key={index} variants={staggerItem}>
          <PostSkeleton />
        </motion.div>
      ))}
    </motion.div>
  );
};

interface SidebarSkeletonProps {
  className?: string;
}

export const SidebarSkeleton: React.FC<SidebarSkeletonProps> = ({ className = '' }) => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={`space-y-4 ${className}`}
    >
      {/* Profile section */}
      <motion.div variants={staggerItem} className="flex items-center space-x-3 p-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
        </div>
      </motion.div>

      {/* Navigation items */}
      {Array.from({ length: 5 }).map((_, index) => (
        <motion.div key={index} variants={staggerItem} className="px-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </motion.div>
      ))}

      {/* Communities section */}
      <motion.div variants={staggerItem} className="px-4 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </motion.div>
    </motion.div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center space-y-4 shadow-xl"
      >
        <LoadingSpinner size="lg" />
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </motion.div>
    </motion.div>
  );
};