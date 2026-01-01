import React, { useMemo } from 'react';
import Link from 'next/link';
import { EnhancedPost } from '@/types/feed';
import OptimizedImage from '../OptimizedImage';
import VideoEmbed from '../VideoEmbed';
import { extractVideoUrls } from '@/utils/videoUtils';
import { formatRelativeTime } from '@/utils/formatters';

interface QuotedPostProps {
    post: EnhancedPost;
    className?: string;
}

export default function QuotedPost({ post, className = '' }: QuotedPostProps) {
    // If post is null/undefined (e.g. deleted), show unavailable message
    if (!post) {
        return (
            <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm italic text-center ${className}`}>
                Original post unavailable
            </div>
        );
    }

    // Determine navigation URL
    const postUrl = post.communityId
        ? `/communities/${encodeURIComponent(post.communityName || post.communityId)}/posts/${post.shareId || post.id}`
        : `/post/${post.id}`;

    const videoEmbeds = useMemo(() => {
        if (!post.content) return [];
        return extractVideoUrls(post.content || '');
    }, [post.content]);

    const hasMedia = post.media && post.media.length > 0;

    // Format numbers for display
    const formatCount = (count: number | undefined) => {
        if (!count) return 0;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
        return count;
    };

    return (
        <Link
            href={postUrl}
            className={`block group mt-2 transition-all duration-200 hover:shadow-md ${className}`}
            onClick={(e) => e.stopPropagation()} // Prevent parent card click handler
        >
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-200">
                <div className="p-3">
                    {/* Header: Author & Date */}
                    <div className="flex items-center space-x-2 text-sm mb-2">
                        <div className="flex items-center min-w-0">
                            {/* Avatar with fallback */}
                            <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex-shrink-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600">
                                {post.authorProfile?.avatar ? (
                                    <img
                                        src={post.authorProfile.avatar}
                                        alt={post.authorProfile.handle}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                                        {(post.authorProfile?.handle || post.author || '?').charAt(0)}
                                    </div>
                                )}
                            </div>

                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                                {post.authorProfile?.handle || post.author}
                            </span>
                        </div>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">•</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {formatRelativeTime(post.createdAt)}
                        </span>
                    </div>

                    {/* Title (if present) */}
                    {post.title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 leading-snug line-clamp-1">
                            {post.title}
                        </h4>
                    )}

                    {/* Content Preview */}
                    {post.content && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-2 leading-relaxed">
                            {post.content}
                        </p>
                    )}

                    {/* Media / Video */}
                    <div className="space-y-2 mt-2">
                        {/* Display Video Overlay if present */}
                        {videoEmbeds.length > 0 && (
                            <div className="rounded-lg overflow-hidden w-full relative">
                                {/* Just show the first video for the preview card to keep it compact */}
                                <VideoEmbed
                                    url={videoEmbeds[0].url}
                                    width={400} // Smaller width for embedded card
                                    height={225}
                                    showPlaceholder={true}
                                    className="w-full"
                                />
                                {videoEmbeds.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                        +{videoEmbeds.length - 1} more video{videoEmbeds.length - 1 > 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Display Header Image if no video or as additional media */}
                        {/* If video exists, maybe skip image to save space, or show if it's explicitly attached media distinct from video link */}
                        {hasMedia && videoEmbeds.length === 0 && (
                            <div className="rounded-lg overflow-hidden h-40 w-full relative bg-gray-100 dark:bg-gray-800">
                                <OptimizedImage
                                    src={post.media![0]}
                                    alt="Post media"
                                    fill
                                    className="object-cover"
                                />
                                {post.media!.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                                        +{post.media!.length - 1} more
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Engagement Stats - Compact Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center space-x-4">
                            {/* Comments */}
                            <div className="flex items-center space-x-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <span>{formatCount(post.comments)}</span>
                            </div>

                            {/* Reposts */}
                            <div className="flex items-center space-x-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{formatCount(post.shares)}</span>
                            </div>

                            {/* Upvotes */}
                            <div className="flex items-center space-x-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
                                </svg>
                                <span>{formatCount(post.upvotes)}</span>
                            </div>
                        </div>

                        {/* View Original Link */}
                        <Link
                            href={postUrl}
                            className="text-primary-600 dark:text-primary-400 hover:underline font-medium flex items-center space-x-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span>View original</span>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </Link>
    );
}
