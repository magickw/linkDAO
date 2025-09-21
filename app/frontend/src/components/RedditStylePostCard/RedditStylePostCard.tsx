import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Eye } from 'lucide-react';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';
import MediaPreview from './MediaPreview';
import PostMetadata from './PostMetadata';
import PostFlair, { FlairConfig } from './PostFlair';

interface RedditStylePostCardProps {
  post: CommunityPost;
  community?: Community;
  viewMode?: 'card' | 'compact';
  showThumbnail?: boolean;
  onVote: (postId: string, direction: 'up' | 'down') => void;
  onSave?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onComment?: (postId: string) => void;
  isPinned?: boolean;
  className?: string;
}

export default function RedditStylePostCard({
  post,
  community,
  viewMode = 'card',
  showThumbnail = true,
  onVote,
  onSave,
  onHide,
  onReport,
  onComment,
  isPinned = false,
  className = ''
}: RedditStylePostCardProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Calculate vote score
  const voteScore = post.upvotes - post.downvotes;

  // Format relative time
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
  };

  // Handle voting with optimistic updates
  const handleVote = useCallback(async (direction: 'up' | 'down') => {
    if (isVoting) return;

    setIsVoting(true);
    
    // Determine final vote (toggle if same direction)
    const finalVote = userVote === direction ? null : direction;
    
    // Optimistic update
    setUserVote(finalVote);
    
    try {
      await onVote(post.id, direction);
    } catch (error) {
      // Revert on error
      setUserVote(userVote);
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  }, [post.id, userVote, isVoting, onVote]);

  // Get vote button styling
  const getVoteButtonStyle = (direction: 'up' | 'down') => {
    const isActive = userVote === direction;
    const baseClasses = "p-1 rounded-md transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700";
    
    if (direction === 'up') {
      return `${baseClasses} ${isActive ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-gray-400 hover:text-orange-500'}`;
    } else {
      return `${baseClasses} ${isActive ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-400 hover:text-blue-500'}`;
    }
  };

  // Get vote score styling
  const getVoteScoreStyle = () => {
    if (voteScore > 0) return 'text-orange-500';
    if (voteScore < 0) return 'text-blue-500';
    return 'text-gray-500 dark:text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ${className}`}
    >
      <div className="flex">
        {/* Left Voting Section */}
        <div className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-600 min-w-[48px]">
          {/* Upvote Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleVote('up')}
            disabled={isVoting}
            className={getVoteButtonStyle('up')}
            aria-label="Upvote"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>

          {/* Vote Score */}
          <motion.div
            key={voteScore}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`text-sm font-bold py-1 min-w-[24px] text-center ${getVoteScoreStyle()}`}
          >
            {voteScore > 0 ? '+' : ''}{voteScore}
          </motion.div>

          {/* Downvote Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleVote('down')}
            disabled={isVoting}
            className={getVoteButtonStyle('down')}
            aria-label="Downvote"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-2">
            <PostMetadata
              author={post.author}
              createdAt={post.createdAt}
              community={community}
              flair={post.flair}
              commentCount={post.comments?.length || 0}
              isPinned={isPinned || post.isPinned}
              isLocked={post.isLocked}
              className="flex-1"
            />

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
                  >
                    {onSave && (
                      <button
                        onClick={() => {
                          onSave(post.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    )}
                    {onHide && (
                      <button
                        onClick={() => {
                          onHide(post.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Hide</span>
                      </button>
                    )}
                    {onReport && (
                      <button
                        onClick={() => {
                          onReport(post.id);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                      >
                        <span>⚠️</span>
                        <span>Report</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-3">
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-relaxed">
              {post.contentCid}
            </div>

            {/* Media */}
            {showThumbnail && post.mediaCids && post.mediaCids.length > 0 && (
              <div className="mt-3">
                {post.mediaCids.map((mediaUrl, index) => (
                  <MediaPreview
                    key={index}
                    url={mediaUrl}
                    lazy={true}
                    className="mb-2 last:mb-0"
                    onClick={() => window.open(mediaUrl, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <PostFlair
                    key={tag}
                    flair={{
                      id: tag,
                      name: `#${tag}`,
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      textColor: '#374151',
                      moderatorOnly: false
                    }}
                    size="sm"
                    variant="subtle"
                    clickable={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            {/* Comments */}
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0} comments</span>
            </button>

            {/* Share */}
            <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {/* Award (placeholder) */}
            <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <span>🏆</span>
              <span>Award</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}