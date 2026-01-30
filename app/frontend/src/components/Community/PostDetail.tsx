import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import { CommunityMembership } from '@/models/CommunityMembership';
import CommunityPostCardEnhanced from './CommunityPostCardEnhanced';
import CommunityAvatar from './CommunityAvatar';
import {
  ArrowLeft,
  Share2,
  Users,
  Calendar,
  Shield
} from 'lucide-react';

import EnhancedCommentSystem from '../EnhancedCommentSystem';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import SharePostModal from '../SharePostModal';

interface PostDetailProps {
  post: EnhancedPost;
  community: Community;
  userMembership: CommunityMembership | null;
  onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => Promise<void>;
  onReaction: (postId: string, type: string, amount?: number) => Promise<void>;
  onTip: (postId: string, amount: string, token: string) => Promise<void>;
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentCount, setCommentCount] = useState(
    typeof post.commentCount === 'number' ? post.commentCount : (Array.isArray(post.comments) ? post.comments.length : 0)
  );

  const handleCopyShareLink = () => {
    setShowShareModal(true);
  };

  const communitySlug = community.slug || community.id || 'community';
  const shareId = post.shareId || post.id;

  if (!isStandalone) {
    return (
      <div className={`space-y-4 ${className}`}>
        <CommunityPostCardEnhanced
          post={{
            ...post,
            commentCount: commentCount
          }}
          community={community}
          userMembership={userMembership}
          onVote={onVote}
          onReaction={onReaction}
          onTip={onTip}
          isStandalone={isStandalone}
          className="shadow-sm border-gray-200 dark:border-gray-700"
        />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4">
            <EnhancedCommentSystem
              postId={post.id}
              postType="community"
              communityId={community.id}
              userMembership={userMembership}
              onCommentCountChange={setCommentCount}
            />
          </div>
        </div>
      </div>
    );
  }

  // Standalone Reddit-style layout
  return (
    <>
      <div className={`relative grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-6 w-full px-4 sm:px-6 lg:px-8 ${className}`}>
        {/* Left Navigation Sidebar - Hidden on mobile */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={() => router.back()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Go Back</span>
              </button>
              <Link
                href={`/communities/${encodeURIComponent(communitySlug)}`}
                className="w-full flex items-center gap-3 px-3 py-2 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>{community.displayName || community.name}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Column */}
        <div className="col-span-1 lg:col-span-6 space-y-4">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 -mt-8 mb-4">
            <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <CommunityAvatar avatar={community.avatar} name={community.name} size="sm" />
              <span className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                {community.displayName || community.name}
              </span>
            </div>
            <button onClick={handleCopyShareLink} className="text-gray-600 dark:text-gray-400">
              <Share2 className="w-6 h-6" />
            </button>
          </div>

          {/* Post Card - Exactly the same as feed but prominent */}
          <CommunityPostCardEnhanced
            post={{
              ...post,
              commentCount: commentCount
            }}
            community={community}
            userMembership={userMembership}
            onVote={onVote}
            onReaction={onReaction}
            onTip={onTip}
            isStandalone={isStandalone}
            className="shadow-md"
          />

          {/* Comments Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4">
              <EnhancedCommentSystem
                postId={post.id}
                postType="community"
                communityId={community.id}
                userMembership={userMembership}
                onCommentCountChange={setCommentCount}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Community Info */}
        <div className="col-span-1 lg:col-span-3 space-y-4">
          <div className="sticky top-24 space-y-4">
            {/* About Community */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-primary-600 h-12"></div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3 -mt-6 mb-3">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-1 ring-4 ring-white dark:ring-gray-800">
                    <CommunityAvatar avatar={community.avatar} name={community.name} size="lg" />
                  </div>
                  <div className="mt-6">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {community.displayName || community.name}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-4">
                  {community.description || 'No description available'}
                </p>

                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Members
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {community.memberCount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/communities/${encodeURIComponent(communitySlug)}`}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors"
                >
                  Go to Community
                </Link>
              </div>
            </div>

            {/* Community Rules */}
            {community.rules && community.rules.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  Community Rules
                </h3>
                <div className="space-y-3">
                  {community.rules.slice(0, 5).map((rule, index) => (
                    <div key={index} className="text-xs text-gray-600 dark:text-gray-400 border-b border-gray-50 dark:border-gray-700/50 pb-2 last:border-0 last:pb-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-0.5">
                        {index + 1}. {typeof rule === 'string' ? `Rule ${index + 1}` : (rule.title || `Rule ${index + 1}`)}
                      </p>
                      <p className="line-clamp-2 opacity-80">
                        {typeof rule === 'string' ? rule : rule.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <SharePostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={{
          ...post,
          communityId: community.id,
          communityName: community.displayName || community.name
        }}
        postType="community"
      />
    </>
  );
}
