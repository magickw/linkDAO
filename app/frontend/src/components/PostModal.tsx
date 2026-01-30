import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import PostDetail from './Community/PostDetail';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';
import { EnhancedPost } from '@/types/feed';

interface PostModalProps {
  post: any;
  isOpen: boolean;
  onClose: () => void;
  onVote?: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
  onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
}

export default function PostModal({
  post,
  isOpen,
  onClose,
  onVote,
  onReaction,
  onTip
}: PostModalProps) {
  const { address } = useWeb3();
  const { addToast } = useToast();

  const [community, setCommunity] = useState<Community | null>(null);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // Fetch community data if post belongs to one
  useEffect(() => {
    const fetchCommunityData = async () => {
      if (isOpen && post?.communityId) {
        try {
          setLoadingCommunity(true);
          const communityData = await CommunityService.getCommunityById(post.communityId);
          setCommunity(communityData);

          if (communityData && address) {
            const isCreator = communityData.creatorAddress?.toLowerCase() === address.toLowerCase();
            const isMod = communityData.moderators?.some((m: string) => m.toLowerCase() === address.toLowerCase());
            
            if (isCreator || isMod || communityData.isMember) {
                setUserMembership({
                    id: `mem-${address}`,
                    role: isCreator ? 'admin' : (isMod ? 'moderator' : 'member'),
                    userId: address,
                    communityId: communityData.id
                });
            }
          }
        } catch (error) {
          console.error('Error fetching community for modal:', error);
        } finally {
          setLoadingCommunity(false);
        }
      }
    };

    fetchCommunityData();
  }, [isOpen, post?.communityId, address]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  // Transform post to EnhancedPost if needed
  const enhancedPost: EnhancedPost = {
    ...post,
    author: post.author || post.walletAddress || '',
    authorProfile: post.authorProfile || {
      handle: post.handle || 'anonymous',
      displayName: post.authorName,
      verified: false,
    },
    createdAt: post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt),
    updatedAt: post.updatedAt instanceof Date ? post.updatedAt : new Date(post.updatedAt || post.createdAt),
    comments: typeof post.commentsCount === 'number' ? post.commentsCount : (Array.isArray(post.comments) ? post.comments.length : 0),
    previews: post.previews || [],
    hashtags: post.hashtags || [],
    mentions: post.mentions || []
  };

  // Mock community if not found but communityId exists
  const effectiveCommunity: Community = community || {
    id: post.communityId || 'unknown',
    name: post.communityName || 'Unknown Community',
    displayName: post.communityName || 'Unknown Community',
    slug: 'unknown',
    description: '',
    rules: [],
    memberCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true,
    moderators: [],
    tags: [],
    category: 'General',
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Post Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <PostDetail
            post={enhancedPost}
            community={effectiveCommunity}
            userMembership={userMembership}
            onVote={onVote || (() => {})}
            onReaction={onReaction}
            onTip={onTip}
            isStandalone={false}
          />
        </div>
      </div>
    </div>
  );
}

