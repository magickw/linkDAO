import React from 'react';
import Link from 'next/link';
import { EnhancedPost } from '@/types/feed';
import OptimizedImage from '../OptimizedImage';
import { VideoEmbed } from '../VideoEmbed'; // Assuming this imports correctly, verify if needed
import { extractVideoUrls } from '@/utils/videoUtils';

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

    const videoEmbeds = extractVideoUrls(post.content || '');
    const hasMedia = post.media && post.media.length > 0;

    return (
        <Link
            href={postUrl}
            className={`block group mt-3 transition-opacity hover:opacity-90 ${className}`}
            onClick={(e) => e.stopPropagation()} // Prevent parent card click handler
        >
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
                <div className="p-3">
                    {/* Header: Author & Date */}
                    <div className="flex items-center space-x-2 text-sm mb-2">
                        <div className="font-medium text-gray-900 dark:text-white flex items-center">
                            {/* Small Avatar if available */}
                            {post.authorProfile?.avatar && (
                                <img
                                    src={post.authorProfile.avatar}
                                    alt={post.authorProfile.handle}
                                    className="w-5 h-5 rounded-full mr-2 object-cover"
                                />
                            )}
                            <span>{post.authorProfile?.handle || post.author || 'Unknown'}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Title (if present) */}
                    {post.title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
                            {post.title}
                        </h4>
                    )}

                    {/* Content Preview */}
                    {post.content && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-2 leading-relaxed">
                            {post.content}
                        </p>
                    )}

                    {/* Media Preview (Compact) */}
                    {hasMedia && (
                        <div className="mt-2 rounded-lg overflow-hidden h-40 w-full relative">
                            <OptimizedImage
                                src={post.media![0]}
                                alt="Post media"
                                fill
                                className="object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
