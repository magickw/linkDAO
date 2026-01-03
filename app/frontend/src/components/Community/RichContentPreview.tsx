import React from 'react';
import { processContent, shouldTruncateContent, getTruncatedContent } from '@/utils/contentParser';

interface RichContentPreviewProps {
    content: string;
    contentType?: 'html' | 'markdown' | 'text';
    maxLength?: number;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    showImages?: boolean;
    className?: string;
}

/**
 * RichContentPreview Component
 * 
 * Displays rich text content with proper formatting, truncation, and expand/collapse functionality.
 * Supports HTML, Markdown, and plain text with automatic detection.
 * 
 * @example
 * ```tsx
 * <RichContentPreview
 *   content={post.content}
 *   contentType="html"
 *   maxLength={500}
 *   isExpanded={expanded}
 *   onToggleExpand={() => setExpanded(!expanded)}
 * />
 * ```
 */
export const RichContentPreview: React.FC<RichContentPreviewProps> = ({
    content,
    contentType = 'html',
    maxLength = 500,
    isExpanded = false,
    onToggleExpand,
    showImages = true,
    className = ''
}) => {
    if (!content) {
        return null;
    }

    const shouldTruncate = shouldTruncateContent(content, maxLength, isExpanded);
    const displayContent = isExpanded
        ? content
        : getTruncatedContent(content, maxLength, true);

    return (
        <div className={`rich-content-preview ${className}`}>
            {/* Content with prose styling */}
            <div
                className={`
          prose prose-sm dark:prose-invert max-w-none
          text-gray-900 dark:text-white leading-relaxed
          ${!showImages ? 'prose-img:hidden' : ''}
        `}
            >
                {processContent(displayContent, contentType)}
            </div>

            {/* Show more/less button */}
            {shouldTruncate && onToggleExpand && (
                <button
                    onClick={onToggleExpand}
                    className="
            text-blue-600 dark:text-blue-400 
            hover:text-blue-800 dark:hover:text-blue-300 
            text-sm font-medium mt-2 
            flex items-center gap-1
            transition-colors
          "
                    aria-label={isExpanded ? 'Show less content' : 'Show more content'}
                >
                    <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default RichContentPreview;
