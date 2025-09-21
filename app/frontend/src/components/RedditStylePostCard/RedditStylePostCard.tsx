import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Eye, Flag, Check, X, Undo2 } from 'lucide-react';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';
import MediaPreview from './MediaPreview';
import PostMetadata from './PostMetadata';
import PostFlair, { FlairConfig } from './PostFlair';
import ReportModal from './ReportModal';

interface RedditStylePostCardProps {
  post: CommunityPost;
  community?: Community;
  viewMode?: 'card' | 'compact';
  showThumbnail?: boolean;
  onVote: (postId: string, direction: 'up' | 'down') => void;
  onSave?: (postId: string) => void;
  onHide?: (postId: string) => void;
  onReport?: (postId: string, reason: string, details?: string) => void;
  onShare?: (postId: string) => void;
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
  onShare,
  onComment,
  isPinned = false,
  className = ''
}: RedditStylePostCardProps) {
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showHideUndo, setShowHideUndo] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

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

  // Handle save action with visual confirmation
  const handleSave = useCallback(async () => {
    if (isProcessingAction || !onSave) return;
    
    setIsProcessingAction(true);
    try {
      await onSave(post.id);
      setIsSaved(!isSaved);
      setShowSaveConfirmation(true);
      
      // Hide confirmation after 2 seconds
      setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 2000);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, isSaved, isProcessingAction, onSave]);

  // Handle hide action with undo option
  const handleHide = useCallback(async () => {
    if (isProcessingAction || !onHide) return;
    
    setIsProcessingAction(true);
    try {
      await onHide(post.id);
      setIsHidden(true);
      setShowHideUndo(true);
      
      // Auto-hide undo option after 5 seconds
      setTimeout(() => {
        setShowHideUndo(false);
      }, 5000);
    } catch (error) {
      console.error('Hide failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, isProcessingAction, onHide]);

  // Handle undo hide action
  const handleUndoHide = useCallback(() => {
    setIsHidden(false);
    setShowHideUndo(false);
  }, []);

  // Handle report submission
  const handleReport = useCallback(async (reason: string, details?: string) => {
    if (isProcessingAction || !onReport) return;
    
    setIsProcessingAction(true);
    try {
      await onReport(post.id, reason, details);
      setShowReportModal(false);
    } catch (error) {
      console.error('Report failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, isProcessingAction, onReport]);

  // Handle share action
  const handleShare = useCallback(async () => {
    if (isProcessingAction) return;
    
    setIsProcessingAction(true);
    try {
      if (onShare) {
        await onShare(post.id);
      } else {
        // Fallback to native share or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `Post by ${post.author}`,
            text: post.contentCid,
            url: window.location.href
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          // Could show a toast notification here
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, post.author, post.contentCid, isProcessingAction, onShare]);

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
        <div 
          className="flex-1 p-4 relative"
          onMouseEnter={() => setShowQuickActions(true)}
          onMouseLeave={() => setShowQuickActions(false)}
        >
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

            {/* Quick Actions Bar - Hover Revealed */}
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center space-x-1 mr-2"
                >
                  {/* Save Button */}
                  {onSave && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSave}
                      disabled={isProcessingAction}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        isSaved 
                          ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' 
                          : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      }`}
                      aria-label={isSaved ? 'Unsave post' : 'Save post'}
                      title={isSaved ? 'Unsave' : 'Save'}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </motion.button>
                  )}

                  {/* Share Button */}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleShare}
                    disabled={isProcessingAction}
                    className="p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
                    aria-label="Share post"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>

                  {/* Hide Button */}
                  {onHide && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleHide}
                      disabled={isProcessingAction}
                      className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                      aria-label="Hide post"
                      title="Hide"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                  )}

                  {/* Report Button */}
                  {onReport && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowReportModal(true)}
                      disabled={isProcessingAction}
                      className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                      aria-label="Report post"
                      title="Report"
                    >
                      <Flag className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Menu Button (fallback for mobile/accessibility) */}
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
                          handleSave();
                          setShowMenu(false);
                        }}
                        disabled={isProcessingAction}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-yellow-600' : ''}`} />
                        <span>{isSaved ? 'Unsave' : 'Save'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleShare();
                        setShowMenu(false);
                      }}
                      disabled={isProcessingAction}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                    {onHide && (
                      <button
                        onClick={() => {
                          handleHide();
                          setShowMenu(false);
                        }}
                        disabled={isProcessingAction}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Hide</span>
                      </button>
                    )}
                    {onReport && (
                      <button
                        onClick={() => {
                          setShowReportModal(true);
                          setShowMenu(false);
                        }}
                        disabled={isProcessingAction}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Flag className="w-4 h-4" />
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
            <button 
              onClick={handleShare}
              disabled={isProcessingAction}
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>

            {/* Award (placeholder) */}
            <button className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <span>🏆</span>
              <span>Award</span>
            </button>
          </div>

          {/* Save Confirmation */}
          <AnimatePresence>
            {showSaveConfirmation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md"
              >
                <Check className="w-4 h-4" />
                <span>{isSaved ? 'Post saved!' : 'Post unsaved!'}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hide Undo */}
          <AnimatePresence>
            {showHideUndo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 flex items-center justify-between text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-md"
              >
                <span>Post hidden from your feed</span>
                <button
                  onClick={handleUndoHide}
                  className="flex items-center space-x-1 text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200 font-medium"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>Undo</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Hidden State Overlay */}
      <AnimatePresence>
        {isHidden && !showHideUndo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-100 dark:bg-gray-800 bg-opacity-90 flex items-center justify-center rounded-lg"
          >
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Post hidden</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReport}
        isLoading={isProcessingAction}
        postId={post.id}
        postAuthor={post.author}
      />
    </motion.div>
  );
}