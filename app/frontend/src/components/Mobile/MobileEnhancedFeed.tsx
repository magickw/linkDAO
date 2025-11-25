import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';
import { MobileVirtualScrolling } from './MobileVirtualScrolling';
import MobileEnhancedPostCard from './MobileEnhancedPostCard';
import MobileEnhancedPostComposer from './MobileEnhancedPostComposer';
import { EnhancedPost } from '@/types/feed';
import { ReactionType } from '@/types/tokenReaction';
import { RichPostInput } from '@/types/enhancedPost';

interface MobileEnhancedFeedProps {
  posts: EnhancedPost[];
  loading?: boolean;
  refreshing?: boolean;
  hasMore?: boolean;
  sortBy?: 'hot' | 'new' | 'top' | 'rising';
  onLoadMore: () => void;
  onRefresh: () => Promise<void>;
  onPostCreate: (post: RichPostInput) => Promise<void>;
  onPostReact: (postId: string, type: ReactionType, amount: number) => Promise<void>;
  onPostComment: (postId: string) => void;
  onPostShare: (postId: string) => void;
  onPostBookmark: (postId: string) => void;
  onPostUpvote?: (postId: string) => Promise<void>;
  onPostDownvote?: (postId: string) => Promise<void>;
  onViewReactors: (postId: string, type: ReactionType) => void;
  onUserPress: (userId: string) => void;
  onSortChange: (sort: 'hot' | 'new' | 'top' | 'rising') => void;
  className?: string;
}

export const MobileEnhancedFeed: React.FC<MobileEnhancedFeedProps> = ({
  posts,
  loading = false,
  refreshing = false,
  hasMore = true,
  sortBy = 'hot',
  onLoadMore,
  onRefresh,
  onPostCreate,
  onPostReact,
  onPostComment,
  onPostShare,
  onPostBookmark,
  onPostUpvote,
  onPostDownvote,
  onViewReactors,
  onUserPress,
  onSortChange,
  className = ''
}) => {
  const {
    triggerHapticFeedback,
    safeAreaInsets,
    touchTargetClasses,
    mobileOptimizedClasses
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const [showComposer, setShowComposer] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { key: 'hot', label: 'Hot', icon: '🔥', description: 'Trending posts' },
    { key: 'new', label: 'New', icon: '🆕', description: 'Latest posts' },
    { key: 'top', label: 'Top', icon: '⭐', description: 'Most popular' },
    { key: 'rising', label: 'Rising', icon: '📈', description: 'Gaining traction' }
  ] as const;

  // Convert posts to virtual items
  const virtualItems = useMemo(() => 
    posts.map(post => ({
      id: post.id,
      data: post,
      height: 400 // Estimated height, could be dynamic
    }))
  , [posts]);

  const handlePostCreate = async (post: RichPostInput) => {
    try {
      await onPostCreate(post);
      triggerHapticFeedback('success');
      announceToScreenReader('Post created successfully');
    } catch (error) {
      triggerHapticFeedback('error');
      announceToScreenReader('Failed to create post');
      throw error;
    }
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    if (newSort !== sortBy) {
      triggerHapticFeedback('light');
      onSortChange(newSort);
      setShowSortMenu(false);
      announceToScreenReader(`Sorted by ${newSort}`);
    }
  };

  const validateReactionType = (emoji: string): ReactionType | null => {
    const validReactions: ReactionType[] = ['🔥', '🚀', '💎'];
    return validReactions.includes(emoji as ReactionType) ? (emoji as ReactionType) : null;
  };

  const renderPost = useCallback((item: { id: string; data: EnhancedPost }, index: number) => (
    <div className="px-4 pb-4">
      <MobileEnhancedPostCard
        post={item.data}
        onReact={(postId, emoji, intensity) => {
          const reactionType = validateReactionType(emoji);
          if (reactionType) {
            onPostReact(postId, reactionType, intensity);
          } else {
            console.warn('Invalid reaction type:', emoji);
          }
        }}
        onComment={onPostComment}
        onShare={onPostShare}
        onBookmark={onPostBookmark}
        onUpvote={onPostUpvote}
        onDownvote={onPostDownvote}
        onViewReactors={onViewReactors}
        onUserPress={onUserPress}
      />
    </div>
  ), [onPostReact, onPostComment, onPostShare, onPostBookmark, onPostUpvote, onPostDownvote, onViewReactors, onUserPress]);

  const EmptyComponent = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-6xl mb-4">📝</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No posts yet
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
        Be the first to share something with the community!
      </p>
      <button
        onClick={() => setShowComposer(true)}
        className={`
          px-6 py-3 bg-blue-500 text-white rounded-full font-medium
          hover:bg-blue-600 transition-colors
          ${touchTargetClasses} ${accessibilityClasses}
        `}
      >
        Create Post
      </button>
    </div>
  );

  const LoadingComponent = () => (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center space-x-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" as any }}
          className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="text-gray-600 dark:text-gray-400">Loading posts...</span>
      </div>
    </div>
  );

  return (
    <div className={`relative h-full ${className} ${mobileOptimizedClasses}`}>
      {/* Header */}
      <div 
        className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
        style={{ paddingTop: safeAreaInsets.top }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Feed
          </h1>

          {/* Sort Button */}
          <button
            onClick={() => setShowSortMenu(true)}
            className={`
              flex items-center space-x-2 px-3 py-2 rounded-full
              bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
              ${touchTargetClasses} ${accessibilityClasses}
            `}
            aria-label={`Currently sorted by ${sortBy}`}
          >
            <span className="text-lg">
              {sortOptions.find(opt => opt.key === sortBy)?.icon}
            </span>
            <span className="text-sm font-medium">
              {sortOptions.find(opt => opt.key === sortBy)?.label}
            </span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="flex-1">
        <MobileVirtualScrolling
          items={virtualItems}
          renderItem={renderPost}
          itemHeight={400}
          onEndReached={onLoadMore}
          onRefresh={onRefresh}
          refreshing={refreshing}
          loading={loading}
          hasMore={hasMore}
          emptyComponent={<EmptyComponent />}
          loadingComponent={<LoadingComponent />}
          className="pb-20" // Space for FAB
        />
      </div>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setShowComposer(true)}
        className={`
          fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full
          shadow-lg hover:bg-blue-600 transition-colors z-20
          flex items-center justify-center
          ${touchTargetClasses} ${accessibilityClasses}
        `}
        style={{ bottom: safeAreaInsets.bottom + 24 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Create new post"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>

      {/* Sort Menu Modal */}
      <AnimatePresence>
        {showSortMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30"
              onClick={() => setShowSortMenu(false)}
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring' as any, damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-gray-900 rounded-t-3xl p-6"
              style={{ paddingBottom: safeAreaInsets.bottom + 24 }}
            >
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sort posts by
              </h3>

              <div className="space-y-2">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleSortChange(option.key as typeof sortBy)}
                    className={`
                      w-full flex items-center space-x-3 p-4 rounded-xl transition-colors
                      ${sortBy === option.key 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }
                      ${touchTargetClasses} ${accessibilityClasses}
                    `}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm opacity-75">{option.description}</div>
                    </div>
                    {sortBy === option.key && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Post Composer Modal */}
      <MobileEnhancedPostComposer
        isOpen={showComposer}
        onClose={() => setShowComposer(false)}
        onSubmit={handlePostCreate}
      />
    </div>
  );
};