import React, { useState, useEffect } from 'react';
import { CommentThreadSkeleton, LoadingSpinner } from './LoadingSkeletons';
import { NetworkError } from './ErrorBoundaries';
import { EmptyState, RetryState } from './FallbackStates';

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  replies: Comment[];
  depth: number;
  parentId?: string;
}

interface ProgressiveCommentLoaderProps {
  postId: string;
  initialComments?: Comment[];
  maxDepth?: number;
  pageSize?: number;
  onLoadComments?: (postId: string, page: number, parentId?: string) => Promise<Comment[]>;
  className?: string;
}

export default function ProgressiveCommentLoader({
  postId,
  initialComments = [],
  maxDepth = 5,
  pageSize = 10,
  onLoadComments,
  className = ''
}: ProgressiveCommentLoaderProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  // Load initial comments
  useEffect(() => {
    if (initialComments.length === 0 && onLoadComments) {
      loadComments();
    }
  }, [postId]);

  const loadComments = async (parentId?: string, pageNum = 1) => {
    if (!onLoadComments) return;

    try {
      setLoading(true);
      setError(null);
      
      const newComments = await onLoadComments(postId, pageNum, parentId);
      
      if (parentId) {
        // Loading replies for a specific comment
        setComments(prevComments => 
          updateCommentsWithReplies(prevComments, parentId, newComments)
        );
      } else {
        // Loading top-level comments
        if (pageNum === 1) {
          setComments(newComments);
        } else {
          setComments(prevComments => [...prevComments, ...newComments]);
        }
      }
      
      setHasMore(newComments.length === pageSize);
      setPage(pageNum + 1);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const updateCommentsWithReplies = (
    comments: Comment[], 
    parentId: string, 
    replies: Comment[]
  ): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return { ...comment, replies: [...comment.replies, ...replies] };
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentsWithReplies(comment.replies, parentId, replies)
        };
      }
      return comment;
    });
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
        // Load replies if not already loaded
        const comment = findComment(comments, commentId);
        if (comment && comment.replies.length === 0) {
          loadComments(commentId, 1);
        }
      }
      return newSet;
    });
  };

  const findComment = (comments: Comment[], id: string): Comment | null => {
    for (const comment of comments) {
      if (comment.id === id) return comment;
      const found = findComment(comment.replies, id);
      if (found) return found;
    }
    return null;
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const isExpanded = expandedThreads.has(comment.id);
    const hasReplies = comment.replies.length > 0;
    const canExpand = depth < maxDepth;

    return (
      <div 
        key={comment.id}
        className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''} mb-4`}
      >
        {/* Comment Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {/* Comment Header */}
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {comment.author}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {comment.createdAt.toLocaleDateString()}
            </span>
          </div>
          
          {/* Comment Content */}
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            {comment.content}
          </p>
          
          {/* Comment Actions */}
          <div className="flex items-center space-x-4 text-sm">
            <button className="flex items-center space-x-1 text-gray-500 hover:text-primary-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>{comment.upvotes}</span>
            </button>
            
            <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{comment.downvotes}</span>
            </button>
            
            <button className="text-gray-500 hover:text-primary-600 transition-colors">
              Reply
            </button>
            
            {hasReplies && canExpand && (
              <button
                onClick={() => toggleThread(comment.id)}
                className="text-gray-500 hover:text-primary-600 transition-colors"
              >
                {isExpanded ? 'Hide' : 'Show'} {comment.replies.length} replies
              </button>
            )}
          </div>
        </div>
        
        {/* Nested Replies */}
        {isExpanded && hasReplies && canExpand && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
        
        {/* Load More Replies Button */}
        {isExpanded && canExpand && comment.replies.length > 0 && (
          <div className="mt-4 ml-6">
            <button
              onClick={() => loadComments(comment.id, Math.floor(comment.replies.length / pageSize) + 1)}
              disabled={loading}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Load more replies'}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <NetworkError
        error={error}
        onRetry={() => loadComments()}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comments Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h3>
      </div>
      
      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <CommentThreadSkeleton key={i} />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <>
          {comments.map(comment => renderComment(comment))}
          
          {/* Load More Comments */}
          {hasMore && (
            <div className="text-center py-4">
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-gray-600 dark:text-gray-300">Loading more comments...</span>
                </div>
              ) : (
                <button
                  onClick={() => loadComments(undefined, page)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                >
                  Load More Comments
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No comments yet"
          description="Be the first to share your thoughts on this post!"
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      )}
    </div>
  );
}