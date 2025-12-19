/**
 * Community Post Share URL Page
 * Handles /cp/:shareId URLs for community posts
 * Redirects to canonical community-scoped URLs
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { EnhancedPostCard } from '@/components/Feed/EnhancedPostCard';
import { ArrowLeft, Loader2, ExternalLink, Users } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

interface CommunityPost {
  id: string;
  shareId: string;
  title?: string;
  content: string;
  contentCid: string;
  mediaCids?: string[];
  tags?: string[];
  communityId: string;
  communityName: string;
  communitySlug: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  createdAt: string;
}

export default function CommunityPostSharePage() {
    const router = useRouter();
    const { shareId } = router.query;
    const { addToast } = useToast();

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canonicalUrl, setCanonicalUrl] = useState<string>('');

    useEffect(() => {
        if (!shareId || typeof shareId !== 'string') return;

        const fetchPost = async () => {
            try {
                setIsLoading(true);
                setError(null);
                console.log(`[CommunityPostSharePage] Fetching post for shareId: ${shareId}`);

                // Fetch community post by share ID - 使用绝对路径确保请求正确
                const response = await fetch(`${window.location.origin}/cp/${shareId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Community post not found');
                    } else {
                        setError(`Failed to load post (${response.status})`);
                    }
                    return;
                }

                // 检查响应内容类型
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    setError('Invalid response format');
                    return;
                }

                const result = await response.json();
                console.log('[CommunityPostSharePage] API response:', result);
                
                if (result.success && result.data) {
                    // 后端返回的数据格式不同，需要从 result.data.post 获取实际帖子数据
                    const postData = result.data.post as CommunityPost;
                    const canonicalUrl = result.data.canonicalUrl;
                    
                    console.log('[CommunityPostSharePage] Post data found:', postData);
                    console.log('[CommunityPostSharePage] Canonical URL:', canonicalUrl);
                    
                    setPost(postData);
                    setCanonicalUrl(canonicalUrl);
                    
                    // 重定向到规范URL
                    if (canonicalUrl && canonicalUrl !== window.location.pathname) {
                        console.log('[CommunityPostSharePage] Redirecting to canonical URL:', canonicalUrl);
                        router.replace(canonicalUrl);
                    }
                } else {
                    console.log('[CommunityPostSharePage] Post not found in response');
                    setError('Community post not found');
                }
            } catch (err) {
                console.error('[CommunityPostSharePage] Error fetching community post:', err);
                console.error('[CommunityPostSharePage] Error details:', {
                    message: err instanceof Error ? err.message : 'Unknown error',
                    stack: err instanceof Error ? err.stack : 'No stack trace',
                    shareId
                });
                setError(err instanceof Error ? err.message : 'Failed to load post');
                addToast('Failed to load community post', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [shareId, addToast]);

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!post) return null;

        const title = post.title 
            ? `${post.title} | ${post.communityName} | LinkDAO`
            : `Post in ${post.communityName} | LinkDAO`;
        const description = post.content?.substring(0, 200) || `Check out this post in ${post.communityName} on LinkDAO`;
        const url = `https://linkdao.io/cp/${shareId}`;

        return (
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
                <meta property="og:site_name" content={post.communityName} />
                {post.mediaCids && post.mediaCids[0] && (
                    <meta property="og:image" content={`https://ipfs.io/ipfs/${post.mediaCids[0]}`} />
                )}

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                {post.mediaCids && post.mediaCids[0] && (
                    <meta name="twitter:image" content={`https://ipfs.io/ipfs/${post.mediaCids[0]}`} />
                )}

                {/* Canonical URL */}
                <link rel="canonical" href={`https://linkdao.io${canonicalUrl || `/cp/${shareId}`}`} />
            </Head>
        );
    };

    // Loading state
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

    // Error state
    if (error || !post) {
        return (
            <Layout title="Community Post Not Found">
                <Head>
                    <title>Community Post Not Found | LinkDAO</title>
                </Head>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
                    <div className="max-w-md w-full text-center">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.964-1.333-3.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Community Post Not Found
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {error || 'The community post you\'re looking for doesn\'t exist or has been removed.'}
                            </p>
                            <Link
                                href="/communities"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Browse Communities
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={post.title || `Post in ${post.communityName}`}>
            {getMetaTags()}

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header with navigation */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/communities')}
                                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Communities</span>
                            </button>
                            
                            <Link
                                href={`/communities/${post.communitySlug}`}
                                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                            >
                                <Users className="w-4 h-4" />
                                <span>{post.communityName}</span>
                            </Link>
                        </div>
                        
                        {canonicalUrl && (
                            <Link
                                href={canonicalUrl}
                                className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span>View in Community</span>
                            </Link>
                        )}
                    </div>

                    {/* Community context banner */}
                    <div className="mb-6 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg p-4 border border-primary-200 dark:border-primary-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                                    {post.communityName}
                                </h3>
                                <p className="text-sm text-primary-700 dark:text-primary-300">
                                    Community post by {post.authorName || post.authorHandle}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Post Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <EnhancedPostCard
                            post={{
                                id: post.id,
                                author: post.authorId,
                                content: post.content,
                                contentCid: post.contentCid,
                                mediaCids: post.mediaCids || [],
                                tags: post.tags || [],
                                createdAt: new Date(post.createdAt),
                                title: post.title,
                                communityId: post.communityId,
                                authorProfile: {
                                    handle: post.authorHandle,
                                    verified: false,
                                    reputationTier: undefined
                                }
                            }}
                            showPreviews={true}
                            showSocialProof={true}
                            showTrending={true}
                            className="p-6"
                        />
                    </div>

                    {/* Comments Section Placeholder */}
                    <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Comments
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                            Comments section coming soon...
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}