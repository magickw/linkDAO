import React, { useRef, useEffect, useState } from 'react';
import { processContent } from '@/utils/contentParser';

interface RichContentPreviewProps {
    content: string;
    contentType?: 'html' | 'markdown' | 'text';
    maxLines?: number;
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
 * Uses DOM-based truncation detection for accurate "Show more" button display.
 * 
 * @example
 * ```tsx
 * <RichContentPreview
 *   content={post.content}
 *   contentType="html"
 *   maxLines={4}
 *   isExpanded={expanded}
 *   onToggleExpand={() => setExpanded(!expanded)}
 * />
 * ```
 */
export const RichContentPreview: React.FC<RichContentPreviewProps> = ({
    content,
    contentType = 'html',
    maxLines = 4,
    isExpanded = false,
    onToggleExpand,
    showImages = true,
    className = ''
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);

    // Check if content is visually truncated using DOM measurements
    useEffect(() => {
        if (!contentRef.current) {
            setIsTruncated(false);
            return;
        }

        const checkTruncation = () => {
            const element = contentRef.current;
            if (!element) return;

            // Get actual computed line height
            const computedStyle = window.getComputedStyle(element);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
            const maxHeight = lineHeight * maxLines;

            // Store current styles
            const currentStyles = {
                maxHeight: element.style.maxHeight,
                overflow: element.style.overflow,
                display: element.style.display,
                webkitLineClamp: element.style.webkitLineClamp,
                webkitBoxOrient: element.style.webkitBoxOrient
            };

            // Temporarily remove constraints to measure full content
            Object.assign(element.style, {
                maxHeight: 'none',
                overflow: 'visible',
                display: 'block',
                webkitLineClamp: 'unset',
                webkitBoxOrient: 'unset'
            });

            const fullHeight = element.scrollHeight;

            // Restore original styles
            Object.assign(element.style, currentStyles);

            // Content needs truncation if full height exceeds max (with 5px tolerance)
            setIsTruncated(fullHeight > maxHeight + 5);
        };

        // Check after content settles
        const timer = setTimeout(checkTruncation, 100);

        // Debounced resize handler
        let resizeTimer: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(checkTruncation, 150);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timer);
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, [content, maxLines]); // Removed isExpanded from dependencies!

    if (!content) {
        return null;
    }

    return (
        <div className={`rich-content-preview ${className}`}>
            {/* Content with prose styling */}
            <div
                ref={contentRef}
                className={`
                    prose prose-sm dark:prose-invert max-w-none
                    text-gray-900 dark:text-white
                    ${!showImages ? 'prose-img:hidden' : ''}
                `}
                style={{
                    display: !isExpanded && isTruncated ? '-webkit-box' : 'block',
                    WebkitLineClamp: !isExpanded && isTruncated ? maxLines : undefined,
                    WebkitBoxOrient: !isExpanded && isTruncated ? 'vertical' : undefined,
                    overflow: !isExpanded && isTruncated ? 'hidden' : 'visible',
                    lineHeight: '1.5rem'
                }}
                aria-expanded={isExpanded}
                role="region"
            >
                {processContent(content, contentType)}
            </div>

            {/* Show more/less button - only show if content is actually truncated */}
            {isTruncated && onToggleExpand && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onToggleExpand();
                    }}
                    className="
                        text-blue-600 dark:text-blue-400 
                        hover:text-blue-800 dark:hover:text-blue-300 
                        text-sm font-medium mt-2 
                        flex items-center gap-1
                        transition-colors
                    "
                    type="button"
                    aria-label={isExpanded ? 'Show less content' : 'Show more content'}
                >
                    <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
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
