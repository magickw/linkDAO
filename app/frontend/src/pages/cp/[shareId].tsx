/**
 * Community Post Share URL Page
 * Handles /cp/:shareId URLs for community posts
 * Redirects to canonical community-scoped URLs
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

export default function CommunityPostSharePage() {
    const router = useRouter();
    const { shareId } = router.query;
    const { addToast } = useToast();
    const { address } = useWeb3();

    const [post, setPost] = useState<EnhancedPost | null>(null);
    const [community, setCommunity] = useState<Community | null>(null);
    const [userMembership, setUserMembership] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canonicalUrl, setCanonicalUrl] = useState<string>('');

    useEffect(() => {
        if (!shareId || typeof shareId !== 'string') return;

        const fetchPost = async (attemptNumber: number = 1) => {
            try {
                setIsLoading(true);
                setError(null);
                
                const response = await fetch(`/api/cp/${shareId}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    setError(errorData.error || `Failed to load post (${response.status})`);
                    setIsLoading(false);
                    return;
                }

                const result = await response.json();

                if (result.success && result.data) {
                    const rawPost = result.data.post;
                    const cUrl = result.data.canonicalUrl;

                    // Try to redirect to canonical URL
                    if (cUrl) {
                        router.replace(cUrl);
                        return;
                    }

                    // Fallback: Render using PostDetail if redirect isn't available
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
                    setCanonicalUrl(cUrl);

                    // Fetch Community data for fallback rendering
                    if (rawPost.communityId) {
                        const communityData = await CommunityService.getCommunityById(rawPost.communityId);
                        setCommunity(communityData);
                    }
                } else {
                    setError('Community post not found');
                }
            } catch (err) {
                console.error('[CommunityPostSharePage] Error:', err);
                if (attemptNumber < 3) {
                    setTimeout(() => fetchPost(attemptNumber + 1), 1000);
                } else {
                    setError('Failed to load community post after several attempts.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost(1);
    }, [shareId, router]);

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!post) return null;

        const title = post.title || 'Community Post | LinkDAO';
        const description = post.content?.substring(0, 200) || 'Check out this community post on LinkDAO';
        const url = `${window.location.origin}/cp/${shareId}`;

        return (
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
                {post.mediaCids && post.mediaCids[0] && (
                    <meta property="og:image" content={post.mediaCids[0].startsWith('http') ? post.mediaCids[0] : `https://ipfs.io/ipfs/${post.mediaCids[0]}`} />
                )}
                <link rel="canonical" href={window.location.origin + (canonicalUrl || `/cp/${shareId}`)} />
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
        <Layout title={post.title || 'Community Post'}>
            {getMetaTags()}
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <PostDetail
                        post={post}
                        community={community}
                        userMembership={userMembership}
                        onVote={() => {}}
                        isStandalone={true}
                    />
                </div>
            </div>
        </Layout>
    );
}