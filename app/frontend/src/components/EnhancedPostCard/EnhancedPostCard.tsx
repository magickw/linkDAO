import React, { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import InlinePreviewRenderer from '../InlinePreviews/InlinePreviewRenderer';
import { ContentPreview } from '../../types/contentPreview';
import SocialProofIndicator, { SocialProofData } from '../SocialProof/SocialProofIndicator';
import TrendingBadge, { TrendingLevel, calculateTrendingLevel } from '../TrendingBadge/TrendingBadge';
import OptimizedImage from '../OptimizedImage';
import PostInteractionBar from '../PostInteractionBar';
import GestureHandler from '../GestureHandler';
import { EnhancedPostCardGlass, RippleEffect, VisualPolishClasses } from '../VisualPolish';

export interface EnhancedPost {
  id: string;
  title: string;
  content: string;
  author: string;
  authorProfile: {
    handle: string;
    verified: boolean;
    reputationTier?: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Enhanced content
  contentType?: 'text' | 'media' | 'link' | 'poll' | 'proposal';
  media?: string[];
  previews: ContentPreview[];
  hashtags: string[];
  mentions: string[];
  
  // Engagement data
  reactions: TokenReaction[];
  tips: TipActivity[];
  comments: number;
  shares: number;
  views: number;
  engagementScore: number;
  
  // Social proof
  socialProof: SocialProofData;
  trendingStatus?: TrendingLevel;
  pinnedUntil?: Date;
  
  // Community context
  communityId?: string;
  communityName?: string;
  tags?: string[];
}

interface TokenReaction {
  type: 'hot' | 'diamond' | 'bullish' | 'governance' | 'art';
  emoji: string;
  label: string;
  totalStaked: number;
  userStaked: number;
  contributors: string[];
  rewardsEarned: number;
}

interface TipActivity {
  amount: number;
  token: string;
  from: string;
  timestamp: Date;
}

interface EnhancedPostCardProps {
  post: EnhancedPost;
  className?: string;
  showPreviews?: boolean;
  showSocialProof?: boolean;
  showTrending?: boolean;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onExpand?: () => void;
}

export default function EnhancedPostCard({
  post,
  className = '',
  showPreviews = true,
  showSocialProof = true,
  showTrending = true,
  onReaction,
  onTip,
  onExpand
}: EnhancedPostCardProps) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showAllPreviews, setShowAllPreviews] = useState(false);

  // Calculate trending level if not provided
  const trendingLevel = post.trendingStatus || calculateTrendingLevel(
    post.engagementScore,
    post.createdAt,
    post.reactions.reduce((sum, r) => sum + r.totalStaked, 0),
    post.comments,
    post.shares
  );

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  // Get visual hierarchy styles based on content importance
  const getContentHierarchy = () => {
    const isPinned = post.pinnedUntil && new Date(post.pinnedUntil) > new Date();
    const isTrending = trendingLevel !== null;
    const hasHighEngagement = post.engagementScore > 1000;

    if (isPinned) {
      return 'ring-2 ring-yellow-400 dark:ring-yellow-500 shadow-lg shadow-yellow-400/20';
    } else if (isTrending) {
      return 'ring-1 ring-primary-400 dark:ring-primary-500 shadow-lg shadow-primary-400/10';
    } else if (hasHighEngagement) {
      return 'shadow-lg hover:shadow-xl';
    }
    return 'shadow-md hover:shadow-lg';
  };

  // Get category styling based on content type
  const getCategoryStyle = () => {
    switch (post.contentType) {
      case 'media':
        return 'border-l-4 border-l-purple-500';
      case 'link':
        return 'border-l-4 border-l-blue-500';
      case 'poll':
        return 'border-l-4 border-l-green-500';
      case 'proposal':
        return 'border-l-4 border-l-indigo-500';
      default:
        return 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
    }
  };

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 280) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Handle double tap for quick reaction
  const handleDoubleTap = async () => {
    if (onReaction) {
      await onReaction(post.id, 'hot', 1);
    }
  };

  return (
    <RippleEffect className="rounded-2xl">
      <EnhancedPostCardGlass
        trending={trendingLevel !== null}
        pinned={post.pinnedUntil && new Date(post.pinnedUntil) > new Date()}
        onClick={onExpand}
        className={`${getCategoryStyle()} ${className}`}
      >
      {/* Header with improved visual hierarchy */}
      <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Author Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary-400 to-secondary-500 border-2 border-white dark:border-gray-800 shadow-md">
                {post.authorProfile.avatar ? (
                  <img
                    src={post.authorProfile.avatar}
                    alt={post.authorProfile.handle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {post.authorProfile.handle.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Reputation indicator */}
              {post.authorProfile.reputationTier && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-white dark:border-gray-800 flex items-center justify-center shadow-sm">
                  <span className="text-xs">🏆</span>
                </div>
              )}
            </div>

            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Link 
                  href={`/profile/${post.author}`}
                  className="font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 truncate"
                >
                  {post.authorProfile.handle}
                </Link>
                
                {post.authorProfile.verified && (
                  <span className="text-blue-500 flex-shrink-0" title="Verified">
                    ✓
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatTimestamp(post.createdAt)}</span>
                
                {post.communityName && (
                  <>
                    <span>•</span>
                    <Link 
                      href={`/community/${post.communityId}`}
                      className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 truncate"
                    >
                      {post.communityName}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trending Badge */}
          {showTrending && trendingLevel && (
            <div className="flex-shrink-0 ml-3">
              <TrendingBadge 
                level={trendingLevel} 
                score={post.engagementScore}
                showScore
              />
            </div>
          )}
        </div>
      </div>

      {/* Content with emphasized hierarchy */}
      <div className="px-6 py-4">
        {/* Title - emphasized */}
        {post.title && (
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
            {post.title}
          </h2>
        )}

        {/* Content - main focus */}
        <div className="mb-4">
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
            {expanded ? post.content : truncateContent(post.content)}
          </p>
          
          {!expanded && post.content.length > 280 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium mt-2 transition-colors duration-200"
            >
              Read more
            </button>
          )}
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className="mb-4 rounded-xl overflow-hidden">
            <OptimizedImage
              src={post.media[0]}
              alt="Post media"
              width={600}
              height={300}
              className="w-full h-64 object-cover transition-transform duration-500 hover:scale-105"
              lazy={true}
              quality={0.85}
            />
          </div>
        )}

        {/* Inline Previews */}
        {showPreviews && post.previews.length > 0 && (
          <div className="mb-4">
            <InlinePreviewRenderer
              enhancedPreviews={post.previews}
              maxPreviews={showAllPreviews ? undefined : 2}
              showAll={showAllPreviews}
            />
            
            {post.previews.length > 2 && !showAllPreviews && (
              <button
                onClick={() => setShowAllPreviews(true)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline mt-2"
              >
                Show {post.previews.length - 2} more preview{post.previews.length - 2 > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Hashtags - de-emphasized */}
        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.hashtags.map((tag, index) => (
              <Link
                key={index}
                href={`/hashtag/${tag}`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors duration-200"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Social Proof */}
        {showSocialProof && post.socialProof && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <SocialProofIndicator socialProof={post.socialProof} />
          </div>
        )}

        {/* Enhanced Interactions */}
        <PostInteractionBar
          post={{
            id: post.id,
            title: post.title,
            contentCid: post.content,
            author: post.author,
            dao: post.communityName || 'general',
            commentCount: post.comments,
            stakedValue: post.reactions.reduce((sum, r) => sum + r.totalStaked, 0)
          }}
          postType="enhanced"
          onComment={() => setExpanded(true)}
          onReaction={onReaction}
          onTip={onTip}
          onShare={async (postId, shareType, message) => {
            console.log('Sharing post:', postId, shareType, message);
            addToast(`Post shared via ${shareType}!`, 'success');
          }}
        />
      </div>
      </EnhancedPostCardGlass>
    </RippleEffect>
  );
}