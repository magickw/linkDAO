import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
import { EmojiPicker } from '../Messaging/EmojiPicker';
import { motion } from 'framer-motion';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { processContent, shouldTruncateContent, getTruncatedContent } from '@/utils/contentParser';
import { createPropsComparatorIgnoring } from '@/utils/performanceUtils';
import RichContentPreview from './RichContentPreview';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';

// Helper function to check if post is a community post
const isCommunityPost = (post: EnhancedPost): boolean => {
  // Check if it has community-specific fields
  // Relaxed check: if it has communityId, it's likely a community post in this context
  // or checks for specific fields if communityId is somehow missing on the type but present on the object
  return 'communityId' in post || ('flair' in post && 'isPinned' in post && 'isLocked' in post);
};

interface Reaction {
  type: string;
  emoji: string;
  label: string;
  price: number; // LDAO tokens required to purchase
  count: number; // How many times this reaction was purchased
  userOwned: boolean; // Whether current user owns this reaction
}



interface CommunityPostCardEnhancedProps {
  post: EnhancedPost; // Changed from CommunityPost to EnhancedPost
  community: Community;
  userMembership: CommunityMembership | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onComment?: (postId: string) => void;
  onOpenPost?: (post: EnhancedPost, communitySlug: string) => void;
  className?: string;
  isLoading?: boolean;
}

