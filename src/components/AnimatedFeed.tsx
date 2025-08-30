import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPostCard } from '@/components/AnimatedPostCard';
import { FeedSkeleton } from '@/components/LoadingAnimations';
import { AnimatedButton } from '@/components/MicroInteractions';
import { 
  staggerContainer, 
  staggerItem, 
  fadeInUp, 
  slideInFromLeft,
  scaleIn 
} from '@/lib/animations';

interface Post {
  id: string;
  author: {
    name: string;
    avatar?: string;
    address: string;
  };
  content: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  images?: string[];
  tags?: string[];
}

interface AnimatedFeedProps {
  posts: Post[];
  loading?: boolean;
  onLoadMore?: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onTip: (postId: string) => void;
  className?: string;
}

export const AnimatedFeed: React.FC<AnimatedFeedProps> = ({
  posts,
  loading = false,
  onLoadMore,
  onLike,
  onComment,
  onShare,
  onTip,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'following' | 'trending'>('all');
  const [hasNewPosts, setHasNewPosts] = useState(false);

  // Simulate new posts notification
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setHasNewPosts(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setHasNewPosts(false);
    // Trigger refresh logic
  };

  const filterButtons = [
    { key: 'all', label: 'All Posts', icon: '🌐' },
    { key: 'following', label: 'Following', icon: '👥' },
    { key: 'trending', label: 'Trending', icon: '🔥' },
  ] as const;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Feed Header with Filters */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Your Feed
          </h2>
          
          {/* New posts notification */}
          <AnimatePresence>
            {hasNewPosts && (
              <motion.button
                variants={scaleIn}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={handleRefresh}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </motion.svg>
                <span>New posts available</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Filter Tabs */}
        <motion.div 
          className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filterButtons.map((button) => (
            <motion.button
              key={button.key}
              onClick={() => setFilter(button.key)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === button.key
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              variants={staggerItem}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>{button.icon}</span>
              <span>{button.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Feed Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <FeedSkeleton count={3} />
          </motion.div>
        ) : posts.length > 0 ? (
          <motion.div
            key="posts"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                variants={staggerItem}
                custom={index}
                layout
              >
                <AnimatedPostCard
                  post={post}
                  onLike={onLike}
                  onComment={onComment}
                  onShare={onShare}
                  onTip={onTip}
                />
              </motion.div>
            ))}

            {/* Load More Button */}
            {onLoadMore && (
              <motion.div
                variants={staggerItem}
                className="flex justify-center pt-6"
              >
                <AnimatedButton
                  onClick={onLoadMore}
                  variant="secondary"
                  className="px-8"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Load More Posts
                </AnimatedButton>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center py-12"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center"
            >
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === 'following' 
                ? "Follow some users to see their posts here"
                : "Be the first to share something with the community"
              }
            </p>
            <AnimatedButton variant="primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Post
            </AnimatedButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating scroll to top button */}
      <motion.button
        className="fixed bottom-20 right-6 p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg z-40"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </motion.button>
    </div>
  );
};