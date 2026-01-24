import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { CommunityPost } from '@/models/CommunityPost';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import { CommunityMembership } from '@/models/CommunityMembership';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import CommunityTipButton from '../CommunityTipButton';
import CommunityNFTEmbed from '../CommunityNFTEmbed';
import CommunityDeFiEmbed from '../CommunityDeFiEmbed';
import WalletSnapshotEmbed from '../WalletSnapshotEmbed';
import CommunityGovernance from '../CommunityGovernance';
import PostInteractionBar from '../PostInteractionBar';
import OptimizedImage from '../OptimizedImage';
import { motion } from 'framer-motion';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { createPropsComparatorIgnoring } from '@/utils/performanceUtils';
import RichContentPreview from './RichContentPreview';
import RichTextEditor from '@/components/EnhancedPostComposer/RichTextEditor';

// Helper function to check if post is a community post
const isCommunityPost = (post: EnhancedPost): boolean => {
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
  post: EnhancedPost;
  community: Community;
  userMembership: CommunityMembership | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onComment?: (postId: string) => void;
  onOpenPost?: (post: EnhancedPost, communitySlug: string) => void;
  className?: string;
  isLoading?: boolean;
  isStandalone?: boolean;
}

function CommunityPostCardEnhanced({
  post,
  community,
  userMembership,
  onVote,
  onReaction,
  onTip,
  onComment,
  onOpenPost,
  className = '',
  isLoading = false,
  isStandalone = false
}: CommunityPostCardEnhancedProps) {
  const router = useRouter();
  const { address, isConnected, hasWallet } = useWeb3();
  const { addToast } = useToast();

  const isCommunityPostType = isCommunityPost(post);
  const communityPost = isCommunityPostType ? post as any : null;

  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const voteScore = isCommunityPostType && typeof post.upvotes === 'number' && typeof post.downvotes === 'number' 
    ? (post.upvotes - post.downvotes) : 0;

  const [upvoteCount, setUpvoteCount] = useState(post.upvotes || 0);
  const [downvoteCount, setDownvoteCount] = useState(post.downvotes || 0);

  useEffect(() => {
    setUpvoteCount(post.upvotes || 0);
    setDownvoteCount(post.downvotes || 0);
  }, [post.upvotes, post.downvotes]);

  const handleVote = useCallback((postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
    if (!isConnected || !address) {
      addToast('Please connect your wallet to vote', 'error');
      return;
    }

    if (!userMembership) {
      addToast('You must join the community to vote', 'error');
      return;
    }

    const isRemoving = userVote === voteType;
    const finalVoteType = isRemoving ? 'remove' : voteType;

    if (isRemoving) {
      if (voteType === 'upvote') setUpvoteCount(prev => Math.max(0, prev - 1));
      else setDownvoteCount(prev => Math.max(0, prev - 1));
    } else {
      if (userVote === 'upvote') {
        setUpvoteCount(prev => Math.max(0, prev - 1));
        setDownvoteCount(prev => prev + 1);
      } else if (userVote === 'downvote') {
        setDownvoteCount(prev => Math.max(0, prev - 1));
        setUpvoteCount(prev => prev + 1);
      } else {
        if (voteType === 'upvote') setUpvoteCount(prev => prev + 1);
        else setDownvoteCount(prev => prev + 1);
      }
    }

    setUserVote(finalVoteType === 'remove' ? null : voteType);
    onVote(postId, finalVoteType as 'upvote' | 'downvote', stakeAmount);
  }, [isConnected, address, userMembership, userVote, onVote, addToast]);

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

  const communitySlug = community.slug || community.id || 'unknown';

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
    >
      <div className="flex flex-col">
        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <button
                onClick={() => router.push(`/communities/${encodeURIComponent(communitySlug)}`)}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {community.displayName || community.name}
              </button>
              <span>•</span>
              <Link
                href={`/u/${post.author || post.walletAddress || ''}`}
                className="font-medium text-gray-900 dark:text-white hover:text-primary-600 transition-colors"
              >
                u/{post.authorProfile?.handle || (post.author || post.walletAddress)?.slice(0, 6)}
              </Link>
              <span>•</span>
              <span>{formatTimestamp(post.createdAt)}</span>
              {communityPost?.flair && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                  {communityPost.flair}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="mb-4">
            {post.title && post.title.trim() !== '' && (
              <h3 
                className="text-lg font-semibold text-gray-900 dark:text-white mb-2 leading-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                onClick={() => onOpenPost ? onOpenPost(post, communitySlug) : router.push(`/communities/${encodeURIComponent(communitySlug)}/posts/${post.shareId || post.id}`)}
              >
                {post.title}
              </h3>
            )}
            <RichContentPreview
              content={post.content}
              contentType="html"
              maxLines={isStandalone ? undefined : 6}
              isExpanded={isStandalone || isExpanded}
              onToggleExpand={() => !isStandalone && setIsExpanded(!isExpanded)}
              className="mb-4"
            />
            
            {/* Media */}
            {post.mediaCids && post.mediaCids.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {post.mediaCids.map((mediaUrl, index) => (
                  <OptimizedImage
                    key={index}
                    src={mediaUrl}
                    alt={`Post media ${index + 1}`}
                    className="rounded-lg max-h-96 object-cover w-full cursor-pointer"
                    onClick={() => window.open(mediaUrl, '_blank')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Interactions */}
          <div className="mt-4">
            <PostInteractionBar
              post={{
                ...post,
                communityId: community.id,
                communityName: community.displayName || community.name,
                upvotes: upvoteCount,
                downvotes: downvoteCount,
                commentCount: post.comments
              }}
              postType="community"
              userMembership={userMembership}
              userVote={userVote}
              onComment={() => onComment ? onComment(post.id) : (onOpenPost ? onOpenPost(post, communitySlug) : router.push(`/communities/${encodeURIComponent(communitySlug)}/posts/${post.shareId || post.id}`))}
              onReaction={onReaction}
              onTip={onTip}
              onUpvote={async () => handleVote(post.id, 'upvote')}
              onDownvote={async () => handleVote(post.id, 'downvote')}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const postCardComparator = createPropsComparatorIgnoring<CommunityPostCardEnhancedProps>(
  ['onVote', 'onReaction', 'onTip', 'onComment', 'onOpenPost']
);

export default memo(CommunityPostCardEnhanced, postCardComparator);