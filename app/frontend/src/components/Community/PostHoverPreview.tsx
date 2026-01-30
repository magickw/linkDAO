import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowUp, Users, Clock } from 'lucide-react';

interface PostHoverPreviewProps {
  post: {
    id: string;
    title: string;
    content: string;
    authorName: string;
    communityName: string;
    upvotes: number;
    commentsCount: number;
    createdAt: string;
    tags: string[];
  };
  isVisible: boolean;
  position: { x: number; y: number };
}

export const PostHoverPreview: React.FC<PostHoverPreviewProps> = ({
  post,
  isVisible,
  position
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-none"
          style={{
            left: Math.min(position.x, window.innerWidth - 320),
            top: Math.max(position.y - 200, 20)
          }}
        >
          {/* Header */}
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <span className="text-xs">📄</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                r/{post.communityName} • u/{post.authorName}
              </p>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
            {post.title}
          </h3>

          {/* Content Preview */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
            {post.content}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Metrics */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <ArrowUp className="w-3 h-3" />
                <span>{post.upvotes}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-3 h-3" />
                <span>{post.commentsCount}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PostHoverPreview;