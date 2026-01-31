import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import TokenReactionSystem from './TokenReactionSystem/TokenReactionSystem';
import SharePostModal from './SharePostModal';
import RepostModal from './RepostModal';
import CommunityTipButton from './CommunityTipButton';
import AwardSelectionModal, { AWARDS } from './TokenReactionSystem/AwardSelectionModal';
import { bookmarkService } from '@/services/bookmarkService';
import { getUserAddress } from '@/utils/userDisplay';

interface PostInteractionBarProps {
  post: {
    id: string;
    title?: string;
    contentCid: string;
    content?: string;
    media?: string[];
    author: string;
    communityId?: string;
    communityName?: string;
    commentsCount?: number;
    shareId?: string;
    isRepostedByMe?: boolean;
    authorProfile?: {
      avatar?: string;
      handle?: string;
    };
    stakedValue?: number;
    reposts?: number;
    views?: number;
    upvotes?: number;
    downvotes?: number;
  };
  postType: 'feed' | 'community' | 'enhanced';
  userMembership?: any;
  onComment?: () => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onShare?: (postId: string, shareType: string, message?: string, media?: string[], replyRestriction?: string) => Promise<void>;
  onUnrepost?: (postId: string) => Promise<void>;
  onAward?: (postId: string) => void;
  onUpvote?: (postId: string) => Promise<void>;
  onDownvote?: (postId: string) => Promise<void>;
  onBookmarkChange?: (postId: string, isBookmarked: boolean) => void;
  userVote?: 'upvote' | 'downvote' | null;
  isBookmarked?: boolean;
  className?: string;
  zenMode?: boolean;
}

