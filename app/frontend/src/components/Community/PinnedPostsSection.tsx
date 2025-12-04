import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin } from 'lucide-react';
import { postManagementService, PinnedPost } from '@/services/postManagementService';
import CommunityPostCardEnhanced from './CommunityPostCardEnhanced';
import { EnhancedPost } from '@/types/feed';
import { Community } from '@/models/Community';
import { CommunityMembership } from '@/models/CommunityMembership';

interface PinnedPostsSectionProps {
    communityId: string;
    community: Community;
    userMembership: CommunityMembership | null;
    onVote: (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => void;
    onReaction?: (postId: string, reactionType: string, amount?: number) => Promise<void>;
    onTip?: (postId: string, amount: string, token: string) => Promise<void>;
}

export default function PinnedPostsSection({
    communityId,
    community,
    userMembership,
    onVote,
    onReaction,
    onTip
}: PinnedPostsSectionProps) {
    const [pinnedPosts, setPinnedPosts] = useState<EnhancedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const fetchPinnedPosts = async () => {
            if (!communityId) return;

            try {
                setLoading(true);
                const response = await postManagementService.getPinnedPosts(communityId);

                if (response.success && Array.isArray(response.data)) {
                    // Map PinnedPost to EnhancedPost
                    // Note: This is a simplified mapping. In a real app, you might need to fetch full post details
                    const mappedPosts: EnhancedPost[] = response.data.map((post: any) => ({
                        id: post.id.toString(),
                        author: post.author?.username || post.author?.address || 'Unknown',
                        authorId: post.authorId,
                        authorProfile: {
                            handle: post.author?.handle || 'user',
                            verified: post.author?.verified || false,
                            avatar: post.author?.avatar,
                            reputationTier: 'Member'
                        },
                        content: post.content || '',
                        contentCid: post.contentCid || '',
                        title: post.title,
                        createdAt: new Date(post.createdAt),
                        updatedAt: new Date(post.updatedAt || post.createdAt),
                        mediaCids: post.mediaCids || [],
                        tags: post.tags || [],
                        onchainRef: post.onchainRef || '',
                        stakedValue: post.stakedValue || 0,
                        reputationScore: post.reputationScore || 0,

                        // Engagement
                        reactions: [],
                        tips: [],
                        comments: post.commentCount || 0,
                        shares: 0,
                        views: post.viewCount || 0,
                        engagementScore: 0,

                        // Voting
                        upvotes: post.upvotes || 0,
                        downvotes: post.downvotes || 0,

                        // Enhanced features
                        previews: [],
                        hashtags: [],
                        mentions: [],

                        // Pin specific
                        isPinned: true,
                        pinnedAt: post.pinnedAt,
                        pinnedBy: post.pinnedBy,

                        // Required fields
                        parentId: null,
                        communityId: communityId
                    }));

                    setPinnedPosts(mappedPosts);
                }
            } catch (error) {
                console.error('Error fetching pinned posts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPinnedPosts();
    }, [communityId]);

    if (loading) {
        return null; // Don't show anything while loading to avoid layout shift if empty
    }

    if (pinnedPosts.length === 0) {
        return null;
    }

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Pin className="w-4 h-4 text-green-500 transform rotate-45" />
                    <span>Pinned Posts</span>
                </div>
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                    {isCollapsed ? 'Show' : 'Hide'}
                </button>
            </div>

            <AnimatePresence>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                    >
                        {pinnedPosts.map(post => (
                            <CommunityPostCardEnhanced
                                key={post.id}
                                post={post}
                                community={community}
                                userMembership={userMembership}
                                onVote={onVote}
                                onReaction={onReaction}
                                onTip={onTip}
                                className="border-green-100 dark:border-green-900/30 shadow-md"
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
