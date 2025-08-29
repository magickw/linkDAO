import React, { useState, useCallback } from 'react';
import { Comment, CreateCommentInput } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import CommentThread from './CommentThread';

interface EnhancedCommentSystemProps {
  postId: string;
  postType: 'feed' | 'community';
  initialComments?: Comment[];
  userMembership?: CommunityMembership | null;
  isLocked?: boolean;
  onCommentAdded?: (comment: Comment) => void;
  className?: string;
}

type SortOption = 'best' | 'new' | 'top' | 'controversial';

export default function EnhancedCommentSystem({
  postId,
  postType,
  initialComments = [],
  userMembership,
  isLocked = false,
  onCommentAdded,
  className = ''
}: EnhancedCommentSystemProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  // State
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Load comments with sorting
  const loadComments = useCallback(async (sortOption: SortOption = sortBy) => {
    if (commentsLoading) return;

    try {
      setCommentsLoading(true);
      const commentsData = await CommunityPostService.getPostComments(postId, {
        sortBy: sortOption,
        limit: 100
      });
      setComments(commentsData);
    } catch (err) {
      console.error('Error loading comments:', err);
      addToast('Failed to load comments', 'error');
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, sortBy, commentsLoading, addToast]);

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    if (!isConnected || !address) {
      addToast('Please connect your wallet to comment', 'error');
      return;
    }

    if (postType === 'community' && !userMembership) {
      addToast('You must join the community to comment', 'error');
      return;
    }

    try {
      setCommentSubmitting(true);
      
      const commentData: CreateCommentInput = {
        postId,
        author: address,
        content: newComment.trim()
      };

      const newCommentObj = await CommunityPostService.createComment(commentData);
      
      // Add new comment to the list
      setComments(prevComments => [newCommentObj, ...prevComments]);
      setNewComment('');
      setShowCommentForm(false);
      
      if (onCommentAdded) {
        onCommentAdded(newCommentObj);
      }
      
      addToast('Comment posted!', 'success');
    } catch (err) {
      console.error('Error posting comment:', err);
      addToast(err instanceof Error ? err.message : 'Failed to post comment', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Handle comment vote
  const handleCommentVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (postType === 'community' && !userMembership) {
      addToast('You must join the community to vote', 'error');
      return;
    }

    // TODO: Implement comment voting API
    addToast(`${voteType} on comment coming soon!`, 'info');
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    loadComments(newSort);
  };

  // Sort comments based on selected option
  const getSortedComments = () => {
    const sortedComments = [...comments];
    
    switch (sortBy) {
      case 'best':
        return sortedComments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      case 'new':
        return sortedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'top':
        return sortedComments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      case 'controversial':
        return sortedComments.sort((a, b) => {
          const aControversy = Math.min(a.upvotes, a.downvotes);
          const bControversy = Math.min(b.upvotes, b.downvotes);
          return bControversy - aControversy;
        });
      default:
        return sortedComments;
    }
  };

  const sortedComments = getSortedComments();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h4>
        
        {/* Sort Options */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="best">Best</option>
            <option value="new">Newest</option>
            <option value="top">Top</option>
            <option value="controversial">Controversial</option>
          </select>
        </div>
      </div>

      {/* Comment Form */}
      {!isLocked && (postType === 'feed' || userMembership) && (
        <div className="space-y-3">
          {!showCommentForm ? (
            <button
              onClick={() => setShowCommentForm(true)}
              className="w-full p-3 text-left text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
            >
              Add a comment...
            </button>
          ) : (
            <form onSubmit={handleCommentSubmit} className="space-y-3">
              <div className="flex space-x-3">
                <div className="bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {address ? address.slice(2, 4).toUpperCase() : 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    rows={4}
                    disabled={commentSubmitting}
                    maxLength={1000}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {newComment.length}/1000 characters
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentForm(false);
                    setNewComment('');
                  }}
                  disabled={commentSubmitting}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newComment.trim() || commentSubmitting}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                >
                  {commentSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting...
                    </div>
                  ) : (
                    'Comment'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Locked Message */}
      {isLocked && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-800 dark:text-yellow-200 font-medium">
            Comments are locked for this post
          </span>
        </div>
      )}

      {/* Comments List */}
      {commentsLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedComments.length > 0 ? (
        <div className="space-y-6">
          {sortedComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onVote={handleCommentVote}
              userMembership={userMembership || null}
              depth={0}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No comments yet</h3>
          <p className="text-sm">
            {isLocked 
              ? 'Comments are locked for this post.' 
              : postType === 'community' && !userMembership
                ? 'Join the community to start the conversation!'
                : 'Be the first to share your thoughts!'
            }
          </p>
        </div>
      )}
    </div>
  );
}