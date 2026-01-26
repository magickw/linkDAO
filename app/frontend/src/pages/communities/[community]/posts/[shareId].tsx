/**
 * Canonical Community Post Page
 * Handles /communities/:community/posts/:shareId URLs
 * This is the canonical URL for community posts, scoped to the community
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import PostDetail from '@/components/Community/PostDetail';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { useWeb3 } from '@/context/Web3Context';
import { CommunityService } from '@/services/communityService';
import { Community } from '@/models/Community';
import { EnhancedPost } from '@/types/feed';

export default function CommunityPostPage() {
    const router = useRouter();
    const { community: communitySlug, shareId } = router.query;
    const { addToast } = useToast();
    const { address, isConnected } = useWeb3();

    const [post, setPost] = useState<EnhancedPost | null>(null);
    const [community, setCommunity] = useState<Community | null>(null);
    const [userMembership, setUserMembership] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shareId || typeof shareId !== 'string') return;

        const fetchPostAndCommunity = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Detect if using UUID or Share ID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareId);
                const endpoint = isUuid
                    ? `${process.env.NEXT_PUBLIC_API_URL}/api/posts/${shareId}`
                    : `${process.env.NEXT_PUBLIC_API_URL}/api/cp/${shareId}`;

                // Fetch post
                const response = await fetch(endpoint);

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Community post not found');
                    } else {
                        setError('Failed to load post');
                    }
                    return;
                }

                const data = await response.json();

                if (data.success && data.data) {
                    // Normalize data structure based on endpoint
                    const rawPost = isUuid ? data.data : data.data.post;

                    // Verify the community slug matches the post's community
                    if (rawPost.communitySlug && communitySlug && rawPost.communitySlug !== communitySlug) {
                        router.replace(`/communities/${encodeURIComponent(rawPost.communitySlug)}/posts/${shareId}`);
                        return;
                    }

                    // Convert to EnhancedPost type
                    const enhancedPost: EnhancedPost = {
                        ...rawPost,
                        author: rawPost.authorId || rawPost.authorAddress || rawPost.author || '',
                        authorProfile: {
                            handle: rawPost.authorHandle || 'anonymous',
                            displayName: rawPost.authorName,
                            verified: false,
                            avatarCid: rawPost.authorAvatar
                        },
                        createdAt: new Date(rawPost.createdAt),
                        updatedAt: new Date(rawPost.updatedAt || rawPost.createdAt),
                        comments: typeof rawPost.commentCount === 'number' ? rawPost.commentCount : 0,
                        previews: [],
                        hashtags: [],
                        mentions: []
                    };

                    setPost(enhancedPost);

                    // Fetch Community data
                    if (rawPost.communityId) {
                        const communityData = await CommunityService.getCommunityById(rawPost.communityId);
                        setCommunity(communityData);

                        // If user is connected, check membership
                        if (address) {
                            // This is a simplified check, in a real app use a proper membership service
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
                    }
                } else {
                    setError('Community post not found');
                }
            } catch (err) {
                console.error('Error fetching community post:', err);
                setError(err instanceof Error ? err.message : 'Failed to load post');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPostAndCommunity();
    }, [shareId, communitySlug, address]);

    const handleVote = (postId: string, voteType: 'upvote' | 'downvote', stakeAmount?: string) => {
        // Implement voting logic or call a service
        console.log('Vote:', postId, voteType, stakeAmount);
    };

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!post || !community) return null;

        const title = post.title
            ? `${post.title} | ${community.displayName || community.name} | LinkDAO`
            : `Post in ${community.displayName || community.name} | LinkDAO`;
        const description = post.content?.substring(0, 200) || `Check out this post in ${community.displayName || community.name} on LinkDAO`;
        const url = `${window.location.origin}/communities/${encodeURIComponent(String(communitySlug))}/posts/${shareId}`;

        return (
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
                <meta property="og:site_name" content={community.displayName || community.name} />
                {post.mediaCids && post.mediaCids[0] && (
                    <meta property="og:image" content={post.mediaCids[0].startsWith('http') ? post.mediaCids[0] : `https://ipfs.io/ipfs/${post.mediaCids[0]}`} />
                )}
                <meta name="twitter:card" content="summary_large_image" />
                <link rel="canonical" href={url} />
            </Head>
        );
    };

    if (isLoading) {
        return (
            <Layout title="Loading Community Post...">
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading community post...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !post || !community) {
        return (
            <Layout title="Community Post Not Found">
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
                    <div className="max-w-md w-full text-center">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Post Not Found</h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The post you are looking for doesn\'t exist.'}</p>
                            <Link href="/communities" className="inline-block px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
                                Browse Communities
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={post.title || `Post in ${community.displayName || community.name}`} fullWidth={true}>
            {getMetaTags()}

            {/* Background gradient for visual polish */}
            <div className="fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 pointer-events-none" />

            <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 pt-0 lg:pt-6">
                <PostDetail
                    post={post}
                    community={community}
                    userMembership={userMembership}
                    onVote={handleVote}
                    isStandalone={true}
                />
            </div>
        </Layout>
    );
}