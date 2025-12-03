import React, { useState, useCallback, useEffect } from 'react';
import { Comment, CreateCommentInput } from '@/models/CommunityPost';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { CommunityService } from '@/services/communityService';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import CommentThread from './CommentThread';

interface EnhancedCommentSystemProps {
  postId: string;
  postType: 'feed' | 'community' | 'enhanced';
  communityId?: string; // Add communityId to determine if community is public/private
  initialComments?: Comment[];
  userMembership?: CommunityMembership | null;
  isLocked?: boolean;
  onCommentAdded?: (comment: Comment) => void;
  onCommentCountChange?: (count: number) => void; // Add callback for comment count changes
  className?: string;
}

type SortOption = 'best' | 'new' | 'top' | 'controversial';

export default function EnhancedCommentSystem({
  postId,
  postType,
  communityId,
  initialComments = [],
  userMembership,
  isLocked = false,
  onCommentAdded,
  onCommentCountChange,
  className = ''
}: EnhancedCommentSystemProps) {
  const { address, isConnected } = useWeb3();
  const { ensureAuthenticated } = useAuth();
  const { addToast } = useToast();

  // State
  const [comments, setComments] = useState<Comment[]>(Array.isArray(initialComments) ? initialComments : []);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('best');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [community, setCommunity] = useState<any>(null); // Store community information
  const [communityLoading, setCommunityLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{
    type: 'image' | 'gif' | 'sticker';
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  } | null>(null);

  // Load comments with sorting
  // Load comments with sorting
  const loadComments = useCallback(async (sortOption: SortOption = sortBy) => {
    try {
      setCommentsLoading(true);
      const response = await CommunityPostService.getPostComments(postId, {
        sortBy: sortOption,
        limit: 100
      });

      // Handle response structure: { comments: [...], pagination: {...} } or just [...]
      const commentsData = Array.isArray(response) ? response : ((response as any).comments || []);
      setComments(commentsData);

      // Update comment count
      const commentCount = await CommunityPostService.getPostCommentCount(postId);
      if (onCommentCountChange) {
        onCommentCountChange(commentCount);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
      addToast('Failed to load comments', 'error');
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, sortBy, onCommentCountChange, addToast]);

  // Load community information when communityId is provided
  useEffect(() => {
    const loadCommunity = async () => {
      if (communityId && !community) {
        try {
          setCommunityLoading(true);
          const communityData = await CommunityService.getCommunityById(communityId);
          setCommunity(communityData);
        } catch (err) {
          console.error('Error loading community:', err);
        } finally {
          setCommunityLoading(false);
        }
      }
    };

    loadCommunity();
  }, [communityId, community]);

  // Load comments on mount and when postId or sort changes
  useEffect(() => {
    loadComments();
  }, [postId, sortBy]); // Remove loadComments dependency to prevent infinite loop

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be less than 5MB', 'error');
      return;
    }

    // Create object URL for preview
    // In a real app, you would upload this to IPFS/S3 here
    const objectUrl = URL.createObjectURL(file);

    // For now, we'll simulate an upload by using the object URL
    // In production, this should be replaced with actual upload logic
    setSelectedMedia({
      type: 'image',
      url: objectUrl,
      alt: file.name
    });
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim() && !selectedMedia) return;

    if (!isConnected || !address) {
      addToast('Please connect your wallet to comment', 'error');
      return;
    }

    // Ensure user is authenticated before submitting comment
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      addToast(authResult.error || 'Please authenticate to comment', 'error');
      return;
    }

    // For community posts, check if community is public or if user is a member
    if (postType === 'community' && communityId && community) {
      // Only require membership for private communities or if there are special requirements
      if (!community.isPublic && !userMembership) {
        addToast('You must join the community to comment', 'error');
        return;
      }

      // Check for staking requirements
      if (community.settings && community.settings.stakingRequirements) {
        const commentStakingReq = community.settings.stakingRequirements.find(req => req.action === 'comment');
        if (commentStakingReq && !userMembership) {
          addToast(`This community requires staking ${commentStakingReq.minimumAmount} ${commentStakingReq.tokenAddress} to comment`, 'error');
          return;
        }
      }
    } else if (postType === 'community' && communityId && !community) {
      // Community data not loaded yet
      addToast('Community information is still loading. Please try again.', 'info');
      return;
    }

    try {
      setCommentSubmitting(true);

      const commentData: CreateCommentInput = {
        postId,
        author: address,
        content: newComment.trim(),
        media: selectedMedia || undefined
      };

      const newCommentObj = await CommunityPostService.createComment(commentData);

      // Validate comment structure before adding to state
      if (!newCommentObj || typeof newCommentObj !== 'object') {
        throw new Error('Invalid comment response from server');
      }

      // Add new comment to the list with defensive coding
      setComments(prevComments => {
        const currentComments = Array.isArray(prevComments) ? prevComments : [];
        return [newCommentObj, ...currentComments];
      });
      setNewComment('');
      setShowCommentForm(false);

      // Update comment count after adding a new comment
      const commentCount = await CommunityPostService.getPostCommentCount(postId);
      if (onCommentCountChange) {
        onCommentCountChange(commentCount);
      }

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
      {!isLocked && (
        (!communityId || (community && community.isPublic) || userMembership) && (
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

                    {/* Media Preview */}
                    {selectedMedia && (
                      <div className="mt-2 relative inline-block">
                        <img
                          src={selectedMedia.url}
                          alt="Selected media"
                          className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedMedia(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        {/* Image Upload */}
                        <label className="cursor-pointer p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={commentSubmitting}
                          />
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </label>

                        {/* GIF Button (Placeholder) */}
                        <button
                          type="button"
                          onClick={() => addToast('GIF selection coming soon!', 'info')}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Sticker Button (Placeholder) */}
                        <button
                          type="button"
                          onClick={() => addToast('Stickers coming soon!', 'info')}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {newComment.length}/1000 characters
                      </div>
                    </div>
                  </div>
                </div >

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentForm(false);
                      setNewComment('');
                      setSelectedMedia(null);
                    }}
                    disabled={commentSubmitting}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={(!newComment.trim() && !selectedMedia) || commentSubmitting}
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
              </form >
            )
            }
          </div >
        )
      )}

      {/* Locked Message */}
      {
        isLocked && (
          <div className="flex items-center justify-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
              Comments are locked for this post
            </span>
          </div>
        )
      }

      {/* Comments List */}
      {
        commentsLoading ? (
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
                : postType === 'community' && communityId && community && !community.isPublic && !userMembership
                  ? 'Join the community to start the conversation!'
                  : 'Be the first to share your thoughts!'
              }
            </p>
          </div>
        )
      }
    </div >
  );
}