import React, { useState, useCallback, useEffect } from 'react';
import { Comment } from '@/models/CommunityPost';
import { CommunityPostService } from '@/services/communityPostService';
import { useToast } from '@/context/ToastContext';
import EnhancedCommentSystem from '@/components/EnhancedCommentSystem';
import Link from 'next/link';

interface CommentPreviewSystemProps {
  postId: string;
  postType?: 'feed' | 'community' | 'enhanced';
  maxPreviewLength?: number;
  maxPreviewComments?: number;
  showExpandButton?: boolean;
  className?: string;
  onExpand?: () => void;
  onCommentCountChange?: (count: number) => void;
}

interface CommentPreview {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  isTopComment: boolean;
}

export default function CommentPreviewSystem({
  postId,
  postType = 'community',
  maxPreviewLength = 100,
  maxPreviewComments = 3,
  showExpandButton = true,
  className = '',
  onExpand,
  onCommentCountChange
}: CommentPreviewSystemProps) {
  const { addToast } = useToast();

  // State
  const [commentPreviews, setCommentPreviews] = useState<CommentPreview[]>([]);
  const [totalCommentCount, setTotalCommentCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comment previews
  const loadCommentPreviews = useCallback(async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get top comments for preview
      const comments = await CommunityPostService.getPostComments(postId, {
        sortBy: 'best',
        limit: maxPreviewComments
      });

      // Transform comments to previews
      const previews: CommentPreview[] = comments.map((comment, index) => ({
        id: comment.id,
        author: comment.author,
        content: comment.content,
        createdAt: comment.createdAt,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        isTopComment: index === 0
      }));

      setCommentPreviews(previews);
      
      // Get total comment count
      const stats = await CommunityPostService.getPostStats(postId);
      setTotalCommentCount(stats.commentCount || comments.length);
      
      if (onCommentCountChange) {
        onCommentCountChange(stats.commentCount || comments.length);
      }
    } catch (err) {
      console.error('Error loading comment previews:', err);
      setError('Failed to load comments');
      addToast('Failed to load comment previews', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [postId, maxPreviewComments, isLoading, addToast]);

  // Load previews on mount
  useEffect(() => {
    loadCommentPreviews();
  }, [loadCommentPreviews]);

  // Format author display
  const formatAuthor = (author: string | any) => {
    const authorAddress = typeof author === 'string' ? author : author?.walletAddress || author?.address || 'Unknown';
    if (authorAddress.length <= 10) return authorAddress;
    return `${authorAddress.slice(0, 6)}...${authorAddress.slice(-4)}`;
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
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

  // Truncate content with ellipsis
  const truncateContent = (content: string, maxLength: number = maxPreviewLength) => {
    if (content.length <= maxLength) return content;
    
    // Find the last space before the limit to avoid cutting words
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  };

  // Handle expand/collapse
  const handleToggleExpand = () => {
    if (onExpand) {
      onExpand();
    }
    setIsExpanded(!isExpanded);
  };

  // Handle comment added in expanded view
  const handleCommentAdded = (comment: Comment) => {
    // Refresh previews to include new comment
    loadCommentPreviews();
  };

  // Render loading state
  if (isLoading && commentPreviews.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading comments...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && commentPreviews.length === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center space-x-2 text-sm text-red-500 dark:text-red-400">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
          <button
            onClick={loadCommentPreviews}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (commentPreviews.length === 0 && !isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>No comments yet</span>
          </div>
          {showExpandButton && (
            <button
              onClick={handleToggleExpand}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Be the first to comment
            </button>
          )}
        </div>
        
        {/* Expanded comment system */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <EnhancedCommentSystem
              postId={postId}
              postType={postType}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Comment count and expand button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>
            {totalCommentCount} {totalCommentCount === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        
        {showExpandButton && (
          <button
            onClick={handleToggleExpand}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors duration-200"
          >
            {isExpanded ? 'Collapse comments' : 'View all comments'}
          </button>
        )}
      </div>

      {/* Comment previews */}
      {!isExpanded && commentPreviews.length > 0 && (
        <div className="space-y-3">
          {commentPreviews.map((preview, index) => (
            <div
              key={preview.id}
              className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                preview.isTopComment
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Comment header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        {(typeof preview.author === 'string' ? preview.author : preview.author?.walletAddress || preview.author?.address || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <Link
                      href={`/u/${typeof preview.author === 'string' ? preview.author : preview.author?.walletAddress || preview.author?.address || ''}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {formatAuthor(preview.author)}
                    </Link>
                  </div>
                  {preview.isTopComment && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">
                      Top comment
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatTimestamp(preview.createdAt)}</span>
                  {(preview.upvotes > 0 || preview.downvotes > 0) && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        <span>{preview.upvotes - preview.downvotes}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Comment content preview */}
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {truncateContent(preview.content)}
              </div>

              {/* Show "read more" if content was truncated */}
              {preview.content.length > maxPreviewLength && (
                <button
                  onClick={handleToggleExpand}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 transition-colors duration-200"
                >
                  Read more
                </button>
              )}
            </div>
          ))}

          {/* Show more comments indicator */}
          {totalCommentCount > maxPreviewComments && (
            <div className="text-center">
              <button
                onClick={handleToggleExpand}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium transition-colors duration-200"
              >
                View {totalCommentCount - maxPreviewComments} more {totalCommentCount - maxPreviewComments === 1 ? 'comment' : 'comments'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded comment system */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <EnhancedCommentSystem
            postId={postId}
            postType={postType}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      )}
    </div>
  );
}