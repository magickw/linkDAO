import { useState, useEffect, useCallback } from 'react';
import { Comment, CreateCommentInput } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Avatar from '@/components/Avatar';
import { getDisplayName } from '@/utils/userDisplay';
import Link from 'next/link';

interface CommentThreadProps {
  comment: Comment;
  onVote: (commentId: string, voteType: 'upvote' | 'downvote') => void;
  userMembership: CommunityMembership | null;
  depth: number;
  maxDepth?: number;
  className?: string;
}

export default function CommentThread({
  comment,
  onVote,
  userMembership,
  depth,
  maxDepth = 5,
  className = ''
}: CommentThreadProps) {
  const { address, isConnected } = useWeb3();
  const { ensureAuthenticated } = useAuth();
  const { addToast } = useToast();

  // State
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(
    Array.isArray(comment.replies) ? comment.replies : []
  );
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  // Manually fetch replies when user wants to view them
  const handleLoadReplies = useCallback(async () => {
    if (repliesLoaded || loadingReplies) return;

    setLoadingReplies(true);
    try {
      const fetchedReplies = await CommunityPostService.getCommentReplies(comment.id);
      setReplies(fetchedReplies);
      setRepliesLoaded(true);
    } catch (error) {
      console.error('Error fetching replies:', error);
      addToast('Failed to load replies. Please try again.', 'error');
    } finally {
      setLoadingReplies(false);
    }
  }, [comment.id, repliesLoaded, loadingReplies, addToast]);

  // Automatically load replies when component mounts if comment has replies
  useEffect(() => {
    if (comment.replyCount > 0 && !repliesLoaded && !loadingReplies) {
      handleLoadReplies();
    }
  }, [comment.replyCount, repliesLoaded, loadingReplies, handleLoadReplies]);

  // Calculate vote score
  const voteScore = comment.upvotes - comment.downvotes;

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString();
  };

  // Handle voting
  const handleVote = (voteType: 'upvote' | 'downvote') => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    // For public communities, allow voting without membership
    // Toggle vote if clicking the same type
    const finalVoteType = userVote === voteType ? 'remove' : voteType;

    // Optimistically update UI
    setUserVote(finalVoteType === 'remove' ? null : voteType);

    // Call parent handler
    onVote(comment.id, finalVoteType as 'upvote' | 'downvote');
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    if (!isConnected || !address) {
      addToast('Please connect your wallet to reply', 'error');
      return;
    }

    // Ensure user is authenticated before submitting reply
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      addToast(authResult.error || 'Please authenticate to reply', 'error');
      return;
    }

    try {
      setReplySubmitting(true);

      const replyData: CreateCommentInput = {
        postId: comment.postId,
        parentId: comment.id,
        author: address,
        content: replyContent.trim()
      };

      const newReply = await CommunityPostService.createComment(replyData);

      // Add new reply to the list
      setReplies(prevReplies => [...prevReplies, newReply]);
      setReplyContent('');
      setShowReplyForm(false);

      addToast('Reply posted!', 'success');
    } catch (err) {
      console.error('Error posting reply:', err);
      addToast(err instanceof Error ? err.message : 'Failed to post reply', 'error');
    } finally {
      setReplySubmitting(false);
    }
  };

  // Calculate indentation based on depth
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';
  const borderClass = depth > 0 ? 'border-l-2 border-gray-200 dark:border-gray-700 pl-4' : '';

  return (
    <div className={`${indentClass} ${borderClass} ${className}`}>
      <div className="flex space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            walletAddress={comment.walletAddress || (typeof comment.author === 'string' ? comment.author : comment.author?.walletAddress)}
            userHandle={comment.handle}
            size={32}
            avatarCid={comment.avatarCid}
            profileCid={comment.profileCid}
            alt={`Avatar for ${comment.handle || comment.displayName || comment.walletAddress || (typeof comment.author === 'string' ? comment.author : comment.author?.walletAddress)}`}
          />
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <Link
              href={`/u/${typeof comment.author === 'string' ? comment.author : (comment.author as any)?.walletAddress || comment.walletAddress}`}
              className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {comment.handle || comment.displayName ? `u/${comment.handle || comment.displayName}` :
                (typeof comment.author === 'string' ? comment.author : (comment.author as any)?.walletAddress || comment.walletAddress) ?
                  `${(typeof comment.author === 'string' ? comment.author : (comment.author as any)?.walletAddress || comment.walletAddress).slice(0, 6)}...${(typeof comment.author === 'string' ? comment.author : (comment.author as any)?.walletAddress || comment.walletAddress).slice(-4)}` :
                  'Anonymous'}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-xs text-gray-500 dark:text-gray-400">(edited)</span>
            )}
          </div>

          {/* Comment Body */}
          {comment.isDeleted ? (
            <p className="text-gray-500 dark:text-gray-400 italic">
              This comment has been deleted
            </p>
          ) : (
            <div className="mt-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {comment.content}
            </div>
          )}

          {/* Comment Actions */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-2">
            {/* Reply Button - Always visible */}
            {!comment.isDeleted && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1 font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
                aria-label="Reply to comment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span>Reply</span>
              </button>
            )}

            <button
              onClick={() => {
                const commentUrl = `${window.location.href}#comment-${comment.id}`;
                navigator.clipboard.writeText(commentUrl);
                addToast('Comment link copied to clipboard!', 'success');
              }}
              className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>

            {/* Delete button - only show for comment author */}
            {address && (
              // Robust check for author address matching current wallet
              address.toLowerCase() === (
                typeof comment.author === 'string'
                  ? comment.author
                  : (comment.author as any)?.walletAddress || comment.walletAddress
              )?.toLowerCase()
            ) && !comment.isDeleted && (
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
                      try {
                        const authorAddress = typeof comment.author === 'string'
                          ? comment.author
                          : (comment.author as any)?.walletAddress || comment.walletAddress;

                        await CommunityPostService.deleteComment(comment.id, authorAddress);
                        addToast('Comment deleted successfully', 'success');
                        // Refresh the page to show updated comments
                        window.location.reload();
                      } catch (error) {
                        console.error('Error deleting comment:', error);
                        addToast('Failed to delete comment', 'error');
                      }
                    }
                  }}
                  className="flex items-center space-x-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3">
              {depth >= maxDepth ? (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Maximum reply depth reached. Please reply to a parent comment.</span>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReplySubmit}>
                  <div className="flex space-x-2">
                    <Avatar
                      walletAddress={address}
                      userHandle={address}
                      size={24}
                      alt="Your avatar"
                    />
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                        rows={2}
                        disabled={replySubmitting}
                        autoFocus
                      />
                      <div className="flex justify-end space-x-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowReplyForm(false);
                            setReplyContent('');
                          }}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                          disabled={replySubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!replyContent.trim() || replySubmitting}
                          className="px-3 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {replySubmitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Replies */}
          {Array.isArray(replies) && replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  onVote={onVote}
                  userMembership={userMembership}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}

          {/* Show loading indicator if replies are being loaded */}
          {loadingReplies && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Loading replies...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}