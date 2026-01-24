import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import { CommunityMembership } from '@/models/CommunityMembership';
import CommunityPostCardEnhanced from './CommunityPostCardEnhanced';
import EnhancedCommentSystem from '../EnhancedCommentSystem';
import { ArrowLeft, Share2, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

interface PostDetailProps {
  post: EnhancedPost;
  community: Community;
  userMembership: CommunityMembership | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  isStandalone?: boolean;
  className?: string;
}

export default function PostDetail({
  post,
  community,
  userMembership,
  onVote,
  onReaction,
  onTip,
  isStandalone = false,
  className = ''
}: PostDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [commentCount, setCommentCount] = useState(
    typeof post.comments === 'number' ? post.comments : (Array.isArray(post.comments) ? post.comments.length : 0)
  );

  const handleCopyShareLink = () => {
    const shareId = post.shareId || post.id;
    const url = `${window.location.origin}/cp/${shareId}`;
    navigator.clipboard.writeText(url);
    addToast('Share link copied to clipboard!', 'success');
  };

  const communitySlug = community.slug || community.id || 'community';
  const shareId = post.shareId || post.id;
  const canonicalUrl = `/communities/${encodeURIComponent(communitySlug)}/posts/${shareId}`;

  return (
    <div className={`space-y-6 ${className}`}>
      {isStandalone && (
        <>
          {/* Header with navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <Link
                href={`/communities/${encodeURIComponent(communitySlug)}`}
                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
              >
                <Users className="w-4 h-4" />
                <span>{community.displayName || community.name}</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Community context banner */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4 border border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                    {community.displayName || community.name}
                  </h3>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    Post by u/{post.authorProfile?.handle || (typeof post.author === 'string' ? `${post.author.slice(0, 6)}...${post.author.slice(-4)}` : 'Anonymous')}
                  </p>
                </div>
              </div>
              <Link
                href={`/communities/${encodeURIComponent(communitySlug)}`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200 font-medium"
              >
                View Community →
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Main Post Card */}
      <CommunityPostCardEnhanced
        post={{
          ...post,
          commentCount: commentCount // Sync count
        }}
        community={community}
        userMembership={userMembership}
        onVote={onVote}
        onReaction={onReaction}
        onTip={onTip}
        className="shadow-lg border-gray-200 dark:border-gray-700"
      />

      {/* Unified Comments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Comments
            <span className="text-sm font-normal text-gray-500">({commentCount})</span>
          </h2>
        </div>
        <div className="p-6 pt-0">
          <EnhancedCommentSystem
            postId={post.id}
            postType="community"
            communityId={community.id}
            userMembership={userMembership}
            onCommentCountChange={setCommentCount}
            className="mt-4"
          />
        </div>
      </div>
    </div>
  );
}
