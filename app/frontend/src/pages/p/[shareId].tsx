/**
 * Status Share URL Page
 * Handles /p/:shareId URLs for status posts
 * Opens status in a modal overlay on the timeline (Twitter/X style)
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Status, convertBackendStatusToStatus } from '@/models/Status';
import { StatusService } from '@/services/statusService';
import { useToast } from '@/context/ToastContext';
import { useWeb3 } from '@/context/Web3Context';
import { useAuth } from '@/context/AuthContext';
import { X, Loader2, ArrowLeft, Share2, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import EnhancedPostCard from '@/components/EnhancedPostCard/EnhancedPostCard';
import EnhancedCommentSystem from '@/components/EnhancedCommentSystem';

export default function StatusSharePage() {
    const router = useRouter();
    const { shareId } = router.query;
    const { addToast } = useToast();
    const { address, isConnected } = useWeb3();
    const { isAuthenticated } = useAuth();

    const [status, setStatus] = useState<Status | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [canonicalUrl, setCanonicalUrl] = useState<string>('');
    const [ownerInfo, setOwnerInfo] = useState<{ handle: string; name: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [commentsCount, setcommentsCount] = useState(0);

    useEffect(() => {
        if (!shareId || typeof shareId !== 'string') return;

        const fetchStatus = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch status by share ID using the unified resolver
                const response = await fetch(`/api/p/${shareId}`);

                const contentType = response.headers.get('content-type');
                const isJson = contentType && contentType.includes('application/json');

                if (!response.ok) {
                    let errorMessage = 'Failed to load status';

                    if (isJson) {
                        try {
                            const errorData = await response.json();
                            errorMessage = errorData.error || errorData.message || errorMessage;
                            if (errorData.debug) {
                                console.log('[SharePage] Debug info:', errorData.debug);
                            }
                        } catch (e) {
                            errorMessage = response.statusText || `Error ${response.status}`;
                        }
                    } else {
                        // Non-JSON error usually means 404 from Next.js (backend unreachable)
                        console.error('[SharePage] Received non-JSON response:', response.status);
                        errorMessage = `Error ${response.status}: Backend unreachable or API route missing`;
                    }

                    if (response.status === 404) {
                        setError(errorMessage || 'Status not found');
                    } else {
                        setError(errorMessage);
                    }
                    setIsLoading(false);
                    return;
                }

                if (!isJson) {
                    throw new Error('Received invalid response format from server');
                }

                const result = await response.json();

                if (result.success && result.data) {
                    const statusData = convertBackendStatusToStatus(result.data.post);
                    const canonical = result.data.canonicalUrl;
                    const owner = result.data.owner;

                    setStatus(statusData);
                    setCanonicalUrl(canonical);
                    setOwnerInfo(owner);

                    // Update the browser URL to the canonical path WITHOUT navigation
                    // This keeps the modal open while showing the canonical URL
                    if (canonical && typeof window !== 'undefined') {
                        window.history.replaceState(
                            { shareId, statusId: statusData.id },
                            '',
                            canonical
                        );
                    }
                } else {
                    setError('Status not found');
                }
            } catch (err) {
                console.error('Error fetching status:', err);
                setError(err instanceof Error ? err.message : 'Failed to load status');
                addToast('Failed to load status', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStatus();
    }, [shareId, addToast]);

    // Close modal and go back
    const handleClose = () => {
        if (typeof window !== 'undefined' && window.history.length > 2) {
            router.back();
        } else {
            router.push('/');
        }
    };

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    // Copy share link
    const handleCopyShareLink = () => {
        const shareUrl = `${window.location.origin}/p/${shareId}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        addToast('Share link copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
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
            await StatusService.addReaction(postId, 'upvote', 1);
            addToast('Upvoted!', 'success');
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
            await StatusService.addReaction(postId, 'downvote', 1);
            addToast('Downvoted!', 'success');
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
            await StatusService.addReaction(postId, reactionType, amount || 1);
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
            await StatusService.sendTip(postId, parseFloat(amount), token);
            addToast(`Tipped ${amount} ${token}!`, 'success');
        } catch (error) {
            console.error('Error tipping:', error);
            addToast('Failed to send tip', 'error');
        }
    };

    const handleCommentAdded = () => {
        setcommentsCount(prev => prev + 1);
    };

    // Generate meta tags for social sharing
    const getMetaTags = () => {
        if (!status) return null;

        const authorHandle = status.authorProfile?.handle || ownerInfo?.handle || 'User';
        const title = `${authorHandle}'s Post | LinkDAO`;
        const description = status.content?.substring(0, 200) || 'Check out this post on LinkDAO';
        const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://linkdao.io'}/p/${shareId}`;

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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto"
                onClick={handleBackdropClick}
            >
                {/* Modal Container */}
                <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8">
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl z-20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Close"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {isLoading ? 'Loading...' : status ? `${status.authorProfile?.displayName || status.authorProfile?.handle || 'User'}'s Post` : 'Post'}
                                    </h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyShareLink}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Copy share link"
                                    >
                                        {copied ? (
                                            <Check className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Share2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                        )}
                                    </button>
                                    <button
                                        onClick={handleClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
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
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {error || 'The status you\'re looking for doesn\'t exist or has been removed.'}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                        Share ID: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{shareId}</code>
                                    </p>
                                    <Link
                                        href="/"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to Home
                                    </Link>
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
                                        defaultExpanded={true}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
