/**
 * Status Detail Page with Modal View
 * Handles /[handle]/statuses/[statusId] URLs
 * Displays status in a modal overlay similar to Twitter/X
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { StatusService } from '@/services/statusService';
import { PostService } from '@/services/postService';
import { Status } from '@/models/Status';
import { useToast } from '@/context/ToastContext';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { X, Loader2 } from 'lucide-react';
import EnhancedPostCard from '@/components/EnhancedPostCard/EnhancedPostCard';
import EnhancedCommentSystem from '@/components/EnhancedCommentSystem';

export default function StatusPage() {
    const router = useRouter();
    const { handle, statusId } = router.query;
    const { addToast } = useToast();
    const { address, isConnected } = useWeb3();
    const { isAuthenticated } = useAuth();

    const [status, setStatus] = useState<Status | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commentCount, setCommentCount] = useState(0);

    useEffect(() => {
        if (!statusId || typeof statusId !== 'string') return;

        const fetchStatus = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch status using StatusService
                const statusData = await StatusService.getStatus(statusId);

                if (!statusData) {
                    setError('Status not found');
                    return;
                }

                // Verify the handle matches the status author
                const statusHandle = statusData.authorProfile?.handle || (statusData.author ? statusData.author.slice(0, 8) : 'unknown');
                if (handle && statusHandle !== handle) {
                    // Redirect to correct canonical URL
                    router.replace(`/${statusHandle}/statuses/${statusId}`);
                    return;
                }

                setStatus(statusData);
            } catch (err) {
                console.error('Error fetching status:', err);
                setError(err instanceof Error ? err.message : 'Failed to load status');
                addToast('Failed to load status', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [statusId, handle, addToast, router]);

    // Close modal and go back
    const handleClose = () => {
        // Try to go back in history
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back();
        } else {
            // Fallback to home page if no history
            router.push('/');
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Interaction handlers
    const handleUpvote = async (postId: string) => {
        if (!isConnected || !address) {
            addToast('Please connect your wallet to upvote', 'error');
            return;
        }

        if (!isAuthenticated) {
            addToast('Please authenticate to upvote', 'error');
            return;
        }

        try {
            await StatusService.reactToStatus(postId, address, 'upvote', '1');
            addToast('Upvoted!', 'success');
            // Optionally refresh status to get updated counts
        } catch (error) {
            console.error('Error upvoting:', error);
            addToast('Failed to upvote', 'error');
        }
    };

    const handleDownvote = async (postId: string) => {
        if (!isConnected || !address) {
            addToast('Please connect your wallet to downvote', 'error');
            return;
        }

        if (!isAuthenticated) {
            addToast('Please authenticate to downvote', 'error');
            return;
        }

        try {
            await StatusService.reactToStatus(postId, address, 'downvote', '1');
            addToast('Downvoted!', 'success');
            // Optionally refresh status to get updated counts
        } catch (error) {
            console.error('Error downvoting:', error);
            addToast('Failed to downvote', 'error');
        }
    };

    const handleReaction = async (postId: string, reactionType: string, amount?: number) => {
        if (!isConnected || !address) {
            addToast('Please connect your wallet to react', 'error');
            return;
        }

        if (!isAuthenticated) {
            addToast('Please authenticate to react', 'error');
            return;
        }

        try {
            await StatusService.reactToStatus(postId, address, reactionType, String(amount || 1));
            addToast(`Reacted with ${reactionType}!`, 'success');
        } catch (error) {
            console.error('Error reacting:', error);
            addToast('Failed to add reaction', 'error');
        }
    };

    const handleTip = async (postId: string, amount: string, token: string) => {
        if (!isConnected || !address) {
            addToast('Please connect your wallet to tip', 'error');
            return;
        }

        if (!isAuthenticated) {
            addToast('Please authenticate to tip', 'error');
            return;
        }

        if (!status) return;

        try {
            await StatusService.tipStatus(postId, address, status.author, token, amount);
            addToast(`Tipped ${amount} ${token}!`, 'success');
        } catch (error) {
            console.error('Error tipping:', error);
            addToast('Failed to send tip', 'error');
        }
    };

    const handleCommentAdded = () => {
        setCommentCount(prev => prev + 1);
    };

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!status) return null;

        const title = `${status.authorProfile?.handle || handle}'s Status`;
        const description = status.content?.substring(0, 200) || 'Check out this status on LinkDAO';
        const url = `https://linkdao.io/${handle}/statuses/${statusId}`;

        return (
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />

                {/* Open Graph */}
                <meta property="og:type" content="article" />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:url" content={url} />
                {status.mediaCids && status.mediaCids[0] && (
                    <meta property="og:image" content={`https://ipfs.io/ipfs/${status.mediaCids[0]}`} />
                )}

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                {status.mediaCids && status.mediaCids[0] && (
                    <meta name="twitter:image" content={`https://ipfs.io/ipfs/${status.mediaCids[0]}`} />
                )}

                {/* Canonical URL */}
                <link rel="canonical" href={url} />
            </Head>
        );
    };

    return (
        <>
            {getMetaTags()}

            {/* Modal Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto"
                onClick={handleBackdropClick}
            >
                {/* Modal Container */}
                <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        </button>

                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl z-10">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                {status?.authorProfile?.handle || 'Unknown'}'s Post
                            </h1>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                                </div>
                            ) : error || !status ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.964-1.333-3.732 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        Status Not Found
                                    </h2>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        {error || 'The status you\'re looking for doesn\'t exist or has been removed.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <EnhancedPostCard
                                        post={status}
                                        onUpvote={handleUpvote}
                                        onDownvote={handleDownvote}
                                        onReaction={handleReaction}
                                        onTip={handleTip}
                                        onExpand={() => { }}
                                    />

                                    {/* Comment System - only render when status is fully loaded */}
                                    {status && status.id && (
                                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                                            <EnhancedCommentSystem
                                                postId={status.id}
                                                postType="feed"
                                                onCommentAdded={handleCommentAdded}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