export default function PostInteractionBar({
  post,
  postType,
  userMembership,
  onComment,
  onReaction,
  onTip,
  onShare,
  onUnrepost,
  onAward,
  onUpvote,
  onDownvote,
  onBookmarkChange,
  userVote = null,
  isBookmarked: initialIsBookmarked = false,
  className = '',
  zenMode = false
}: PostInteractionBarProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // Bookmark state
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  // Log engagement stats when post changes (helps diagnose missing data)
  useEffect(() => {
    console.log('[PostInteractionBar] Engagement stats for post:', {
      postId: post.id,
      views: post.views,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      commentsCount: post.commentsCount,
      reposts: post.reposts,
      postType
    });
  }, [post.id, post.views, post.upvotes, post.downvotes, post.commentsCount, post.reposts, postType]);

  // Sync with prop changes
  useEffect(() => {
    setIsBookmarked(initialIsBookmarked);
  }, [initialIsBookmarked]);

  // State for repost menu
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const repostMenuRef = React.useRef<HTMLDivElement>(null);

  // Close repost menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (repostMenuRef.current && !repostMenuRef.current.contains(event.target as Node)) {
        setShowRepostMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [userGemBalance, setUserGemBalance] = useState(0);

  // Fetch gem balance when modal is opened
  useEffect(() => {
    if (showAwardModal && isConnected) {
      const fetchBalance = async () => {
        try {
          const sessionToken = typeof window !== 'undefined' ? sessionStorage.getItem('linkdao_access_token') : null;
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';
          
          const response = await fetch(`${apiUrl}/api/gems/balance`, {
            headers: {
              'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserGemBalance(data.balance || 0);
          }
        } catch (error) {
          console.error('Error fetching gem balance:', error);
        }
      };
      
      fetchBalance();
    }
  }, [showAwardModal, isConnected]);

  // Handle comment button click
  const handleCommentClick = () => {
    if (!isConnected) {
      addToast('Please connect your wallet to comment', 'error');
      return;
    }

    if (postType === 'community' && (!userMembership || (userMembership.isMember === false))) {
      addToast('You must join the community to comment', 'error');
      return;
    }

    if (onComment) {
      onComment();
    }
  };

  // Handle share button click
  const handleShareClick = () => {
    setShowShareModal(true);
  };

  // Handle repost button click
  const handleRepostClick = async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to repost', 'error');
      return;
    }

    if (post.isRepostedByMe && onUnrepost) {
      if (window.confirm('Remove this repost from your timeline?')) {
        await onUnrepost(post.id);
      }
    } else {
      setShowRepostModal(true);
    }
  };

  // Handle save post (bookmark toggle)
  const handleSavePost = async () => {
    if (!isConnected) {
      addToast('Please connect your wallet to save posts', 'error');
      return;
    }

    if (isBookmarkLoading) return;

    setIsBookmarkLoading(true);
    try {
      const result = await bookmarkService.toggleBookmark(post.id);
      setIsBookmarked(result.bookmarked);

      if (result.bookmarked) {
        addToast('Post saved to your bookmarks!', 'success');
      } else {
        addToast('Post removed from your bookmarks', 'info');
      }

      // Notify parent component if callback provided
      if (onBookmarkChange) {
        onBookmarkChange(post.id, result.bookmarked);
      }
    } catch (error: any) {
      console.error('Error toggling bookmark:', error);
      addToast(error.message || 'Failed to save post. Please try again.', 'error');
    } finally {
      setIsBookmarkLoading(false);
    }
  };


  const handleUpvoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpvote) return;
    try {
      await onUpvote(post.id);
    } catch (error) {
      console.error('Error upvoting:', error);
      addToast('Failed to upvote', 'error');
    }
  };

  const handleDownvoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDownvote) return;
    try {
      await onDownvote(post.id);
    } catch (error) {
      console.error('Error downvoting:', error);
      addToast('Failed to downvote', 'error');
    }
  };

  return (
    <div className={`space-y-4 relative ${className}`}>
      {/* Tipping Status Mini-Overlay */}
      {/* Tipping Status Mini-Overlay - Removed due to redundancy and ReferenceError */}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-wrap items-center gap-1 sm:gap-4">

          {/* Voting Buttons - Integrated */}
          <div className="flex items-center space-x-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={handleUpvoteClick}
              disabled={!onUpvote}
              className={`flex items-center space-x-1 p-2 rounded-md transition-colors min-h-[40px] min-w-[40px] ${userVote === 'upvote'
                ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                : onUpvote
                  ? 'text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
              aria-label="Upvote"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {!zenMode && <span className="text-sm font-medium">{post.upvotes || 0}</span>}
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
            <button
              onClick={handleDownvoteClick}
              disabled={!onDownvote}
              className={`flex items-center space-x-1 p-2 rounded-md transition-colors min-h-[40px] min-w-[40px] ${userVote === 'downvote'
                ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                : onDownvote
                  ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-gray-300 cursor-not-allowed'
                }`}
              aria-label="Downvote"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {!zenMode && <span className="text-sm font-medium">{post.downvotes || 0}</span>}
            </button>
          </div>

          {/* Comment Button */}
          <button
            onClick={handleCommentClick}
            className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105 min-h-[40px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {!zenMode && (
              <>
                <span className="hidden sm:inline">{post.commentsCount || 0} Comments</span>
                <span className="sm:hidden">{post.commentsCount || 0}</span>
              </>
            )}
            {zenMode && <span className="hidden sm:inline">Comment</span>}
          </button>

          {/* Repost Button & Dropdown */}
          {postType !== 'community' && !post.communityId && (
            <div className="relative group" ref={repostMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRepostMenu(!showRepostMenu);
                }}
                className={`flex items-center space-x-2 p-2 text-sm font-medium transition-colors duration-200 hover:scale-105 min-h-[40px] ${post.isRepostedByMe
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                  }`}
                aria-label="Repost actions"
                aria-haspopup="true"
              >
                <svg className={`h-5 w-5 ${post.isRepostedByMe ? 'fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {!zenMode && (
                  <span className="hidden sm:inline">
                    {post.reposts && post.reposts > 0 ? (
                      <>
                        {post.reposts} Repost{post.reposts !== 1 ? 's' : ''}
                      </>
                    ) : (
                      'Repost'
                    )}
                  </span>
                )}
                {!zenMode && <span className="sm:hidden">{post.reposts || 0}</span>}
                {zenMode && <span className="hidden sm:inline">Repost</span>}
              </button>

              {/* Dropdown Menu */}
              {showRepostMenu && (
                <div
                  className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn"
                >
                  {post.isRepostedByMe ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRepostMenu(false);
                        if (onUnrepost && window.confirm('Remove this repost from your timeline?')) {
                          onUnrepost(post.id);
                        }
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center font-medium"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Undo Repost
                    </button>
                  ) : (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowRepostMenu(false);
                        if (onShare) {
                          await onShare(post.id, 'timeline', undefined);
                        }
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center font-medium"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Repost
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRepostMenu(false);
                      setShowRepostModal(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center font-medium"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Quote
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Share Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105 min-h-[40px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* View Count - moved to right side for balance or keep here? Let's keep it here but visible */}
          {!zenMode && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm font-medium p-2 min-h-[40px]" title={`${post.views || 0} Views`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden sm:inline">{post.views || 0}</span>
              <span className="sm:hidden text-xs">{post.views || 0}</span>
            </div>
          )}

          {/* Tip Button - Use CommunityTipButton for all post types for consistent UX */}
          <CommunityTipButton
            postId={post.id}
            recipientAddress={post.walletAddress || getUserAddress(post)}
            communityId={post.communityId || ''}
            onTip={onTip}
          />

          {/* Award Button */}
          <button
            onClick={() => setShowAwardModal(true)}
            className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-sm font-medium transition-colors duration-200 hover:scale-105 min-h-[40px]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            <span className="hidden sm:inline">Award</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSavePost}
            disabled={isBookmarkLoading}
            className={`flex items-center space-x-2 p-2 text-sm font-medium transition-colors duration-200 hover:scale-105 min-h-[40px] ${isBookmarked
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              } ${isBookmarkLoading ? 'opacity-50 cursor-wait' : ''}`}
            title={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'}
          >
            <svg
              className="h-5 w-5"
              fill={isBookmarked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>


      </div>

      {/* Share Modal */}
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
        }}
        post={post}
        postType={postType}
        onShare={onShare}
        addToast={addToast}
      />

      {/* Repost Modal */}
      <RepostModal
        isOpen={showRepostModal}
        onClose={() => setShowRepostModal(false)}
        post={post}
        onRepost={async (postId, message, media, replyRestriction) => {
          if (onShare) {
            await onShare(postId, 'timeline', message, media, replyRestriction);
          }
        }}
      />

      {/* Award Selection Modal */}
      <AwardSelectionModal
        isOpen={showAwardModal}
        postId={post.id}
        userGemBalance={userGemBalance}
        onAwardGiven={async (awardId: string) => {
          // Refresh balance after giving award
          setUserGemBalance(prev => {
            const award = (AWARDS as any[]).find(a => a.id === awardId);
            return prev - (award?.cost || 0);
          });
          
          if (onAward) {
            await onAward(post.id);
          }
          addToast('Award given successfully!', 'success');
        }}
        onClose={() => setShowAwardModal(false)}
      />
    </div>
  );
}