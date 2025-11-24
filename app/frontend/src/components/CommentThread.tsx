import React, { useState, useCallback } from 'react';
import { Comment, CreateCommentInput } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import EnhancedReactionSystem from './EnhancedReactionSystem';
import { getDisplayName, getDefaultAvatar } from '@/utils/userDisplay';

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
  const { addToast } = useToast();

  // State
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies || []);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  // Fetch replies when comment is expanded (not collapsed)
  React.useEffect(() => {
    const fetchReplies = async () => {
      // Only fetch if not collapsed, not already loaded, and comment has no pre-loaded replies
      if (!collapsed && !repliesLoaded && (!comment.replies || comment.replies.length === 0)) {
        setLoadingReplies(true);
        try {
          const fetchedReplies = await CommunityPostService.getCommentReplies(comment.id);
          setReplies(fetchedReplies);
          setRepliesLoaded(true);
        } catch (error) {
          console.error('Error fetching replies:', error);
        } finally {
          setLoadingReplies(false);
        }
      }
    };

    fetchReplies();
  }, [collapsed, comment.id, comment.replies, repliesLoaded]);

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

    if (!userMembership) {
      addToast('You must join the community to vote', 'error');
      return;
    }

    // Toggle vote if clicking the same type
    const finalVoteType = userVote === voteType ? 'remove' : voteType;

    // Optimistically update UI
    setUserVote(finalVoteType === 'remove' ? null : voteType);

    // Call parent handler
    onVote(comment.id, finalVoteType as 'upvote' | 'downvote');
  };

  // Handle reply submission
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) return;

    if (!isConnected || !address) {
      addToast('Please connect your wallet to reply', 'error');
      return;
    }

    if (!userMembership) {
      addToast('You must join the community to reply', 'error');
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
        {/* Comment Vote Buttons (Vertical) */}
        <div className="flex flex-col items-center space-y-1 pt-1">
          {/* Upvote */}
          <button
            onClick={() => handleVote('upvote')}
            disabled={!userMembership}
            className={`p-1 rounded transition-colors duration-200 ${userVote === 'upvote'
              ? 'text-orange-500 bg-orange-100 dark:bg-orange-900/30'
              : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              } ${!userMembership ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Vote Score */}
          <span className={`text-xs font-bold ${voteScore > 0
            ? 'text-orange-500'
            : voteScore < 0
              ? 'text-blue-500'
              : 'text-gray-500 dark:text-gray-400'
            }`}>
            {voteScore}
          </span>

          {/* Downvote */}
          <button
            onClick={() => handleVote('downvote')}
            disabled={!userMembership}
            className={`p-1 rounded transition-colors duration-200 ${userVote === 'downvote'
              ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
              : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              } ${!userMembership ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-medium text-gray-900 dark:text-white">
              u/{getDisplayName(comment)}
            </span>
            <span>•</span>
            <span>{formatTimestamp((comment as any).createdAt || new Date())}</span>
            {comment.isEdited && (
              <>
                <span>•</span>
                <span className="italic">edited</span>
              </>
            )}
            {replies.length > 0 && (
              <>
                <span>•</span>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  {collapsed ? `[+] ${replies.length} replies` : '[-] collapse'}
                </button>
              </>
            )}
          </div>

          {/* Comment Content */}
          {!collapsed && (
            <>
              {comment.isDeleted ? (
                <div className="text-gray-500 dark:text-gray-400 italic text-sm">
                  [deleted]
                </div>
              ) : (
                <div className="text-gray-900 dark:text-white text-sm whitespace-pre-wrap break-words mb-2">
                  {comment.content}
                </div>
              )}

              {/* Enhanced Reactions for Comments */}
              {!comment.isDeleted && (
                <div className="mb-2">
                  <EnhancedReactionSystem
                    postId={comment.id}
                    postType="community"
                    onReaction={async (commentId, reactionType, amount) => {
                      // Handle comment reactions
                      console.log('Comment reaction:', commentId, reactionType, amount);
                      addToast(`Reacted to comment with ${reactionType}!`, 'success');
                    }}
                    className="scale-75 origin-left"
                  />
                </div>
              )}

              {/* Comment Actions */}
              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                {userMembership && depth < maxDepth && !comment.isDeleted && (
                  <button
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                <button
                  onClick={() => {
                    // TODO: Implement save comment functionality
                    addToast('Comment saved!', 'success');
                  }}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Save</span>
                </button>

                {/* Report/More options */}
                <div className="relative">
                  <button
                    onClick={() => {
                      // TODO: Implement more options menu
                      addToast('More options coming soon!', 'info');
                    }}
                    className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    •••
                  </button>
                </div>
              </div>

              {/* Reply Form */}
              {showReplyForm && userMembership && (
                <form onSubmit={handleReplySubmit} className="mt-3">
                  <div className="flex space-x-2">
                    <div className="bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {getDefaultAvatar(getDisplayName({ author: address }))}
                      </span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                        rows={2}
                        disabled={replySubmitting}
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

              {/* Nested Replies */}
              {!collapsed && replies.length > 0 && (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}