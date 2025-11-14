import React, { useState, useCallback, useRef, useId, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, MessageCircle, Share2, Bookmark, MoreHorizontal, Eye, Flag, Check, X, Undo2 } from 'lucide-react';
import { CommunityPost } from '@/models/CommunityPost';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import MediaPreview from './MediaPreview';
import PostMetadata from './PostMetadata';
import PostFlair, { FlairConfig } from './PostFlair';
import ReportModal from './ReportModal';
import { getViewModeClasses, shouldShowThumbnail, getThumbnailSize } from '@/hooks/useViewMode';
import { useAccessibility } from '@/components/Accessibility/AccessibilityProvider';
import { useKeyboardNavigation } from '@/hooks/useAccessibility';

// Helper function to normalize post data for consistent access
interface NormalizedPost {
  id: string;
  author: string;
  contentCid: string;
  mediaCids?: string[];
  tags?: string[];
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  comments: number;
  flair?: string;
  isPinned: boolean;
  isLocked: boolean;
  isQuickPost: boolean;
}

const normalizePost = (post: EnhancedPost): NormalizedPost => {
  // Check if it's a quickPost based on the isQuickPost flag or missing community fields
  const isQuickPost = post.isQuickPost || (!post.dao && !post.communityId);
  
  return {
    id: post.id,
    author: post.author,
    contentCid: post.contentCid,
    mediaCids: post.mediaCids,
    tags: post.tags,
    createdAt: post.createdAt,
    upvotes: 0, // QuickPosts don't have upvotes/downvotes, default to 0
    downvotes: 0,
    comments: post.comments || 0,
    flair: undefined, // QuickPosts don't have flair
    isPinned: false, // QuickPosts aren't pinned
    isLocked: false, // QuickPosts aren't locked
    isQuickPost
  };
};

