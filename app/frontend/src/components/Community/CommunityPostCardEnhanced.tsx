import React, { useState, useCallback } from 'react';
import { CommunityPost, Comment, CreateCommentInput } from '@/models/CommunityPost';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import { CommunityMembership } from '@/models/CommunityMembership';
import { CommunityPostService } from '@/services/communityPostService';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import CommentThread from '../CommentThread';
import StakingVoteButton from '../StakingVoteButton';
import CommunityTipButton from '../CommunityTipButton';
import CommunityNFTEmbed from '../CommunityNFTEmbed';
import CommunityDeFiEmbed from '../CommunityDeFiEmbed';
import WalletSnapshotEmbed from '../WalletSnapshotEmbed';
import CommunityGovernance from '../CommunityGovernance';
import PostInteractionBar from '../PostInteractionBar';
import OptimizedImage from '../OptimizedImage';
import { motion } from 'framer-motion';

// Helper function to check if post is a community post
const isCommunityPost = (post: EnhancedPost): boolean => {
  // Check if it has community-specific fields
  return 'flair' in post && 'isPinned' in post && 'isLocked' in post;
};

interface Reaction {
  type: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art';
  emoji: string;
  label: string;
  totalStaked: number;
  userStaked: number;
  contributors: string[];
  rewardsEarned: number;
}

interface CommunityPostCardEnhancedProps {
  post: EnhancedPost; // Changed from CommunityPost to EnhancedPost
  community: Community;
  userMembership: CommunityMembership | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  className?: string;
  isLoading?: boolean;
}

