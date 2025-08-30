import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LikeButton, ShareButton, AnimatedButton } from '@/components/MicroInteractions';
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from '@/lib/animations';

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

interface AnimatedPostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onTip: (postId: string) => void;
  className?: string;
}

export const AnimatedPostCard: React.FC<AnimatedPostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  onTip,
  className = '',
}) => {
  const [showComments, setShowComments] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLike = () => {
    onLike(post.id);
  };

  const handleShare = () => {
    onShare(post.id);
  };

  const handleComment = () => {
    setShowComments(!showComments);
    onComment(post.id);
  };

  const truncatedContent = post.content.length > 200 
    ? post.content.substring(0, 200) + '...' 
    : post.content;

  return (
    <motion.article
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -2 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-shadow duration-200 ${className}`}
    >
      {/* Post Header */}
      <motion.div 
        className="p-6 pb-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItem} className="flex items-center space-x-3 mb-4">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {post.author.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                post.author.name.charAt(0).toUpperCase()
              )}
            </div>
            <motion.div 
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <motion.h3 
              className="text-sm font-semibold text-gray-900 dark:text-white truncate"
              whileHover={{ x: 2 }}
            >
              {post.author.name}
            </motion.h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {post.author.address}
            </p>
          </div>
          
          <motion.div 
            className="text-xs text-gray-500 dark:text-gray-400"
            whileHover={{ scale: 1.05 }}
          >
            {post.timestamp.toLocaleDateString()}
          </motion.div>
        </motion.div>

        {/* Post Content */}
        <motion.div variants={staggerItem}>
          <AnimatePresence mode="wait">
            <motion.p 
              key={isExpanded ? 'expanded' : 'truncated'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-900 dark:text-white text-sm leading-relaxed mb-3"
            >
              {isExpanded ? post.content : truncatedContent}
            </motion.p>
          </AnimatePresence>
          
          {post.content.length > 200 && (
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </motion.button>
          )}
        </motion.div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <motion.div 
            variants={staggerItem}
            className="flex flex-wrap gap-2 mt-3"
          >
            {post.tags.map((tag, index) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full"
                whileHover={{ scale: 1.05 }}
              >
                #{tag}
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <motion.div 
            variants={staggerItem}
            className="mt-4 -mx-6"
          >
            <motion.div 
              className="grid gap-2"
              style={{
                gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'
              }}
            >
              {post.images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative overflow-hidden rounded-lg"
                >
                  <img
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* Post Actions */}
      <motion.div 
        className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30"
        variants={staggerItem}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <LikeButton
              liked={post.isLiked}
              count={post.likes}
              onToggle={handleLike}
            />
            
            <motion.button
              onClick={handleComment}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">{post.comments}</span>
            </motion.button>

            <ShareButton onShare={handleShare} />
          </div>

          <div className="flex items-center space-x-2">
            <AnimatedButton
              onClick={() => onTip(post.id)}
              variant="ghost"
              size="sm"
              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:hover:bg-yellow-900/20"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Tip
            </AnimatedButton>
          </div>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
            >
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Sample comments */}
                <motion.div 
                  className="space-y-2"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {[1, 2].map((i) => (
                    <motion.div 
                      key={i}
                      variants={staggerItem}
                      className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg"
                    >
                      <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">User {i}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Great post! Thanks for sharing.</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.article>
  );
};