interface RedditStylePostCardProps {
  post: EnhancedPost; // Changed from CommunityPost to EnhancedPost to handle both regular posts and quickPosts
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
  const [isSaved, setIsSaved] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showHideUndo, setShowHideUndo] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [settings, setSettings] = useState({ reducedMotion: false });
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const postCardRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  
  // Generate IDs for accessibility
  const postId = `${id}-post`;
  const voteGroupId = `${id}-vote`;
  const menuId = `${id}-menu`;
  
  // Accessibility hook
  const { announceToScreenReader } = useAccessibility();
  
  // Normalize the post data for consistent access
  const normalizedPost = useMemo(() => normalizePost(post), [post]);

  // Calculate vote score
  const voteScore = normalizedPost.upvotes - normalizedPost.downvotes;

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

  // Handle voting with optimistic updates and accessibility announcements
  const handleVote = useCallback(async (direction: 'up' | 'down') => {
    if (isVoting) return;

    setIsVoting(true);
    
    // Determine final vote (toggle if same direction)
    const finalVote = userVote === direction ? null : direction;
    const wasToggled = userVote === direction;
    
    // Optimistic update
    setUserVote(finalVote);
    
    // Announce to screen readers
    const voteAction = wasToggled 
      ? `Removed ${direction}vote` 
      : `${direction === 'up' ? 'Upvoted' : 'Downvoted'} post`;
    announceToScreenReader(`${voteAction}. Current score: ${voteScore + (finalVote === 'up' ? 1 : finalVote === 'down' ? -1 : 0)}`);
    
    try {
      await onVote(normalizedPost.id, direction);
    } catch (error) {
      // Revert on error
      setUserVote(userVote);
      announceToScreenReader('Vote failed. Please try again.');
      console.error('Vote failed:', error);
    } finally {
      setIsVoting(false);
    }
  }, [normalizedPost.id, userVote, isVoting, onVote, announceToScreenReader, voteScore]);

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

  // Handle save action with visual confirmation and accessibility announcements
  const handleSave = useCallback(async () => {
    if (isProcessingAction || !onSave) return;
    
    setIsProcessingAction(true);
    const newSavedState = !isSaved;
    
    try {
      await onSave(normalizedPost.id);
      setIsSaved(newSavedState);
      setShowSaveConfirmation(true);
      
      // Announce to screen readers
      announceToScreenReader(newSavedState ? 'Post saved' : 'Post unsaved');
      
      // Hide confirmation after 2 seconds
      setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 2000);
    } catch (error) {
      announceToScreenReader('Save failed. Please try again.');
      console.error('Save failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, isSaved, isProcessingAction, onSave, announceToScreenReader]);

  // Handle hide action with undo option and accessibility announcements
  const handleHide = useCallback(async () => {
    if (isProcessingAction || !onHide) return;
    
    setIsProcessingAction(true);
    try {
      await onHide(normalizedPost.id);
      setIsHidden(true);
      setShowHideUndo(true);
      
      // Announce to screen readers
      announceToScreenReader('Post hidden. Undo option available for 5 seconds.');
      
      // Auto-hide undo option after 5 seconds
      setTimeout(() => {
        setShowHideUndo(false);
      }, 5000);
    } catch (error) {
      announceToScreenReader('Hide failed. Please try again.');
      console.error('Hide failed:', error);
    } finally {
      setIsProcessingAction(false);
    }
  }, [post.id, isProcessingAction, onHide, announceToScreenReader]);

  // Handle undo hide action with accessibility announcement
  const handleUndoHide = useCallback(() => {
    setIsHidden(false);
    setShowHideUndo(false);
    announceToScreenReader('Post unhidden and restored to feed.');
  }, [announceToScreenReader]);

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
        await onShare(normalizedPost.id);
      } else {
        // Fallback to native share or copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: `Post by ${normalizedPost.author}`,
            text: normalizedPost.contentCid,
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
  }, [normalizedPost.id, normalizedPost.author, normalizedPost.contentCid, isProcessingAction, onShare]);

  // Keyboard navigation handlers
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onComment?.(normalizedPost.id);
    } else if (e.key === 'u') {
      e.preventDefault();
      handleVote('up');
    } else if (e.key === 'd') {
      e.preventDefault();
      handleVote('down');
    } else if (e.key === 's') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'h') {
      e.preventDefault();
      handleHide();
    } else if (e.key === 'r') {
      e.preventDefault();
      setShowReportModal(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowMenu(false);
      setShowReportModal(false);
    }
  };

  // Get view mode specific classes
  const viewModeClasses = getViewModeClasses(viewMode);
  const showThumbnailForMode = shouldShowThumbnail(viewMode, !!(normalizedPost.mediaCids && normalizedPost.mediaCids.length > 0));
  const thumbnailSize = getThumbnailSize(viewMode);

  // Render compact view
  if (viewMode === 'compact') {
    return (
      <motion.article
        ref={postCardRef}
        initial={settings.reducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={settings.reducedMotion ? {} : { opacity: 1, y: 0 }}
        className={`${viewModeClasses.postCard} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${className}`}
        role="article"
        aria-labelledby={`${postId}-title`}
        aria-describedby={`${postId}-metadata ${postId}-actions`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className={viewModeClasses.content}>
          {/* Compact Voting Section */}
          <div 
            className={viewModeClasses.voting}
            role="group"
            aria-labelledby={`${voteGroupId}-label`}
            aria-describedby={`${voteGroupId}-score`}
          >
            <span id={`${voteGroupId}-label`} className="sr-only">
              Post voting controls
            </span>
            <motion.button
              whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
              onClick={() => handleVote('up')}
              disabled={isVoting}
              className={`p-0.5 rounded transition-colors ${getVoteButtonStyle('up')}`}
              aria-label={`${userVote === 'up' ? 'Remove upvote' : 'Upvote post'}`}
              aria-pressed={userVote === 'up'}
              title="Upvote (U key)"
            >
              <ChevronUp className="w-3 h-3" aria-hidden="true" />
            </motion.button>
            <div 
              id={`${voteGroupId}-score`}
              className={`text-xs font-bold text-center ${getVoteScoreStyle()}`}
              aria-label={`Current score: ${voteScore > 0 ? '+' : ''}${voteScore} points`}
            >
              {voteScore > 0 ? '+' : ''}{voteScore}
            </div>
            <motion.button
              whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
              onClick={() => handleVote('down')}
              disabled={isVoting}
              className={`p-0.5 rounded transition-colors ${getVoteButtonStyle('down')}`}
              aria-label={`${userVote === 'down' ? 'Remove downvote' : 'Downvote post'}`}
              aria-pressed={userVote === 'down'}
              title="Downvote (D key)"
            >
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
            </motion.button>
          </div>

          {/* Thumbnail (if available) */}
          {showThumbnailForMode && normalizedPost.mediaCids && normalizedPost.mediaCids.length > 0 && (
            <div className="flex-shrink-0">
              <img
                src={normalizedPost.mediaCids[0]}
                alt={`Thumbnail for post: ${normalizedPost.contentCid.substring(0, 50)}...`}
                className={viewModeClasses.thumbnail}
                loading="lazy"
              />
            </div>
          )}

          {/* Main Content */}
          <div className={viewModeClasses.main}>
            {/* Title and Metadata */}
            <div className="mb-1">
              <h3 
                id={`${postId}-title`}
                className={viewModeClasses.title}
              >
                {normalizedPost.contentCid}
              </h3>
              <div 
                id={`${postId}-metadata`}
                className={viewModeClasses.metadata}
              >
                <PostMetadata
                  author={normalizedPost.author}
                  createdAt={normalizedPost.createdAt}
                  community={community}
                  flair={normalizedPost.flair}
                  commentCount={normalizedPost.comments}
                  isPinned={isPinned || normalizedPost.isPinned}
                  isLocked={normalizedPost.isLocked}
                  compact={true}
                />
              </div>
            </div>

            {/* Compact Actions */}
            <div 
              id={`${postId}-actions`}
              className={viewModeClasses.actions}
              role="group"
              aria-label="Post actions"
            >
              <button
                onClick={() => onComment?.(normalizedPost.id)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label={`View ${normalizedPost.comments} comments`}
                title="View comments (Enter key)"
              >
                <MessageCircle className="w-4 h-4 inline mr-1" aria-hidden="true" />
                {normalizedPost.comments} comments
              </button>
              <button
                onClick={handleShare}
                disabled={isProcessingAction}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                aria-label="Share post"
                title="Share post"
              >
                <Share2 className="w-4 h-4 inline mr-1" aria-hidden="true" />
                share
              </button>
              {onSave && (
                <button
                  onClick={handleSave}
                  disabled={isProcessingAction}
                  className={`transition-colors disabled:opacity-50 ${
                    isSaved 
                      ? 'text-yellow-600 hover:text-yellow-700' 
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  aria-label={isSaved ? 'Unsave post' : 'Save post'}
                  aria-pressed={isSaved}
                  title={`${isSaved ? 'Unsave' : 'Save'} post (S key)`}
                >
                  <Bookmark className={`w-4 h-4 inline mr-1 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                  {isSaved ? 'saved' : 'save'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Compact Save Confirmation */}
        <AnimatePresence>
          {showSaveConfirmation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800"
            >
              {isSaved ? 'Post saved!' : 'Post unsaved!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
          isLoading={isProcessingAction}
          postId={normalizedPost.id}
          postAuthor={post.author}
        />
      </motion.article>
    );
  }

  // Render card view (existing layout)
  return (
    <motion.article
      ref={postCardRef}
      initial={settings.reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={settings.reducedMotion ? {} : { opacity: 1, y: 0 }}
      className={`${viewModeClasses.postCard} hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ${className}`}
      role="article"
      aria-labelledby={`${postId}-title`}
      aria-describedby={`${postId}-metadata ${postId}-content ${postId}-actions`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={viewModeClasses.content}>
        {/* Left Voting Section */}
        <div 
          className={viewModeClasses.voting}
          role="group"
          aria-labelledby={`${voteGroupId}-label`}
          aria-describedby={`${voteGroupId}-score`}
        >
          <span id={`${voteGroupId}-label`} className="sr-only">
            Post voting controls
          </span>
          
          {/* Upvote Button */}
          <motion.button
            whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
            onClick={() => handleVote('up')}
            disabled={isVoting}
            className={getVoteButtonStyle('up')}
            aria-label={`${userVote === 'up' ? 'Remove upvote' : 'Upvote post'}`}
            aria-pressed={userVote === 'up'}
            title="Upvote (U key)"
          >
            <ChevronUp className="w-5 h-5" aria-hidden="true" />
          </motion.button>

          {/* Vote Score */}
          <motion.div
            key={voteScore}
            initial={settings.reducedMotion ? {} : { scale: 1.2 }}
            animate={settings.reducedMotion ? {} : { scale: 1 }}
            id={`${voteGroupId}-score`}
            className={`text-sm font-bold py-1 min-w-[24px] text-center ${getVoteScoreStyle()}`}
            aria-label={`Current score: ${voteScore > 0 ? '+' : ''}${voteScore} points`}
            role="status"
            aria-live="polite"
          >
            {voteScore > 0 ? '+' : ''}{voteScore}
          </motion.div>

          {/* Downvote Button */}
          <motion.button
            whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
            onClick={() => handleVote('down')}
            disabled={isVoting}
            className={getVoteButtonStyle('down')}
            aria-label={`${userVote === 'down' ? 'Remove downvote' : 'Downvote post'}`}
            aria-pressed={userVote === 'down'}
            title="Downvote (D key)"
          >
            <ChevronDown className="w-5 h-5" aria-hidden="true" />
          </motion.button>
        </div>

        {/* Main Content */}
        <div 
          className={`${viewModeClasses.main} relative`}
          onMouseEnter={() => setShowQuickActions(true)}
          onMouseLeave={() => setShowQuickActions(false)}
        >
          {/* Post Header */}
          <div className="flex items-center justify-between mb-2">
            <div id={`${postId}-metadata`} className="flex-1">
              <PostMetadata
                author={normalizedPost.author}
                createdAt={normalizedPost.createdAt}
                community={community}
                flair={normalizedPost.flair}
                commentCount={normalizedPost.comments}
                isPinned={isPinned || normalizedPost.isPinned}
                isLocked={normalizedPost.isLocked}
                className="flex-1"
              />
            </div>

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
                      whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
                      onClick={handleSave}
                      disabled={isProcessingAction}
                      className={`p-2 rounded-md transition-all duration-200 ${
                        isSaved 
                          ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' 
                          : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                      }`}
                      aria-label={isSaved ? 'Unsave post' : 'Save post'}
                      aria-pressed={isSaved}
                      title={`${isSaved ? 'Unsave' : 'Save'} post (S key)`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                    </motion.button>
                  )}

                  {/* Share Button */}
                  <motion.button
                    whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
                    onClick={handleShare}
                    disabled={isProcessingAction}
                    className="p-2 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 disabled:opacity-50"
                    aria-label="Share post"
                    title="Share post"
                  >
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                  </motion.button>

                  {/* Hide Button */}
                  {onHide && (
                    <motion.button
                      whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
                      onClick={handleHide}
                      disabled={isProcessingAction}
                      className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
                      aria-label="Hide post"
                      title="Hide post (H key)"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </motion.button>
                  )}

                  {/* Report Button */}
                  {onReport && (
                    <motion.button
                      whileTap={settings.reducedMotion ? {} : { scale: 0.9 }}
                      onClick={() => setShowReportModal(true)}
                      disabled={isProcessingAction}
                      className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
                      aria-label="Report post"
                      title="Report post (R key)"
                    >
                      <Flag className="w-4 h-4" aria-hidden="true" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Menu Button (fallback for mobile/accessibility) */}
            <div className="relative">
              <button
                ref={menuButtonRef}
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="More options"
                aria-expanded={showMenu}
                aria-haspopup="menu"
                aria-controls={menuId}
                title="More options menu"
              >
                <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={settings.reducedMotion ? {} : { opacity: 0, scale: 0.95, y: -10 }}
                    animate={settings.reducedMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
                    exit={settings.reducedMotion ? {} : { opacity: 0, scale: 0.95, y: -10 }}
                    id={menuId}
                    role="menu"
                    aria-labelledby={menuButtonRef.current?.id}
                    className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setShowMenu(false);
                        menuButtonRef.current?.focus();
                      }
                    }}
                  >
                    {onSave && (
                      <button
                        onClick={() => {
                          handleSave();
                          setShowMenu(false);
                        }}
                        disabled={isProcessingAction}
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                        aria-pressed={isSaved}
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current text-yellow-600' : ''}`} aria-hidden="true" />
                        <span>{isSaved ? 'Unsave' : 'Save'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleShare();
                        setShowMenu(false);
                      }}
                      disabled={isProcessingAction}
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Share2 className="w-4 h-4" aria-hidden="true" />
                      <span>Share</span>
                    </button>
                    {onHide && (
                      <button
                        onClick={() => {
                          handleHide();
                          setShowMenu(false);
                        }}
                        disabled={isProcessingAction}
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
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
                        role="menuitem"
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Flag className="w-4 h-4" aria-hidden="true" />
                        <span>Report</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Post Content */}
          <div id={`${postId}-content`} className="mb-3">
            <h2 
              id={`${postId}-title`}
              className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            >
              {normalizedPost.contentCid.split('\n')[0] || 'Untitled Post'}
            </h2>
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words leading-relaxed">
              {normalizedPost.contentCid}
            </div>

            {/* Media */}
            {showThumbnail && normalizedPost.mediaCids && normalizedPost.mediaCids.length > 0 && (
              <div className="mt-3">
                {normalizedPost.mediaCids.map((mediaUrl, index) => (
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
            {normalizedPost.tags && normalizedPost.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {normalizedPost.tags.map((tag) => (
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
          <div 
            id={`${postId}-actions`}
            className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400"
            role="group"
            aria-label="Post actions"
          >
            {/* Comments */}
            <button
              onClick={() => onComment?.(normalizedPost.id)}
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label={`View ${normalizedPost.comments} comments`}
              title="View comments (Enter key)"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>{normalizedPost.comments} comments</span>
            </button>

            {/* Share */}
            <button 
              onClick={handleShare}
              disabled={isProcessingAction}
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              aria-label="Share post"
              title="Share post"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              <span>Share</span>
            </button>

            {/* Award (placeholder) */}
            <button 
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Give award to post"
              title="Give award"
            >
              <span role="img" aria-label="trophy">🏆</span>
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
        postId={normalizedPost.id}
        postAuthor={post.author}
      />
    </motion.article>
  );
}