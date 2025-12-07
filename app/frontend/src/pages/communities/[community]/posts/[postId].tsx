import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { EnhancedPostCard } from '@/components/Feed/EnhancedPostCard';
import { PostService } from '@/services/postService';
import { Post } from '@/models/Post';
import { useToast } from '@/context/ToastContext';
import { Loader2 } from 'lucide-react';

export default function CommunityPostPage() {
    const router = useRouter();
    const { community, postId } = router.query;
    const { addToast } = useToast();

    const [post, setPost] = useState<Post | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!postId || typeof postId !== 'string' || !community) return;

        const fetchPost = async () => {
            try {
                setIsLoading(true);
                const fetchedPost = await PostService.getPost(postId);

                if (!fetchedPost) {
                    // Post not found, redirect to community page
                    console.log('Post not found, redirecting to community:', community);
                    router.replace(`/communities/${community}`);
                    return;
                }

                setPost(fetchedPost);
            } catch (err) {
                console.error('Error fetching post:', err);
                // On error, also redirect to community page as a fallback
                // We can optionally show a toast before redirecting
                addToast('Post not found or unavailable', 'error');
                router.replace(`/communities/${community}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPost();
    }, [postId, community, router, addToast]);

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!post) return null;

        const title = post.title || `Post by ${post.author?.slice(0, 8)}...`;
        const description = post.content?.substring(0, 200) || 'Check out this post on LinkDAO';
        const url = `https://linkdao.io/communities/${community}/post/${postId}`;

        return (
            <Head>
                <title>{title} | LinkDAO</title>
                <meta name="description" content={description} />

                {/* Open Graph */}
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
                <meta property="og:type" content="article" />
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
            </Head>
        );
    };

    if (isLoading || !post) {
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

    return (
        <Layout title={post.title || 'Post'}>
            {getMetaTags()}

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back button */}
                    <div className="mb-6">
                        <button
                            onClick={() => router.push(`/communities/${community}`)}
                            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                        >
                            <span>← Back to Community</span>
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
