/**
 * Canonical User-Scoped Post Page
 * Handles /:handle/posts/:shareId URLs
 * This is the canonical URL for posts, scoped to the user's profile
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { EnhancedPostCard } from '@/components/Feed/EnhancedPostCard';
import { Status } from '@/models/Status';
import { useToast } from '@/context/ToastContext';
import Link from 'next/link';
import { ArrowLeft, Loader2, Share2 } from 'lucide-react';

export default function UserPostPage() {
    const router = useRouter();
    const { handle, shareId } = router.query;
    const { addToast } = useToast();

    const [post, setPost] = useState<Status | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');

    useEffect(() => {
        if (!shareId || typeof shareId !== 'string') return;

        const fetchPost = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Detect if using UUID or Share ID
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shareId);
                const endpoint = isUuid
                    ? `${process.env.NEXT_PUBLIC_API_URL}/api/quick-posts/${shareId}`
                    : `${process.env.NEXT_PUBLIC_API_URL}/api/quick-posts/share/${shareId}`;

                // Fetch post
                const response = await fetch(endpoint);

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Post not found');
                    } else {
                        setError('Failed to load post');
                    }
                    return;
                }

                const data = await response.json();

                if (data.success && data.data) {
                    const postData = data.data as Status;

                    // Verify the handle matches the post author
                    const postHandle = postData.authorProfile?.handle || postData.author?.slice(0, 8);
                    if (handle && postHandle !== handle) {
                        // Redirect to correct canonical URL
                        router.replace(`/${postHandle}/posts/${shareId}`);
                        return;
                    }

                    setPost(postData);
                    setShareUrl(`/p/${shareId}`);
                } else {
                    setError('Post not found');
                }
            } catch (err) {
                console.error('Error fetching post:', err);
                setError(err instanceof Error ? err.message : 'Failed to load post');
                addToast('Failed to load post', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [shareId, handle, addToast, router]);

    const handleCopyShareLink = () => {
        const url = `${window.location.origin}/p/${shareId}`;
        navigator.clipboard.writeText(url);
        addToast('Share link copied to clipboard!', 'success');
    };

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!post) return null;

        const title = `Post by ${post.authorProfile?.handle || handle} | LinkDAO`;
        const description = post.content?.substring(0, 200) || 'Check out this post on LinkDAO';
        const url = `https://linkdao.io/${handle}/posts/${shareId}`;

        return (
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
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
                <link rel="canonical" href={url} />
            </Head>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <Layout title="Loading Post...">
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading post...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    // Error state
    if (error || !post) {
        return (
            <Layout title="Post Not Found">
                <Head>
                    <title>Post Not Found | LinkDAO</title>
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
                                Post Not Found
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {error || 'The post you\'re looking for doesn\'t exist or has been removed.'}
                            </p>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={`Post by ${handle}`}>
            {getMetaTags()}

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header with navigation */}
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/')}
                                className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </button>
                            <Link
                                href={`/u/${post.author}`}
                                className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
                            >
                                View @{handle}'s Profile
                            </Link>
                        </div>

                        <button
                            onClick={handleCopyShareLink}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                        </button>
                    </div>

                    {/* Post Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <EnhancedPostCard
                            post={post}
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