export default function CommunityPostCardEnhanced({
  post,
  community,
  userMembership,
  onVote,
  onReaction,
  onTip,
  className = '',
  isLoading = false
}: CommunityPostCardEnhancedProps) {
  const { address, isConnected } = useWeb3();
  const { ensureAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Check if the post is a CommunityPost or a QuickPost
  const isCommunityPostType = isCommunityPost(post);

  // Type guard to safely access CommunityPost properties
  const communityPost = isCommunityPostType ? post as any : null;

  // State
  const [showComments, setShowComments] = useState(false);
  // Initialize comments based on the type of post (CommunityPost has structured comments, EnhancedPost has a count)
  const [comments, setComments] = useState<Comment[]>(isCommunityPostType && Array.isArray((post as any).comments) ? (post as any).comments : []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([
    { type: 'hot', emoji: '🔥', label: 'Hot Take', totalStaked: 12, userStaked: 0, contributors: [], rewardsEarned: 2.4 },
    { type: 'diamond', emoji: '💎', label: 'Diamond Hands', totalStaked: 8, userStaked: 0, contributors: [], rewardsEarned: 1.6 },
    { type: 'bullish', emoji: '🚀', label: 'Bullish', totalStaked: 21, userStaked: 0, contributors: [], rewardsEarned: 4.2 },
    { type: 'governance', emoji: '⚖️', label: 'Governance', totalStaked: 9, userStaked: 0, contributors: [], rewardsEarned: 1.8 }
  ]);

  // Calculate vote score (community posts have upvotes/downvotes, quickPosts don't)
  const voteScore = isCommunityPostType && 'upvotes' in post && typeof (post as any).upvotes === 'number' && 'downvotes' in post && typeof (post as any).downvotes === 'number' ? ((post as any).upvotes - (post as any).downvotes) : 0;

  // Loading skeleton
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse ${className}`}
      >
        <div className="flex">
          <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-600 w-16">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
            <div className="w-8 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded"></div>
          </div>
          <div className="flex-1 p-4">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full mr-2"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
            </div>
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  // Handle voting with staking
  const handleVote = useCallback((postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
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

    // Call parent handler with stake amount
    onVote(postId, finalVoteType as 'upvote' | 'downvote', stakeAmount);

    if (stakeAmount) {
      addToast(`Voted with ${stakeAmount} tokens staked!`, 'success');
    }
  }, [isConnected, address, userMembership, userVote, onVote, addToast]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (commentsLoading) return;

    try {
      setCommentsLoading(true);
      const commentsData = await CommunityPostService.getPostComments(post.id, {
        sortBy: 'best',
        limit: 50
      });
      setComments(commentsData);
    } catch (err) {
      console.error('Error loading comments:', err);
      addToast('Failed to load comments', 'error');
    } finally {
      setCommentsLoading(false);
    }
  }, [post.id, commentsLoading, addToast]);

  // Toggle comments visibility
  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

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

    if (!userMembership) {
      addToast('You must join the community to comment', 'error');
      return;
    }

    try {
      setCommentSubmitting(true);

      const commentData: CreateCommentInput = {
        postId: post.id,
        author: address || '',
        content: newComment.trim()
      };

      const newCommentObj = await CommunityPostService.createComment(commentData);

      // Add new comment to the list
      setComments(prevComments => [newCommentObj, ...prevComments]);
      setNewComment('');

      addToast('Comment posted!', 'success');
    } catch (err) {
      console.error('Error posting comment:', err);
      addToast(err instanceof Error ? err.message : 'Failed to post comment', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Handle web3 reactions (staking tokens)
  const handleReaction = async (reactionType: string, amount: number) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    if (!userMembership) {
      addToast('You must join the community to react', 'error');
      return;
    }

    try {
      if (onReaction) {
        await onReaction(post.id, reactionType, amount);
      }

      // Update local state
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          const reward = amount * 0.1;
          return {
            ...reaction,
            totalStaked: reaction.totalStaked + amount,
            userStaked: reaction.userStaked + amount,
            rewardsEarned: reaction.rewardsEarned + reward,
            contributors: [...reaction.contributors, address ? address.substring(0, 6) + '...' + address.substring(38) : '']
          };
        }
        return reaction;
      }));

      addToast(`Successfully staked ${amount} $LNK on ${reactionType} reaction!`, 'success');
    } catch (error) {
      console.error('Error reacting:', error);
      addToast('Failed to react. Please try again.', 'error');
    }
  };

  // Handle comment vote
  const handleCommentVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (!userMembership) {
      addToast('You must join the community to vote', 'error');
      return;
    }

    // TODO: Implement comment voting API
    addToast('Comment voting coming soon!', 'info');
  };

  // Get category gradient based on post tags
  const getCategoryGradient = () => {
    if (post.tags && post.tags.length > 0) {
      if (post.tags.includes('defi') || post.tags.includes('yield') || post.tags.includes('trade')) {
        return 'from-green-400/30 via-emerald-500/20 to-teal-600/30';
      } else if (post.tags.includes('nft') || post.tags.includes('art') || post.tags.includes('collection')) {
        return 'from-purple-400/30 via-fuchsia-500/20 to-pink-600/30';
      } else if (post.tags.includes('governance') || post.tags.includes('proposal') || post.tags.includes('dao')) {
        return 'from-blue-400/30 via-indigo-500/20 to-violet-600/30';
      } else if (post.tags.includes('social') || post.tags.includes('community') || post.tags.includes('discussion')) {
        return 'from-orange-400/30 via-amber-500/20 to-yellow-600/30';
      }
    }
    return 'from-gray-400/20 to-slate-600/20';
  };

  // Render enhanced web3 embeds based on post type
  const renderWeb3Embed = () => {
    if (isCommunityPostType && post.tags?.includes('nft') && post.onchainRef) {
      const [contractAddress, tokenId] = post.onchainRef.split(':');
      return (
        <CommunityNFTEmbed
          contractAddress={contractAddress || '0x1234567890123456789012345678901234567890'}
          tokenId={tokenId || '1'}
          className="mt-3"
        />
      );
    }

    if (isCommunityPostType && post.tags?.includes('defi')) {
      // Extract protocol name from tags or content
      const protocolName = post.tags.find(tag =>
        ['aave', 'compound', 'uniswap', 'curve', 'yearn'].includes(tag.toLowerCase())
      ) || 'Aave';
      return <CommunityDeFiEmbed protocolName={protocolName} className="mt-3" />;
    }

    if (isCommunityPostType && post.tags?.includes('wallet') && post.onchainRef) {
      return <WalletSnapshotEmbed walletAddress={post.onchainRef} className="mt-3" />;
    }

    if (isCommunityPostType && (post.tags?.includes('governance') || post.tags?.includes('dao'))) {
      return <CommunityGovernance community={community} className="mt-3" />;
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200 ${className}`}
      role="article"
      aria-label={`Post by ${post.author} in ${community.displayName}`}
    >
      <div className="flex">
        {/* Vote Section with Staking */}
        <div className="flex flex-col items-center p-3 bg-gray-50 dark:bg-gray-700/50 border-r border-gray-200 dark:border-gray-600">
          {/* Upvote Button with Staking */}
          <StakingVoteButton
            postId={post.id}
            communityId={community.id}
            voteType="upvote"
            currentVote={userVote}
            onVote={handleVote}
            disabled={!userMembership}
            className="mb-2"
          />

          {/* Vote Score */}
          <span
            className={`text-sm font-bold py-1 ${voteScore > 0
              ? 'text-orange-500'
              : voteScore < 0
                ? 'text-blue-500'
                : 'text-gray-500 dark:text-gray-400'
              }`}
            aria-label={`Vote score: ${voteScore > 0 ? '+' : ''}${voteScore}`}
          >
            {voteScore > 0 ? '+' : ''}{voteScore}
          </span>

          {/* Downvote Button with Staking */}
          <StakingVoteButton
            postId={post.id}
            communityId={community.id}
            voteType="downvote"
            currentVote={userVote}
            onVote={handleVote}
            disabled={!userMembership}
            className="mt-2"
          />
        </div>

        {/* Post Content */}
        <div className="flex-1 p-4">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">
                u/{post.author.slice(0, 6)}...{post.author.slice(-4)}
              </span>
              <span>•</span>
              <span>{formatTimestamp(post.createdAt)}</span>
              {/* Only show flair for community posts */}
              {isCommunityPostType && communityPost && communityPost.flair && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                    {communityPost.flair}
                  </span>
                </>
              )}
              {/* Only show pinned status for community posts */}
              {isCommunityPostType && communityPost && communityPost.isPinned && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center text-green-600 dark:text-green-400">
                    📌 Pinned
                  </span>
                </>
              )}
            </div>

            {/* Post Actions Menu */}
            <div className="flex items-center space-x-2">
              {/* Only show locked status for community posts */}
              {isCommunityPostType && communityPost && communityPost.isLocked && (
                <span className="text-yellow-500" title="Comments are locked" aria-label="Comments are locked">
                  🔒
                </span>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            {/* Post Title */}
            {post.title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight">
                {post.title}
              </h3>
            )}

            <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {post.contentCid}
            </div>

            {/* Media */}
            {post.mediaCids && post.mediaCids.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {post.mediaCids.map((mediaUrl, index) => (
                  <div
                    key={index}
                    className="rounded-lg max-h-96 object-cover w-full cursor-pointer hover:opacity-90 transition-opacity duration-200"
                    onClick={() => window.open(mediaUrl, '_blank')}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && window.open(mediaUrl, '_blank')}
                    role="button"
                    aria-label={`View media ${index + 1}`}
                  >
                    <OptimizedImage
                      src={mediaUrl}
                      alt={`Post media ${index + 1}`}
                      className="rounded-lg max-h-96 object-cover w-full"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* NFT/Onchain Reference (only for community posts) */}
            {isCommunityPostType && post.onchainRef && (
              <div className="mt-3 p-3 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔗</span>
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    Onchain Reference: {post.onchainRef}
                  </span>
                </div>
              </div>
            )}

            {/* Web3 Embeds */}
            {renderWeb3Embed()}

            {/* Tags (only for community posts) */}
            {isCommunityPostType && post.tags && post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-200"
                    onClick={() => window.open(`/tag/${tag}`, '_blank')}
                    onKeyDown={(e) => e.key === 'Enter' && window.open(`/tag/${tag}`, '_blank')}
                    tabIndex={0}
                    role="button"
                    aria-label={`Tag: ${tag}`}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Enhanced Post Interactions */}
            {userMembership && (
              <div className="mt-4">
                <PostInteractionBar
                  post={{
                    id: post.id,
                    contentCid: post.contentCid,
                    author: post.author,
                    communityId: community.id, // Use the community ID passed to the component
                    commentCount: comments.length,
                    stakedValue: reactions.reduce((sum, r) => sum + r.totalStaked, 0)
                  }}
                  postType="community"
                  userMembership={userMembership}
                  onComment={toggleComments}
                  onReaction={onReaction}
                  onTip={onTip}
                  onShare={async (postId, shareType, message) => {
                    // Handle sharing
                    console.log('Sharing community post:', postId, shareType, message);
                    addToast(`Post shared via ${shareType}!`, 'success');
                  }}
                />
              </div>
            )}

            {/* Analytics Section */}
            {showAnalytics && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white dark:bg-gray-700 p-2 rounded text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {reactions.reduce((sum, r) => sum + r.totalStaked, 0)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tokens Staked</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 p-2 rounded text-center">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{comments.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Comments</p>
                  </div>
                </div>

                {reactions.filter(r => r.userStaked > 0).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Your Stakes</h5>
                    <div className="space-y-1">
                      {reactions.filter(r => r.userStaked > 0).map((reaction) => (
                        <div key={reaction.type} className="flex items-center justify-between text-xs">
                          <span className="flex items-center space-x-1">
                            <span>{reaction.emoji}</span>
                            <span>{reaction.label}</span>
                          </span>
                          <span className="font-medium">{reaction.userStaked} $LNK</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Analytics Toggle for Non-Members */}
          {!userMembership && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleComments}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  aria-label="Toggle comments"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{comments.length} comments</span>
                </button>

                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  aria-label="Toggle analytics"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Analytics</span>
                </button>
              </div>

              <div className="text-xs font-medium">
                {reactions.reduce((sum, r) => sum + r.totalStaked, 0)} $LDAO staked
              </div>
            </div>
          )}

          {/* Comments Section */}
          {showComments && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              {/* Comment Form (only for community posts) */}
              {isCommunityPostType && userMembership && communityPost && !communityPost.isLocked && (
                <form onSubmit={handleCommentSubmit} className="mb-4">
                  <div className="flex space-x-3">
                    <div className="bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {address ? address.slice(2, 4).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                        rows={3}
                        disabled={commentSubmitting}
                        aria-label="Write a comment"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="submit"
                          disabled={!newComment.trim() || commentSubmitting}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                          aria-label={commentSubmitting ? "Posting comment..." : "Post comment"}
                        >
                          {commentSubmitting ? 'Posting...' : 'Comment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Comments List */}
              {commentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex space-x-3">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      onVote={handleCommentVote}
                      userMembership={userMembership}
                      depth={0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}