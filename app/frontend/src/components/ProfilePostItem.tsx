import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { RichContentPreview } from '@/components/Community/RichContentPreview';
import { useToast } from '@/context/ToastContext';

interface ProfilePostItemProps {
    post: any;
    currentUserAddress?: string;
    targetUserAddress?: string;
    profileHandle?: string;
    handleEditPost?: (post: any) => void;
    handleDeletePost?: (postId: string) => void;
}

export const ProfilePostItem: React.FC<ProfilePostItemProps> = ({
    post,
    currentUserAddress,
    targetUserAddress,
    profileHandle,
    handleEditPost,
    handleDeletePost
}) => {
    const router = useRouter();
    const { addToast } = useToast(); // Assuming Toast context is available
    const [content, setContent] = useState<string>('');
    const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    // Function to fetch content if it's an IPFS CID
    useEffect(() => {
        let isMounted = true;

        const fetchContent = async () => {
            // If content is already a string and not a CID, use it directly
            if (post.content && typeof post.content === 'string' && !post.content.startsWith('Qm') && !post.content.startsWith('baf')) {
                if (isMounted) setContent(post.content);
                return;
            }

            // If no valid CID/content, try fallback
            if (!post.contentCid || (!post.contentCid.startsWith('Qm') && !post.contentCid.startsWith('baf'))) {
                if (isMounted) setContent(post.content || '');
                return;
            }

            // It's a CID, fetch it
            setIsLoadingContent(true);
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000'}/api/feed/content/${post.contentCid}`);
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        if (isMounted) setContent(data.data?.content || data.content || 'Content not available');
                    } else {
                        const text = await response.text();
                        if (isMounted) setContent(text);
                    }
                } else {
                    if (isMounted) setContent('Content not available');
                }
            } catch (error) {
                console.error('Error fetching post content:', error);
                if (isMounted) setContent('Content not available');
            } finally {
                if (isMounted) setIsLoadingContent(false);
            }
        };

        fetchContent();

        return () => {
            isMounted = false;
        };
    }, [post.content, post.contentCid]);

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent navigation if text selection is happening
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;

        const postUrl = post.communityId
            ? `/communities/${post.communityId}/posts/${post.id}`
            : `/${profileHandle || currentUserAddress?.slice(0, 8)}/statuses/${post.id}`;

        router.push(postUrl);
    };

    return (
        <div
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <Link
                        href={post.communityId ? `/communities/${post.communityId}/posts/${post.id}` : `/${profileHandle || currentUserAddress?.slice(0, 8)}/statuses/${post.id}`}
                        className="hover:no-underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                            {post.title || 'Untitled Post'}
                        </h4>
                    </Link>

                    <div className="text-gray-600 dark:text-gray-300 mb-2">
                        {isLoadingContent ? (
                            <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                        ) : (
                            <RichContentPreview
                                content={content}
                                contentType="html"
                                maxLines={3} // As requested: truncate by certain lines (3 lines default)
                                isExpanded={isExpanded}
                                onToggleExpand={() => setIsExpanded(!isExpanded)}
                                className="text-sm"
                            />
                        )}
                    </div>
                </div>

                {targetUserAddress === currentUserAddress && (
                    <div className="flex space-x-2 ml-4">
                        {handleEditPost && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleEditPost(post);
                                }}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                title="Edit post"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {handleDeletePost && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeletePost(post.id);
                                }}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                title="Delete post"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                {post.communityId && (
                    <>
                        <span>
                            in{' '}
                            <Link
                                href={`/communities/${encodeURIComponent(post.communityId ?? '')}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {post.communityId}
                            </Link>
                        </span>
                        <span className="mx-2">•</span>
                    </>
                )}
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                <span className="mx-2">•</span>
                <span>{post.comments || 0} comments</span>
                <span className="mx-2">•</span>
                <span>{post.reactions?.length || 0} reactions</span>
            </div>
        </div>
    );
};