function CommunityPostCardEnhanced({
  post,
  community,
  userMembership,
  onVote,
  onReaction,
  onTip,
  onOpenPost,
  className = '',
  isLoading = false
}: CommunityPostCardEnhancedProps) {
  const router = useRouter();
  const { address, isConnected, hasWallet, requestConnection } = useWeb3();
  const { ensureAuthenticated } = useAuth();
  const { addToast } = useToast();

  // Check if the post is a CommunityPost or a Status
  const isCommunityPostType = isCommunityPost(post);

  // Type guard to safely access CommunityPost properties
  const communityPost = isCommunityPostType ? post as any : null;

  // State
  const [showComments, setShowComments] = useState(false);
  // Always initialize comments as empty and load from API for consistency
  // This ensures comments are synced across all views (feed, community page, post detail)
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Calculate vote score (statuses have upvotes/downvotes, posts also do)
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

  const [isExpanded, setIsExpanded] = useState(false);

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
    if (!hasWallet) {
      addToast('No wallet detected. Please install a wallet like MetaMask.', 'error');
      return;
    }

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
  }, [hasWallet, isConnected, address, userMembership, userVote, onVote, addToast]);

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

  // Load comments and reactions when component mounts
  useEffect(() => {
    loadComments();
    loadReactions();
  }, [post.id]); // Only reload when post ID changes

  // Load reactions
  const loadReactions = useCallback(async () => {
    try {
      // Use the post's reactions if available, otherwise fetch from API
      // The post object should have reactions data from the API
      if (post.reactions && Array.isArray(post.reactions)) {
        // Map the API reactions to the expected format
        const mappedReactions: Reaction[] = post.reactions.map((reaction: any) => ({
          type: reaction.type || 'hot',
          emoji: getReactionEmoji(reaction.type),
          label: getReactionLabel(reaction.type),
          totalStaked: reaction.totalAmount || 0,
          userStaked: reaction.users?.reduce((sum: number, user: any) =>
            user.address === address ? sum + (user.amount || 0) : sum, 0) || 0,
          contributors: reaction.users?.map((user: any) => user.address) || [],

          rewardsEarned: 0, // Calculate rewards if needed
          // Lint fixes: provide required properties
          price: 0,
          count: reaction.count || 0,
          userOwned: reaction.users?.some((user: any) => user.address === address) || false
        }));
        setReactions(mappedReactions);
      } else {
        // Fallback: fetch reactions from API
        // TODO: Implement actual API call to fetch reactions
        // const reactionsData = await someReactionService.getPostReactions(post.id);
        setReactions([]);
      }
    } catch (err) {
      console.error('Error loading reactions:', err);
      // Set empty reactions on error
      setReactions([]);
    }
  }, [post.id, post.reactions, address]);

  // Helper function to get emoji for reaction type
  const getReactionEmoji = (type: string): string => {
    const emojiMap: Record<string, string> = {
      hot: '🔥',
      diamond: '💎',
      bullish: '🚀',
      governance: '⚖️',
      art: '🎨',
      'hot-take': '🔥',
      'diamond-hands': '💎',
      // bullish: '🚀', // Removed duplicate
      bearish: '🐻',
      love: '❤️',
      laugh: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😠',
      upvote: '👍',
      downvote: '👎'
    };
    return emojiMap[type.toLowerCase()] || '👍';
  };

  // Helper function to get label for reaction type
  const getReactionLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      hot: 'Hot Take',
      diamond: 'Diamond Hands',
      bullish: 'Bullish',
      governance: 'Governance',
      art: 'Art',
      'hot-take': 'Hot Take',
      'diamond-hands': 'Diamond Hands',
      bearish: 'Bearish',
      love: 'Love',
      laugh: 'Laugh',
      wow: 'Wow',
      sad: 'Sad',
      angry: 'Angry',
      upvote: 'Upvote',
      downvote: 'Downvote'
    };
    return labelMap[type.toLowerCase()] || type;
  };

  // Get reaction price
  const getReactionPrice = (type: string): number => {
    const priceMap: Record<string, number> = {
      hot: 1,
      diamond: 2,
      bullish: 1,
      love: 1,
      laugh: 1,
      wow: 2,
    };
    return priceMap[type.toLowerCase()] || 1;
  };

  // Toggle comments visibility
  const toggleComments = () => {
    setShowComments(!showComments);
  };

  // Handle comment submission
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    // Check wallet connection with more detailed error handling
    if (!hasWallet) {
      addToast('No wallet detected. Please install a wallet like MetaMask.', 'error');
      return;
    }

    if (!isConnected) {
      addToast('Please connect your wallet to comment', 'error');
      // Try to request connection
      try {
        await requestConnection();
      } catch (error) {
        console.error('Failed to request wallet connection:', error);
      }
      return;
    }

    if (!address) {
      addToast('Wallet address not detected. Please reconnect your wallet.', 'error');
      return;
    }

    // Ensure user is authenticated before submitting comment
    const authResult = await ensureAuthenticated();
    if (!authResult.success) {
      // If authentication failed, provide specific error message
      const errorMessage = authResult.error || 'Please authenticate to comment';
      addToast(errorMessage, 'error');

      // If it's a wallet connection issue, suggest reconnecting
      if (errorMessage.includes('connect') || errorMessage.includes('wallet')) {
        addToast('Try disconnecting and reconnecting your wallet', 'info');
      }
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
      setCommentImages([]);

      addToast('Comment posted!', 'success');
    } catch (err) {
      console.error('Error posting comment:', err);
      addToast(err instanceof Error ? err.message : 'Failed to post comment', 'error');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = commentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCommentText = newComment.slice(0, start) + emoji + newComment.slice(end);

      setNewComment(newCommentText);

      // Set cursor position after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    }

    setShowEmojiPicker(false);
  }, [newComment]);

  // Handle image upload
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be less than 5MB', 'error');
      return;
    }

    setUploadingImage(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCommentImages(prev => [...prev, data.url]);
        addToast('Image uploaded successfully', 'success');
      } else {
        addToast('Failed to upload image', 'error');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      addToast('Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  }, [addToast]);

  // Handle removing uploaded image
  const handleRemoveImage = useCallback((index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle reaction purchase (simplified from staking)
  const handleReactionPurchase = async (reactionType: string) => {
    if (!hasWallet) {
      addToast('No wallet detected. Please install a wallet like MetaMask.', 'error');
      return;
    }

    if (!isConnected || !address) {
      addToast('Please connect your wallet to react', 'error');
      return;
    }

    if (!userMembership) {
      addToast('You must join the community to react', 'error');
      return;
    }

    const price = getReactionPrice(reactionType);

    try {
      // Simple token transfer to treasury
      const result = await ldaoTokenService.transfer(
        '0x074E3874CA62F8cB9be6DDCD23235d0Bb5a8A0b5', // Treasury address
        price.toString()
      );

      if (!result.success) {
        addToast(result.error || 'Failed to purchase reaction', 'error');
        return;
      }

      if (onReaction) {
        await onReaction(post.id, reactionType, price);
      }

      // Update local state - much simpler
      setReactions(prev => prev.map(reaction => {
        if (reaction.type === reactionType) {
          return {
            ...reaction,
            count: reaction.count + 1,
            userOwned: true
          };
        }
        return reaction;
      }));

      addToast(`Purchased ${reactionType} reaction for ${price} LDAO!`, 'success');
    } catch (error) {
      console.error('Error purchasing reaction:', error);
      addToast('Failed to purchase reaction', 'error');
    }
  };

  // Handle comment vote
  const handleCommentVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    if (!hasWallet) {
      addToast('No wallet detected. Please install a wallet like MetaMask.', 'error');
      return;
    }

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

  // Handle delete post
  const handleDelete = async () => {
    if (!address) {
      addToast('Wallet not connected', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      if (post.isStatus) {
        const { StatusService } = await import('@/services/statusService');
        await StatusService.deleteStatus(post.id);
      } else if (isCommunityPostType && community?.id && community.id !== 'unknown') {
        await CommunityPostService.deletePost(community.id, post.id, address);
      } else {
        // Fallback to generic delete for other posts
        const { PostService } = await import('@/services/postService');
        await PostService.deletePost(post.id);
      }

      addToast('Post deleted successfully', 'success');
      // Reload page to reflect changes
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error deleting post:', error);
      // improved error message
      const msg = error?.message || 'Failed to delete post';
      addToast(msg, 'error');
    }
  };

  // Edit functionality
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || '');
  const [editContent, setEditContent] = useState(post.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // Reset form when opening
      setEditTitle(post.title || '');
      setEditContent(post.content || '');
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      addToast('Content cannot be empty', 'error');
      return;
    }

    try {
      setIsSaving(true);

      if (isCommunityPostType && community?.id && community.id !== 'unknown') {
        await CommunityPostService.updatePost(community.id, post.id, {
          title: editTitle,
          content: editContent
        });

        post.title = editTitle;
        post.content = editContent;

        setIsEditing(false);
        addToast('Post updated successfully', 'success');
      } else {
        // Fallback for non-community posts if needed (or just show error)
        addToast('Editing only supported for community posts currently', 'info');
      }
    } catch (error: any) {
      console.error('Error updating post:', error);
      addToast(error?.message || 'Failed to update post', 'error');
    } finally {
      setIsSaving(false);
    }
  };


  const isAuthor = address && (
    (post.author && post.author.toLowerCase() === address.toLowerCase()) ||
    (post.walletAddress && post.walletAddress.toLowerCase() === address.toLowerCase())
  );

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
            disabled={!isConnected}
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
            disabled={!isConnected}
            className="mt-2"
          />
        </div>

        {/* Post Content */}
        <div className="flex-1 p-4">
          {/* Post Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              {/* Community Name */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const communitySlug = encodeURIComponent(community.slug ?? community.id ?? community.name ?? 'unknown');
                  setTimeout(() => router.push(`/communities/${communitySlug}`), 0);
                }}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {community.displayName || community.name || 'Unknown Community'}
              </button>
              <span>•</span>
              {/* Author */}
              <Link
                href={`/u/${post.author || post.walletAddress || ''}`}
                className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                u/{post.author || post.walletAddress ?
                  `${(post.author || post.walletAddress)?.slice(0, 6)}...${(post.author || post.walletAddress)?.slice(-4)}` :
                  'Unknown'
                }
              </Link>
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
              {/* Actions for Author */}
              {isAuthor && (
                <>
                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEditToggle();
                    }}
                    className={`p-1 transition-colors ${isEditing ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                    title="Edit Post"
                    aria-label="Edit Post"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Post"
                    aria-label="Delete Post"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}

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
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Post Title"
                  className="w-full px-3 py-2 text-lg font-semibold border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <RichTextEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Post Content"
                  className="w-full min-h-[200px] border rounded-lg dark:border-gray-600 bg-white dark:bg-gray-700"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleEditToggle}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Post Title */}
                {(post.title && post.title.trim() !== '') && (
                  onOpenPost ? (
                    <h3
                      className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        const communitySlug = encodeURIComponent(community.slug ?? community.id ?? community.name ?? 'unknown');
                        onOpenPost(post, communitySlug);
                      }}
                    >
                      {post.title}
                    </h3>
                  ) : (
                    <Link
                      href={`/communities/${encodeURIComponent(community.slug ?? community.id ?? community.name ?? 'unknown')}/posts/${post.shareId || post.id}`}
                      className="block mb-2 group"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">
                        {post.title}
                      </h3>
                    </Link>
                  )
                )}
                <RichContentPreview
                  content={post.content}
                  contentType="html"
                  maxLength={500}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setIsExpanded(!isExpanded)}
                  className="mb-4"
                />
              </>
            )}

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
                  {/* Trending Badge */}
                  {post.trendingStatus === 'trending' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium">
                      <span>🔥</span>
                      <span>Trending</span>
                    </div>
                  )}
                  {/* Hot Badge */}
                  {post.trendingStatus === 'hot' && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                      <span>🚀</span>
                      <span>Hot</span>
                    </div>
                  )}
                  <span className="text-gray-500 dark:text-gray-400">&bull;</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
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
                  <Link
                    key={tag}
                    href={`/communities/${encodeURIComponent(community.slug ?? community.id)}?tag=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium rounded-full transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Enhanced Post Interactions */}
            {userMembership && (
              <div className="mt-4">
                {/* View Counter for Members */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <div className="flex items-center space-x-1" aria-label="View count">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{(post.views || post.viewCount || 0).toLocaleString()} views</span>
                  </div>
                </div>

                <PostInteractionBar
                  post={{
                    id: post.id,
                    contentCid: post.contentCid,
                    content: post.content, // add actual content
                    shareId: post.shareId, // add shareId
                    author: post.author,
                    communityId: community.id,
                    commentCount: comments.length,
                    authorProfile: post.authorProfile // add author profile
                  }}
                  postType="community"
                  userMembership={userMembership}
                  onComment={toggleComments}
                  onReaction={onReaction}
                  onTip={onTip}
                  onShare={async (postId, shareType, message) => {
                    console.log('Sharing community post:', postId, shareType, message);
                    addToast(`Post shared via ${shareType}!`, 'success');
                  }}
                />
              </div>
            )}


          </div>

          {/* Analytics Toggle for Non-Members */}
          {!userMembership && (
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center space-x-4">
                {/* View Counter */}
                <div className="flex items-center space-x-1" aria-label="View count">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{(post.views || post.viewCount || 0).toLocaleString()}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleComments();
                  }}
                  className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                  aria-label="Toggle comments"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>
                    {comments.length === 0
                      ? 'Add a comment'
                      : `${comments.length} comment${comments.length === 1 ? '' : 's'}`
                    }
                  </span>
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
            </div>
          )}

          {/* Comment prompt when no comments and section is collapsed */}
          {!showComments && (
            <div className="mt-4 text-center py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {comments.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No comments yet.
                  <button
                    onClick={toggleComments}
                    className="ml-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                  >
                    Be the first to comment!
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleComments}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  View {comments.length} comment{comments.length === 1 ? '' : 's'}
                </button>
              )}
            </div>
          )}



          {/* Comments Section */}
          {showComments && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              {/* Comment Form (only for community posts) */}
              {isCommunityPostType && (
                <>
                  {(userMembership || community.isPublic) ? (
                    !communityPost?.isLocked ? (
                      <form onSubmit={handleCommentSubmit} className="mb-4">
                        <div className="flex space-x-3">
                          <div className="bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs">
                              {address ? address.slice(2, 4).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div className="flex-1">
                            {/* Image Preview */}
                            {commentImages.length > 0 && (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {commentImages.map((imageUrl, index) => (
                                  <div key={index} className="relative inline-block">
                                    <img
                                      src={imageUrl}
                                      alt={`Uploaded image ${index + 1}`}
                                      className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveImage(index)}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                      aria-label="Remove image"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comment Input */}
                            <div className="relative">
                              <textarea
                                ref={commentTextareaRef}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                                rows={3}
                                disabled={commentSubmitting}
                                aria-label="Write a comment"
                              />

                              {/* Emoji and Image Buttons */}
                              <div className="absolute right-2 bottom-2 flex space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                  disabled={commentSubmitting}
                                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                  title="Add emoji"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                <label className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer disabled:opacity-50">
                                  <input
                                    type="file"
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                    disabled={commentSubmitting || uploadingImage}
                                  />
                                  {uploadingImage ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  )}
                                </label>
                              </div>

                              {/* Emoji Picker */}
                              {showEmojiPicker && (
                                <div className="absolute bottom-full right-0 mb-2 z-10">
                                  <EmojiPicker
                                    onEmojiSelect={handleEmojiSelect}
                                    onClose={() => setShowEmojiPicker(false)}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end mt-2">
                              <button
                                type="submit"
                                disabled={!newComment.trim() && commentImages.length === 0 || commentSubmitting}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                aria-label={commentSubmitting ? "Posting comment..." : "Post comment"}
                              >
                                {commentSubmitting ? 'Posting...' : 'Comment'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-center text-yellow-700 dark:text-yellow-400">
                        <span className="mr-2">🔒</span>
                        <span>Comments are locked for this post.</span>
                      </div>
                    )
                  ) : (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center border border-gray-200 dark:border-gray-600">
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        This is a private community. You must be a member of <span className="font-semibold">{community.displayName || community.name}</span> to comment.
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          // Redirect to community page to join
                          const communitySlug = encodeURIComponent(community.slug ?? community.id ?? community.name ?? 'unknown');
                          router.push(`/communities/${communitySlug}`);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
                      >
                        Join Community
                      </button>
                    </div>
                  )}
                </>
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

// Memoize the component for better list rendering performance
// Ignores callback props that may change reference but don't affect rendering
const postCardComparator = createPropsComparatorIgnoring<CommunityPostCardEnhancedProps>(
  ['onVote', 'onReaction', 'onTip']
);

export default memo(CommunityPostCardEnhanced, postCardComparator);